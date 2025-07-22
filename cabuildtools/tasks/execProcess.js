const process = require("process");
const child_process = require("child_process");
module.exports = function(context, args) {
	return new Promise(function(resolve, reject) {
		var child = child_process.spawn(args.command, args.args, args);
		if (args.input) {
			child.stdin.end(args.input);
		}
		child.on("exit", function(code, signal) {
			if (code != 0) {
				reject(new Error("Process returns " + code));
			} else {
				resolve();
			}
		});
		child.on("error", function(err) {
			reject(err);
		});
	});
}