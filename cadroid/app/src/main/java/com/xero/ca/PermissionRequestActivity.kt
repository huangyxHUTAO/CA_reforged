package com.xero.ca

import android.app.Activity
import android.os.Build
import android.os.Bundle
import android.os.Handler
import com.xero.ca.script.ScriptObject

class PermissionRequestActivity : Activity() {
    private var mCallback: Callback? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        ScriptInterface.onBeginPermissionRequest(this)
        if (mCallback == null) {
            Handler().post { finish() }
        }
        super.onCreate(savedInstanceState)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray,
    ) {
        mCallback?.onRequestPermissionsResult(this, requestCode, permissions, grantResults)
    }

    override fun onDestroy() {
        mCallback?.onEndPermissionRequest(this)
        super.onDestroy()
    }

    @ScriptObject
    override fun shouldShowRequestPermissionRationale(permission: String): Boolean {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && super.shouldShowRequestPermissionRationale(permission)
    }

    @ScriptObject
    fun setCallback(callback: Callback?) {
        mCallback = callback
    }

    @ScriptObject
    fun requestPermissionsCompat(requestCode: Int, permissions: Array<String>) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            requestPermissions(permissions, requestCode)
        } else {
            val handler = Handler(mainLooper)
            handler.post {
                val grantResults = IntArray(permissions.size)
                val packageManager = packageManager
                val pkgName = packageName
                for (i in permissions.indices) {
                    grantResults[i] = packageManager.checkPermission(permissions[i], pkgName)
                }
                onRequestPermissionsResult(requestCode, permissions, grantResults)
            }
        }
    }

    @ScriptObject
    interface Callback {
        fun onRequestPermissionsResult(
            activity: PermissionRequestActivity,
            requestCode: Int,
            permissions: Array<String>,
            grantResults: IntArray,
        )

        fun onEndPermissionRequest(activity: PermissionRequestActivity)
    }
}
