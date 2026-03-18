const fs = require("fs");
const path = require("path");
const readAllConfigs = require("../readconfig");

module.exports = function(context, args) {
    // 读取所有配置
    const configDir = path.resolve("./config");
    const allConfig = readAllConfigs(configDir);
    
    // 获取 shell 和 sign 配置
    const shell = allConfig.shell || {};
    const sign = allConfig.sign || {};
    
    // 保持向后兼容的 shellConfig 结构
    context.shellConfig = {
        shellPath: shell.path,
        jarsignerPath: shell.tools?.jarsigner?.path,
        apksignerPath: shell.tools?.apksigner?.path,
        zipalignPath: shell.tools?.zipalign?.path,
        dexPath: shell.dex_path,
        androidJarPath: shell.android_jar_path,
        keystorePath: sign.keystore,
        keyName: sign.key_alias,
        signStorePassword: sign.store_password,
        signKeyPassword: sign.key_password,
        releaseSignPath: sign.release_pubkey,
        debugSignPath: sign.debug_pubkey,
        hotfixPrivateKey: sign.hotfix_private_key
    };
};
