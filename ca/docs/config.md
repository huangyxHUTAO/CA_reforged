# 构建配置（`config/`）

`config/` 下全部是 **JSON 数据文件**，构建工具直接读，没有逻辑代码。
这里记录每个字段的含义、谁在用、以及怎么覆盖——JSON 里不能写注释，说明都放这一份。

改完不需要重新安装什么，下一次构建就会生效。

| 文件 | 内容 |
| --- | --- |
| [`build.json`](#buildjson) | 版本号、versionCode、日期、更新说明 |
| [`update-sources.json`](#update-sourcesjson) | 客户端检查更新的源、发布端地址 |
| [`publish.json`](#publishjson) | 发布方式与目标 |
| [`shell.json`](#shelljson) | 壳子打包相关路径（多数自动探测） |
| [`import.json`](#importjson) | `generateImport` 用的 android.jar |

---

## build.json

```json
{
	"version": "1.2.14",
	"versionCode": [1, 2, 14],
	"date": "2026-10-22",
	"licenceUpdate": "2019/9/21",
	"description": "……"
}
```

| 字段 | 用途 |
| --- | --- |
| `version` | 显示用版本名，写进核心的 `BuildConfig.version`，也出现在「关于」面板 |
| `versionCode` | 整数数组，Gradle 的 versionCode 与部分比较逻辑用 |
| `date` | 发布日期，写进 `BuildConfig.date`、`.lib` 安装器文件名、`update.json` |
| `licenceUpdate` | 许可协议的更新日期，变了才会重新弹协议 |
| `description` | 更新说明，原样写进 `update.json` 和「新版本信息」对话框 |

使用方：

- `cabuildtools/tasks/getBuildConfig.js` 读出来作为 `context.buildConfig`
- 核心脚本的 `BuildConfig`（`modules/BuildConfig.js` 里的 LOADER 块注入）
- `writeUpdateRelease` / `writeUpdateSnapshot` 写 `update.json`
- `shellUpdateGradle` 用 `date` 算 cadroid 的 versionCode，写回它的 `app/build.gradle`

`description` 支持换行（JSON 里写 `\n`），内容是给用户看的中文说明。

---

## update-sources.json

一份文件管两端：**客户端**去哪检查更新，**发布端**把更新文件地址写成什么。

### 客户端（App 里「检查更新」）

| 字段 | 说明 |
| --- | --- |
| `release` | 正式渠道用的源；更新信息文件是 `hotfix.json`（每 7 天检查一次，设置里可关） |
| `beta` | 非正式渠道（debug / beta / snapshot）；更新信息文件是 `snapshot.json`（每次启动都查） |

两者结构相同：

```json
{ "id": "缓存键（随便填唯一字符串）", "content": ["地址1", "地址2", "..."] }
```

- `content` **按顺序尝试**，前一个失败才用下一个
- 清空成 `[]` 就彻底不检查更新（`Updater` 静默跳过，不报错）
- `id` 只是本地缓存键

`hotfix.json` 的结构：

```json
{ "version": …, "info": …, "downloads": {…}, "hotfix": { "url": …, "sign": …, "shell": …, "sha1": … }, "requirements": [] }
```

`snapshot.json` 的结构：

```json
{ "version": …, "snapshot": { "url": …, "sha1": … } }
```

### 发布端（生成更新信息时）

| 字段 | 说明 |
| --- | --- |
| `downloadSource` | 展示给用户的下载页，写进 `update.json` 的 `downloads` 字段 |
| `remoteRoot` | 更新文件所在的站点根目录，**必须以 `/` 结尾**；拼出来的是 `<remoteRoot>hotfix/release.js`、`<remoteRoot>hotfix/release.sign`、`<remoteRoot>snapshot.js` |

> 注意：这里的地址只决定「从哪拉更新信息 / 更新文件」。
> 热更新文件本身还会用 App 内置公钥（`Secret.getVerifyKey`）验签——
> 把源指向别人的服务器，也装不上别人签的脚本。

使用方：`getUpdateConfig`（发布端）、`assembleSource*`（注入成核心里的 `UpdateSources`）。

---

## publish.json

发布产物去哪。

```json
{
	"method": "local",
	"destPath": "./build/dist",
	"remoteRoot": null,
	"sshConfig": null
}
```

| method | 行为 | 需要的字段 |
| --- | --- | --- |
| `local` | 把产物复制到 `destPath` | `destPath` |
| `sftp` | 通过 SFTP 上传到 `remoteRoot` | `remoteRoot`、`sshConfig`（`ssh2.Client.connect` 的参数） |

多套发布目标：在 `preparePublish` 里支持「名字 → 配置文件名」的映射，
运行时 `node ./cabuildtools/main.js publish <名字>` 选择，例如另建
`config/publish.sftp.json`：

```json
{ "method": "sftp", "remoteRoot": "/var/www/ca/", "sshConfig": { "host": "…", "username": "…" } }
```

`preparePublish` 读取顺序：`.json` → `.js`（兼容旧配置）→ `.txt`（caclib 子树那种格式）。

---

## shell.json

壳子（cadroid）打包用。这里**只写和机器无关的默认值**，具体路径由
`cabuildtools/shellconfig.js` 自动探测：cadroid 项目位置、Android SDK、
Build Tools、JDK。

想覆盖不用改这个文件，用环境变量：

| 环境变量 | 作用 |
| --- | --- |
| `CA_CADROID` | cadroid 项目路径（默认找 CA 旁边的 `cadroid/` 或 `ca/`） |
| `ANDROID_HOME` / `ANDROID_SDK_ROOT` | Android SDK 路径（默认还会读 cadroid 的 `local.properties` 的 `sdk.dir`） |
| `JAVA_HOME` | JDK 路径（默认找 Android Studio 自带的 JBR 或 `~/.jdks` 下的 17） |

| 字段 | 说明 |
| --- | --- |
| `shellPath` / `androidSdk` / `javaHome` | 留 `null` = 自动探测；填了就用填的 |
| `buildToolVersion` | 优先用的 Build Tools 版本（没装则取已安装的最高版本） |
| `dexPath` | Gradle 产出的 `classes.dex`（CRC32 会写进脚本，运行时校验）。AGP 8 在 `minifyReleaseWithR8` 下，AGP 7.3 及更早是 `mergeDexRelease/out` |
| `releaseSignPath` | 正式版证书 DER（异或密钥），相对 cadroid 项目 |
| `debugSignPath` | 调试版证书 DER |
| `hotfixPrivateKey` | 热更新签名私钥 |
| `keystorePath` / `keyPasswordPath` | APK 签名密钥（alias `testkey`）与密码文件 |
| `lineagePath` / `lineageSigners` | 密钥轮换：默认不启用（单密钥签名）；启用时填 lineage 文件路径和从旧到新的每把密钥 |

自动探测的规则（按顺序）：

| 要找到的东西 | 探测顺序 |
| --- | --- |
| cadroid 项目 | 环境变量 `CA_CADROID` → CA 旁边的 `cadroid/` 或 `ca/` |
| Android SDK | `ANDROID_HOME` / `ANDROID_SDK_ROOT` → cadroid 的 `local.properties`（`sdk.dir`）→ 常见安装位置 |
| Build Tools | `buildToolVersion`（默认 34.0.0），否则已安装的最高版本 |
| JDK | `JAVA_HOME` → `~/.jdks`（优先 17）→ Studio 自带 JBR → `/usr/lib/jvm` |

解析结果写到 `build/generated/shellConfig.json`，排查问题直接看那份就知道用了哪个 SDK / JDK / cadroid。

---

## import.json

`generateImport`（生成命令库导入信息）用。

| 字段 | 说明 |
| --- | --- |
| `androidJarPath` | 留 `null` = 自动找 SDK 里最新的 `platforms/android-NN/android.jar` |
| `shellPath` / `androidSdk` | 留 `null` 时自动探测（一般不用填） |

解析结果写到 `build/generated/importConfig.json`。

---

## 和 `caclib/` 的关系

`caclib/` 是作者的 clib 子树（在线拓展包源工程），它自己还有一套元数据：

- `caclib/config.txt`：clib 发布源设置（uuid / outputUrl / signKey 等）
- `caclib/config/publish.txt`：发布方式
- `caclib/src/*/library.txt`：每个命令库的 id / 名称 / 版本 / 入口

那套是 `@key value` 的 txt 格式，由 `cabuildtools/clibspawn.js` 读取，
**不要**和 `config/` 下的构建配置混在一起。
