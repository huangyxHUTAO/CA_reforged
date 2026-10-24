package com.huangyx.ca;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;

public class BugReportActivity extends Activity {
    private String mException = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.bug_report);

        Bundle ex = getIntent().getExtras();
        if (ex == null) {
            finish();
            return;
        }
        mException = ex.getString("exception", "");
        final int epid = ex.getInt("pid", 0);

        ((TextView) findViewById(R.id.bug_message))
                .setText(getString(R.string.bug_report_message) + mException);

        findViewById(R.id.bug_copy).setOnClickListener(v -> {
            setClipText(mException);
            finish();
        });
        findViewById(R.id.bug_ignore).setOnClickListener(v -> finish());

        View kill = findViewById(R.id.bug_kill);
        if (epid != 0) {
            kill.setVisibility(View.VISIBLE);
            kill.setOnClickListener(v -> {
                finish();
                android.os.Process.killProcess(epid);
                System.exit(0);
            });
        }
    }

    private void setClipText(String str) {
        ClipboardManager cm = ((ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE));
        if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("", str));
    }

    public static Intent createIntent(Context context, String message, int sourcePid) {
        Intent i = new Intent(context, BugReportActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        i.putExtra("exception", message);
        i.putExtra("pid", sourcePid);
        return i;
    }
}
