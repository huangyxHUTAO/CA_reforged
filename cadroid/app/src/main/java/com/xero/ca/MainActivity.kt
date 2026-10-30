package com.xero.ca

import android.app.Activity
import android.os.Bundle

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        processIntent()
        finish()
    }

    private fun processIntent() {
        val intent = intent ?: return
        ScriptInterface.callIntent(this, intent)
    }
}
