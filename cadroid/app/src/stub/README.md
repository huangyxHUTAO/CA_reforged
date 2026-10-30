# 缺依赖时的空实现（编译用）

这些类**只在对应的本地依赖缺失时**才参与编译（条件见 `app/build.gradle` 的 `sourceSets`），
用来保证 clone 下来没有任何本地文件也能直接构建；把真实依赖放进 `app/libs/` 后，
这里的同名类不会参与编译，功能自动恢复。

| 目录 | 顶替的依赖 | 缺失时的行为 |
| --- | --- | --- |
| `talkingdata/` | `libs/SaaS_TalkingDataSDK_Android_V5.0.38.jar` | 统计功能关闭（全部方法为空实现） |
| `gdt/` | `libs/GDTActionSDK.min.1.9.8.aar` + Maven 的 `com.qq.e.union:union` | 整套优量汇不加载（`BuildConfig.GDT_ENABLED=false`），不请求开屏广告 |

方法签名与官方 SDK 保持一致；调用方改动时记得同步这里。

为什么要单独的目录：这些桩类和真实 SDK 是**同名类**，一次构建里只能有一份参与编译。
Gradle 的条件包含是按「源目录」生效的，所以每个依赖的桩各占一个目录（`stub/<依赖>/java`），
`app/build.gradle` 按「本地有没有这个依赖」决定加不加。要是都塞进 `src/main/java`，
装了真实依赖时就会和桩撞成重复类、直接编译失败。
