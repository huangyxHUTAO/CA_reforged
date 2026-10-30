# 命令助手_reforged

命令助手是一款用于辅助玩家输入 Minecraft（基岩版）命令的工具，基于 Rhino（Android）引擎的脚本。该项目包含三个主要部分：命令助手核心代码、命令助手 Android 应用以及命令助手构建工具。

## 项目状态

**更新说明**：虽然原项目目前暂停更新，但作者[ProjectXero](https://github.com/XeroAlpha)并**未宣布完全停止维护**。我们期待作者未来可能的更新，并鼓励社区参与，以确保项目的持续运行和改进。
**关于本项目**：为了方便整理，将原本的3个项目合为一个文件方便管理

## 原项目
### 命令助手
- **链接**: [命令助手核心代码](https://github.com/XeroAlpha/ca)
- **描述**: 提供命令的智能补全与纠错，支持命令在线帮助，已汉化的 ID 表，一键粘贴命令等功能。
- **项目对应**：对应本项目的`ca/`

### 命令助手Android
- **链接**: [命令助手Android](https://github.com/XeroAlpha/cadroid)
- **描述**: 命令助手的 Android 应用版本，增加了一键粘贴、适配器、从文件管理器加载命令库等功能。
- **项目对应**：对应本项目的`cadroid/`

### 命令助手构建工具
- **链接**: [命令助手构建工具](https://github.com/XeroAlpha/cabuildtools)
- **描述**: 支持自动化构建命令助手、命令助手Android与命令助手拓展包源。
- **项目对应**：对应本项目的`ca/cabuildtools/`

## 致谢与第三方资源

- **命令补全与 ID 翻译数据**  
  - ProjectXero
    - 主要来源 [XeroAlpha/caidlist](https://github.com/XeroAlpha/caidlist)，遵循 MIT 许可证。  
    再次感谢原作者 [ProjectXero](https://github.com/XeroAlpha) 提供的开源工具链与数据支持！
  
  - CHelper
    - 0.3.0 起集成了 [CHelper-Core](https://github.com/Yancey2023/CHelper-Core) 的命令解析内核（在 设置 → 智能补全 → 命令引擎 中启用），提供更严格的语法检查与错误定位；命令库资源（cpack）同样来自该项目。
    - 早期版本还参考过其**补全机制**与**方块状态**等复杂 ID 数据。如果你觉得 *命令助手 Reforged* 不好用，欢迎试试 CHelper 本体。

- **动画、粒子、声音 ID 及中文译名**  
  由 **南鸢晨星** 独立翻译；原始英文条目取自 [中文 Minecraft Wiki](https://zh.minecraft.wiki) ，遵循 CC BY-NC-SA 3.0。

- **悬浮窗与系统设置权限兼容**  
  集成 [czy1121/settingscompat](https://github.com/czy1121/settingscompat)（Apache-2.0 许可证）。
  
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
# 构建工具在 ca/ 子树里（CA 仓库的 cabuildtools）
npm install -g ./ca/cabuildtools
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

#### 3.1 配置构建环境（首次使用）

`ca/config/` 里的通用配置已随仓库提供；涉及**密码**和**服务器信息**的不入库，仓库里给了模板：

```bash
cd ca/config
cp sign.toml.example sign.toml
cp sign.local.toml.example sign.local.toml
```

| 文件 | 用途 | 是否入库 |
| --- | --- | --- |
| `build.toml` | 版本号、发布日期、更新说明 | 是 |
| `shell.toml` | Android SDK 与签名工具路径（按本机修改） | 是 |
| `update.toml` | 更新源地址 | 是 |
| `sign.toml` | 密钥库、公钥、热更新私钥的路径 | 否，从 `.example` 复制 |
| `sign.local.toml` | 密钥库密码、密钥密码 | 否，从 `.example` 复制 |
| `publish.toml` | 发布方式与 SSH 配置（仅发布时需要） | 否，从 `.example` 复制 |

Release 构建还需要 `cadroid/app/signatures/` 下的密钥库和公钥文件，同样不入库。

---

### 4️⃣ 编译 Debug 安装包 (APK)

> Debug 版本包含调试信息，不进行代码混淆，适合开发和测试

```bash
cabuild shellBuildDebug
```

执行完成后，产物位于：

```
ca/build/outputs/debugApk/
└── app-debug.apk
```

---

### 4.1 仅生成 JS 资源 (不打包 APK)

如果你只想编译 JS 资源（用于 Android Studio 调试或热更新）：

```bash
cabuild shellPrepareDebug
```

JS 文件将输出到 `cadroid/app/src/main/assets/script.js`

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
| cabuild 命令未找到 | 确认 `npm install -g ./ca/cabuildtools` 是否成功，再检查系统 `PATH` |
| Node 版本报错 | 使用 `nvm`（推荐）或手动降级到 Node 16 |
| 构建产物为空 | 删除 `ca/build` 目录后重试 |

