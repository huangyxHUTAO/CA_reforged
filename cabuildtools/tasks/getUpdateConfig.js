const fs = require("fs");
const path = require("path");
const readConfig = require("../readconfig");

module.exports = function(context, args) {
    // 优先尝试读取 TOML 格式配置
    const tomlPath = path.resolve("./config/config.toml");
    
    if (fs.existsSync(tomlPath)) {
        const config = readConfig(tomlPath);
        // TOML 格式中 update 节包含更新配置
        context.updateConfig = config.update || {};
    } else {
        // 回退到旧格式
        const readLegacyConfig = require("../readconfig").readLegacyConfig;
        const content = fs.readFileSync("./config/update.txt", "utf-8");
        context.updateConfig = readLegacyConfig(content);
    }
};
