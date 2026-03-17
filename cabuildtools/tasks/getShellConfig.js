const fs = require("fs");
const path = require("path");
const readConfig = require("../readconfig");

module.exports = function(context, args) {
    // 优先尝试读取 TOML 格式配置
    const tomlPath = path.resolve("./config/config.toml");
    
    if (fs.existsSync(tomlPath)) {
        // 使用 TOML 配置
        const config = readConfig(tomlPath);
        
        // 将新格式转换为旧格式以保持兼容性
        context.shellConfig = {
            shellPath: config.shell?.path,
            jarsignerPath: config.tools?.jarsigner?.path,
            apksignerPath: config.tools?.apksigner?.path,
            zipalignPath: config.tools?.zipalign?.path,
            dexPath: config.build?.dex_path,
            keystorePath: config.sign?.keystore,
            keyName: config.sign?.key_alias,
            signStorePassword: config.sign?.store_password,
            signKeyPassword: config.sign?.key_password,
            releaseSignPath: config.sign?.release_pubkey,
            debugSignPath: config.sign?.debug_pubkey,
            hotfixPrivateKey: config.sign?.hotfix_private_key
        };
    } else {
        // 回退到旧格式（向后兼容）
        const readLegacyConfig = require("../readconfig").readLegacyConfig;
        const mapLegacyToNew = require("../readconfig").mapLegacyToNew;
        
        const content = fs.readFileSync("./config/shell.txt", "utf-8");
        const legacyConfig = readLegacyConfig(content);
        const config = mapLegacyToNew(legacyConfig);
        
        context.shellConfig = {
            shellPath: config.shell?.path,
            jarsignerPath: config.tools?.jarsigner?.path,
            apksignerPath: config.tools?.apksigner?.path,
            zipalignPath: config.tools?.zipalign?.path,
            dexPath: config.build?.dex_path,
            keystorePath: config.sign?.keystore,
            keyName: config.sign?.key_alias,
            signStorePassword: config.sign?.store_password,
            signKeyPassword: config.sign?.key_password,
            releaseSignPath: config.sign?.release_pubkey,
            debugSignPath: config.sign?.debug_pubkey,
            hotfixPrivateKey: config.sign?.hotfix_private_key
        };
    }
};
