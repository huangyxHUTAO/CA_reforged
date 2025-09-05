package com.huangyx.ca;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Message;
import android.os.Messenger;
import android.os.RemoteException;
import android.widget.Toast;

import com.huangyx.ca.script.ScriptObject;

@ScriptObject
public class MCAdapter implements ServiceConnection, Handler.Callback {
    private Context mContext;
    private Handler mHandler;
    private String clientName;
    private int version;
    private boolean mConnected = false;
    private Messenger mRemote = null;
    private Messenger mClient;
    private Bundle mInfo;
    private String newVer = null;
    private int mPID;

    public MCAdapter(Context context, String clientName, int version) {
        mContext = context;
        this.clientName = clientName;
        this.version = version;
        mHandler = new Handler(context.getMainLooper());
        mHandler.post(new ConnectCommand());
        mInfo = new Bundle();
    }

    public void setNewVersion(String newVersion) {
        newVer = newVersion;
    }

    public void toast(final String str) {
        mHandler.post(() -> Toast.makeText(mContext, str, Toast.LENGTH_SHORT).show());
    }

    public void connect() {
        if (mConnected) return;
        try {
            Intent intent = new Intent("com.huangyx.ca.GameBridge");
            intent.setComponent(new ComponentName("com.huangyx.ca", "com.huangyx.ca.GameBridgeService"));
            mContext.bindService(intent, this, Context.BIND_AUTO_CREATE);
        } catch (Exception e) {
            toast("无法连接至命令助手安卓版\n" + e);
        }
    }

    public void disconnect() {
        if (!mConnected) return;
        mContext.unbindService(this);
    }

    public void send(Bundle bundle) throws RemoteException {
        if (mRemote == null) return;
        Message msg = Message.obtain();
        msg.what = 1;
        msg.replyTo = mClient;
        bundle.putInt("pid", mPID);
        msg.setData(bundle);
        mRemote.send(msg);
    }

    public void sendInit() {
        Bundle bundle = new Bundle();
        bundle.putString("action", "init");
        bundle.putString("platform", clientName);
        bundle.putInt("version", version);
        try {
            send(bundle);
        } catch (RemoteException e) {
            //do nothing
        }
    }

    public Bundle getBundle() {
        return mInfo;
    }

    public void update() throws RemoteException {
        Bundle bundle = new Bundle();
        bundle.putString("action", "info");
        bundle.putBundle("info", getBundle());
        send(bundle);
    }

    public void event(String name, String param) throws RemoteException {
        Bundle bundle = new Bundle();
        bundle.putString("action", "event");
        bundle.putString("name", name);
        bundle.putString("param", param);
        send(bundle);
    }

    public void resetMCV(String newVersion) {
        Bundle bundle = new Bundle();
        bundle.putString("action", "resetMCV");
        bundle.putString("version", newVersion);
        try {
            send(bundle);
        } catch (RemoteException e) {
            //do nothing
        }
    }

    @Override
    public void onServiceConnected(ComponentName cn, IBinder binder) {
        if (binder == null) {
            toast("命令助手安卓版已经与一个适配器连接。");
            return;
        }
        mConnected = true;
        mRemote = new Messenger(binder);
        mClient = new Messenger(new android.os.Handler(this));
        mPID = android.os.Process.myPid();
        sendInit();
        if (newVer != null) {
            resetMCV(newVer);
        }
    }

    @Override
    public void onServiceDisconnected(ComponentName cn) {
        mConnected = false;
        mRemote = null;
        toast("命令助手已断开与适配器的连接");
    }

    @Override
    public boolean handleMessage(Message msg) {
        if (msg.what == 2) sendInit();
        return false;
    }

    public class ConnectCommand implements Runnable {
        @Override
        public void run() {
            if (mConnected) return;
            connect();
            mHandler.postDelayed(this, 10000);
        }
    }
}
