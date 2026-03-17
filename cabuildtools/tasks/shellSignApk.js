const path = require("path");
const fs = require("fs");

module.exports = function(context, args) {
    var shellConfig = context.shellConfig;
    var shellPath = shellConfig.shellPath;
    
    // 工具路径
    var jarsignerPath = shellConfig.jarsignerPath;
    var apksignerPath = shellConfig.apksignerPath;
    var keystorePath = path.resolve(shellPath, shellConfig.keystorePath);
    
    // APK 路径
    var unsignedPath = path.resolve(shellPath, "./app/build/outputs/apk/release/app-release-unsigned.apk");
    var v1SignedPath = path.resolve(shellPath, "./app/build/outputs/apk/release/app-release-v1.apk");
    var finalPath = path.resolve(shellPath, "./app/build/outputs/apk/release/app-release.apk");
    
    // 签名配置
    var keyAlias = shellConfig.keyName;
    var storePassword = shellConfig.signStorePassword;
    var keyPassword = shellConfig.signKeyPassword;
    
    // 清理可能存在的旧文件
    if (fs.existsSync(v1SignedPath)) {
        fs.unlinkSync(v1SignedPath);
    }
    if (fs.existsSync(finalPath)) {
        fs.unlinkSync(finalPath);
    }
    
    // 步骤1: V1 签名 (jarsigner)
    function signV1() {
        console.log("[Sign] Starting V1 signing with jarsigner...");
        return context.execute("execProcess", {
            command: jarsignerPath,
            args: [
                "-keystore", keystorePath,
                "-storepass", storePassword,
                "-keypass", keyPassword,
                "-sigalg", "SHA256withRSA",
                "-digestalg", "SHA-256",
                "-signedjar", v1SignedPath,
                unsignedPath,
                keyAlias
            ],
            cwd: shellPath,
            stdio: "inherit",
            shell: true
        });
    }
    
    // 步骤2: V2 + V3 签名 (apksigner)
    function signV2V3() {
        console.log("[Sign] Starting V2+V3 signing with apksigner...");
        return context.execute("execProcess", {
            command: apksignerPath,
            args: [
                "sign",
                "--ks", keystorePath,
                "--ks-key-alias", keyAlias,
                "--ks-pass", "pass:" + storePassword,
                "--key-pass", "pass:" + keyPassword,
                "--v2-signing-enabled", "true",
                "--v3-signing-enabled", "true",
                "--out", finalPath,
                v1SignedPath
            ],
            cwd: shellPath,
            stdio: "inherit",
            shell: true
        });
    }
    
    // 步骤3: 验证签名
    function verifySign() {
        console.log("[Sign] Verifying APK signature...");
        return context.execute("execProcess", {
            command: apksignerPath,
            args: [
                "verify",
                "--verbose",
                finalPath
            ],
            cwd: shellPath,
            stdio: "inherit",
            shell: true
        });
    }
    
    // 步骤4: 清理临时文件
    function cleanup() {
        if (fs.existsSync(v1SignedPath)) {
            fs.unlinkSync(v1SignedPath);
        }
        return Promise.resolve();
    }
    
    // 执行完整签名流程
    return signV1()
        .then(signV2V3)
        .then(verifySign)
        .then(cleanup)
        .then(() => {
            console.log("[Sign] APK signing completed successfully!");
            console.log("[Sign] Output: " + finalPath);
            return finalPath;
        });
};

module.exports.input = "cli";
