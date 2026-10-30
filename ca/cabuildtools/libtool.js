#!/usr/bin/env node
/**
 * .lib 打包 / 解包工具（命令助手拓展包容器）
 *
 *   npm run pack   -- <输入.js|输入.json> [-o 输出.lib] [--sign 私钥.pem]
 *   npm run unpack -- <输入.lib> [-o 输出] [--key 公钥.pem|der]
 *   npm run info   -- <输入.lib>
 *
 * 支持的容器：
 *   LIBRARY    本地/安装器库：7 字节魔数 + 8 字节时间戳 + gzip 载荷
 *   SIGNLIB01  分发格式：9 字节魔数 + 256 字节 RSA 签名 + 8 字节时间戳 + gzip
 *   LIBSIGN01  本地已验签：9 字节魔数 + int32 sourceId 长度 + sourceId + SIGNLIB01 的 [9..]
 *
 * 打包默认出 LIBRARY（锁定包）；加 --sign 出 SIGNLIB01。
 * 解包会自动识别格式，内容能解析成 JSON 就输出 .json（格式化），否则输出 .js。
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const { parseArgs : parseCliArgs } = require("util");

const MAGIC_LIBRARY = "LIBRARY";
const MAGIC_SIGNED = "SIGNLIB01";
const MAGIC_LOCAL = "LIBSIGN01";
const SIGN_LEN = 256;

function usage() {
	console.log([
		"用法：",
		"  npm run pack   -- <输入.js|输入.json> [-o 输出.lib] [--sign 私钥.pem]",
		"  npm run unpack -- <输入.lib> [-o 输出] [--key 公钥.pem|der] [--raw]",
		"  npm run info   -- <输入.lib>",
		"",
		"说明：",
		"  pack   默认打成 LIBRARY（锁定包）；--sign 用私钥打成 SIGNLIB01（可分发）",
		"  unpack 自动识别 LIBRARY / SIGNLIB01 / LIBSIGN01；--key 可顺带验签",
		"         内容是 JSON 就输出 .json（格式化），否则输出 .js",
		"  info   只打印容器信息（格式、大小、库名/uuid/版本等）"
	].join("\n"));
}

/** 版本数组转字符串；[年,月,日,时,分,秒] 这种把时、分、秒补成两位 */
function formatVersion(v) {
	if (!Array.isArray(v)) return String(v);
	if (v.length === 6 && v[0] >= 2000) {
		var pad2 = function(n) { return ("0" + n).slice(-2); };
		return [v[0], v[1], v[2], pad2(v[3]), pad2(v[4]), pad2(v[5])].join(".");
	}
	return v.join(".");
}

function fail(msg) {
	console.error("失败：" + msg);
	process.exit(1);
}

function parseArgs(argv) {
	let parsed;
	try {
		parsed = parseCliArgs({
			args : argv,
			options : {
				out : { type : "string", short : "o" },
				sign : { type : "string" },
				key : { type : "string" },
				raw : { type : "boolean" },
				help : { type : "boolean", short : "h" }
			},
			allowPositionals : true,
			strict : true
		});
	} catch (e) {
		// 未知参数 / 缺值时直接报错，不再像手写版那样默默当路径
		console.error("失败：" + e.message);
		usage();
		process.exit(1);
	}
	return Object.assign(parsed.values, { _ : parsed.positionals });
}

/** 读私钥：PEM 或 DER 都行 */
function readPrivateKey(file) {
	const buf = fs.readFileSync(file);
	const text = buf.toString("utf-8");
	if (text.indexOf("BEGIN") >= 0) return text;
	return crypto.createPrivateKey({ key: buf, format: "der", type: "pkcs8" });
}

/** 读公钥：PEM / DER / 证书 PEM / 证书 DER */
function readPublicKey(file) {
	const buf = fs.readFileSync(file);
	const text = buf.toString("utf-8");
	try {
		if (text.indexOf("BEGIN CERTIFICATE") >= 0) {
			const x509 = new crypto.X509Certificate(text);
			return x509.publicKey;
		}
		if (text.indexOf("BEGIN") >= 0) return crypto.createPublicKey(text);
		return crypto.createPublicKey({ key: buf, format: "der", type: "spki" });
	} catch (e) {
		// 可能是证书 DER
		const x509 = new crypto.X509Certificate(buf);
		return x509.publicKey;
	}
}

function gzip(content) {
	return zlib.gzipSync(Buffer.from(content, "utf-8"));
}

/** 打成 LIBRARY：7 字节魔数 + 8 字节时间戳 + gzip */
function packLibrary(content, timestamp) {
	const now = timestamp || Date.now();
	const head = Buffer.alloc(15);
	head.write(MAGIC_LIBRARY, 0, "utf-8");
	head.writeInt32BE(Math.floor(now / 0xffffffff), 7);
	head.writeInt32BE(now & 0xffffffff, 11);
	return Buffer.concat([head, gzip(content)]);
}

/** 打成 SIGNLIB01：9 字节魔数 + 256 字节 RSA-SHA256 + 8 字节时间戳 + gzip */
function packSigned(content, privateKey, timestamp) {
	const now = timestamp || Date.now();
	const stamp = Buffer.alloc(8);
	stamp.writeInt32BE(Math.floor(now / 0xffffffff), 0);
	stamp.writeInt32BE(now & 0xffffffff, 4);
	const payload = Buffer.concat([stamp, gzip(content)]);
	const signature = crypto.createSign("RSA-SHA256").update(payload).sign(privateKey);
	return Buffer.concat([Buffer.from(MAGIC_SIGNED, "utf-8"), signature, payload]);
}

/** 识别容器类型并取出 gzip 载荷 + 元信息 */
function detect(buf) {
	const head = buf.slice(0, 9).toString("utf-8");
	if (buf.slice(0, 7).toString("utf-8") === MAGIC_LIBRARY) {
		return {
			format: MAGIC_LIBRARY,
			timestamp: buf.readInt32BE(7) * 0xffffffff + buf.readInt32BE(11),
			payload: buf.slice(15),
			verify: null
		};
	}
	if (head === MAGIC_SIGNED) {
		const dataStart = 9 + SIGN_LEN;              // 签名覆盖「时间戳 + gzip」
		return {
			format: MAGIC_SIGNED,
			timestamp: buf.readInt32BE(dataStart) * 0xffffffff + buf.readInt32BE(dataStart + 4),
			payload: buf.slice(dataStart + 8),        // 解压只取 gzip
			verify: {
				signature: buf.slice(9, 9 + SIGN_LEN),
				data: buf.slice(dataStart)
			}
		};
	}
	if (head === MAGIC_LOCAL) {
		const idLen = buf.readInt32BE(9);
		const sourceId = buf.slice(13, 13 + idLen).toString("utf-8");
		const rest = buf.slice(13 + idLen); // 从 SIGNLIB01 的 [9..] 开始
		return {
			format: MAGIC_LOCAL,
			sourceId,
			timestamp: rest.readInt32BE(SIGN_LEN) * 0xffffffff + rest.readInt32BE(SIGN_LEN + 4),
			payload: rest.slice(SIGN_LEN + 8),        // 跳过签名与时间戳，只剩 gzip
			verify: {
				signature: rest.slice(0, SIGN_LEN),
				data: rest.slice(SIGN_LEN)
			}
		};
	}
	if (buf.slice(0, 2).toString("hex") === "1f8b") {
		return { format: "GZIP", timestamp: 0, payload: buf, verify: null };
	}
	return null;
}

function decompress(info) {
	return zlib.gunzipSync(info.payload).toString("utf-8");
}

/** 从内容里猜库元数据（JSON 库直接解析；插件库用正则从源码里抽） */
function guessMeta(content) {
	let json = null;
	try {
		json = JSON.parse(content);
	} catch (e) {}
	let meta = {};
	if (json) {
		meta = {
			name: json.name,
			uuid: json.uuid,
			version: json.version,
			author: json.author,
			type: "JSON 库"
		};
	} else {
		const grab = function(k) {
			const arr = content.match(new RegExp(k + "\\s*=\\s*\\[([^\\]]*)\\]"));
			if (arr) return arr[1].split(",").map(function(x) { return parseInt(x, 10) || 0; });
			const str = content.match(new RegExp(k + "\\s*=\\s*[\"']([^\"']*)[\"']"));
			return str ? str[1] : undefined;
		};
		meta = {
			name: grab("name"),
			uuid: grab("uuid"),
			version: grab("version"),
			author: grab("author"),
			type: /^\s*Plugins\.inject/.test(content) ? "插件库" : "JS"
		};
	}
	return meta;
}

function cmdPack(args) {
	const input = args._[0];
	if (!input) fail("缺少输入文件");
	if (!fs.existsSync(input)) fail("找不到文件：" + input);

	const raw = fs.readFileSync(input);
	let content, isJson;
	if (detect(raw)) {
		// 输入本身就是一个 .lib：先解出内容，再按目标格式重新打包（可用来补签名）
		const info = detect(raw);
		content = decompress(info).replace(/\s+$/, "");
		isJson = (function() {
			try {
				JSON.parse(content);
				return true;
			} catch (e) {
				return false;
			}
		})();
		console.log("输入是 " + info.format + " 容器，先解出内容再重新打包");
	} else {
		content = raw.toString("utf-8").replace(/\s+$/, "");
		isJson = path.extname(input).toLowerCase() === ".json";
	}
	if (!content) fail("输入是空的");

	// 校验一下内容是否能被 App 加载（JSON 就直接解析，JS 按表达式求值）
	if (isJson) {
		try {
			JSON.parse(content);
		} catch (e) {
			fail("JSON 解析失败：" + e.message);
		}
	} else {
		try {
			new Function("return (" + content + ")");
		} catch (e) {
			fail("不是合法的库代码：" + e.message);
		}
	}

	let out = args.out || path.join(path.dirname(input), path.basename(input, path.extname(input)) + ".lib");
	let buf;
	if (args.sign) {
		buf = packSigned(content, readPrivateKey(args.sign));
	} else {
		buf = packLibrary(content);
	}
	fs.writeFileSync(out, buf);
	const format = args.sign ? MAGIC_SIGNED : MAGIC_LIBRARY;
	console.log("打包完成：" + out);
	console.log("  格式：" + format + "  " + buf.length + " 字节");
	console.log("  内容：" + content.length + " 字符（" + (isJson ? "JSON" : "JS") + "）");
}

function cmdUnpack(args) {
	const input = args._[0];
	if (!input) fail("缺少输入文件");
	if (!fs.existsSync(input)) fail("找不到文件：" + input);
	const buf = fs.readFileSync(input);
	const info = detect(buf);
	if (!info) fail("无法识别的容器格式（头 9 字节：" + JSON.stringify(buf.slice(0, 9).toString("utf-8")) + "）");

	if (args.key && info.verify) {
		const publicKey = readPublicKey(args.key);
		const ok = crypto.createVerify("RSA-SHA256").update(info.verify.data).verify(publicKey, info.verify.signature);
		console.log("验签：" + (ok ? "通过" : "失败"));
		if (!ok) process.exit(2);
	}

	let content;
	try {
		content = decompress(info);
	} catch (e) {
		fail("解压失败（签名/格式可能不对）：" + e.message);
	}

	const isJson = (function() {
		try {
			JSON.parse(content);
			return true;
		} catch (e) {
			return false;
		}
	})();

	let out = args.out;
	if (!out) {
		out = path.join(path.dirname(input), path.basename(input, path.extname(input)) + (isJson ? ".json" : ".js"));
	}
	const body = isJson && !args.raw ? JSON.stringify(JSON.parse(content), null, "\t") : content;
	fs.writeFileSync(out, body + (body.endsWith("\n") ? "" : "\n"));

	const meta = guessMeta(content);
	console.log("解包完成：" + out);
	console.log("  格式：" + info.format + (info.sourceId ? "（sourceId=" + info.sourceId + "）" : ""));
	console.log("  内容：" + (isJson ? "JSON" : "JS") + "  " + content.length + " 字符");
	if (meta.name) console.log("  库信息：" + meta.name + "  uuid=" + (meta.uuid || "?") + "  version=" + (meta.version || "?"));
}

function cmdInfo(args) {
	const input = args._[0];
	if (!input) fail("缺少输入文件");
	const buf = fs.readFileSync(input);
	const info = detect(buf);
	if (!info) fail("无法识别的容器格式");
	const content = (function() {
		try {
			return decompress(info);
		} catch (e) {
			return null;
		}
	})();
	const meta = content ? guessMeta(content) : {};
	console.log("文件：" + input);
	console.log("  容器：" + info.format + "  " + buf.length + " 字节");
	if (info.sourceId) console.log("  sourceId：" + info.sourceId);
	if (info.timestamp) console.log("  时间戳：" + new Date(info.timestamp).toLocaleString());
	if (content) console.log("  内容：" + content.length + " 字符  " + (meta.type || "?"));
	if (meta.name) console.log("  库名：" + meta.name);
	if (meta.uuid) console.log("  uuid：" + meta.uuid);
	if (meta.version) console.log("  版本：" + formatVersion(meta.version));
	if (meta.author) console.log("  作者：" + meta.author);
}

const argv = process.argv.slice(2);
const command = argv[0];
const args = parseArgs(argv.slice(1));

if (!command || command === "-h" || command === "--help" || args.help) {
	usage();
} else if (command === "pack") {
	cmdPack(args);
} else if (command === "unpack") {
	cmdUnpack(args);
} else if (command === "info") {
	cmdInfo(args);
} else {
	fail("未知命令：" + command + "\n\n" + usage.call(null));
}
