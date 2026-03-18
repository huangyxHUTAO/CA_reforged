const TOML = require("@iarna/toml");
const fs = require("fs");
const path = require("path");

// 配置文件列表
const CONFIG_FILES = ["build", "shell", "sign", "publish", "update"];

/**
 * 读取 TOML 配置文件
 * 会自动读取同目录下的 *.local.toml 文件作为本地覆盖配置
 * @param {string} configDir - 配置目录路径
 * @param {string} name - 配置文件名（不含扩展名）
 * @returns {Object} 配置对象
 */
function readConfigFile(configDir, name) {
    const configPath = path.join(configDir, `${name}.toml`);
    
    // 如果 TOML 不存在，返回空对象（后续会尝试旧格式）
    if (!fs.existsSync(configPath)) {
        return null;
    }
    
    // 读取主配置
    const mainContent = fs.readFileSync(configPath, "utf-8");
    const config = TOML.parse(mainContent);
    
    // 尝试读取本地覆盖配置（文件名格式: name.local.toml）
    const localPath = path.join(configDir, `${name}.local.toml`);
    if (fs.existsSync(localPath)) {
        const localContent = fs.readFileSync(localPath, "utf-8");
        const localConfig = TOML.parse(localContent);
        // 深度合并本地配置到主配置
        deepMerge(config, localConfig);
    }
    
    return config;
}

/**
 * 读取所有配置文件并合并
 * @param {string} configDir - 配置目录路径
 * @returns {Object} 合并后的配置对象
 */
function readAllConfigs(configDir) {
    const result = {};
    let hasToml = false;
    let hasLegacy = false;
    
    for (const name of CONFIG_FILES) {
        const tomlConfig = readConfigFile(configDir, name);
        
        if (tomlConfig) {
            // 使用 TOML 配置
            hasToml = true;
            result[name] = tomlConfig[name] || {};
        } else {
            // 尝试旧格式
            const legacyPath = path.join(configDir, `${name}.txt`);
            if (fs.existsSync(legacyPath)) {
                hasLegacy = true;
                console.warn(`[WARN] 检测到旧版配置文件: ${name}.txt，请迁移到 TOML 格式 (${name}.toml)`);
                const content = fs.readFileSync(legacyPath, "utf-8");
                result[name] = readLegacyConfig(content);
            }
        }
    }
    
    // 如果混合使用了新旧格式，给出警告
    if (hasToml && hasLegacy) {
        console.warn("[WARN] 同时检测到 TOML 和旧版 txt 配置文件，建议统一迁移到 TOML 格式");
    }
    
    return result;
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
 * 读取旧格式的 txt 配置文件
 * @deprecated 请使用 TOML 格式
 * @param {string} content - 配置文件内容
 * @returns {Object} 配置对象
 */
function readLegacyConfig(content) {
    console.warn("[WARN] readLegacyConfig 已废弃，请迁移到 TOML 格式配置");
    
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
 * @deprecated 请使用 TOML 格式
 * @param {Object} legacy - 旧格式配置
 * @returns {Object} 新格式配置
 */
function mapLegacyToNew(legacy) {
    console.warn("[WARN] mapLegacyToNew 已废弃，请迁移到 TOML 格式配置");
    
    return {
        shell: {
            path: legacy.shellPath,
            dex_path: legacy.dexPath,
            android_jar_path: legacy.androidJarPath
        },
        tools: {
            jarsigner: { path: legacy.jarsignerPath },
            apksigner: { path: legacy.apksignerPath },
            zipalign: { path: legacy.zipalignPath }
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

module.exports = readAllConfigs;
module.exports.readConfigFile = readConfigFile;
module.exports.readLegacyConfig = readLegacyConfig;
module.exports.mapLegacyToNew = mapLegacyToNew;
