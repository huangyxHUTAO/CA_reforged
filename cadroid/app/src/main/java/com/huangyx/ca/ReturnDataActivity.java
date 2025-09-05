package com.huangyx.ca;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;

public class ReturnDataActivity extends Activity {
    public static final String EXTRA_INTENT = "com.huangyx.ca.EXTRA_INTENT";
    public static final String EXTRA_REQUEST_CODE = "com.huangyx.ca.EXTRA_REQUEST_CODE";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent lastIntent = getIntent();
        if (lastIntent != null) {
            Intent intent = null;
            int requrestCode = 0;
            try {
                intent = lastIntent.getParcelableExtra(EXTRA_INTENT);
                requrestCode = lastIntent.getIntExtra(EXTRA_REQUEST_CODE,0);
            } catch (ClassCastException e) {
                //Ignore this exception
            }
            if (intent != null) {
                startActivityForResult(intent, requrestCode);
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            finishAndRemoveTask();
        } else {
            finish();
        }
        ScriptInterface.onActivityResult(requestCode, resultCode, data);
    }

    public static Intent createIntent(Context context, Intent intent, int requestCode) {
        return new Intent(context, ReturnDataActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                .putExtra(EXTRA_INTENT, intent)
                .putExtra(EXTRA_REQUEST_CODE, requestCode);
    }
}
