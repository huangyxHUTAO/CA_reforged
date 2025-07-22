const path = require("path");
const child_process = require("child_process");
module.exports = function(context, args) {
    return
	//请手动签名，签名验证忽略了
	var jarsignerPath = context.shellConfig.jarsignerPath;
    var keystorePath = path.resolve(context.shellConfig.shellPath, context.shellConfig.keystorePath);
    var unsignedPath = path.resolve(context.shellConfig.shellPath, "./app/build/outputs/apk/release/app-release.apk");
    // 不再处理密码文件
    return context.execute("execProcess", {
        command: jarsignerPath,
        args: [
            "-keystore", keystorePath,
            unsignedPath,
            context.shellConfig.keyName
        ],
        cwd: context.shellConfig.shellPath,
        stdio: "inherit",
        shell: true
    });
}