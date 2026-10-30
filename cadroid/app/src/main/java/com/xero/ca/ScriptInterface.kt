package com.xero.ca

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Message
import android.util.Log
import android.view.KeyEvent

import com.xero.ca.gen.Secret
import com.xero.ca.script.AnalyticsPlatform
import com.xero.ca.script.RhinoFrameLayout
import com.xero.ca.script.RhinoWebSocketClientHelper
import com.xero.ca.script.RhinoWebSocketServerHelper
import com.xero.ca.script.RhinoWebView
import com.xero.ca.script.ScriptObject

import org.mozilla.javascript.NativeJavaObject
import org.mozilla.javascript.Scriptable
import org.mozilla.javascript.lc.type.TypeInfoFactory

import java.io.File
import java.io.IOException
import java.net.URISyntaxException

/**
 * 暴露给核心脚本的 Java 接口对象。
 *
 * 注意：这个类里的公有方法、字段名都被 AndroidBridge.js 通过反射访问，
 * 迁移到 Kotlin 时必须逐个保持原名（不要改成 Kotlin 属性），
 * 静态成员用 @JvmStatic、常量用 const val。
 */
@ScriptObject
class ScriptInterface(manager: ScriptManager) {
    private val mManager: ScriptManager = manager
    private val mContext = manager.getBindContext()!!
    private var mBindActivity: SplashActivity? = null
    private var mBindService: ScriptService? = null
    private val mUiThread: Thread
    private val mUiHandler: Handler
    private val mPreference: Preference
    private var mBridge: Bridge? = null
    private val mCallbackProxy: CallbackProxy
    private var mOnlineMode = false
    private var mOfflineReason: String? = null

    init {
        if (mContext is ScriptService) {
            mBindService = mContext
        }
        mUiHandler = Handler(mContext.mainLooper)
        mUiThread = mContext.mainLooper.thread
        mPreference = Preference.getInstance(mContext)
        mCallbackProxy = CallbackProxy()
    }

    fun reportError(techInfo: String?) {
        mContext.applicationContext.startActivity(
            BugReportActivity.createIntent(mContext, techInfo ?: "", android.os.Process.myPid())
        )
    }

    fun setLoadingTitle(title: String) {
        mBindActivity?.setLoadingTitle(title)
    }

    fun runOnUiThread(action: Runnable) {
        if (Thread.currentThread() != mUiThread) {
            mUiHandler.post(action)
        } else {
            action.run()
        }
    }

    fun setBridge(bridge: Bridge?) {
        mBridge = bridge
        GameBridgeService.setCallback(mCallbackProxy)
        AccessibilitySvc.setLifeCycleListener(mCallbackProxy)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ScriptTileService.setTileListener(mCallbackProxy)
        }
    }

    fun clearBridge() {
        mBridge = null
        GameBridgeService.removeCallback()
        AccessibilitySvc.setLifeCycleListener(null)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ScriptTileService.setTileListener(null)
        }
    }

    fun getContext(): Context = mContext

    fun getBindActivity(): SplashActivity? = mBindActivity

    fun getBindService(): ScriptService? = mBindService

    fun isActivityRunning(): Boolean = mBindActivity != null

    fun isServiceRunning(): Boolean = mBindService != null

    fun getIntent(): Intent? = mBindService?.getLastIntent()

    fun quit() {
        mBindService?.stopSelf()
        mBindActivity?.finishAndRemoveTask()
    }

    fun checkSelfPermission(permission: String): Int =
        mContext.checkPermission(permission, android.os.Process.myPid(), android.os.Process.myUid())

    fun beginPermissionRequest() {
        mContext.startActivity(
            Intent(mContext, PermissionRequestActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
    }

    fun startActivityForResult(intent: Intent, requestCode: Int) {
        if (mBridge == null || mBridge!!.applyIntent(intent)) {
            mContext.startActivity(ReturnDataActivity.createIntent(mContext, intent, requestCode))
        }
    }

    fun getPreference(): Preference = mPreference

    fun getAccessibilitySvc(): AccessibilitySvc? = AccessibilitySvc.getInstance()

    fun goToAccessibilitySetting() {
        AccessibilitySvc.goToAccessibilitySetting(mContext)
    }

    fun getScriptManager(): ScriptManager = mManager

    fun createWebSocketHelper(port: Int, delegate: RhinoWebSocketServerHelper.DelegateInterface?): RhinoWebSocketServerHelper =
        RhinoWebSocketServerHelper(port, delegate)

    fun createWSClient(uri: String, delegate: RhinoWebSocketClientHelper.DelegateInterface?): RhinoWebSocketClientHelper =
        try {
            RhinoWebSocketClientHelper(uri, delegate)
        } catch (e: URISyntaxException) {
            throw RuntimeException("Cannot create RhinoWebSocketClientHelper:" + e.message, e)
        }

    fun fileToUri(file: File): Uri = UnsafeFileProvider.getUriForFile(file)

    fun createFrameLayout(callback: RhinoFrameLayout.Callback?): RhinoFrameLayout =
        RhinoFrameLayout(mContext, callback)

    fun getShellVersion(): Int = BuildConfig.SHELL_VERSION

    fun getVersionCode(): Int = BuildConfig.VERSION_CODE

    fun getVersion(): String = BuildConfig.VERSION_NAME

    fun getVerifyKey(): ByteArray = Secret.getVerifyKey()

    fun getGiteeFeedbackToken(): String = Secret.getGiteeFeedbackToken()

    fun createWebView(delegee: RhinoWebView.Delegee?): RhinoWebView =
        RhinoWebView(mContext).setDelegee(delegee)

    fun getGiteeClientId(): String = Secret.getGiteeClientId()

    fun getGiteeClientSecret(): String = Secret.getGiteeClientSecret()

    fun getAnalyticsPlatform(): AnalyticsPlatform = AnalyticsPlatform.getInstance()

    fun isOnlineMode(): Boolean = mOnlineMode

    fun getOfflineReason(): String? = mOfflineReason

    fun onScriptReady() {
        AdProvider.getInstance().runAfterComplete(mCallbackProxy)
    }

    fun notifyTileUpdate() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ScriptTileService.getInstance()?.notifyUpdate()
        }
    }

    fun beginForegroundTask(intent: Intent) {
        mContext.startActivity(
            intent.setClass(mContext, ForegroundTaskActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
    }

    @Throws(IOException::class, ClassNotFoundException::class)
    fun executeScriptCache(cacheFile: String, hash: ByteArray?, scope: Scriptable?): Any? =
        mManager.executeScriptCache(cacheFile, hash, scope)

    @Throws(IOException::class)
    fun writeScriptCache(source: String, sourceName: String?, cacheFile: String, hash: ByteArray) {
        mManager.writeScriptCache(source, sourceName, cacheFile, hash)
    }

    @Throws(IOException::class, ClassNotFoundException::class)
    fun executeICode(iCode: ByteArray, hash: ByteArray?, scope: Scriptable?): Any? =
        mManager.executeICode(iCode, hash, scope)

    @Throws(IOException::class)
    fun compileICode(source: String, sourceName: String?, hash: ByteArray): ByteArray =
        mManager.compileICode(source, sourceName, hash)

    /**
     * 把 JS 对象包成"静态类型为 Scriptable"的 NativeJavaObject。
     *
     * 脚本用它调内部方法（get/put/delete/has 等）来模拟 Proxy。
     * Rhino 1.7 可以直接 `new NativeJavaObject(scope, obj, Scriptable)`，
     * 1.9 的第三个参数换成了 TypeInfo，而且脚本里 `Class.forName(...)`
     * 在反射调用下会走引导类加载器、找不到应用类，所以放在这里做。
     */
    fun wrapAsScriptable(obj: Any?, scope: Scriptable?): Any? =
        NativeJavaObject(scope, obj, TypeInfoFactory.GLOBAL.create(Scriptable::class.java))

    fun getUserID(): String = mPreference.getUserId()

    @ScriptObject
    interface Bridge {
        fun applyIntent(intent: Intent): Boolean

        fun onAccessibilitySvcCreate()

        fun onAccessibilitySvcDestroy()

        fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?)

        fun onBeginPermissionRequest(activity: PermissionRequestActivity)

        fun onNewIntent(intent: Intent)

        fun onKeyEvent(event: KeyEvent)

        fun onRemoteEnabled()

        fun onRemoteMessage(msg: Message)

        fun onRemoteDisabled()

        fun onTileReady(config: ScriptTileService.TileConfig)

        fun onTileClick(config: ScriptTileService.TileConfig)

        fun onBeginForegroundTask(activity: ForegroundTaskActivity, intent: Intent?)
    }

    inner class CallbackProxy : AccessibilitySvc.ServiceLifeCycleListener,
        GameBridgeService.Callback, AdProvider.OnCompleteListener, ScriptTileService.TileListener {

        override fun onCreate() {
            mBridge?.onAccessibilitySvcCreate()
        }

        override fun onDestroy() {
            mBridge?.onAccessibilitySvcDestroy()
        }

        override fun onRemoteEnabled() {
            mBridge?.onRemoteEnabled()
        }

        override fun onRemoteMessage(msg: Message) {
            mBridge?.onRemoteMessage(msg)
        }

        override fun onRemoteDisabled() {
            mBridge?.onRemoteDisabled()
        }

        override fun onComplete(provider: AdProvider, success: Boolean, message: String?) {
            if (mOnlineMode) return
            mOnlineMode = success
            mOfflineReason = message
            mManager.startScript()
        }

        override fun onReady(config: ScriptTileService.TileConfig) {
            mBridge?.onTileReady(config)
        }

        override fun onClick(config: ScriptTileService.TileConfig) {
            mBridge?.onTileClick(config)
        }
    }

    companion object {
        const val ACTION_ADD_LIBRARY = "com.xero.ca.ADD_LIBRARY"
        const val ACTION_EDIT_COMMAND = "com.xero.ca.EDIT_COMMAND"
        const val ACTION_START_ON_BOOT = "com.xero.ca.START_ON_BOOT"
        const val ACTION_START_FROM_BACKGROUND = "com.xero.ca.ACTION_START_FROM_BACKGROUND"
        const val ACTION_START_FROM_SHORTCUT = "com.xero.ca.ACTION_START_FROM_SHORTCUT"
        const val ACTION_START_FROM_QS_TILE = "com.xero.ca.ACTION_START_FROM_QS_TILE"
        const val ACTION_SCRIPT_ACTION = "com.xero.ca.ACTION_SCRIPT_ACTION"
        const val ACTION_URI_ACTION = "com.xero.ca.ACTION_URI_ACTION"
        const val ACTION_DEBUG_EXEC = "com.xero.ca.DEBUG_EXEC"

        @JvmStatic
        fun getInstance(): ScriptInterface? =
            if (ScriptManager.hasInstance()) ScriptManager.getInstance().getScriptInterface() else null

        @JvmStatic
        fun callIntent(ctx: Context, intent: Intent) {
            val instance = getInstance()
            if (instance != null) {
                Log.d("CA", "Pass intent to script: $intent")
                instance.mBridge?.onNewIntent(intent)
            } else {
                val showSplash = !Preference.getInstance(ctx).getHideSplash()
                val serviceIntent = Intent(ctx, ScriptService::class.java)
                serviceIntent.putExtra(Intent.EXTRA_INTENT, intent)
                Log.d("CA", "Launch service to process intent: $intent")
                Log.d("CA", "Source context: $ctx")
                if (ctx is Activity && showSplash) {
                    serviceIntent.action = ScriptService.ACTION_PREPARE
                    ctx.startActivity(
                        Intent(ctx, SplashActivity::class.java)
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    )
                } else {
                    serviceIntent.action = ScriptService.ACTION_RUN
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ctx.startForegroundService(serviceIntent)
                } else {
                    ctx.startService(serviceIntent)
                }
            }
        }

        @JvmStatic
        fun onSplashActivityCreate(activity: SplashActivity): Boolean {
            val instance = getInstance() ?: return false
            instance.mBindActivity = activity
            return true
        }

        @JvmStatic
        fun onSplashActivityDestroy(activity: SplashActivity) {
            getInstance()?.mBindActivity = null
        }

        @JvmStatic
        fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
            getInstance()?.mBridge?.onActivityResult(requestCode, resultCode, data)
        }

        @JvmStatic
        fun onBeginPermissionRequest(activity: PermissionRequestActivity) {
            getInstance()?.mBridge?.onBeginPermissionRequest(activity)
        }

        @JvmStatic
        fun onBeginForegroundTask(activity: ForegroundTaskActivity, intent: Intent?) {
            getInstance()?.mBridge?.onBeginForegroundTask(activity, intent)
        }

        @JvmStatic
        fun applyIntent(intent: Intent): Boolean {
            val instance = getInstance() ?: return true
            return instance.mBridge?.applyIntent(intent) ?: true
        }

        @JvmStatic
        fun notifyKeyEvent(event: KeyEvent) {
            getInstance()?.mBridge?.onKeyEvent(event)
        }
    }
}
