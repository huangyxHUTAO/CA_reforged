# 命令助手

## 简介

一个支持对 Minecraft（基岩版）的命令进行补全与辅助输入的 App。本仓库为 App 的核心代码，逻辑用 JavaScript 编写，通过 Rhino 引擎在 Android 上执行。

App 工程参见 [命令助手Android版](https://gitee.com/projectxero/cadroid)。

### 特性

* 支持命令的智能补全与纠错
* 支持命令在线帮助
* 加入了已汉化的 ID 表
* 一键粘贴命令
* 支持历史命令与命令收藏夹
* 支持外加命令库来加入支持更多的功能或命令补全
* 内置一组默认命令库，无需手动导入
* 支持通过远程清单更新命令库
* 支持更换主题样式

### 信息

* 宣传片：[BV1nx411V7jB](https://www.bilibili.com/video/BV1nx411V7jB)
* [正式版下载链接](https://www.coolapk.com/game/com.xero.ca)

## 目录结构

- `modules/` — CA 的核心 JS 模块（`main.js` 里用 `Loader.fromFile` 按顺序拼装）
- `data/` — 从代码里剥出来的纯数据：内置命令库（`idlibs/`）、主题、提示语等
  （每个数据文件都有对应说明，见 `docs/data-notes/`）
- `intl/` — 界面文案（`zh_CN` / `en_US`）
- `cabuildtools/` — 构建工具（git subtree），AST 加载器、签名打包、壳子任务都在这里
- `config/` — 构建配置（版本号、渠道、发布方式等，见下一节）
- `caclib/` — 作者的 clib 源码（git subtree，**保持原样不要手改**）：在线拓展包源的工程，
  由 `clibspawn` 打包发布，**不参与 App 构建**
- `caaccel/` — Java 加速库源码（配合 `modules/Accel.js`）
- `docs/` — 开发文档：分支约定、构建配置、数据外置方案、`data/` 各文件说明、
  选择器补全的返回值结构等
- `community-clib/` — 社区拓展包源：`src/` 放原始包，`build.js` 解包重签后生成
  `info.json` / 索引 / `packs/*.lib` / `verify.key`，GitHub 上直接对外提供（见该目录 README）
- `build/` — 构建产物（不入版本库）

## 生成

### 准备工作

1. 安装依赖：`npm install`
   需要 Node `^22.18.0` 或 `>=24.11.0`。构建工具用了 Babel 8（纯 ESM），
   靠 Node 22+ 的 `require(esm)` 直接在 CommonJS 里加载；Node 太老会报模块找不到。
2. 配置（一般不用改）。`config/shell.json` 与 `config/import.json` 里只写和机器无关的默认值，
   构建时会自动探测本机路径：

   | 要找到的东西 | 探测顺序 |
   | --- | --- |
   | cadroid 项目 | 环境变量 `CA_CADROID` → CA 旁边的 `cadroid/` 或 `ca/` |
   | Android SDK | `ANDROID_HOME` / `ANDROID_SDK_ROOT` → cadroid 的 `local.properties`（`sdk.dir`）→ 常见安装位置 |
   | Build Tools | 优先 `config/shell.json` 的 `buildToolVersion`（默认 34.0.0），否则取已安装的最高版本 |
   | JDK | `JAVA_HOME` → `~/.jdks`（优先 17）→ Android Studio 自带的 JBR → `/usr/lib/jvm` |
   | android.jar | SDK 里最新的 platform |

   解析结果会写到 `build/generated/shellConfig.json`（`generateImport` 则写 `importConfig.json`），
   排查问题时直接看这份就知道用了哪个 SDK / JDK / cadroid。要固定某个路径，改
   `config/shell.json` 里对应字段即可（填了就不再探测）。

   配置一览（都在 `config/` 下，**全部是 JSON**；字段说明见 [docs/config.md](docs/config.md)）：

   | 文件 | 内容 |
   | --- | --- |
   | `build.json` | 版本号、versionCode、日期、许可更新日期、更新说明（会写进核心的 BuildConfig 与 update.json） |
   | `update-sources.json` | 客户端检查更新用的源地址（可按渠道配置、可清空关闭），以及发布端的下载地址表、更新站点根目录 |
   | `publish.json` | 发布方式（`local` 复制到目录 / `sftp` 上传）、目标路径与 SSH 参数 |
   | `shell.json` | 壳子打包相关路径（一般不用改，自动探测） |
   | `import.json` | `generateImport` 用的 android.jar（自动探测） |

   `caclib/` 里还有 clib 自己的元数据：`config.txt`（发布源设置）、`config/publish.txt`
   （发布方式）、`src/*/library.txt`（每个命令库的 id/名称/版本/entry）。
   `caclib/` 是作者的 git subtree，**保持原样**；`clibspawn.js` 已适配 `.txt` 格式（同时也兼容 `.js`）。

   > 注意：`caclib/signature/`（clib 签名私钥）和 `caclib/outputs/` 不入库，所以 `clibspawn`
   > 在全新检出的仓库里跑不起来，需要自己准备私钥后才会生成产物。

### 构建代码

    npm run help               # 列出所有任务、渠道参数与产物位置

    npm run build              # 正式版
    npm run buildSnapshot      # 快照版

    # 渠道参数要放在 -- 后面（npm 会把 -- 之后的参数传给脚本）
    npm run build -- -beta      # 测试渠道
    npm run build -- -dev       # 开发渠道
    npm run build -- -canary    # 前沿渠道

    # 等价于直接调用构建脚本
    node ./cabuildtools/main.js buildRelease
    node ./cabuildtools/main.js buildSnapshot

产物导出至 `build/outputs/release/main.js` 与 `build/outputs/snapshot/main.js`。

### 生成渠道版 JS（standard / beta / dev / canary）

构建命令可以附加渠道参数，产物名会带上渠道名，一眼能看出是什么构建物：

    node ./cabuildtools/main.js buildRelease            # 命令助手(2026-10-15) standard.js + 命令助手standard<日期>.lib
    node ./cabuildtools/main.js buildRelease -beta      # 命令助手(2026-10-15) beta.js + 命令助手beta<日期>.lib
    node ./cabuildtools/main.js buildSnapshot           # build/outputs/snapshot/snapshot.js + 命令助手snapshot<日期>.lib
    node ./cabuildtools/main.js buildSnapshot -dev      # dev.js + 命令助手dev<日期>.lib
    node ./cabuildtools/main.js buildSnapshot -canary   # canary.js + 命令助手canary<日期>.lib

渠道名和构建形态是分开的两个概念：

- **形态**（`BuildConfig.variants`）决定核心行为：`buildRelease` -> `release`，`buildSnapshot` -> `snapshot`
  （快照形态：不写 `update.json`，核心按非正式版处理）
- **渠道**（产物名 + `.lib` 的 uuid）默认都是 **standard**，加 `-beta` / `-dev` / `-canary` 才换成对应渠道

`standard` 只是对外的名字，内部仍然是 `release`/`snapshot`，所以核心代码里 `variants == "release"`
这类判断不受影响。

`.lib` 是安装器：装进 App 后把该渠道的脚本设为调试源并建快捷方式。每个渠道固定一个 uuid，
版本号取构建时刻 `[年, 月, 日, 时, 分, 秒]`，同一天重新构建的包也会被识别为更新。**快照形态沿用作者原来的
`f6cf1729-...` uuid**（唯一特例，保证老的快照包还能被覆盖更新）；**同版本号下渠道优先级
`canary > dev > beta > standard`**，低优先级不会覆盖高优先级。

### 生成 APP

    npm run gradlew               # 正式版 APK
    npm run gradlew -- -debug     # 调试版 APK

    # 等价于
    node ./cabuildtools/main.js shellBuildRelease
    node ./cabuildtools/main.js shellBuildDebug

正式版产物在 `build/dist/`，调试版在 `build/outputs/debugApk/app-debug.apk`。
壳子的 Gradle 任务由 `shellGradle` 内部调用，不需要手动执行。

> 调试包也开启了 R8（`minifyEnabled true`）。Rhino 1.9 的 `SlotMapOwner$ThreadedAccess`
> 用了 `MethodHandle.invoke`，D8 在 minSdk 21 下不会做兼容转换，不开 R8 会直接报
> `Error while dexing`；release 一直是开着的，所以只有 debug 会撞上。

### 跑构建工具的测试

    npm test

    # 等价于
    node ./cabuildtools/tests/async-transform.test.js
    node ./cabuildtools/tests/loader-ast.test.js

### 检查 / 更新依赖

    npm run deps                      # 检查：有可更新的依赖就返回码 1（适合 CI）
    npm run deps -- --json            # 机器可读输出
    npm run deps -- --no-error        # 只看报告，不靠返回码卡流程

    npm run deps:update               # 升「范围内」的版本（npm update），然后跑 npm test
    npm run deps:update -- --latest   # 连大版本一起升（只动直接依赖的声明）
    npm run deps:update -- --verify   # 更新后再跑一次 npm run build
    npm run deps:update -- --dry-run  # 只打印会做什么，不改文件

依赖检查靠 `npm outdated`，workspace 里的包也能识别；大版本默认不升，
因为跨大版本可能有 ESM/API 变化（比如 Babel 7 → 8），需要自己确认后
再 `--latest`。更新完会自动跑测试，加 `--verify` 还会再构建一次。

## 内置命令库

内置命令库只有一套来源：`data/idlibs/*.json`。由 `modules/builtinData.js` 用
`Loader.fromFile` 直接内联成 `CA.Library.inner["default"]` 等对象，用户无需手动导入。

`caclib/` 不参与 App 构建——它是作者 **在线拓展包源**（clib）的工程仓库，通过
`git subtree` 同步进来，由 `cabuildtools/clibspawn.js` 打包成 SIGNLIB01 发布到源站
（对应 `pages/clib/` 的那套结构）。两者不要混：
把 caclib 的库内嵌成内置包会导致同一份内容在列表里出现两次。

`data/idlibs` 里除了命令库，还有 `schema_v1.json`（库格式的 JSON Schema）和
`JSONSchema.json`（内置的 rawtext schema，供 `jsonPro` 参数补全）。

## 打包与解包 .lib

`cabuildtools/libtool.js` 提供三条命令，js / json 与 .lib 之间互转：

```bash
# json 或 js → .lib（默认 LIBRARY 锁定包）
npm run pack -- 我的库.json                    # 生成 我的库.lib
npm run pack -- 插件.js -o 输出.lib

# 打成分发格式（SIGNLIB01），需要私钥
npm run pack -- 我的库.json --sign signatures/keys/testkey_private.pem

# 输入已经是 .lib 也行：解出内容再按目标格式重打（可用来补签名）
npm run pack -- 旧包.lib --sign 私钥.pem -o 新包.lib

# .lib → js / json（自动识别 LIBRARY / SIGNLIB01 / LIBSIGN01）
npm run unpack -- 我的库.lib                   # JSON 内容输出 .json（格式化），否则 .js
npm run unpack -- 已签名.lib --key 公钥.pem     # 顺带验签，失败退出码 2

# 只看容器信息
npm run info -- 我的库.lib
```

内容会先做合法性检查：JSON 必须能解析，JS 必须能作为表达式求值。

## 命令库的签名格式

命令库有三种容器，`01` 是格式版本号：

| 魔数 | 生成工具 | 用途 |
| --- | --- | --- |
| `LIBRARY` | `js2lib.js` | 锁定包（社区俗称「加密包」），安装器 lib 也用这个格式 |
| `SIGNLIB01` | `js2signlib.js` | 分发（源站/商店下载），9 字节魔数 + 256 字节 RSA 签名 + 8 字节时间戳 + gzip 载荷 |
| `LIBSIGN01` | App 下载时 / `js2localib.js` | 本地已验签库，9 字节魔数 + int32 sourceId 长度 + sourceId + SIGNLIB01 的 [9..] |

> **术语**：社区里把 `LIBRARY` 格式的包统称「**锁定包**」（后来又叫「加密包」）。
> 它并不加密，只是 App 用 `LIBRARY` 前缀识别、并把它标成「锁定」；列表里 `[锁定]`
> 那行小字是**包作者自己写的**说明，不是 App 生成的结论，别把它当成安全背书。

    # 分发格式
    node ./cabuildtools/js2signlib.js <源码.js> <私钥.pem> <输出.lib>

    # 本地格式（源站 uuid + App 公钥，公钥在 cadroid 的 Secret.HOTFIX_PUBLIC_KEY）
    node ./cabuildtools/js2localib.js <输入.lib> <源站uuid> <输出.lib> [app公钥]

签名私钥必须是 **RSA 2048 位**（App 里验签段长度写死 256 字节）。`LIBSIGN01` 旁边的 `.hash`
是 `SHA1(appVerifyKey || SHA1(payload))`，用 App 内置的公钥算——所以只有 App（或掌握其公钥的
本地流程）能产出合法 `.hash`。`SIGNLIB01` 只在下载路径里验签；直接拷贝进手机的 `SIGNLIB01`
会被当成未知格式，需要先转成 `LIBSIGN01`。

## 拓展包源

拓展包的「检测更新」和「在线拓展包」都支持多个源。入口：**设置 → 智能补全 → 拓展包源**，
打开独立的「管理拓展包源」页面（左上角标题、右上角 ▼）。

- **命令助手官方拓展包源**默认存在，列表里带 `[官方]` 前缀，不能禁用或删除；
  给它加备注后，备注会当标题显示，原名以小字「原名：命令助手官方拓展包源」放在下面
- **添加源**：右上角 ▼ →「添加拓展包源」，填源站根目录（或它的 `info.json` 地址）。
  读 `info.json` 是网络请求，走后台线程；失败会把输入回填到输入框
- **源显示名**：`info.json` 的 `name` → `maintainer` → `details` → 地址。
  `name` 是可选字段（官方源没有），源端声明了就用它；早期添加的源在下次
  读取 `info.json` 时会自动同步过来
- **点按源**：备注 / 禁用 / 删除（官方源只有备注）
- 源不再出现在「管理拓展包」列表里——源不是拓展包
- 配置存在 `CA.settings.librarySources`，源对象为 `{url, name, enabled, note, builtin}`，
  增删改都会立刻 `CA.trySave()`（否则进程被系统杀掉后新加的源会丢失）

检查更新时（`requestUpdateUrlFromDefSrc`）按顺序遍历启用中的源，第一个给出该 uuid 更新地址的源
胜出；源内部仍然校验 `sourceId`、SHA-1 与 RSA 签名。

「在线拓展包」会汇总**所有启用中的源**，同一个 uuid 只显示版本最高的那个，下载时用该条目
所属的源验签。

## 拓展包的信任分级

签名包按**验签用的公钥**分两级，显示在「管理拓展包」列表里：

| 标记 | 判定方式 |
| --- | --- |
| `[官方]` | 用官方源（`builtin: true` 的那个源）的公钥验签通过 |
| `[社区]` | 用第三方源自己的公钥验签通过；下载时会在包旁边写一个 `.community` 标记 |
| `[内置]` | `builtin://` 内置库 |
| `[锁定]` | `LIBRARY` 前缀格式，即锁定包（社区叫加密包） |

安全级别共五档（0–4），决定什么类型的包能被加载：

| 值 | 名称 | 允许加载 | 拒绝 |
| --- | --- | --- | --- |
| 0 | 禁用 | 全部：内置 / 官方签名 / 社区签名 / 锁定包 / 未打包的 `.js`/`.json` | —（没有任何检查） |
| 1 | 低 | 签名包 + 锁定包（`LIBRARY`，没有签名也加载，会提示一次） | 未打包的 `.js`/`.json` |
| 2 | 中（默认，推荐） | 只加载签名包（官方 + 社区） | 锁定包、未打包的 `.js`/`.json` |
| 3 | 高 | 只加载官方签名 | 社区签名、锁定包、未打包的 `.js`/`.json` |
| 4 | 严格 | 只加载内置库 | 所有外部拓展包 |

> 切换时的确认框只在**放宽**级别（数字变小）时弹出——从低往高收紧是安全操作，
> 直接生效；从高往低放宽会提示会额外接受哪类包。

编辑 / 锁定 / 创建副本 / 新建拓展包这些开发操作**只有「禁用」级别（值 0）才可见**，而且编辑器只能处理 JSON 格式的包（`JSON.parse` 失败会直接提示）。

> 已移除原先"从 GitHub 自动下载远程拓展包"的机制（`modules/RemoteLibrary.js` 与
> `libraries.json`）。
