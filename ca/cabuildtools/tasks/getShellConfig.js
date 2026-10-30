const path = require("path");
const shellconfig = require("../shellconfig");

/**
 * 解析 config/shell.json：自动探测 cadroid / Android SDK / Build Tools / JDK，
 * 结果写进 build/generated/shellConfig.json（构建产物，方便排查用了哪套路径）。
 */
module.exports = function(context, args) {
	context.shellConfig = shellconfig.shell(path.resolve("."));
	console.log("shell 配置: " + shellconfig.writeGenerated("./build/generated/shellConfig.json", context.shellConfig));
}
