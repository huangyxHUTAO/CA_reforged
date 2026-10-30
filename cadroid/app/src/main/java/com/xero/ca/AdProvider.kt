package com.xero.ca

import android.annotation.SuppressLint

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.text.TextUtils
import android.view.View
import android.view.ViewGroup
import android.view.accessibility.AccessibilityNodeInfo

import com.qq.e.ads.splash.SplashAD
import com.qq.e.ads.splash.SplashADListener
import com.qq.e.comm.util.AdError
import com.xero.ca.gen.Secret
import com.xero.ca.script.AnalyticsPlatform

import java.lang.ref.WeakReference

/**
 * 开屏广告的封装。单例，启动页通过 prepare() 发起请求，
 * 结果通过 Listener / OnCompleteListener 回调；没配置广告位或首次启动时直接跳过。
 */
class AdProvider {
    private val mADListener = ADListener()
    private val mHandler = Handler(Looper.getMainLooper())

    private var mPaid = false
    private var mCompleted = false
    private var mPaused = false
    private var mDispatchWhenResume = false
    private var mPresentTime = 0L
    private var mPresentDuration = -1
    private var mAutoSkip = false
    private var mMessage: String? = null
    private var mActivity: WeakReference<Activity>? = null
    private var mListener: Listener? = null
    private var mOnCompleteListener: OnCompleteListener? = null
    private var mSplashAD: SplashAD? = null
    private var mContainer: ViewGroup? = null
    private var mAdShown = false

    fun prepare(activity: Activity, container: ViewGroup) {
        prepare(activity, container, null)
    }

    fun prepare(activity: Activity, container: ViewGroup, skipView: View?) {
        prepare(activity, container, skipView, null)
    }

    fun prepare(activity: Activity, container: ViewGroup, skipView: View?, listener: Listener?) {
        mActivity = WeakReference(activity)
        mListener = listener
        mContainer = container
        mPaused = false
        mDispatchWhenResume = false
        mPresentTime = 0
        mPresentDuration = -1
        mAutoSkip = false
        mAdShown = false
        mSplashAD = null
        synchronized(this) {
            mOnCompleteListener = null
            mCompleted = false
            mPaid = false
            mMessage = null
        }
        mHandler.removeCallbacksAndMessages(null)
        if (Preference.getInstance(activity).checkFirstRun() || !isAdEnabled()) {
            // 首次启动或未配置广告位时不请求广告，直接进入脚本
            mADListener.onADDismissed()
            return
        }
        // union 4.x 起 AppID 由 GDTAdSdk 初始化传入（见 XApplication），构造参数只保留广告位 ID；
        // 跳过按钮由 SDK 在 container 内自行绘制，不再使用 skipView。
        val ad = SplashAD(activity, Secret.getGDTPosID(), mADListener, 0)
        mSplashAD = ad
        ad.fetchAdOnly()
        skipView?.accessibilityDelegate = SkipChecker()
        mHandler.postDelayed({ mADListener.onADDismissed() }, AD_FETCH_TIMEOUT_MS.toLong())
    }

    fun runAfterComplete(listener: OnCompleteListener) {
        synchronized(this) {
            if (mCompleted) {
                listener.onComplete(this, mPaid, mMessage)
            } else {
                mOnCompleteListener = listener
            }
        }
    }

    private fun dispatchComplete(success: Boolean, message: String?) {
        synchronized(this) {
            if (!mCompleted) {
                mCompleted = true
                mPaid = success
                mMessage = message
                mOnCompleteListener?.onComplete(this, success, message)
            }
        }
    }

    private fun dispatchCompleteCheckSkip(success: Boolean, message: String?) {
        var ok = success
        var msg = message
        if (ok && mAutoSkip && mPresentDuration < 3000) {
            ok = false
            msg = "点击事件校验失败，请检查开发者选项内是否开启了调试点击"
            reportError(5212, msg)
        }
        dispatchComplete(ok, msg)
    }

    fun isCompleted(): Boolean {
        synchronized(this) {
            return mCompleted
        }
    }

    fun getPresentDuration(): Int = mPresentDuration

    fun pause() {
        mPaused = true
    }

    fun resume() {
        mPaused = false
        if (mDispatchWhenResume) {
            mDispatchWhenResume = false
            dispatchCompleteCheckSkip(true, null)
        }
    }

    fun release() {
        mActivity = null
        mContainer = null
        mSplashAD = null
        mHandler.removeCallbacksAndMessages(null)
        dispatchComplete(false, null)
        mListener = null
        mOnCompleteListener = null
    }

    private fun reportError(errorCode: Int, errorMsg: String?) {
        // GDT 似乎有时会在 Activity 被 destroy 后调用此方法
        val ref = mActivity ?: return
        val activity = ref.get() ?: return
        AnalyticsPlatform.reportAdError(activity, errorCode, errorMsg)
    }

    inner class ADListener : SplashADListener {
        override fun onADDismissed() {
            mHandler.removeCallbacksAndMessages(null)
            mPresentDuration = (SystemClock.uptimeMillis() - mPresentTime).toInt()
            if (mPaused) {
                mDispatchWhenResume = true
            } else {
                dispatchCompleteCheckSkip(true, null)
            }
            mListener?.onComplete()
        }

        override fun onNoAD(adError: AdError?) {
            mHandler.removeCallbacksAndMessages(null)
            val errorCode = adError?.errorCode ?: 0
            val errorMsg = adError?.errorMsg
            val adEnabled = errorCode >= 5000
            reportError(errorCode, errorMsg)
            dispatchComplete(adEnabled, errorMsg)
        }

        override fun onADLoaded(l: Long) {
            // 广告拉取完成，此时才能交给 SDK 展示到 container 中（切回主线程再操作 View）
            mHandler.post {
                val ad = mSplashAD
                val container = mContainer
                if (ad == null || container == null || mAdShown || isCompleted()) return@post
                mAdShown = true
                ad.showAd(container)
            }
        }

        override fun onADPresent() {
            mPresentTime = SystemClock.uptimeMillis()
            mListener?.onPresent()
        }

        override fun onADClicked() {}

        override fun onADTick(l: Long) {
            mListener?.onTick((l / 1000).toInt())
        }

        override fun onADExposure() {}
    }

    inner class SkipChecker : View.AccessibilityDelegate() {
        override fun performAccessibilityAction(host: View, action: Int, args: Bundle?): Boolean {
            if (action == AccessibilityNodeInfo.ACTION_CLICK) { // 被无障碍模拟点击了
                mAutoSkip = true
            }
            return super.performAccessibilityAction(host, action, args)
        }
    }

    interface Listener {
        fun onPresent()
        fun onTick(secondsLeft: Int)
        fun onComplete()
    }

    interface OnCompleteListener {
        fun onComplete(provider: AdProvider, success: Boolean, message: String?)
    }

    companion object {
        /** 广告从开始请求到展示的最长等待时间，超时后按“没有广告”处理，避免一直卡在启动页 */
        private const val AD_FETCH_TIMEOUT_MS = 10000

        // 单例持有 ViewGroup 会被 lint 判为 StaticFieldLeak。
        // 实际不会泄漏：release() 里会把 mContainer / mActivity 全部置空（见第 137 行）。
        @SuppressLint("StaticFieldLeak")
        private val sInstance = AdProvider()

        @JvmStatic
        fun getInstance(): AdProvider = sInstance

        @JvmStatic
        private fun isAdEnabled(): Boolean =
            // GDT_ENABLED：构建时是否装配了优量汇（广告 + 转化两个 SDK 是一套，见 app/build.gradle）
            // GDT_ENABLED：构建期是否装配了优量汇
            // GdtState.ready：运行期是否真的初始化成功（缺 libturingad.so 时为 false）
            BuildConfig.GDT_ENABLED &&
                GdtState.ready &&
                !TextUtils.isEmpty(Secret.getGDTAppID()) &&
                !TextUtils.isEmpty(Secret.getGDTPosID())
    }
}
