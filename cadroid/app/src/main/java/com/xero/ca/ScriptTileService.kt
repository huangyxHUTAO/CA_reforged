package com.xero.ca

import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.SystemClock
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.util.Log

import androidx.annotation.RequiresApi

import com.xero.ca.script.ScriptObject

import java.lang.ref.WeakReference

/**
 * 快捷设置磁贴。
 *
 * 磁贴的点击/刷新都通过 Handler 串行化（sPending 保证同一时刻只有一个命令在跑），
 * 脚本侧通过 setTileListener 接管内容的绘制，没接管时退回默认行为。
 */
@RequiresApi(Build.VERSION_CODES.N)
class ScriptTileService : TileService() {
    private var mHandler: Handler? = null
    private var mListening = false

    override fun onCreate() {
        sInstance = WeakReference(this)
        mHandler = Handler(mainLooper)
        super.onCreate()
    }

    override fun onDestroy() {
        sInstance = null
        mHandler = null
        super.onDestroy()
    }

    override fun onStartListening() {
        super.onStartListening()
        mListening = true
        notifyUpdate()
    }

    override fun onStopListening() {
        mListening = false
        super.onStopListening()
    }

    override fun onClick() {
        postCommand(TYPE_CLICK)
    }

    fun notifyUpdate() {
        if (mListening) {
            postCommand(TYPE_UPDATE)
        }
    }

    private fun postCommand(type: Int) {
        Log.d(TAG, "Post Command:$type spending=$sPending")
        val handler = mHandler
        if (handler != null && !sPending) {
            sPending = true
            handler.post(UpdateTileCommand(type))
        }
    }

    @ScriptObject
    class TileConfig {
        @JvmField
        var label: CharSequence? = null

        @JvmField
        var subtitle: CharSequence? = null

        @JvmField
        var state: Int = 0

        override fun toString(): String =
            "[TileConfig@" + Integer.toHexString(hashCode()) + " label=" + label +
                ",subtitle=" + subtitle + ",state=" + state + "]"

        companion object {
            const val STATE_ACTIVE = Tile.STATE_ACTIVE
            const val STATE_INACTIVE = Tile.STATE_INACTIVE
            const val STATE_UNAVAILABLE = Tile.STATE_UNAVAILABLE
        }
    }

    inner class UpdateTileCommand(private val mType: Int) : Runnable {
        private val mConfig: TileConfig = createTileConfig()

        override fun run() {
            val listener = sListener
            if (listener != null) {
                if (mType == TYPE_CLICK) {
                    listener.onClick(mConfig)
                } else {
                    listener.onReady(mConfig)
                }
            } else {
                if (mType == TYPE_CLICK) {
                    Log.d(TAG, "Trying to launch service")
                    val command = StartAppCommand()
                    if (isLocked) {
                        unlockAndRun(command)
                    } else {
                        mHandler?.post(command)
                    }
                } else {
                    updateTileDefault(mConfig)
                }
            }
            updateTile(mConfig)
            sPending = false
            Log.d(TAG, "Command Executed:$mType")
        }

        fun createTileConfig(): TileConfig {
            val config = TileConfig()
            val tile = qsTile
            if (tile != null) {
                config.label = tile.label
                config.state = tile.state
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    config.subtitle = tile.subtitle
                }
            }
            Log.d(TAG, "TileConfig created:$config")
            return config
        }

        fun updateTile(config: TileConfig) {
            val tile = qsTile ?: return
            tile.label = config.label
            tile.state = config.state
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                tile.subtitle = config.subtitle
            }
            tile.updateTile()
            Log.d(TAG, "TileConfig updated:$config")
        }

    }

    private fun updateTileDefault(config: TileConfig) {
        config.label = getText(R.string.app_name)
        config.state = if (sPendingLaunch && SystemClock.uptimeMillis() - sLastLaunch < 30000) {
            Tile.STATE_UNAVAILABLE
        } else {
            Tile.STATE_INACTIVE
        }
    }

    interface TileListener {
        fun onReady(config: TileConfig)
        fun onClick(config: TileConfig)
    }

    inner class StartAppCommand : Runnable {
        override fun run() {
            if (sPendingLaunch) return
            ScriptInterface.callIntent(
                this@ScriptTileService,
                Intent(ScriptInterface.ACTION_START_FROM_QS_TILE)
            )
            sPendingLaunch = true
            sLastLaunch = SystemClock.uptimeMillis()
            notifyUpdate()
        }
    }

    companion object {
        private const val TAG = "CA"
        private var sInstance: WeakReference<ScriptTileService>? = null
        private var sListener: TileListener? = null
        private var sPending = false
        private var sPendingLaunch = false
        private var sLastLaunch = 0L

        const val TYPE_UPDATE = 0
        const val TYPE_CLICK = 1

        @JvmStatic
        fun getInstance(): ScriptTileService? = sInstance?.get()

        @JvmStatic
        fun setTileListener(listener: TileListener?) {
            sListener = listener
            val instance = getInstance()
            if (listener != null) {
                sPendingLaunch = false
            }
            instance?.notifyUpdate()
        }
    }
}
