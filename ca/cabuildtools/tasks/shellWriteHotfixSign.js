const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
module.exports = function(context, args) {
	var pkPath = path.resolve(context.shellConfig.shellPath, context.shellConfig.hotfixPrivateKey);
	var signature = crypto.createSign("RSA-SHA256");
	signature.update(args[0]);
	var signBytes = signature.sign(fs.readFileSync(pkPath, "utf-8"));
	var versionBytes = Buffer.alloc(4);
	versionBytes.writeInt32LE(context.gradleConfig.versionCode, 0);
	fs.writeFileSync("./build/outputs/hotfix/release.sign", Buffer.concat([versionBytes, signBytes]));
	return args[0];
}