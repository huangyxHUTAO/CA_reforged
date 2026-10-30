const fs = require("fs");
const path = require("path");

/**
 * 打印构建工具的用法。
 *
 *   node ./cabuildtools/main.js help
 *   npm run help
 *
 * 不带任务运行时 main.js 也默认走这里，所以新加的 CLI 任务只要在下面的
 * 描述表里补一行就会出现在帮助里；没写描述的会归到「其他 CLI 任务」。
 */

const TASK_DESC = {
	buildRelease : "构建正式版脚本 + 安装器 .lib（渠道参数可换渠道）",
	buildSnapshot : "构建快照版脚本 + 安装器 .lib",
	shellBuildRelease : "打包正式版 APK（含签名、对齐）",
	shellBuildDebug : "打包调试版 APK（debuggable，走 R8）",
	shellBuildReleaseHotfix : "生成热更新包（core.js + 签名）",
	buildCLib : "构建内置命令库（caclib）",
	publishRelease : "发布正式版到配置的发布端",
	publishSnapshot : "发布快照版",
	publishHotfix : "发布热更新包",
	publishCLib : "发布内置命令库",
	generateImport : "生成 import 用的 android.jar 索引",
	clean : "清理 build 目录",
	delay : "延时若干毫秒（调试流水线用）",
	shellPrepareDebug : "准备调试版壳子资源",
	shellPrepareHotfix : "准备热更新壳子资源"
};

const CHANNEL_DESC = [
	["-beta", "测试渠道（可选）"],
	["-dev", "开发渠道（可选）"],
	["-canary", "前沿渠道（可选）"]
];

const OUTPUT_DESC = [
	["build/outputs/", "脚本中间产物（release / snapshot / snapshotLib 等）"],
	["build/dist/", "成品：APK、安装器 .lib、update.json"],
	["build/generated/", "生成的配置（shellConfig.json / importConfig.json）"]
];

function listCliTasks() {
	const dir = __dirname;
	const names = fs.readdirSync(dir)
		.filter(function(f) { return f.endsWith(".js") && f !== "index.js" && f !== "help.js"; })
		.map(function(f) { return path.basename(f, ".js"); })
		.sort();
	return names.filter(function(name) {
		try {
			const task = require(path.join(dir, name + ".js"));
			return task && task.input === "cli";
		} catch (e) {
			return false;
		}
	});
}

function readScripts() {
	try {
		const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf-8"));
		return pkg.scripts || {};
	} catch (e) {
		return {};
	}
}

/** 按终端显示宽度补齐：中文/全角算 2 列，否则列会错开 */
function pad(text, width) {
	var w = 0, i, c;
	for (i = 0; i < text.length; i++) {
		c = text.charCodeAt(i);
		w += (c > 0x2e80 && c < 0xfe10) || (c >= 0xff00 && c <= 0xff60) ? 2 : 1;
	}
	while (w < width) {
		text += " ";
		w++;
	}
	return text;
}

module.exports = function() {
	const cliTasks = listCliTasks();
	const described = cliTasks.filter(function(name) { return TASK_DESC[name]; });
	const others = cliTasks.filter(function(name) { return !TASK_DESC[name]; });
	const scripts = readScripts();
	const lines = [];

	lines.push("");
	lines.push("命令助手构建工具");
	lines.push("");
	lines.push("用法");
	lines.push("  node ./cabuildtools/main.js <任务> [参数...]");
	lines.push("  npm run <脚本>");
	lines.push("  不带任务时打印本帮助");
	lines.push("");
	lines.push("常用任务");
	described.forEach(function(name) {
		lines.push("  " + pad(name, 26) + TASK_DESC[name]);
	});
	if (others.length) {
		lines.push("");
		lines.push("其他 CLI 任务");
		others.forEach(function(name) { lines.push("  " + name); });
	}
	lines.push("");
	lines.push("渠道参数（可选，加在任务后面）");
	lines.push("  不写渠道参数就是默认渠道 standard；写了就按该渠道出包");
	lines.push("");
	CHANNEL_DESC.forEach(function(row) {
		lines.push("  " + pad(row[0], 12) + row[1]);
	});
	lines.push("  例：node ./cabuildtools/main.js buildRelease -beta");
	lines.push("      npm run build -- -beta");
	lines.push("");
	lines.push("npm 脚本");
	Object.keys(scripts).forEach(function(name) {
		if (name === "postinstall") return;
		lines.push("  " + pad("npm run " + name, 26) + scripts[name]);
	});
	lines.push("");
	lines.push("产物");
	OUTPUT_DESC.forEach(function(row) {
		lines.push("  " + pad(row[0], 20) + row[1]);
	});
	lines.push("");
	lines.push("安装器 .lib 的格式：LIBRARY（锁定包，安装器用）/ SIGNLIB01（分发）/ LIBSIGN01（本地已验签）");
	lines.push("");

	console.log(lines.join("\n"));
	return lines;
};

module.exports.input = "cli";
