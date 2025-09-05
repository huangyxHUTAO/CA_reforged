package com.huangyx.ca;

import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import android.os.Handler;
import android.support.annotation.NonNull;
import android.view.KeyEvent;

import com.huangyx.ca.script.ScriptObject;

public class ForegroundTaskActivity extends Activity {
    private Delegee mDelegee;
    private boolean mModal = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        ScriptInterface.onBeginForegroundTask(this, getIntent());
        if (mDelegee == null) {
            new Handler().post(this::finish);
        }
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        if (mDelegee != null) mDelegee.onRequestPermissionsResult(this, requestCode, permissions, grantResults);
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (mDelegee != null) mDelegee.onActivityResult(this, requestCode, resultCode, data);
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        if (mDelegee != null) mDelegee.onConfigurationChanged(this, newConfig);
        super.onConfigurationChanged(newConfig);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (mModal && (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_HOME)) {
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onPause() {
        if (mDelegee != null) mDelegee.onPause(this);
        super.onPause();
    }

    @Override
    protected void onResume() {
        if (mDelegee != null) mDelegee.onResume(this);
        super.onResume();
    }

    @Override
    protected void onStop() {
        if (mDelegee != null) mDelegee.onStop(this);
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        if (mDelegee != null) mDelegee.onDestroy(this);
        super.onDestroy();
    }

    @ScriptObject
    public void setDelegee(Delegee delegee) {
        mDelegee = delegee;
    }

    @ScriptObject
    public boolean isModal() {
        return mModal;
    }

    @ScriptObject
    public void setModal(boolean modal) {
        mModal = modal;
    }

    @ScriptObject
    public interface Delegee {
        void onPause(ForegroundTaskActivity activity);
        void onResume(ForegroundTaskActivity activity);
        void onStop(ForegroundTaskActivity activity);
        void onDestroy(ForegroundTaskActivity activity);
        void onConfigurationChanged(ForegroundTaskActivity activity, Configuration newConfig);
        void onActivityResult(ForegroundTaskActivity activity, int requestCode, int resultCode, Intent data);
        void onRequestPermissionsResult(ForegroundTaskActivity activity, int requestCode, String[] permissions, int[] grantResults);
    }
}
