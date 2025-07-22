# 命令助手_reforged

命令助手是一款用于辅助玩家输入 Minecraft（基岩版）命令的工具，基于 Rhino（Android）引擎的脚本。该项目包含三个主要部分：命令助手核心代码、命令助手 Android 应用以及命令助手构建工具。

## 项目状态

**更新说明**：虽然原项目目前暂停更新，但作者[ProjectXero](https://gitee.com/projectxero)并**未宣布停止维护**。我们期待作者未来可能的更新，并鼓励社区参与，以确保项目的持续运行和改进。
**关于本项目**：为了方便整理，将原本的3个项目合为一个文件方便管理

## 原项目
### 命令助手
- **链接**: [命令助手核心代码](https://gitee.com/projectxero/ca)
- **描述**: 提供命令的智能补全与纠错，支持命令在线帮助，已汉化的 ID 表，一键粘贴命令等功能。
- **项目对应**：对应本项目的`ca/`

### 命令助手Android
- **链接**: [命令助手Android](https://gitee.com/projectxero/cadroid)
- **描述**: 命令助手的 Android 应用版本，增加了一键粘贴、适配器、从文件管理器加载命令库等功能。
- **项目对应**：对应本项目的`cadroid/`

### 命令助手构建工具
- **链接**: [命令助手构建工具](https://gitee.com/projectxero/cabuildtools)
- **描述**: 支持自动化构建命令助手、命令助手Android与命令助手拓展包源。
- **项目对应**：对应本项目的`cabuildtools/`

## 安装与使用

> 适用于 **Windows / macOS / Linux**，以下步骤均已在 **JDK 11** 与 **Node.js 16** 环境的**Windows 10/11**验证通过。
---
### 1️⃣ 环境准备

| 依赖      | 推荐版本 | 下载地址 |
|-----------|----------|----------|
| JDK       | 11.x     | [Oracle](https://www.oracle.com/java/technologies/javase/jdk11-archive-downloads.html) / [OpenJDK](https://adoptopenjdk.net/) |
| Node.js   | 16.x LTS | [Nodejs 官网](https://nodejs.org/dist/latest-v16.x/) |

> ⚠️ 请务必使用 **Node 16.x**。更高或更低版本可能导致依赖安装失败。

---

### 2️⃣ 安装 CA 构建工具链

#### 2.1 全局安装 cabuildtools

```bash
# 在项目根目录执行
npm install -g ./cabuildtools
```

安装完成后，终端中即可使用 `cabuild` 命令：

```bash
cabuild 
# 期望输出：CA Build Tools 1.1.2
```

---

### 3️⃣ 初始化项目

将当前目录切换至项目根目录（根目录下的 `ca` 文件夹）：

```bash
cd ./ca
```

---

### 4️⃣ 生成 Debug 版本的 JS 资源


```bash
cabuild shellPrepareDebug
```

执行完成后，可在以下目录查看产物：

```
ca/build/debug/
├── 命令助手(xxxxx).lib
└── ...其他资源
```

---

### 5️⃣ 编译正式安装包

> 使用 `shellBuildRelease` 进行正式打包

```bash
cabuild shellBuildRelease
```

> 该步骤会基于前面的产物进一步压缩、混淆，并打包成可发布的安装包。

最终产物位于：

```
ca/build/dist/
├── 命令助手(0.0.1).apk
```

你可能需要手动签名
---

### 6️⃣ 常见 FAQ

| 问题 | 解决思路 |
|------|----------|
| cabuild 命令未找到 | 确认 `npm install -g ./cabuildtools` 是否成功，再检查系统 `PATH` |
| Node 版本报错 | 使用 `nvm`（推荐）或手动降级到 Node 16 |
| 构建产物为空 | 删除 `ca/build` 目录后重试 |

