package com.xero.ca.script

import android.app.Activity
import android.content.Context

import com.tendcloud.tenddata.TalkingDataSDK

import java.util.HashMap

@ScriptObject
class AnalyticsPlatform private constructor() {
    fun onError(context: Context, throwable: Throwable) {
        TalkingDataSDK.onError(context, throwable)
    }

    fun onPageStart(context: Context, pageName: String) {
        TalkingDataSDK.onPageBegin(context, pageName)
    }

    fun onPageEnd(context: Context, pageName: String) {
        TalkingDataSDK.onPageEnd(context, pageName)
    }

    // 脚本按 3 参 / 4 参两种方式调用，用默认参数 + @JvmOverloads 保住两个重载
    @JvmOverloads
    fun onEvent(context: Context, eventId: String, eventValue: Double, kv: Map<String, Any?>? = null) {
        TalkingDataSDK.onEvent(context, eventId, eventValue, kv)
    }

    fun setGlobalKV(key: String, value: String) {
        TalkingDataSDK.setGlobalKV(key, value)
    }

    fun removeGlobalKV(key: String) {
        TalkingDataSDK.removeGlobalKV(key)
    }

    companion object {
        private val sInstance = AnalyticsPlatform()

        @JvmStatic
        fun getInstance(): AnalyticsPlatform = sInstance

        @JvmStatic
        fun reportAdError(activity: Activity, errorCode: Int, errorMessage: String?) {
            val kv: MutableMap<String, Any?> = HashMap()
            kv["error"] = "$errorCode $errorMessage"
            TalkingDataSDK.onEvent(activity, "AD_ERROR", 0.0, kv)
        }
    }
}
