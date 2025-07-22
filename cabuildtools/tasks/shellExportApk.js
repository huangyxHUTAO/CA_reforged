const fs = require("fs");
const path = require("path");
module.exports = function(context, args) {
	var outPath = path.resolve(context.shellConfig.shellPath, "./app/build/outputs/apk/release/app-release.apk");
	fs.copyFileSync(outPath, "./build/outputs/releaseApk/app-release.apk");
	fs.copyFileSync("./build/outputs/releaseApk/app-release.apk", "./build/dist/命令助手(" + context.buildConfig.version + ").apk");
}