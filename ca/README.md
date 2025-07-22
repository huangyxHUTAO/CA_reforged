> 这是原始项目的 README 文件，为了保留项目的历史记录，我们保留了这个文件。但是，对于项目的最新信息和使用指南，请参阅顶层的 [README.md](../README.md)。
# 命令助手
## 简介
一个支持对Minecraft(基岩版)的命令进行补全与辅助输入App。本仓库为App的核心代码。

App工程参见[命令助手Android版](https://gitee.com/projectxero/cadroid)。

### 特性
* 支持命令的智能补全与纠错
* 支持命令在线帮助
* 加入了已汉化的ID表
* 一键粘贴命令
* 支持历史命令与命令收藏夹
* 支持外加命令库来加入支持更多的功能或命令补全
* 支持更换主题样式

### 信息
* 宣传片： [bilibili:av14938870](http://www.bilibili.com/video/av14938870)
* [正式版下载链接](https://www.coolapk.com/game/com.huangyx.ca)

## 生成
### 准备工作
1. 安装[命令助手构建工具](https://gitee.com/projectxero/cabuildtools)。
2. 按需要修改 `config` 文件夹内的配置文件。

### 生成正式版JS
在当前目录下运行 `cabuild buildRelease` 即可，文件会导出至 `/build/dist` 。

### 生成快照版JS
在当前目录下运行 `cabuild buildSnapshot` 即可，文件会导出至 `/build/dist` 。

### 生成正式版APP
在当前目录下运行 `cabuild shellBuildRelease` 即可，文件会导出至 `/build/dist` 。