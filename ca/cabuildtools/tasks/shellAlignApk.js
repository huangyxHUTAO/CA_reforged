const path = require("path");
module.exports = function(context, args) {
	var zipalignPath = path.resolve(context.shellConfig.shellPath, context.shellConfig.buildToolPath, "zipalign");
	var unalignedPath = path.resolve(context.shellConfig.shellPath, "./app/build/outputs/apk/release/app-release-unsigned.apk");
	var outPath = path.resolve(context.shellConfig.shellPath, "./app/build/outputs/apk/release/app-release.apk");
	return context.execute("execProcess", {
		command : zipalignPath,
		args : [
			"-f", "4",
			unalignedPath,
			outPath
		],
		cwd : context.shellConfig.shellPath,
		stdio : "inherit",
		shell : true
	});
}