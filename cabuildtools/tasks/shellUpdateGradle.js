const fs = require("fs");
const path = require("path");
module.exports = function(context, args) {
	var gradle = path.resolve(context.shellConfig.shellPath, "./app/build.gradle"),
		gradleConfig = context.gradleConfig = {};
	var s = fs.readFileSync(gradle, "utf-8");
	gradleConfig.versionCode = Math.floor(Date.parse(context.buildConfig.date) / 86400000);
	gradleConfig.versionName = context.buildConfig.version;
	gradleConfig.minSdkVersion = parseInt((s.match(/minSdkVersion (\d+)/) || [undefined, 1])[1]);
	gradleConfig.shellVersion = parseInt((s.match(/buildConfigField "int", "SHELL_VERSION", "(\d+)"/) || [undefined, 0])[1]);
	s = s.replace(/versionCode \d+/, "versionCode " + gradleConfig.versionCode);
	s = s.replace(/versionName ".*"/, "versionName " + JSON.stringify(gradleConfig.versionName));
	fs.writeFileSync(gradle, s);
}