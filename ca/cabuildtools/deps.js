#!/usr/bin/env node
/**
 * 依赖检查 / 更新。
 *
 *   node ./cabuildtools/deps.js check    [--json] [--no-error] [--cwd <dir>]
 *   node ./cabuildtools/deps.js update   [--latest] [--dry-run] [--no-test] [--verify] [--cwd <dir>]
 *
 * 对应 npm 脚本：
 *   npm run deps                 检查有没有可更新的依赖（有就返回码 1，适合 CI）
 *   npm run deps:update          升「范围内」的版本（npm update），然后跑测试
 *   npm run deps:update -- --latest    连大版本一起升（直接依赖）
 *
 * 说明：
 *   - 靠 `npm outdated --json` 判断新旧，仓库里有 workspace 也能识别
 *   - 大版本不会默认升：直接依赖按 workspace/依赖段分组，用
 *     `npm install <pkg>@latest` 更新对应的 package.json 声明
 *   - update 默认只跑 npm test；加 --verify 再跑一次 npm run build
 *     （build 需要 JDK，缺环境时会提示但不当作失败）
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
const ROOT = path.resolve(__dirname, "..");

function usage() {
	console.log([
		"用法：",
		"  node ./cabuildtools/deps.js check  [--json] [--no-error] [--cwd <dir>]",
		"  node ./cabuildtools/deps.js update [--latest] [--dry-run] [--no-test] [--verify] [--cwd <dir>]",
		"",
		"check",
		"  --json       输出 JSON（给脚本用）",
		"  --no-error   即使有可更新的依赖也返回 0",
		"",
		"update",
		"  --latest     大版本也升（只动直接依赖的声明）",
		"  --dry-run    只打印会执行什么，不真的改",
		"  --no-test    跳过 npm test",
		"  --verify     更新后再跑一次 npm run build",
		"",
		"两个子命令都支持：",
		"  --cwd <dir>  在别的目录跑（默认仓库根目录）",
		"",
		"npm 脚本：npm run deps / npm run deps:update"
	].join("\n"));
}

function fail(msg) {
	console.error("失败：" + msg);
	process.exit(1);
}

/** 全角字符按 2 列算，和 help.js 一样 */
function pad(text, width) {
	let w = 0;
	for (const ch of String(text)) {
		w += /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/.test(ch) ? 2 : 1;
	}
	return String(text) + " ".repeat(Math.max(0, width - w));
}

function readJson(file) {
	try {
		return JSON.parse(fs.readFileSync(file, "utf-8"));
	} catch (e) {
		return null;
	}
}

/** 收集直接依赖：包名 → { section, workspace } */
function declaredDeps(cwd) {
	const out = new Map();
	const root = readJson(path.join(cwd, "package.json"));
	if (!root) fail("找不到 " + path.join(cwd, "package.json"));

	function add(pkg, workspace) {
		if (!pkg) return;
		["dependencies", "devDependencies", "optionalDependencies"].forEach(function(section) {
			const deps = pkg[section];
			if (!deps) return;
			Object.keys(deps).forEach(function(name) {
				// 同一包可能被多个 workspace 声明，保留第一个
				if (!out.has(name)) out.set(name, { section : section, workspace : workspace, range : deps[name] });
			});
		});
	}

	add(root, null);
	let workspaces = root.workspaces;
	if (workspaces && !Array.isArray(workspaces)) workspaces = workspaces.packages;
	(workspaces || []).forEach(function(pattern) {
		if (/[*?]/.test(pattern)) return; // 复杂 workspace 通配不展开，够用就行
		add(readJson(path.join(cwd, pattern, "package.json")), pattern);
	});
	return out;
}

function npm(args, cwd, options) {
	const opts = Object.assign({ cwd : cwd, encoding : "utf-8" }, options || {});
	return spawnSync(NPM, args, opts);
}

function npmInherit(args, cwd) {
	const r = spawnSync(NPM, args, { cwd : cwd, stdio : "inherit" });
	if (r.error) fail(r.error.message);
	return r.status;
}

/** npm outdated --json；没有可更新的返回 {} */
function outdated(cwd) {
	const r = npm(["outdated", "--json"], cwd, { stdio : ["ignore", "pipe", "pipe"] });
	const text = (r.stdout || "").trim();
	if (!text) return {};
	try {
		return JSON.parse(text) || {};
	} catch (e) {
		// npm 有时会把警告混进 stdout，取第一段 JSON
		const start = text.indexOf("{");
		if (start >= 0) {
			try {
				return JSON.parse(text.slice(start)) || {};
			} catch (e2) { /* 忽略 */ }
		}
		return {};
	}
}

/** 包管理器层面的问题（缺失/版本不匹配），用于 check 附带检查 */
function npmProblems(cwd) {
	const r = npm(["ls", "--depth=0", "--json"], cwd, { stdio : ["ignore", "pipe", "pipe"] });
	const text = (r.stdout || "").trim();
	if (!text) return [];
	let data;
	try {
		data = JSON.parse(text);
	} catch (e) {
		return [];
	}
	return (data.problems || []).filter(Boolean);
}

function splitVersion(v) {
	// 1.2.3 / 1.2.3-beta.1 / 1.2 → [1,2,3]
	return String(v || "0").split("-")[0].split(".").map(function(n) {
		return parseInt(n, 10) || 0;
	});
}

function deltaKind(from, to) {
	const a = splitVersion(from), b = splitVersion(to);
	if (b[0] !== a[0]) return "大版本";
	if (b[1] !== a[1]) return "小版本";
	return "补丁";
}

function isOutOfRange(info) {
	// latest 超出 wanted：说明当前声明范围盖不住最新版（通常是跨大版本）
	return info && info.latest && info.wanted && info.latest !== info.wanted && !String(info.latest).startsWith(info.wanted + ".");
}

function collect(cwd) {
	const out = outdated(cwd);
	const declared = declaredDeps(cwd);
	const direct = [], transitive = [];
	Object.keys(out).sort().forEach(function(name) {
		const info = out[name];
		const row = {
			name : name,
			current : info.current || "",
			wanted : info.wanted || "",
			latest : info.latest || "",
			// npm 的 type 字段不一定有，自己判断
			kind : info.current ? deltaKind(info.current, info.latest) : "未安装",
			outOfRange : isOutOfRange(info),
			declared : declared.has(name)
		};
		(row.declared ? direct : transitive).push(row);
	});
	return { direct : direct, transitive : transitive, problems : npmProblems(cwd), declared : declared };
}

function printRows(rows) {
	if (!rows.length) return;
	const widths = [30, 12, 12, 12];
	console.log("  " + pad("包名", widths[0]) + pad("当前", widths[1]) + pad("范围允许", widths[2]) + pad("最新", widths[3]) + "类型");
	rows.forEach(function(row) {
		console.log("  " + pad(row.name, widths[0]) + pad(row.current || "-", widths[1]) + pad(row.wanted || "-", widths[2]) + pad(row.latest || "-", widths[3]) + row.kind + (row.outOfRange ? "（超出范围）" : ""));
	});
}

function check(flags) {
	const data = collect(flags.cwd);
	const total = data.direct.length + data.transitive.length;

	if (flags.json) {
		console.log(JSON.stringify({
			direct : data.direct,
			transitive : data.transitive,
			problems : data.problems
		}, null, 2));
		return total || data.problems.length ? 1 : 0;
	}

	console.log("");
	console.log("依赖检查：" + flags.cwd);
	if (!total && !data.problems.length) {
		console.log("  ✓ 所有依赖都是最新");
		console.log("");
		return 0;
	}
	if (data.direct.length) {
		console.log("");
		console.log("直接依赖（" + data.direct.filter(function(r) { return !r.outOfRange; }).length + " 个范围内 + " +
			data.direct.filter(function(r) { return r.outOfRange; }).length + " 个跨范围）");
		printRows(data.direct);
	}
	if (data.transitive.length) {
		console.log("");
		console.log("传递依赖（升级上面的包后一般会跟着变）");
		printRows(data.transitive);
	}
	if (data.problems.length) {
		console.log("");
		console.log("包管理器报告的问题：");
		data.problems.forEach(function(p) { console.log("  - " + p); });
	}
	console.log("");
	console.log("升级：npm run deps:update" + (data.direct.some(function(r) { return r.outOfRange; }) ? " -- --latest（有跨大版本）" : ""));
	console.log("");
	if (flags.noError) return 0;
	return total || data.problems.length ? 1 : 0;
}

function update(flags) {
	const before = collect(flags.cwd);
	const total = before.direct.length + before.transitive.length;
	console.log("");
	console.log("依赖更新：" + flags.cwd);
	if (!total) {
		console.log("  ✓ 没有可更新的依赖（范围内），如需大版本请加 --latest");
	} else {
		console.log("  可更新：" + total + " 个（直接 " + before.direct.length + "，传递 " + before.transitive.length + "）");
		if (before.direct.length) printRows(before.direct);
	}

	// ① 范围内升级
	console.log("");
	console.log("> npm update" + (flags.dryRun ? " --dry-run" : ""));
	const updateArgs = ["update"];
	if (flags.dryRun) updateArgs.push("--dry-run");
	if (npmInherit(updateArgs, flags.cwd) !== 0) fail("npm update 失败");

	// ② 大版本（只动直接依赖的声明）
	let latestTargets = [];
	if (flags.latest) {
		const after = outdated(flags.cwd);
		const declared = declaredDeps(flags.cwd);
		latestTargets = Object.keys(after).filter(function(name) {
			return declared.has(name) && isOutOfRange(after[name]);
		}).sort();
		if (latestTargets.length) {
			const groups = new Map();
			latestTargets.forEach(function(name) {
				const info = declared.get(name);
				const key = (info.workspace || "") + "|" + info.section;
				if (!groups.has(key)) groups.set(key, { workspace : info.workspace, section : info.section, names : [] });
				groups.get(key).names.push(name + "@latest");
			});
			groups.forEach(function(group) {
				const args = ["install"];
				if (group.workspace) args.push("-w", group.workspace);
				if (group.section === "devDependencies") args.push("--save-dev");
				if (flags.dryRun) args.push("--dry-run");
				args.push.apply(args, group.names);
				console.log("");
				console.log("> npm " + args.join(" "));
				if (npmInherit(args, flags.cwd) !== 0) fail("npm install 失败");
			});
		} else {
			console.log("");
			console.log("  （--latest：没有需要跨大版本的直接依赖）");
		}
	}

	// ③ 验证
	if (flags.dryRun) {
		console.log("");
		console.log("--dry-run：没有改动任何文件");
		return 0;
	}
	if (!flags.noTest) {
		const pkg = readJson(path.join(flags.cwd, "package.json")) || {};
		if (pkg.scripts && pkg.scripts.test) {
			console.log("");
			console.log("> npm test");
			if (npmInherit(["test", "--silent"], flags.cwd) !== 0) {
				console.error("失败：npm test 没通过，依赖可能有问题");
				return 1;
			}
		}
	}
	if (flags.verify) {
		const pkg = readJson(path.join(flags.cwd, "package.json")) || {};
		if (pkg.scripts && pkg.scripts.build) {
			console.log("");
			console.log("> npm run build");
			const status = npmInherit(["run", "build", "--silent"], flags.cwd);
			if (status !== 0) {
				console.error("失败：npm run build 没通过（JDK / Android SDK 环境也会导致失败，请检查）");
				return 1;
			}
		}
	}

	// ④ 收尾
	const after = collect(flags.cwd);
	console.log("");
	if (!after.direct.length && !after.transitive.length) {
		console.log("  ✓ 全部依赖已是最新");
	} else {
		console.log("  仍可更新：" + (after.direct.length + after.transitive.length) + " 个");
		if (after.direct.length) printRows(after.direct);
		if (after.direct.some(function(r) { return r.outOfRange; })) {
			console.log("  跨大版本的用 npm run deps:update -- --latest");
		}
	}
	console.log("");
	return 0;
}

function parseFlags(argv) {
	const flags = {
		command : "check",
		cwd : ROOT,
		json : false,
		noError : false,
		latest : false,
		dryRun : false,
		noTest : false,
		verify : false
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "check" || a === "update") flags.command = a;
		else if (a === "--json") flags.json = true;
		else if (a === "--no-error") flags.noError = true;
		else if (a === "--latest") flags.latest = true;
		else if (a === "--dry-run") flags.dryRun = true;
		else if (a === "--no-test") flags.noTest = true;
		else if (a === "--verify") flags.verify = true;
		else if (a === "-c" || a === "--cwd") {
			const dir = argv[++i];
			if (!dir) fail(a + " 需要一个目录");
			flags.cwd = path.resolve(dir);
		} else if (a === "-h" || a === "--help") {
			usage();
			process.exit(0);
		} else {
			fail("未知参数：" + a + "（--help 看用法）");
		}
	}
	if (!fs.existsSync(flags.cwd)) fail("目录不存在：" + flags.cwd);
	return flags;
}

const flags = parseFlags(process.argv.slice(2));
process.exit(flags.command === "update" ? update(flags) : check(flags));
