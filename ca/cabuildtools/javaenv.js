const process = require("process");
const path = require("path");

/**
 * 返回注入了 JDK 的环境变量。
 *
 * 为什么需要：命令行构建时系统 PATH 里不一定有 java。
 *  - gradlew 需要 JAVA_HOME（找不到 java 会直接报错）
 *  - build-tools 的 apksigner 启动脚本写死了 `exec java`，只认 PATH，不认 JAVA_HOME
 * 所以这里两个都设上。
 */
module.exports = function javaEnv(shellConfig) {
	var env = Object.assign({}, process.env);
	var javaHome = shellConfig && shellConfig.javaHome;
	if (javaHome) {
		env.JAVA_HOME = javaHome;
		env.PATH = path.join(javaHome, "bin") + path.delimiter + (env.PATH || "");
	}
	return env;
};
