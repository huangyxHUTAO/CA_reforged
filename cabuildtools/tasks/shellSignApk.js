const path = require("path");
const fs = require("fs");

/**
 * 对包含空格的路径添加引号
 * @param {string} p - 路径
 * @returns {string} 处理后的路径
 */
function quotePath(p) {
    if (p.includes(" ") && !p.startsWith('"')) {
        return `"${p}"`;
    }
    return p;
}

module.exports = function(context, args) {
    var shellConfig = context.shellConfig;
    var shellPath = shellConfig.shellPath;
    
    // 工具路径（加引号处理空格）
    var jarsignerPath = quotePath(shellConfig.jarsignerPath);
    var apksignerPath = quotePath(shellConfig.apksignerPath);
    var keystorePath = quotePath(path.resolve(shellPath, shellConfig.keystorePath));
    
    // APK 路径（加引号处理空格）
    var unsignedPath = quotePath(path.resolve(shellPath, "./app/build/outputs/apk/release/app-release-unsigned.apk"));
    var v1SignedPath = quotePath(path.resolve(shellPath, "./app/build/outputs/apk/release/app-release-v1.apk"));
    var finalPath = quotePath(path.resolve(shellPath, "./app/build/outputs/apk/release/app-release.apk"));
    
    // 签名配置
    var keyAlias = shellConfig.keyName;
    var storePassword = shellConfig.signStorePassword;
    var keyPassword = shellConfig.signKeyPassword;
    
    // 清理可能存在的旧文件
    if (fs.existsSync(v1SignedPath.replace(/"/g, ''))) {
        fs.unlinkSync(v1SignedPath.replace(/"/g, ''));
    }
    if (fs.existsSync(finalPath.replace(/"/g, ''))) {
        fs.unlinkSync(finalPath.replace(/"/g, ''));
    }
    
    // 步骤1: V1 签名 (jarsigner)
    function signV1() {
        console.log("[Sign] Starting V1 signing with jarsigner...");
        // 构建完整命令字符串（因为 shell: true）
        var cmd = `${jarsignerPath} -keystore ${keystorePath} -storepass ${storePassword} -keypass ${keyPassword} -sigalg SHA256withRSA -digestalg SHA-256 -signedjar ${v1SignedPath} ${unsignedPath} ${keyAlias}`;
        return context.execute("execProcess", {
            command: "cmd",
            args: ["/c", cmd],
            cwd: shellPath,
            stdio: "inherit",
            shell: true
        });
    }
    
    // 步骤2: V2 + V3 签名 (apksigner)
    function signV2V3() {
        console.log("[Sign] Starting V2+V3 signing with apksigner...");
        // 构建完整命令字符串（因为 shell: true）
        var cmd = `${apksignerPath} sign --ks ${keystorePath} --ks-key-alias ${keyAlias} --ks-pass pass:${storePassword} --key-pass pass:${keyPassword} --v2-signing-enabled true --v3-signing-enabled true --out ${finalPath} ${v1SignedPath}`;
        return context.execute("execProcess", {
            command: "cmd",
            args: ["/c", cmd],
            cwd: shellPath,
            stdio: "inherit",
            shell: true
        });
    }
    
    // 步骤3: 验证签名
    function verifySign() {
        console.log("[Sign] Verifying APK signature...");
        var cmd = `${apksignerPath} verify --verbose ${finalPath}`;
        return context.execute("execProcess", {
            command: "cmd",
            args: ["/c", cmd],
            cwd: shellPath,
            stdio: "inherit",
            shell: true
        });
    }
    
    // 步骤4: 清理临时文件
    function cleanup() {
        var v1PathClean = v1SignedPath.replace(/"/g, '');
        if (fs.existsSync(v1PathClean)) {
            fs.unlinkSync(v1PathClean);
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
            console.log("[Sign] Output: " + finalPath.replace(/"/g, ''));
            return finalPath.replace(/"/g, '');
        });
};

module.exports.input = "cli";
