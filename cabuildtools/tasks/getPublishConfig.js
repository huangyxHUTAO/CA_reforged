const fs = require("fs");
const path = require("path");
const readAllConfigs = require("../readconfig");

module.exports = function(context, args) {
    // 读取所有配置
    const configDir = path.resolve("./config");
    const allConfig = readAllConfigs(configDir);
    
    // 获取 publish 配置
    context.publishConfig = allConfig.publish || {};
};
