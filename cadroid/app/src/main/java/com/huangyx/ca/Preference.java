package com.huangyx.ca;

import android.content.Context;
import android.content.SharedPreferences;

import com.huangyx.ca.script.ScriptObject;

import java.util.UUID;

public class Preference {
    public static final String SETTING_HIDE_SPLASH = "hideSplash";
    public static final String SETTING_HIDE_NOTIFICATION = "hideNotification";
    public static final String SETTING_START_ON_BOOT = "bootStart";
    public static final String SETTING_FIRST_RUN = "firstRun";
    public static final String SETTING_USER_ID = "userID";
    public static final String PREFERENCE_NAME = "user_settings";
    public static final String SETTING_LAST_APK_VERSION_CODE = "lastApkVersionCode";

    private static Preference sInstance = null;

    private SharedPreferences mPreferences;

    private Preference(Context context) {
        mPreferences = context.getSharedPreferences(PREFERENCE_NAME, Context.MODE_PRIVATE);
    }

    public static Preference getInstance(Context context) {
        if (sInstance != null) return sInstance;
        sInstance = new Preference(context);
        return sInstance;
    }

    @ScriptObject
    public boolean getHideSplash() {
        return mPreferences.getBoolean(SETTING_HIDE_SPLASH, false);
    }

    @ScriptObject
    public void setHideSplash(boolean v) {
        mPreferences.edit().putBoolean(SETTING_HIDE_SPLASH, v).apply();
    }

    @ScriptObject
    public boolean getHideNotification() {
        return mPreferences.getBoolean(SETTING_HIDE_NOTIFICATION, false);
    }

    @ScriptObject
    public void setHideNotification(boolean v) {
        mPreferences.edit().putBoolean(SETTING_HIDE_NOTIFICATION, v).apply();
    }

    @ScriptObject
    public boolean getBootStart() {
        return mPreferences.getBoolean(SETTING_START_ON_BOOT, false);
    }

    @ScriptObject
    public void setBootStart(boolean v) {
        mPreferences.edit().putBoolean(SETTING_START_ON_BOOT, v).apply();
    }

    public String getDebugSource() {
        return mPreferences.getString("debugSource", "");
    }

    public boolean checkFirstRun() {
        boolean result = !mPreferences.contains(SETTING_FIRST_RUN);
        if (result) {
            mPreferences.edit().putBoolean(SETTING_FIRST_RUN, false).apply();
        }
        return result;
    }

    public String getUserId() {
        String uuid = mPreferences.getString(SETTING_USER_ID, null);
        if (uuid == null) {
            uuid = UUID.randomUUID().toString();
            mPreferences.edit().putString(SETTING_USER_ID, uuid).apply();
        }
        return uuid;
    }

    public int getLastApkVersionCode() {
        return mPreferences.getInt(SETTING_LAST_APK_VERSION_CODE, -1); // 默认值为 -1 表示未存储
    }

    public void setLastApkVersionCode(int versionCode) {
        mPreferences.edit().putInt(SETTING_LAST_APK_VERSION_CODE, versionCode).apply();
    }
}
