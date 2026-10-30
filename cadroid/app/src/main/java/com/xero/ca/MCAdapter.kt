package com.xero.ca

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Message
import android.os.Messenger
import android.os.RemoteException
import android.widget.Toast

import com.xero.ca.script.ScriptObject

/**
 * 运行在游戏进程里的适配器侧的连接封装（由脚本创建）。
 *
 * 注意：这里连的是 com.xero.ca 包下的 GameBridgeService，action/组件名是硬编码字符串，
 * 改包名时需要同步修改，不能依赖当前的 applicationId。
 */
@ScriptObject
class MCAdapter(
    private val mContext: Context,
    private val clientName: String,
    private val version: Int,
) : ServiceConnection, Handler.Callback {
    private val mHandler = Handler(mContext.mainLooper)
    private var mConnected = false
    private var mRemote: Messenger? = null
    private var mClient: Messenger? = null
    private val mInfo = Bundle()
    private var newVer: String? = null
    private var mPID = 0

    init {
        mHandler.post(ConnectCommand())
    }

    fun setNewVersion(newVersion: String?) {
        newVer = newVersion
    }

    fun toast(str: String) {
        mHandler.post { Toast.makeText(mContext, str, Toast.LENGTH_SHORT).show() }
    }

    fun connect() {
        if (mConnected) return
        try {
            val intent = Intent("com.xero.ca.GameBridge")
            intent.component = ComponentName("com.xero.ca", "com.xero.ca.GameBridgeService")
            mContext.bindService(intent, this, Context.BIND_AUTO_CREATE)
        } catch (e: Exception) {
            toast("无法连接至命令助手安卓版\n$e")
        }
    }

    fun disconnect() {
        if (!mConnected) return
        mContext.unbindService(this)
    }

    @Throws(RemoteException::class)
    fun send(bundle: Bundle) {
        val remote = mRemote ?: return
        val msg = Message.obtain()
        msg.what = 1
        msg.replyTo = mClient
        bundle.putInt("pid", mPID)
        msg.data = bundle
        remote.send(msg)
    }

    fun sendInit() {
        val bundle = Bundle()
        bundle.putString("action", "init")
        bundle.putString("platform", clientName)
        bundle.putInt("version", version)
        try {
            send(bundle)
        } catch (e: RemoteException) {
        }
    }

    fun getBundle(): Bundle = mInfo

    @Throws(RemoteException::class)
    fun update() {
        val bundle = Bundle()
        bundle.putString("action", "info")
        bundle.putBundle("info", getBundle())
        send(bundle)
    }

    @Throws(RemoteException::class)
    fun event(name: String, param: String?) {
        val bundle = Bundle()
        bundle.putString("action", "event")
        bundle.putString("name", name)
        bundle.putString("param", param)
        send(bundle)
    }

    fun resetMCV(newVersion: String?) {
        val bundle = Bundle()
        bundle.putString("action", "resetMCV")
        bundle.putString("version", newVersion)
        try {
            send(bundle)
        } catch (e: RemoteException) {
        }
    }

    override fun onServiceConnected(cn: ComponentName, binder: IBinder?) {
        if (binder == null) {
            toast("命令助手安卓版已经与一个适配器连接。")
            return
        }
        mConnected = true
        mRemote = Messenger(binder)
        mClient = Messenger(Handler(this))
        mPID = android.os.Process.myPid()
        sendInit()
        newVer?.let { resetMCV(it) }
    }

    override fun onServiceDisconnected(cn: ComponentName) {
        mConnected = false
        mRemote = null
        toast("命令助手已断开与适配器的连接")
    }

    override fun handleMessage(msg: Message): Boolean {
        if (msg.what == 2) sendInit()
        return false
    }

    inner class ConnectCommand : Runnable {
        override fun run() {
            if (mConnected) return
            connect()
            mHandler.postDelayed(this, 10000)
        }
    }
}
