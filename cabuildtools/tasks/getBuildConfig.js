const fs = require("fs");
const path = require("path");
const readConfig = require("../readconfig");

module.exports = function(context, args) {
    // 优先尝试读取 TOML 格式配置
    const tomlPath = path.resolve("./config/config.toml");
    
    if (fs.existsSync(tomlPath)) {
        const config = readConfig(tomlPath);
        // TOML 格式中 build 节包含版本信息
        context.buildConfig = config.build || {};
    } else {
        // 回退到旧格式
        const readLegacyConfig = require("../readconfig").readLegacyConfig;
        const content = fs.readFileSync("./config/build.txt", "utf-8");
        context.buildConfig = readLegacyConfig(content);
    }
    
    context.buildConfig.variants = args;
    context.buildConfig.publishTime = Date.now();
};
