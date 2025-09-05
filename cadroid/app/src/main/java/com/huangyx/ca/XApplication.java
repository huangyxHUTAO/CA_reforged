package com.huangyx.ca;

import android.app.Application;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Environment;
import android.util.Log;

import java.io.FileOutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.text.SimpleDateFormat;
import java.util.Date;

public class XApplication extends Application {
    public static final String TAG = "CA";

    public static String getPackageVersion(Context ctx) {
        try {
            return ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException e) {
            //do nothing
        }
        return null;
    }

    public static void reportError(Context ctx, Thread t, Throwable e) {
        Log.e(TAG, t.toString(), e);
        StringWriter s = new StringWriter();
        s.append("Version ").append(getPackageVersion(ctx)).append("\n");
        e.printStackTrace(new PrintWriter(s));
        try {
            PrintWriter fs = new PrintWriter(new FileOutputStream(Environment.getExternalStorageDirectory().getAbsolutePath() + "/com.huangyx.ca.error.log", true));
            fs.println("* Error: " + SimpleDateFormat.getDateTimeInstance().format(new Date()));
            fs.println("FATAL:" + s);
            fs.close();
        } catch (Exception err) {
            Log.e(TAG, "I/O Error", err);
        }
        ctx.startActivity(BugReportActivity.createIntent(ctx, s.toString(), 0));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Thread.setDefaultUncaughtExceptionHandler(new ErrorCatcher());
    }

    public class ErrorCatcher implements Thread.UncaughtExceptionHandler {
        @Override
        public void uncaughtException(Thread t, Throwable e) {
            reportError(XApplication.this, t, e);
            android.os.Process.killProcess(android.os.Process.myPid());
            System.exit(0);
        }
    }
}
