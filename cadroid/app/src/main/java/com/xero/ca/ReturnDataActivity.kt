package com.xero.ca

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle

class ReturnDataActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val lastIntent = intent ?: return
        var target: Intent? = null
        var requestCode = 0
        try {
            @Suppress("DEPRECATION")
            target = lastIntent.getParcelableExtra(EXTRA_INTENT)
            requestCode = lastIntent.getIntExtra(EXTRA_REQUEST_CODE, 0)
        } catch (e: ClassCastException) {
            // 参数类型不对时忽略，等价于没有指定 Intent
        }
        if (target != null) {
            @Suppress("DEPRECATION")
            startActivityForResult(target, requestCode)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        finishAndRemoveTask()
        ScriptInterface.onActivityResult(requestCode, resultCode, data)
    }

    companion object {
        const val EXTRA_INTENT = "com.xero.ca.EXTRA_INTENT"
        const val EXTRA_REQUEST_CODE = "com.xero.ca.EXTRA_REQUEST_CODE"

        @JvmStatic
        fun createIntent(context: Context, intent: Intent, requestCode: Int): Intent =
            Intent(context, ReturnDataActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                .putExtra(EXTRA_INTENT, intent)
                .putExtra(EXTRA_REQUEST_CODE, requestCode)
    }
}
