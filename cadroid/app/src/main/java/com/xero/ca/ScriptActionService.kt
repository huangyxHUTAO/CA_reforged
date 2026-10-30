package com.xero.ca

import android.app.Service
import android.content.Intent
import android.os.IBinder

class ScriptActionService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        ScriptInterface.callIntent(this, Intent(ScriptInterface.ACTION_SCRIPT_ACTION))
        stopSelf()
        return super.onStartCommand(intent, flags, startId)
    }
}
