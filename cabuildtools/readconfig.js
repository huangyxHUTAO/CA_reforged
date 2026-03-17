const TOML = require("@iarna/toml");
const fs = require("fs");
const path = require("path");

/**
 * 读取并合并 TOML 配置文件
 * 会自动读取同目录下的 *.local.toml 文件作为本地覆盖配置
 * @param {string} configPath - 主配置文件路径
 * @returns {Object} 合并后的配置对象
 */
function readConfig(configPath) {
    // 读取主配置
    if (!fs.existsSync(configPath)) {
        throw new Error("Config file not found: " + configPath);
    }
    
    const mainContent = fs.readFileSync(configPath, "utf-8");
    const config = TOML.parse(mainContent);
    
    // 尝试读取本地覆盖配置（文件名格式: name.local.toml）
    const dir = path.dirname(configPath);
    const baseName = path.basename(configPath, ".toml");
    const localPath = path.join(dir, baseName + ".local.toml");
    
    if (fs.existsSync(localPath)) {
        const localContent = fs.readFileSync(localPath, "utf-8");
        const localConfig = TOML.parse(localContent);
        // 深度合并本地配置到主配置
        deepMerge(config, localConfig);
    }
    
    return config;
}

/**
 * 深度合并两个对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 */
function deepMerge(target, source) {
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
                if (!target[key] || typeof target[key] !== "object") {
                    target[key] = {};
                }
                deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }
}

/**
 * 将旧格式的 shell.txt 配置转换为新格式（向后兼容）
 * 用于读取旧的 txt 格式配置文件
 * @param {string} content - 配置文件内容
 * @returns {Object} 转换后的配置对象
 */
function readLegacyConfig(content) {
    function parseNative(data) {
        try {
            return JSON.parse(data);
        } catch(e) {
            return data;
        }
    }
    
    var i, a = content.split(/\r\n|\r|\n/), result = {};
    var lastData = [], spacePos, multiline = "";
    for (i = 0; i < a.length; i++) {
        if (a[i].startsWith("@")) {
            if (multiline && a[i] == "@end " + multiline) {
                result[multiline] = parseNative(lastData.join("\n"));
                multiline = "";
                lastData = [];
            } else {
                spacePos = a[i].indexOf(" ");
                if (spacePos >= 0) {
                    result[a[i].slice(1, spacePos)] = parseNative(a[i].slice(spacePos + 1));
                } else {
                    multiline = a[i].slice(1);
                }
            }
        } else if (multiline) {
            lastData.push(a[i]);
        }
    }
    return result;
}

/**
 * 将旧配置映射到新配置结构
 * @param {Object} legacy - 旧格式配置
 * @returns {Object} 新格式配置
 */
function mapLegacyToNew(legacy) {
    return {
        shell: {
            path: legacy.shellPath
        },
        tools: {
            jarsigner: { path: legacy.jarsignerPath },
            apksigner: { path: legacy.apksignerPath },
            zipalign: { path: legacy.zipalignPath }
        },
        build: {
            dex_path: legacy.dexPath
        },
        sign: {
            keystore: legacy.keystorePath,
            key_alias: legacy.keyName,
            store_password: legacy.signStorePassword,
            key_password: legacy.signKeyPassword,
            release_pubkey: legacy.releaseSignPath,
            debug_pubkey: legacy.debugSignPath,
            hotfix_private_key: legacy.hotfixPrivateKey
        }
    };
}

module.exports = readConfig;
module.exports.readLegacyConfig = readLegacyConfig;
module.exports.mapLegacyToNew = mapLegacyToNew;
