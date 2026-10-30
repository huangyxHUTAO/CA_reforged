#!/usr/bin/env node
/**
 * 命令助手拓展包源 —— 构建脚本
 *
 * 把 src/ 里的原始包（.json 或 .lib）统一签名成 SIGNLIB01，生成可直接被
 * 命令助手在线读取的源站结构：
 *
 *   dist/info.json          源信息（入口）
 *   dist/index-0.json …     分页清单（每页 PACKS_PER_PAGE 个包）
 *   dist/packs/<uuid>.lib   签名后的包
 *   dist/packs/<uuid>.json  更新信息（updateurl 用）
 *   dist/verify.key         验签公钥（DER）
 *
 * 用法：
 *   node build.js                       # 用 source-config.json 里的 baseUrl
 *   node build.js --base=<URL>          # 临时指定线上根地址
 *   node build.js --verify              # 只校验已生成的 dist
 *
 * 私钥不会被提交：默认读 CADROID 的 app/signatures/privateKey.pem，
 * 也可以用环境变量 CA_SIGN_KEY 指定。
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const ROOT = __dirname;
const SRC = path.join(ROOT, "src");
let OUT = null; // 由 source-config.json 的 outputDir 决定（默认 dist，community-clib 里是当前目录）
const PACKS_PER_PAGE = 20;

/** 不收录的包（文件名 → 原因），构建时跳过 */
const EXCLUDES = {
	"[苦力怕论坛]命令拓展 by JG 1.3.0.lib" : "文件格式损坏（既不是 LIBRARY 也不是有效 JSON）",
	"命令助手快照20190226130049.lib" : "这是 2019 年的快照安装器，不是拓展包",
	"内测组插件.lib" : "作者内部测试插件，不对外分发"
};

function loadConfig() {
	const cfgPath = path.join(ROOT, "source-config.json");
	if (!fs.existsSync(cfgPath)) throw new Error("缺少 source-config.json");
	return JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
}

function resolveBase(cfg) {
	const arg = process.argv.find(function(a) { return a.indexOf("--base=") === 0; });
	let base = arg ? arg.slice("--base=".length) : (process.env.SOURCE_BASE || cfg.baseUrl);
	if (!base) throw new Error("没有配置线上地址：source-config.json 的 baseUrl 或 --base=");
	if (base.slice(-1) !== "/") base += "/";
	return base;
}

function readPrivateKey(cfg) {
	const keyPath = process.env.CA_SIGN_KEY || cfg.privateKey;
	if (!keyPath) throw new Error("没有配置私钥：source-config.json 的 privateKey 或环境变量 CA_SIGN_KEY");
	if (!fs.existsSync(keyPath)) throw new Error("私钥不存在：" + keyPath);
	return fs.readFileSync(keyPath);
}

function gzip(content) {
	return zlib.gzipSync(Buffer.from(content, "utf-8"));
}

/**
 * 与 cabuildtools/js2signlib.js 完全一致的容器：SIGNLIB01 + RSA-SHA256 + 时间戳 + gzip
 * 时间戳用源文件的 mtime，而不是当前时间 —— 这样内容没变时重新构建，
 * 产物逐字节一致，不会把整个 packs/ 都变脏。
 */
function sign(content, privateKey, timestamp) {
	const now = timestamp || Date.now();
	const stamp = Buffer.alloc(8);
	stamp.writeInt32BE(Math.floor(now / 0xffffffff), 0);
	stamp.writeInt32BE(now & 0xffffffff, 4);
	const payload = Buffer.concat([stamp, gzip(content)]);
	const signature = crypto.createSign("RSA-SHA256").update(payload).sign(privateKey);
	return Buffer.concat([Buffer.from("SIGNLIB01"), signature, payload]);
}

function verifyLib(buf, publicKey) {
	if (buf.slice(0, 9).toString() !== "SIGNLIB01") return false;
	const signature = buf.slice(9, 9 + 256);
	const payload = buf.slice(9 + 256);
	return crypto.createVerify("RSA-SHA256").update(payload).verify(publicKey, signature);
}

/** 读一个源包，返回 {content, kind, meta} */
function readPack(file) {
	const raw = fs.readFileSync(file);
	if (file.endsWith(".json")) {
		const data = JSON.parse(raw.toString("utf-8"));
		return { content : JSON.stringify(data, null, "\t"), kind : "json", meta : data };
	}
	if (raw.slice(0, 7).toString() === "LIBRARY") {
		const body = zlib.gunzipSync(raw.slice(15)).toString("utf-8");
		const isPlugin = body.replace(/^\s+/, "").indexOf("Plugins.inject") === 0;
		let meta;
		if (isPlugin) {
			meta = {};
			[["name", "name"], ["author", "author"], ["uuid", "uuid"], ["description", "description"]].forEach(function(pair) {
				const m = body.match(new RegExp(pair[0] + '\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"'));
				if (m) meta[pair[1]] = m[1];
			});
			const v = body.match(/version\s*=\s*\[([^\]]*)\]/);
			meta.version = v ? v[1].split(",").map(function(x) { return parseInt(x, 10) || 0; }) : [0];
		} else {
			meta = JSON.parse(body);
			return { content : JSON.stringify(meta, null, "\t"), kind : "json", meta : meta };
		}
		return { content : body, kind : "plugin", meta : meta };
	}
	throw new Error("无法识别的包格式");
}

function normalizeMeta(meta, file) {
	const m = Object.assign({}, meta);
	if (m.name) m.name = String(m.name).replace(/^\[锁定\]\s*/, "");
	if (!Array.isArray(m.version)) m.version = [parseInt(m.version, 10) || 0];
	if (!Array.isArray(m.require)) m.require = [];
	if (!m.uuid) throw new Error("缺少 uuid：" + file);
	if (!m.author) m.author = "未知作者";
	return m;
}

/** 版本号数组比较：a > b 返回正数，相等 0 */
function compareVersion(a, b) {
	const n = Math.max(a.length, b.length);
	for (let i = 0; i < n; i++) {
		const x = a[i] || 0, y = b[i] || 0;
		if (x !== y) return x - y;
	}
	return 0;
}

/**
 * 整理规则（都在 source-config.json 的 curation 里）：
 *   excludeNameRegex  名字命中就丢掉（比如「的副本」这类备份）
 *   lineages          同一系列只留版本最高的一个（名字用正则匹配）
 *   renames           uuid → 新的显示名（只改展示，不动原文件）
 */
function applyCuration(items, curation) {
	const rules = curation || {};
	const exclude = (rules.excludeNameRegex || []).map(function(r) { return new RegExp(r); });
	const lineages = (rules.lineages || []).map(function(l) {
		return { id : l.id, re : new RegExp(l.match, l.flags || "i") };
	});

	const dropped = [];
	let list = items.filter(function(it) {
		const hit = exclude.some(function(re) { return re.test(it.meta.name); });
		if (hit) {
			it.dropReason = "名字命中排除规则（备份/副本）";
			dropped.push(it);
		}
		return !hit;
	});

	lineages.forEach(function(line) {
		const group = list.filter(function(it) { return line.re.test(it.meta.name); });
		if (group.length <= 1) return;
		let best = group[0];
		group.forEach(function(it) {
			if (compareVersion(it.meta.version, best.meta.version) > 0) best = it;
		});
		group.forEach(function(it) {
			if (it !== best) it.dropReason = "同系列（" + line.id + "）只保留最新的 " + best.meta.name;
		});
	});

	const renames = rules.renames || {};
	return {
		keep : list.filter(function(it) { return !it.dropReason; }),
		drop : dropped.concat(list.filter(function(it) { return it.dropReason; }))
	};
}

/**
 * 清理上一次的生成物。OUT 可能就是仓库根（community-clib/），这种时候只能删
 * 已知的生成物，不能整个目录 rm —— 否则会把 src/、build.js 一起删掉。
 */
function clearOutput(out) {
	if (path.resolve(out) !== path.resolve(ROOT)) {
		if (fs.existsSync(out)) fs.rmSync(out, { recursive : true, force : true });
		fs.mkdirSync(out, { recursive : true });
		return;
	}
	fs.rmSync(path.join(out, "packs"), { recursive : true, force : true });
	fs.readdirSync(out).forEach(function(f) {
		if (/^index-\d+\.json$/.test(f) || f === "info.json" || f === "verify.key" || f === "map.json") {
			fs.rmSync(path.join(out, f), { force : true });
		}
	});
}

function build() {
	const cfg = loadConfig();
	OUT = path.resolve(ROOT, cfg.outputDir || "dist");
	const base = resolveBase(cfg);
	const privateKey = readPrivateKey(cfg);
	const publicKeyPem = crypto.createPublicKey(privateKey).export({ type : "spki", format : "pem" });
	const publicKeyDer = crypto.createPublicKey(privateKey).export({ type : "spki", format : "der" });

	clearOutput(OUT);
	fs.mkdirSync(path.join(OUT, "packs"), { recursive : true });

	const files = [];
	["json", "lib"].forEach(function(dir) {
		const d = path.join(SRC, dir);
		if (!fs.existsSync(d)) return;
		fs.readdirSync(d).forEach(function(f) {
			if (f.charAt(0) === ".") return;
			files.push({ dir : dir, name : f, path : path.join(d, f) });
		});
	});

	const packs = [], skipped = [], items = [];
	files.forEach(function(item) {
		if (EXCLUDES[item.name]) {
			skipped.push(item.name + "（" + EXCLUDES[item.name] + "）");
			return;
		}
		let pack;
		try {
			pack = readPack(item.path);
		} catch (e) {
			skipped.push(item.name + "（解析失败：" + e.message + "）");
			return;
		}
		items.push({ file : item, pack : pack, meta : normalizeMeta(pack.meta, item.name) });
	});

	const curated = applyCuration(items, cfg.curation);
	curated.drop.forEach(function(it) { skipped.push(it.meta.name + "（" + it.dropReason + "）"); });

	curated.keep.forEach(function(entry) {
		const item = entry.file, pack = entry.pack;
		let meta = entry.meta;
		const rename = (cfg.curation && cfg.curation.renames) || {};
		if (rename[meta.uuid]) meta = Object.assign({}, meta, { name : rename[meta.uuid] });
		const mtime = Math.floor(fs.statSync(item.path).mtimeMs);
		const lib = sign(pack.content, privateKey, mtime);
		const libName = meta.uuid + ".lib";
		fs.writeFileSync(path.join(OUT, "packs", libName), lib);
		const libUrl = base + "packs/" + libName;
		const sha1 = crypto.createHash("sha1").update(lib).digest("base64");
		// 更新信息用官方源的字段：App 的 requestUpdateInfo 只认 version，
		// doUpdate 需要 url/sha1/source(源根地址，用来取验签公钥)
		fs.writeFileSync(path.join(OUT, "packs", meta.uuid + ".json"),
			JSON.stringify({
				uuid : meta.uuid,
				version : meta.version,
				url : libUrl,
				source : base,
				sha1 : sha1
			}, null, "\t"));
		packs.push({
			name : meta.name,
			author : meta.author,
			description : meta.description || "",
			uuid : meta.uuid,
			version : meta.version,
			downloadurl : libUrl,
			updateurl : base + "packs/" + meta.uuid + ".json",
			sha1 : sha1,
			mtime : mtime
		});
	});

	packs.sort(function(a, b) { return a.name.localeCompare(b.name, "zh"); });

	const pages = [];
	for (let i = 0; i < packs.length; i += PACKS_PER_PAGE) pages.push(packs.slice(i, i + PACKS_PER_PAGE));
	if (!pages.length) pages.push([]);

	pages.forEach(function(list, i) {
		fs.writeFileSync(path.join(OUT, "index-" + i + ".json"), JSON.stringify({
			pageNo : i,
			sourceId : cfg.sourceId,
			nextPage : i + 1 < pages.length ? base + "index-" + (i + 1) + ".json" : null,
			content : list
		}, null, "\t"));
	});

	// map.json：uuid → 更新信息地址。App 的「检测更新」在没有 update 字段时靠它找
	const map = {};
	packs.forEach(function(p) { map[p.uuid] = p.updateurl; });
	fs.writeFileSync(path.join(OUT, "map.json"), JSON.stringify({
		sourceId : cfg.sourceId,
		content : map
	}, null, "\t"));

	fs.writeFileSync(path.join(OUT, "verify.key"), publicKeyDer);
	fs.writeFileSync(path.join(OUT, "info.json"), JSON.stringify({
		sourceId : cfg.sourceId,
		index : base + "index-0.json",
		indexPages : pages.length,
		indexLibs : packs.length,
		map : base + "map.json",
		pubkey : base + "verify.key",
		lastUpdate : packs.reduce(function(max, p) { return Math.max(max, p.mtime || 0); }, 0) || Date.now(),
		// name 是给 App 显示的源名称（可选；没有就由 App 回退到 maintainer）
		name : cfg.name || undefined,
		maintainer : cfg.maintainer || "codesenlin",
		details : cfg.details || ("共 " + packs.length + " 个拓展包")
	}, null, "\t"));

	console.log("源地址：" + base);
	console.log("打包完成：" + packs.length + " 个包 / " + pages.length + " 页");
	if (skipped.length) {
		console.log("跳过 " + skipped.length + " 个：");
		skipped.forEach(function(s) { console.log("  · " + s); });
	}
	console.log("");
	console.log("包列表：");
	packs.forEach(function(p) {
		console.log("  " + p.name + "  (" + p.uuid + ")  v" + p.version.join(".") + "  " + p.author);
	});
	console.log("");
	console.log("命令助手里的源地址填：");
	console.log("  " + base);
	console.log("（或 info.json 的完整地址）");
	return { packs : packs, publicKeyPem : publicKeyPem };
}

function verify() {
	const cfg = loadConfig();
	const privateKey = readPrivateKey(cfg);
	const publicKey = crypto.createPublicKey(privateKey);
	const infoPath = path.join(OUT, "info.json");
	if (!fs.existsSync(infoPath)) throw new Error("dist 还没有生成，先跑 node build.js");
	const info = JSON.parse(fs.readFileSync(infoPath, "utf-8"));
	const keyFile = fs.readFileSync(path.join(OUT, "verify.key"));
	const publicKeyFromFile = crypto.createPublicKey({ key : keyFile, format : "der", type : "spki" });
	const derFromFile = publicKeyFromFile.export({ type : "spki", format : "der" }).toString("hex");
	const derExpected = publicKey.export({ type : "spki", format : "der" }).toString("hex");
	if (derFromFile !== derExpected) throw new Error("verify.key 与私钥不匹配");
	let checked = 0, bad = 0;
	for (let i = 0; i < info.indexPages; i++) {
		const page = JSON.parse(fs.readFileSync(path.join(OUT, "index-" + i + ".json"), "utf-8"));
		page.content.forEach(function(item) {
			const libPath = path.join(OUT, "packs", item.uuid + ".lib");
			if (!fs.existsSync(libPath)) {
				console.log("  ✗ 缺文件：" + item.uuid + ".lib");
				bad++;
				return;
			}
			const buf = fs.readFileSync(libPath);
			const sha1 = crypto.createHash("sha1").update(buf).digest("base64");
			const okSig = verifyLib(buf, publicKey);
			const okSha = sha1 === item.sha1;
			checked++;
			if (!okSig || !okSha) {
				bad++;
				console.log("  ✗ " + item.name + " 验签=" + okSig + " sha1=" + okSha);
			}
		});
	}
	console.log("校验完成：" + checked + " 个包，问题 " + bad + " 个");
	process.exit(bad ? 1 : 0);
}

const isVerify = process.argv.indexOf("--verify") >= 0;
try {
	if (isVerify) verify();
	else build();
	if (!isVerify) verify();
} catch (e) {
	console.error("失败：" + (e && e.message ? e.message : e));
	process.exit(1);
}
