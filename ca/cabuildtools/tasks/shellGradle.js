const process = require("process");
const child_process = require("child_process");
const javaenv = require("../javaenv");
module.exports = function(context, args) {
	console.log("Running " + args);
	// Windows 的 cmd 会先在当前目录查找 gradlew，Linux 下必须显式写 ./
	var gradlew = process.platform == "win32" ? "gradlew" : "./gradlew";
	return context.execute("execProcess", {
		command : gradlew,
		args : [
			"--console", "plain",
			"--warning-mode", "all",
			args
		],
		cwd : context.shellConfig.shellPath,
		env : javaenv(context.shellConfig),
		stdio : "inherit",
		shell : true
	});
}