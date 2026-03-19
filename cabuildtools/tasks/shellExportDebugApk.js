const fs = require("fs");
const path = require("path");
module.exports = function(context, args) {
	var outPath = path.resolve(context.shellConfig.shellPath, "./app/build/outputs/apk/debug/app-debug.apk");
	fs.copyFileSync(outPath, "./build/outputs/debugApk/app-debug.apk");
	console.log("Debug APK exported to: ./build/outputs/debugApk/app-debug.apk");
}
module.exports.input = "pipe";
