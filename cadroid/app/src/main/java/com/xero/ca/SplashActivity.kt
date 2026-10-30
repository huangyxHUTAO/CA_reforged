package com.xero.ca

import android.app.Activity
import android.content.res.Configuration
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.widget.FrameLayout
import android.widget.TextView

class SplashActivity : Activity() {
    private lateinit var mLoadingTitleView: TextView
    private lateinit var mAdContainer: FrameLayout
    private lateinit var mAdSkipView: TextView
    private lateinit var mAdSecondsView: TextView
    private lateinit var mProvider: AdProvider

    override fun onCreate(savedInstanceState: Bundle?) {
        setContentView(R.layout.main)
        mLoadingTitleView = findViewById(R.id.loadingTitle)
        mAdContainer = findViewById(R.id.adContainer)
        mAdSkipView = findViewById(R.id.skipView)
        mAdSecondsView = findViewById(R.id.secondsLeft)
        super.onCreate(savedInstanceState)
        if (!ScriptInterface.onSplashActivityCreate(this)) {
            finish()
        }
        mProvider = AdProvider.getInstance()
        mProvider.prepare(this, mAdContainer, mAdSkipView, AdListener())
    }

    override fun onDestroy() {
        ScriptInterface.onSplashActivityDestroy(this)
        mProvider.release()
        super.onDestroy()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        return !mProvider.isCompleted() &&
                (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_HOME) || super.onKeyDown(keyCode, event)
    }

    override fun onPause() {
        mProvider.pause()
        super.onPause()
    }

    override fun onResume() {
        mProvider.resume()
        super.onResume()
    }

    fun setLoadingTitle(title: String) {
        runOnUiThread(SetLoadingTitleTask(title))
    }

    internal inner class SetLoadingTitleTask(private val title: String) : Runnable {
        override fun run() {
            mLoadingTitleView.text = title
        }
    }

    internal inner class AdListener : AdProvider.Listener {
        override fun onPresent() {
            mAdSecondsView.visibility = View.VISIBLE
            // 新版优量汇 SDK 会在 adContainer 内自行绘制带倒计时的“跳过”按钮，
            // 布局里的 skipView 不再交给 SDK，保持隐藏即可
        }

        override fun onTick(secondsLeft: Int) {
            val text = getText(R.string.ad_seconds_left).toString()
            mAdSecondsView.text = String.format(text, secondsLeft)
        }

        override fun onComplete() {
            mAdContainer.visibility = View.GONE
            mAdSecondsView.visibility = View.GONE
            mAdSkipView.visibility = View.GONE
        }
    }
}
