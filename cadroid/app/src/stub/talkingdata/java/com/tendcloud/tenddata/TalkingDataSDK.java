package com.tendcloud.tenddata;

import android.content.Context;

import java.util.Map;

/**
 * TalkingData SDK 的空实现（桩）。
 *
 * 只在本地缺少 {@code app/libs/SaaS_TalkingDataSDK_Android_V5.0.38.jar} 时参与编译
 * （见 app/build.gradle 里 sourceSets 的条件），这样 clone 下来没有本地依赖也能直接构建，
 * 统计功能等于关闭。
 *
 * 把官方 jar 放进 app/libs/ 后本文件不参与编译，统计功能自动恢复；
 * 方法签名与官方 SDK 保持一致，改动调用方时记得同步这里。
 */
public class TalkingDataSDK {
    public static void initSDK(Context context, String appId, String channel, String partner) {
    }

    public static void onError(Context context, Throwable throwable) {
    }

    public static void onPageBegin(Context context, String pageName) {
    }

    public static void onPageEnd(Context context, String pageName) {
    }

    public static void onEvent(Context context, String eventId, double eventValue, Map<String, Object> kv) {
    }

    public static void onEvent(Context context, String eventId, Map<String, Object> kv) {
    }

    public static void setGlobalKV(String key, Object value) {
    }

    public static void removeGlobalKV(String key) {
    }
}
