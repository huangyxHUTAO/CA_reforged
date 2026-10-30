package com.xero.ca

import android.app.Activity
import android.content.Intent
import android.os.Bundle

class UriActionActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        processIntent()
        finish()
    }

    private fun processIntent() {
        val intent = intent ?: return
        val target = Intent(ScriptInterface.ACTION_URI_ACTION)
        target.setDataAndType(intent.data, intent.type)
        target.putExtras(intent)
        ScriptInterface.callIntent(this, target)
    }
}
