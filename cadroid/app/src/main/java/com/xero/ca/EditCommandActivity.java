package com.huangyx.ca;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

public class EditCommandActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        processIntent();
        finish();
    }

    private void processIntent() {
        Intent intent = getIntent();
        if (intent == null) return;
        Bundle extras = intent.getExtras();
        if (extras == null) return;
        Intent target = new Intent(ScriptInterface.ACTION_EDIT_COMMAND);
        target.putExtra("text", extras.getString(Intent.EXTRA_TEXT, ""));
        ScriptInterface.callIntent(this, target);
    }
}
