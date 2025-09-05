package com.huangyx.ca;

import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.support.annotation.NonNull;

import com.huangyx.ca.script.ScriptObject;

public class PermissionRequestActivity extends Activity {
    private Callback mCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        ScriptInterface.onBeginPermissionRequest(this);
        if (mCallback == null) {
            new Handler().post(this::finish);
        }
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        if (mCallback != null) mCallback.onRequestPermissionsResult(this, requestCode, permissions, grantResults);
    }

    @Override
    protected void onDestroy() {
        if (mCallback != null) mCallback.onEndPermissionRequest(this);
        super.onDestroy();
    }

    @ScriptObject
    @Override
    public boolean shouldShowRequestPermissionRationale(@NonNull String permission) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return super.shouldShowRequestPermissionRationale(permission);
        }
        return false;
    }

    @ScriptObject
    public void setCallback(Callback callback) {
        mCallback = callback;
    }

    @ScriptObject
    public void requestPermissionsCompat(final int requestCode, final String[] permissions) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            requestPermissions(permissions, requestCode);
        } else {
            Handler handler = new Handler(getMainLooper());
            handler.post(() -> {
                final int[] grantResults = new int[permissions.length];
                PackageManager packageManager = getPackageManager();
                String packageName = getPackageName();
                final int permissionCount = permissions.length;
                for (int i = 0; i < permissionCount; i++) {
                    grantResults[i] = packageManager.checkPermission(
                            permissions[i], packageName);
                }
                onRequestPermissionsResult(requestCode, permissions, grantResults);
            });
        }
    }

    @ScriptObject
    public interface Callback {
        void onRequestPermissionsResult(PermissionRequestActivity activity, int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults);

        void onEndPermissionRequest(PermissionRequestActivity activity);
    }
}
