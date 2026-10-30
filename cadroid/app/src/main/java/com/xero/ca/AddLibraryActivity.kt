package com.xero.ca

import android.app.Activity
import android.content.Intent
import android.os.Bundle

class AddLibraryActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        processIntent()
        finish()
    }

    private fun processIntent() {
        val intent = intent ?: return
        val data = intent.data
        val target = Intent(ScriptInterface.ACTION_ADD_LIBRARY, data)
        grantUriPermission(packageName, data, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        ScriptInterface.callIntent(this, target)
    }
}
