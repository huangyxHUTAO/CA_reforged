package com.huangyx.ca;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.text.TextUtils;

import java.io.File;
import java.lang.ref.WeakReference;

public class ScriptService extends Service {
    private static WeakReference<ScriptService> sInstance = null;
    private static final String DEFAULT_CHANNEL = "default";

    public static final String ACTION_PREPARE = "com.huangyx.ca.script.ACTION_PREPARE";
    public static final String ACTION_RUN = "com.huangyx.ca.script.ACTION_RUN";

    private ScriptManager mManager;
    private Intent mLastIntent;

    @Override
	public int onStartCommand(Intent intent, int flags, int startId) {
        if (sInstance != null) {
            // 已有实例在运行
            return super.onStartCommand(intent, flags, startId);
        }
        // 设置当前实例
        sInstance = new WeakReference<>(this);
        if (intent == null) {
            stopSelf();
            return super.onStartCommand(null, flags, startId);
        }

        Intent realIntent = intent.getParcelableExtra(Intent.EXTRA_INTENT);
        if (realIntent == null) {
            stopSelf();
            return super.onStartCommand(intent, flags, startId);
        }
        mLastIntent = realIntent;
        String sourceName = getString(R.string.app_name);
        String src = Preference.getInstance(this).getDebugSource();
        if (ScriptInterface.ACTION_DEBUG_EXEC.equals(realIntent.getAction()) && !TextUtils.isEmpty(src)) {
            mManager = ScriptManager.createDebuggable(src);
        } else {
            mManager = ScriptManager.getInstance();
        }
        if (mManager == null || mManager.isRunning()) {
            stopSelf();
        } else {
            mManager.setCacheDir(getCacheDir().getPath());
            checkHotfix(); // 检查并应用“快速更新”
            if (ACTION_PREPARE.equals(intent.getAction())) {
                mManager.prepareScript(this, sourceName, false);
            } else if (ACTION_RUN.equals(intent.getAction())) {
                mManager.prepareScript(this, sourceName, true);
            }
            startForeground(1, createNotification());
        }
        return super.onStartCommand(intent, flags, startId);
	}

    @Override
    public void onDestroy() {
        if (mManager != null) mManager.endScript();
        sInstance = null;
        super.onDestroy();
    }

    @Override
	public IBinder onBind(Intent intent) {
		return null;
	}

    // 获取“快速更新”的js文件并直接使用
    private void checkHotfix() {
        File base = getDir("rhino", MODE_PRIVATE);
        File core = new File(base, "core.js");
        if (!core.isFile()) return;
        File sign = new File(base, "core.sign");
        mManager.setHotfix(core.getPath(), sign.getPath(), new byte[0], BuildConfig.VERSION_CODE);
    }

    @Override
    public void startActivity(Intent intent) {
        if (ScriptInterface.applyIntent(intent)) {
            super.startActivity(intent);
        }
    }

    public Intent getLastIntent() {
        return mLastIntent;
    }

    public Notification createNotification() {
        int intentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            intentFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        Notification.Builder nof = createNotificationBuilder()
                .setContentTitle("命令助手")
                .setContentText("正在运行中...")
                .setSmallIcon(R.mipmap.icon_small)
                .setLargeIcon(BitmapFactory.decodeResource(getResources(), R.mipmap.icon_small))
                .setContentIntent(
                        PendingIntent.getService(
                                this,
                                1,
                                new Intent(
                                        this,
                                        ScriptActionService.class
                                ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                                intentFlags
                        )
                );
        return nof.build();
    }

    @SuppressWarnings("deprecation")
    private Notification.Builder createNotificationBuilder() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(DEFAULT_CHANNEL, "保持活跃", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("快速管理命令助手");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
            return new Notification.Builder(this, DEFAULT_CHANNEL);
        } else {
            return new Notification.Builder(this);
        }
    }
}
