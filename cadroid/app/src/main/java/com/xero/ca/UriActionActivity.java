package com.huangyx.ca;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

public class UriActionActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        processIntent();
        finish();
    }

    private void processIntent() {
        Intent intent = getIntent();
        if (intent == null) return;
        Intent target = new Intent(ScriptInterface.ACTION_URI_ACTION);
        target.setDataAndType(intent.getData(), intent.getType());
        target.putExtras(intent);
        ScriptInterface.callIntent(this, target);
    }
}
