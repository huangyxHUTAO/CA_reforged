> 这是原始项目的 README 文件，为了保留项目的历史记录，我们保留了这个文件。但是，对于项目的最新信息和使用指南，请参阅顶层的 [README.md](../README.md)。

# 命令助手Android
## 简介
命令助手Android是[命令助手](https://gitee.com/projectxero/ca)的App版本，增加了命令助手的功能，如一键粘贴、适配器、从文件管理器加载命令库等。

### 增加特性
* 支持无障碍服务，提供粘贴与监听非打印按键接口
* 支持特殊Intent调用
* 支持适配器
* 支持开机自启

## 编译步骤
1. 将编译完成的，没有压缩的命令助手代码写入[assets](https://gitee.com/projectxero/cadroid/tree/master/src/main/assets)/script.js。
2. 对script.js进行GZIP编码。
3. 使用签名对script.js进行加密，加密方法为逐位异或法，签名为PackageManager返回的Signature字节数组。
4. 编译Apk。

