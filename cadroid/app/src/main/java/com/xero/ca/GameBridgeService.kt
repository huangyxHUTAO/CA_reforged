package com.xero.ca

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Message
import android.os.Messenger
import android.util.Log

import java.lang.ref.WeakReference
import java.util.Collections

/**
 * 给运行在游戏进程里的适配器（另一个 App）提供绑定入口，用于收发桥接消息。
 *
 * 适配器绑定成功后会把命令助手带到前台，按系统版本分两种方式：
 *   - Android 10 及以下：直接 startActivity
 *   - Android 11 及以上：发一条「点按打开」的通知
 * 因为 Android 11 起禁止后台启动 Activity，从适配器里 startActivity 会打断对方
 * Activity（Performing stop of activity that is not resumed）。
 */
class GameBridgeService : Service(), Handler.Callback {
    private val mHandler = Handler(this)

    override fun onBind(intent: Intent?): IBinder? {
        if (instance.get() != null) return null
        instance = WeakReference(this)
        if (ScriptManager.hasInstance()) {
            runMain()
        }
        mCallback?.onRemoteEnabled()
        return Messenger(mHandler).binder
    }

    override fun onUnbind(intent: Intent?): Boolean {
        instance.clear()
        mQueue.clear()
        mCallback?.onRemoteDisabled()
        return super.onUnbind(intent)
    }

    /**
     * 适配器绑定成功后把命令助手带到前台。
     *
     * Android 11（API 30）起禁止后台启动 Activity，直接 startActivity 会打断适配器所在的
     * Activity，所以改成发通知、由用户点按进入；Android 10 及以下仍用原来的方式。
     */
    private fun runMain() {
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.Q) {
            postOpenNotification()
            return
        }
        try {
            val i = Intent(this, MainActivity::class.java)
                .setAction(ScriptInterface.ACTION_START_FROM_BACKGROUND)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_FROM_BACKGROUND)
            startActivity(i)
        } catch (e: Exception) {
            Log.e(TAG, "startActivity failed", e)
        }
    }

    /** Android 11+：发一条「点按打开命令助手」的通知 */
    private fun postOpenNotification() {
        // Android 13+ 需要运行时通知权限，没有就静默跳过
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        val manager = getSystemService(NOTIFICATION_SERVICE) as? NotificationManager ?: return
        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags = flags or PendingIntent.FLAG_IMMUTABLE
        val contentIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), flags
        )
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_OPEN)
        } else {
            Notification.Builder(this)
        }
        builder.setContentTitle("命令助手")
            .setContentText("游戏已连接，点按打开命令助手")
            .setSmallIcon(R.mipmap.icon_small)
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_OPEN, "打开命令助手", NotificationManager.IMPORTANCE_DEFAULT)
            )
        }
        try {
            manager.notify(NOTIFICATION_ID, builder.build())
        } catch (e: Exception) {
            Log.e(TAG, "notify failed", e)
        }
    }

    override fun handleMessage(msg: Message): Boolean {
        val cb = mCallback
        if (cb != null) {
            cb.onRemoteMessage(msg)
        } else {
            mQueue.add(msg)
        }
        return false
    }

    interface Callback {
        fun onRemoteEnabled()
        fun onRemoteMessage(msg: Message)
        fun onRemoteDisabled()
    }

    companion object {
        private const val TAG = "GameBridge"
        private const val CHANNEL_OPEN = "game_bridge_open"
        private const val NOTIFICATION_ID = 0x4742 // "GB"

        @JvmField
        var instance: WeakReference<GameBridgeService?> = WeakReference(null)

        private var mCallback: Callback? = null

        private val mQueue: MutableList<Message> =
            Collections.synchronizedList(ArrayList<Message>())

        @JvmStatic
        fun setCallback(c: Callback) {
            mCallback = c
            if (isConnected()) c.onRemoteEnabled()
            if (mQueue.isNotEmpty()) {
                for (e in mQueue) {
                    c.onRemoteMessage(e)
                }
                mQueue.clear()
            }
        }

        @JvmStatic
        fun removeCallback() {
            mCallback = null
        }

        @JvmStatic
        fun isConnected(): Boolean = instance.get() != null
    }
}
