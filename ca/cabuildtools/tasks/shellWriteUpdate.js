const fs = require("fs");
const crypto = require("crypto");
function digestSHA1(data) {
	var digest = crypto.createHash("sha1");
	digest.update(data);
	return digest.digest("base64");
}
module.exports = function(context, args) {
	fs.writeFileSync("./build/outputs/hotfix/hotfix.json", JSON.stringify({
		"time": context.buildConfig.publishTime,
		"version": context.buildConfig.date,
		"belongs": context.buildConfig.version,
		"info": context.buildConfig.description,
		"downloads": context.updateConfig.downloadSource,
		"hotfix": {
			"url": context.updateConfig.remoteRoot + "hotfix/release.js",
			"sign": context.updateConfig.remoteRoot + "hotfix/release.sign",
			"shell": context.gradleConfig.shellVersion,
			"sha1": digestSHA1(fs.readFileSync("./build/outputs/hotfix/release.js"))
		},
		"requirements": [
			{
				"type": "minsdk",
				"value": context.gradleConfig.minSdkVersion
			}
		]
	}));
}