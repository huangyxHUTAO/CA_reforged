package com.xero.ca

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (Intent.ACTION_BOOT_COMPLETED == intent.action) {
            if (Preference.getInstance(context).getBootStart()) {
                ScriptInterface.callIntent(context, Intent(ScriptInterface.ACTION_START_ON_BOOT))
            }
        }
    }
}
