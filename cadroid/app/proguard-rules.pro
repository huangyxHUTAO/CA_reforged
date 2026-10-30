# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in C:\tools\adt-bundle-windows-x86_64-20131030\sdk/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# R8 完整模式（AGP 8 起默认开启）下会把“引用了不存在的类”当成错误，
# 下面这些是依赖库引用到、但 Android 运行时/编译 SDK 里没有的类，忽略即可。
# 规则由 AGP 生成于 build/outputs/mapping/release/missing_rules.txt
-dontwarn android.app.Activity$ScreenCaptureCallback
-dontwarn java.beans.BeanDescriptor
-dontwarn java.beans.BeanInfo
-dontwarn java.beans.IntrospectionException
-dontwarn java.beans.Introspector
-dontwarn java.beans.PropertyDescriptor

# TalkingData SDK
-dontwarn com.tendcloud.tenddata.**
-keep class com.tendcloud.** {
    *;
}
-keep public class com.tendcloud.** {
    public protected *;
}

# GDT SDK
-dontwarn com.qq.gdt.action.**
-keep class com.qq.gdt.action.** {*;}
-keepclassmembers class com.qq.gdt.action.** {*;}
-keep public class com.tencent.turingfd.sdk.**
-keep class com.**.TNative$aa {public *;}
-keep class com.**.TNative$aa$bb {public *;}
-keep class com.**.TNative$bb {*;}
-keep class com.**.TNative$bb$I {*;}

# Scripting
-keep @com.xero.ca.script.ScriptObject public class *{
    public *;
}
-keepclassmembers class * {
    @com.xero.ca.script.ScriptObject public *;
}
-keep public class com.xero.ca.R
-keep public class com.xero.ca.R$* {
    public *;
}
# 核心脚本按类名反射调用（modules/utils/DBSettings.js 的 getUndefinedInstance），
# 原作者 1.2.14-Beta-14 的正式包里这个类名同样是保留的；不 keep 会被 R8 改名成
# com.xero.ca.script.a，脚本里那句调用就会失败（我们的内核有 try/catch 兜底，
# 只是退回 org.mozilla.javascript.Undefined；官方内核没兜底，会直接抛异常）
-keep class com.xero.ca.script.WrappedUndefined {
    *;
}
-keep class org.mozilla.** {
    *;
}
-keep public class org.java_websocket.** {
    public *;
}

# 加速库：只被核心脚本通过 Rhino 反射（Packages.top.projectxero.ca.accel.Accel）调用，
# Java 侧没有任何静态引用，R8 会把它整个裁掉，必须显式保留
-keep class top.projectxero.ca.accel.** { *; }

# ---- Rhino 1.9 ----
# 这些类 Android 上不存在，但只在"编译模式"（optimizationLevel >= 0）里用到。
# 本项目用 -1 纯解释执行，永远不走那条路径，所以放行 R8 的缺失类检查。
-dontwarn jdk.dynalink.**
-dontwarn java.lang.StackWalker

# Rhino 的 E4X 实现通过 ServiceLoader 加载（META-INF/services/
# org.mozilla.javascript.xml.XMLLoader → XMLLoaderImpl）。
# 核心 jar 里没有任何对 xmlimpl 的静态引用，不 keep 会被 R8 删光，
# 脚本里 XML() 和 <a/> 字面量就会报 "XML 未定义"。
-keep class org.mozilla.javascript.xmlimpl.XMLLoaderImpl { *; }
-keepnames class org.mozilla.javascript.xml.** { *; }
