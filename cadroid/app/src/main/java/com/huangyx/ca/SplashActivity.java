package com.huangyx.ca;

import android.app.Activity;
import android.content.res.Configuration;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.view.KeyEvent;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.TextView;

public class SplashActivity extends Activity {
    private TextView mLoadingTitleView;
    private FrameLayout mAdContainer;
    private TextView mAdSkipView;
    private TextView mAdSecondsView;
    private AdProvider mProvider;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        setContentView(R.layout.main);
        mLoadingTitleView = findViewById(R.id.loadingTitle);
        mAdContainer = findViewById(R.id.adContainer);
        mAdSkipView = findViewById(R.id.skipView);
        mAdSecondsView = findViewById(R.id.secondsLeft);
        super.onCreate(savedInstanceState);
        if (!ScriptInterface.onSplashActivityCreate(this)) {
            finish();
        }
        mProvider = AdProvider.getInstance();
        mProvider.prepare(this, mAdContainer, mAdSkipView, new AdListener());
    }

    @Override
    protected void onDestroy() {
        ScriptInterface.onSplashActivityDestroy(this);
        mProvider.release();
        super.onDestroy();
    }

    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (!mProvider.isCompleted() && (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_HOME)) {
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onPause() {
        mProvider.pause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        mProvider.resume();
        super.onResume();
    }

    public void setLoadingTitle(String title) {
        runOnUiThread(new SetLoadingTitleTask(title));
    }

    class SetLoadingTitleTask implements Runnable {
        private String title;

        public SetLoadingTitleTask(String title) {
            this.title = title;
        }

        @Override
        public void run() {
            mLoadingTitleView.setText(title);
        }
    }

    class AdListener implements AdProvider.Listener {
        @Override
        public void onPresent() {
            mAdSecondsView.setVisibility(View.VISIBLE);
            mAdSkipView.setVisibility(View.VISIBLE);
        }

        @Override
        public void onTick(int secondsLeft) {
            String text = getText(R.string.ad_seconds_left).toString();
            mAdSecondsView.setText(String.format(text, secondsLeft));
        }

        @Override
        public void onComplete() {
            mAdContainer.setVisibility(View.GONE);
            mAdSecondsView.setVisibility(View.GONE);
            mAdSkipView.setVisibility(View.GONE);
        }
    }
}
