# 命令助手 Android

## 简介

命令助手 Android 是[命令助手](https://ca.projectxero.top/features.html)的 App 版本，在核心脚本之外
增加了壳子层的能力，如一键粘贴、适配器、从文件管理器加载命令库等。

### 增加特性

* 支持无障碍服务，提供粘贴与监听非打印按键接口
* 支持特殊 Intent 调用
* 支持适配器
* 支持开机自启

### 相关仓库

| 仓库                                   | 说明                                                |
|----------------------------------------|-----------------------------------------------------|
| <https://github.com/codesenlin/CA>     | 本 fork 的核心脚本（构建 APK 前需要先构建它，见下） |
| <https://gitee.com/projectxero/ca>     | 原作者的核心脚本仓库                                |
| <https://github.com/XeroAlpha/cadroid> | 原作者的 Android 壳仓库（本仓库的上游）             |

## 构建

### 1. 先决条件：准备核心脚本

本仓库只是壳子，核心逻辑是 JS，写在 [CA](https://github.com/codesenlin/CA) 里。构建前先确认
`app/src/main/assets/script.js` 存在——推荐直接用 CA 的构建工具生成（它会把下面这套活全干完）：

```bash
cd ../CA
node ./cabuildtools/main.js shellPrepareDebug     # 调试用：组装核心 → gzip → 加密 → 写入 assets
node ./cabuildtools/main.js shellBuildRelease     # 正式包：额外做 dex 校验、zipalign、apksigner、导出
```

- 构建工具读 CA 的 `config/shell.local.txt`（首次运行自动从模板生成，填自己机器上的路径）
- 正式包会导出到 `CA/build/dist/命令助手(x.y.z).apk`；日常调试也可以直接 `./gradlew :app:assembleDebug`
  （用 `assets/` 里已有的 `script.js`）

<details>
<summary>为什么脚本要加密（手动做法）</summary>

`assets/script.js` 是「GZIP 压缩 + 用 APK 签名证书 DER 逐字节异或」后的结果，运行时由
`ScriptFileStream` 读取当前签名证书解密。所以签名密钥必须和 `app/signatures/*.signature`
保持一致。手动打包步骤：未压缩的脚本写入 `assets/script.js` → GZIP → 用签名证书 DER 异或加密。
</details>

### 2. 编译 APK

```bash
./gradlew :app:assembleDebug     # 调试包（用 app/signatures/release.keystore 的 testkey 签名）
./gradlew :app:assembleRelease   # 未签名包，交给 CA 的 zipalign + apksigner 签名
```

JDK 不用手动装：字节码级别固定在 Java 17（`compileOptions`），用来跑构建的 JVM 由
`gradle/gradle-daemon-jvm.properties` 固定为 JBR 17，配合 `settings.gradle` 里的
foojay-resolver，缺了会自动下载（Android Studio 用的是它自带的 JBR，一般直接命中）。
从命令行跑 Gradle 时仍需要环境里有一个 Java（或设 `JAVA_HOME`），否则 wrapper 起不来。

`app/signatures/`、`app/libs/`、`assets/script.js` 都不入库，缺了也能编译。

## 本地依赖（可选）

工程**不依赖任何本地文件即可构建**：缺少的统计/广告 SDK 会被自动跳过，对应功能关闭。
下面两个 SDK 需要自己下载，放进 `app/libs/`（该目录不入库）。

### TalkingData（统计）

1. 到 <https://www.talkingdata.com/> 按官方流程注册账号并定制专属 SDK，最新版本会发到你指定的邮箱
2. 解压后把 `.jar` 放进 `app/libs/`
3. 改 `app/build.gradle` 里**两处**文件名（`tdAvailable` 的判断、以及 `implementation files(...)`），
   让它们和你刚放进来的文件名一致
4. Sync / 重新构建

### 腾讯广告转化 SDK（优量汇）

1. 按官方指引 <https://datanexus.qq.com/doc/develop/guider/sdk/android/init> 下载
   [GDT_ActionSDK_Android.zip](https://sr-home-1257214331.file.myqcloud.com/sdk/dmp-sdk-android/GDT_ActionSDK_Android.zip?t=1)
2. 解压后把 `.aar` 放进 `app/libs/`
3. 改 `app/build.gradle` 里**两处**文件名（`gdtAvailable` 的判断、以及 `implementation files(...)`）
4. Sync / 重新构建

> ⚠️ 这个 aar 带 arm 的 native 库（`armeabi` / `armeabi-v7a` / `arm64-v8a` 的 `libturingad.so`），
> 加了它之后 APK 只支持 arm 架构，x86 设备 / 模拟器装不上。
>
> 补充：优量汇的**广告 SDK 本体**走 Maven（`com.qq.e.union:union`），不用手动放。广告 SDK 与
> 转化 SDK 是**成套加载**的——本地没有这个 aar 时两个都不加载（`BuildConfig.GDT_ENABLED=false`，
> 不请求广告），避免出现「投放广告但缺转化回传」的半套状态。

## 账号/密钥（逐条合并：local > standard > template）

账号信息推荐用模板快速配置：

```bash
cp app/src/main/java/config/template/Secret.java \
   app/src/main/java/config/local/Secret.java
```

然后在 `config/local/Secret.java` 里按注释填写需要的条目——**每条都允许为空**，空条目会自动
回退，不影响其它条目。

| 优先级 | 文件                          | 说明                                                                                            |
|--------|-------------------------------|-------------------------------------------------------------------------------------------------|
| 1      | `config/local/Secret.java`    | **本机私人配置**（`config/.gitignore` 已忽略，可选）                                            |
| 2      | `config/standard/Secret.java` | **默认配置**：CA 原作者公开的那份值（TalkingData token、优量汇 AppID/广告位、Gitee OAuth 凭据） |
| 3      | `config/template/Secret.java` | **模板**：全部留空，兜底                                                                        |

**合并是按条目（每个 getter）来的，不是整份文件**：例如只填了 TalkingData token、其余留空，
那么广告 AppID / 广告位 / Gitee 那几项会各自回退到默认配置的值；某一条在默认里也是空，
才落回模板的空实现（该功能关闭）。

**实现**：`app/secret-config.gradle` 在构建时解析这三份文件、逐条合并，生成
`com/xero/ca/gen/Secret.java` 参与编译（`config/` 整棵目录只当数据源，不参与编译）。
构建日志会列出每一项最终来自哪份：

```
Secret 配置（逐条合并）:
  getTDToken: local（本机） （已配置）
  getGDTAppID: standard（默认） （已配置）
  ...
```

热更新校验公钥是公开信息，`standard` / `template` 里都写死同一份（我们自己的那张，配
`app/signatures/privateKey.pem`），换签名密钥时记得同步。
