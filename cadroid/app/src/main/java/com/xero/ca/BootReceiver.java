package com.huangyx.ca;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            if (Preference.getInstance(context).getBootStart()) {
                ScriptInterface.callIntent(context, new Intent(ScriptInterface.ACTION_START_ON_BOOT));
            }
        }
    }
}
