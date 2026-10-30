package com.xero.ca

import android.app.Activity
import android.content.Intent
import android.os.Bundle

class EditCommandActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        processIntent()
        finish()
    }

    private fun processIntent() {
        val intent = intent ?: return
        val extras = intent.extras ?: return
        val target = Intent(ScriptInterface.ACTION_EDIT_COMMAND)
        target.putExtra("text", extras.getString(Intent.EXTRA_TEXT, ""))
        ScriptInterface.callIntent(this, target)
    }
}
