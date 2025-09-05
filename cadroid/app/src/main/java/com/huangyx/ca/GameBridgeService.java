package com.huangyx.ca;

import android.app.Service;
import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.os.Message;
import android.os.Messenger;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class GameBridgeService extends Service implements Handler.Callback {
    public static WeakReference<GameBridgeService> instance = new WeakReference<>(null);
    private static Callback mCallback;
    private static List<Message> mQueue = Collections.synchronizedList(new ArrayList<>());
    private Handler mHandler = new Handler(this);

    public static void setCallback(Callback c) {
        mCallback = c;
        if (isConnected()) c.onRemoteEnabled();
        if (mQueue.size() > 0) {
            for (Message e : mQueue) {
                c.onRemoteMessage(e);
            }
            mQueue.clear();
        }
    }

    public static void removeCallback() {
        mCallback = null;
    }

    public static boolean isConnected() {
        return instance.get() != null;
    }

    @Override
    public IBinder onBind(Intent intent) {
        if (instance.get() != null) return null;
        instance = new WeakReference<>(this);
        if (ScriptManager.hasInstance()) {
            runMain();
        }
        if (mCallback != null) mCallback.onRemoteEnabled();
        return new Messenger(mHandler).getBinder();
    }

    @Override
    public boolean onUnbind(Intent intent) {
        instance.clear();
        mQueue.clear();
        if (mCallback != null) mCallback.onRemoteDisabled();
        return super.onUnbind(intent);
    }

    @Override
    public boolean handleMessage(Message msg) {
        if (mCallback != null) {
            mCallback.onRemoteMessage(msg);
        } else {
            mQueue.add(msg);
        }
        return false;
    }

    private void runMain() {
		/* TODO: fix it
		Intent i = new Intent(this, MainActivity.class).setAction(MainActivity.ACTION_START_FROM_BACKGROUND).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_FROM_BACKGROUND);
		startActivity(i);
		*BUG：从适配器打开时，适配器所在Activity闪退
		 java.lang.RuntimeException: Performing stop of activity that is not resumed: {com.huangyx.ca/com.huangyx.ca.MainActivity}
		*/
    }

    public interface Callback {
        void onRemoteEnabled();

        void onRemoteMessage(Message msg);

        void onRemoteDisabled();
    }
}
