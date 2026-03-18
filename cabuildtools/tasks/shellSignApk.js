const path = require("path");
const fs = require("fs");
const os = require("os");

/**
 * 检查是否需要使用 shell 执行
 * Windows 下 .bat/.cmd 文件需要 shell 解释执行
 * @param {string} cmd - 命令路径
 * @returns {boolean}
 */
function needShell(cmd) {
    if (os.platform() !== 'win32') return false;
    const ext = path.extname(cmd).toLowerCase();
    return ext === '.bat' || ext === '.cmd';
}

/**
 * 构建命令参数
 * 如果需要 shell，返回合并后的命令字符串
 * @param {string} cmd - 命令
 * @param {string[]} args - 参数数组
 * @returns {Object} { command, args, shell }
 */
function buildCommand(cmd, args) {
    if (needShell(cmd)) {
        // Windows .bat/.cmd 需要 shell 执行
        const quotedArgs = args.map(arg => {
            // 对包含空格的参数加引号
            if (arg.includes(' ') && !arg.startsWith('"')) {
                return `"${arg}"`;
            }
            return arg;
        });
        return {
            command: "cmd",
            args: ["/c", `"${cmd}" ${quotedArgs.join(" ")}`],
            shell: true
        };
    }
    return { command: cmd, args: args, shell: false };
}

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
    // jarsigner 是原生可执行文件，不需要 shell
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
            shell: false
        });
    }
    
    // 步骤2: V2 + V3 签名 (apksigner)
    // apksigner 在 Windows 下是 .bat 文件，需要 shell
    function signV2V3() {
        console.log("[Sign] Starting V2+V3 signing with apksigner...");
        var cmd = buildCommand(apksignerPath, [
            "sign",
            "--ks", keystorePath,
            "--ks-key-alias", keyAlias,
            "--ks-pass", "pass:" + storePassword,
            "--key-pass", "pass:" + keyPassword,
            "--v2-signing-enabled", "true",
            "--v3-signing-enabled", "true",
            "--out", finalPath,
            v1SignedPath
        ]);
        return context.execute("execProcess", {
            command: cmd.command,
            args: cmd.args,
            cwd: shellPath,
            stdio: "inherit",
            shell: cmd.shell
        });
    }
    
    // 步骤3: 验证签名
    function verifySign() {
        console.log("[Sign] Verifying APK signature...");
        var cmd = buildCommand(apksignerPath, [
            "verify",
            "--verbose",
            finalPath
        ]);
        return context.execute("execProcess", {
            command: cmd.command,
            args: cmd.args,
            cwd: shellPath,
            stdio: "inherit",
            shell: cmd.shell
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
