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

# TalkingData SDK
-dontwarn com.tendcloud.tenddata.**
-keep class com.tendcloud.** {
    *;
}
-keep public class com.tendcloud.** {
    public protected *;
}

# Scripting
-keep @com.huangyx.ca.script.ScriptObject public class *{
    public *;
}
-keepclassmembers class * {
    @com.huangyx.ca.script.ScriptObject public *;
}
-keep public class com.huangyx.ca.R
-keep public class com.huangyx.ca.R$* {
    public *;
}
-keep class org.mozilla.** {
    *;
}
-keep public class org.java_websocket.** {
    public *;
}