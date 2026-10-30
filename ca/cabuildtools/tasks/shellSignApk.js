const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const javaenv = require("../javaenv");
module.exports = function(context, args) {
	var jarsignerPath = path.resolve(context.shellConfig.shellPath, context.shellConfig.buildToolPath, "apksigner");
	var keystonePath = path.resolve(context.shellConfig.shellPath, context.shellConfig.keystorePath);
	var unsignedPath = path.resolve(context.shellConfig.shellPath, "./app/build/outputs/apk/release/app-release.apk");
	var keyPassPath = path.resolve(context.shellConfig.shellPath, context.shellConfig.keyPasswordPath);
	// 密钥轮换：shell.txt 里配了 lineageSigners（从旧到新）且 lineage 文件存在时改用 --lineage
	var signers = context.shellConfig.lineageSigners || [];
	var lineagePath = context.shellConfig.lineagePath ? path.resolve(context.shellConfig.shellPath, context.shellConfig.lineagePath) : null;
	var hasLineage = signers.length > 0 && lineagePath != null && fs.existsSync(lineagePath);
	var signArgs = ["sign"], i, signer;
	if (hasLineage) {
		for (i = 0; i < signers.length; i++) {
			signer = signers[i];
			if (i > 0) signArgs.push("--next-signer");
			signArgs.push("--ks", path.resolve(context.shellConfig.shellPath, signer.keystorePath));
			if (signer.alias) signArgs.push("--ks-key-alias", signer.alias);
			if (signer.passwordPath) signArgs.push("--ks-pass", "file:" + path.resolve(context.shellConfig.shellPath, signer.passwordPath));
		}
		signArgs.push("--lineage", lineagePath);
	} else {
		if (signers.length) console.log("lineageSigners 已配置但 lineage 文件不存在，回退为单密钥签名: " + lineagePath);
		signArgs.push("--ks", keystonePath);
	}
	// 保证存在 v1(JAR) 签名：API 21~27 只能从 v1 读到证书，脚本异或密钥靠它
	signArgs.push("--v1-signing-enabled", "true", unsignedPath);
	return context.execute("execProcess", {
		command : jarsignerPath,
		args : signArgs,
		cwd : context.shellConfig.shellPath,
		env : javaenv(context.shellConfig),
		stdio : hasLineage ? "inherit" : ["pipe", "inherit", "inherit"],
		input : hasLineage ? undefined : fs.readFileSync(keyPassPath),
		shell : true
	});
}