package com.huangyx.ca;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;

public class ScriptActionService extends Service {
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        ScriptInterface.callIntent(this, new Intent(ScriptInterface.ACTION_SCRIPT_ACTION));
        stopSelf();
        return super.onStartCommand(intent, flags, startId);
    }
}
