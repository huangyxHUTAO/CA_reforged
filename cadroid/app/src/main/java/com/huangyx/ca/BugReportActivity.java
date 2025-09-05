package com.huangyx.ca;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

public class BugReportActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getActionBar() != null) {
            getActionBar().setTitle("BugReport");
        }
        Bundle ex = getIntent().getExtras();
        if (ex != null) {
            final String em = ex.getString("exception", "");
            final int epid = ex.getInt("pid", 0);
            AlertDialog.Builder builder = new AlertDialog.Builder(this)
                    .setTitle("错误")
                    .setCancelable(false)
                    .setMessage("您好，命令助手出现了一个错误。您可以将这个错误反馈给我们，来推动命令助手社区版的更新。您也可以选择忽略。" +
                            "社区版作者联系方式：QQ-3353255023;Email-huangyxnycx@gmail.com\n\n" +
                            "错误信息：\n" + em)
                    .setPositiveButton("复制并关闭", (dia, w) -> {
                        setClipText(em);
                        finish();
                    })
                    .setNegativeButton("忽略", (dia, w) -> finish());
            if (epid != 0) {
                builder.setNeutralButton("立即停止", (dia, w) -> {
                    finish();
                    android.os.Process.killProcess(epid);
                    System.exit(0);
                });
            }
            builder.show();
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
