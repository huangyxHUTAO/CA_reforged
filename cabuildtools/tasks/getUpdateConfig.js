const fs = require("fs");
const path = require("path");
const readAllConfigs = require("../readconfig");

module.exports = function(context, args) {
    // 读取所有配置
    const configDir = path.resolve("./config");
    const allConfig = readAllConfigs(configDir);
    
    // 获取 update 配置
    const update = allConfig.update || {};
    
    // 保持向后兼容的 updateConfig 结构
    context.updateConfig = {
        downloadSource: update.download_source || [],
        remoteRoot: update.remote_root || ""
    };
};
