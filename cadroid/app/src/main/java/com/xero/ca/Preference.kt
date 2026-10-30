package com.xero.ca

import androidx.core.content.edit

import android.content.Context
import android.content.SharedPreferences

import com.xero.ca.script.ScriptObject

import java.util.UUID

/**
 * 应用级设置的读写入口。
 *
 * 注意：对核心脚本可见的方法（带 @ScriptObject 的那些）刻意保持 `getXxx`/`setXxx`
 * 的方法形式，而不是 Kotlin 属性——属性上的注解只会写进 Kotlin 元数据，Java 侧
 * 反射（AndroidBridge.js）看不到，属性名也会被改掉。
 */
class Preference private constructor(context: Context) {
    private val mPreferences: SharedPreferences =
        context.getSharedPreferences(PREFERENCE_NAME, Context.MODE_PRIVATE)

    @ScriptObject
    fun getHideSplash(): Boolean = mPreferences.getBoolean(SETTING_HIDE_SPLASH, false)

    @ScriptObject
    fun setHideSplash(v: Boolean) {
        mPreferences.edit { putBoolean(SETTING_HIDE_SPLASH, v) }
    }

    @ScriptObject
    fun getHideNotification(): Boolean = mPreferences.getBoolean(SETTING_HIDE_NOTIFICATION, false)

    @ScriptObject
    fun setHideNotification(v: Boolean) {
        mPreferences.edit { putBoolean(SETTING_HIDE_NOTIFICATION, v) }
    }

    @ScriptObject
    fun getBootStart(): Boolean = mPreferences.getBoolean(SETTING_START_ON_BOOT, false)

    @ScriptObject
    fun setBootStart(v: Boolean) {
        mPreferences.edit { putBoolean(SETTING_START_ON_BOOT, v) }
    }

    fun getDebugSource(): String = mPreferences.getString("debugSource", "") ?: ""

    fun checkFirstRun(): Boolean {
        val result = !mPreferences.contains(SETTING_FIRST_RUN)
        if (result) {
            mPreferences.edit { putBoolean(SETTING_FIRST_RUN, false) }
        }
        return result
    }

    fun getUserId(): String {
        var uuid = mPreferences.getString(SETTING_USER_ID, null)
        if (uuid == null) {
            uuid = UUID.randomUUID().toString()
            mPreferences.edit { putString(SETTING_USER_ID, uuid) }
        }
        return uuid
    }

    companion object {
        const val SETTING_HIDE_SPLASH = "hideSplash"
        const val SETTING_HIDE_NOTIFICATION = "hideNotification"
        const val SETTING_START_ON_BOOT = "bootStart"
        const val SETTING_FIRST_RUN = "firstRun"
        const val SETTING_USER_ID = "userID"
        const val PREFERENCE_NAME = "user_settings"

        @Volatile
        private var sInstance: Preference? = null

        @JvmStatic
        fun getInstance(context: Context): Preference {
            sInstance?.let { return it }
            return synchronized(this) {
                sInstance ?: Preference(context).also { sInstance = it }
            }
        }
    }
}
