const process = require("process");
const child_process = require("child_process");
module.exports = function(context, args) {
	console.log("Running " + args);
	return context.execute("execProcess", {
		command : "gradlew",
		args : [
			"--console", "plain",
			"--warning-mode", "all",
			args
		],
		cwd : context.shellConfig.shellPath,
		stdio : "inherit",
		shell : true
	});
}