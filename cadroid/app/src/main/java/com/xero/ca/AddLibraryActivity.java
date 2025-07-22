package com.huangyx.ca;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

public class AddLibraryActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        processIntent();
        finish();
    }

    private void processIntent() {
        Intent intent = getIntent();
        if (intent == null) return;
        Uri data = intent.getData();
        Intent target = new Intent(ScriptInterface.ACTION_ADD_LIBRARY, data);
        grantUriPermission(getPackageName(), data, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        ScriptInterface.callIntent(this, target);
    }
}
