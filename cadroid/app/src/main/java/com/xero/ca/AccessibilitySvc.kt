package com.xero.ca

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent

import java.lang.ref.WeakReference

class AccessibilitySvc : AccessibilityService() {
    override fun onAccessibilityEvent(accessibilityEvent: AccessibilityEvent?) {
    }

    override fun onInterrupt() {
    }

    override fun onKeyEvent(event: KeyEvent): Boolean {
        if (event.isPrintingKey) return false
        notifyKeyEvent(event)
        return false
    }

    override fun onCreate() {
        instance = WeakReference(this)
        super.onCreate()
        mLifeCycleListener?.onCreate()
    }

    override fun onDestroy() {
        instance.clear()
        mLifeCycleListener?.onDestroy()
        super.onDestroy()
    }

    interface ServiceLifeCycleListener {
        fun onCreate()

        fun onDestroy()
    }

    companion object {
        private var instance: WeakReference<AccessibilitySvc> = WeakReference(null)
        private var mLifeCycleListener: ServiceLifeCycleListener? = null

        @JvmStatic
        fun goToAccessibilitySetting(context: Context) {
            context.startActivity(
                Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        }

        @JvmStatic
        fun getInstance(): AccessibilitySvc? = instance.get()

        @JvmStatic
        fun notifyKeyEvent(e: KeyEvent) {
            ScriptInterface.notifyKeyEvent(e)
        }

        @JvmStatic
        fun setLifeCycleListener(mListener: ServiceLifeCycleListener?) {
            mLifeCycleListener = mListener
        }
    }
}
