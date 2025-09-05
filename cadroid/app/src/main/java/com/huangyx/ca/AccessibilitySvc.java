package com.huangyx.ca;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityEvent;

import java.lang.ref.WeakReference;

public class AccessibilitySvc extends AccessibilityService {
    private static WeakReference<AccessibilitySvc> instance = new WeakReference<>(null);
    private static ServiceLifeCycleListener mLifeCycleListener = null;

    public static void goToAccessibilitySetting(Context context) {
        context.startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    public static AccessibilitySvc getInstance() {
        return instance.get();
    }

    public static void notifyKeyEvent(final KeyEvent e) {
        ScriptInterface.notifyKeyEvent(e);
    }

    public static void setLifeCycleListener(ServiceLifeCycleListener mListener) {
        mLifeCycleListener = mListener;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent accessibilityEvent) {
    }

    @Override
    public void onInterrupt() {
    }

    @Override
    protected boolean onKeyEvent(KeyEvent event) {
        if (event.isPrintingKey()) return false;
        notifyKeyEvent(event);
        return false;
    }

    @Override
    public void onCreate() {
        instance = new WeakReference<>(this);
        super.onCreate();
        if (mLifeCycleListener != null) mLifeCycleListener.onCreate();
    }

    @Override
    public void onDestroy() {
        instance.clear();
        if (mLifeCycleListener != null) mLifeCycleListener.onDestroy();
        super.onDestroy();
    }

    public interface ServiceLifeCycleListener {
        void onCreate();

        void onDestroy();
    }
}
