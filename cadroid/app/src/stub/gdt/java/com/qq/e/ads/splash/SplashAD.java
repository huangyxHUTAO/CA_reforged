package com.qq.e.ads.splash;

import android.content.Context;
import android.view.ViewGroup;

/**
 * 优量汇 SplashAD 的空实现（桩）。
 *
 * 只在本地缺 GDTActionSDK aar 时参与编译：广告与转化 SDK 是配套的，缺一个就整套不装配。
 * 此时 AdProvider 里的 BuildConfig.GDT_ENABLED 为 false，不会走到这里；
 * 本类只是为了让引用它的代码仍能编译通过。
 */
public final class SplashAD {
    public SplashAD(Context context, String posId, SplashADListener listener, int fetchDelay) {
    }

    public void fetchAdOnly() {
    }

    public void showAd(ViewGroup container) {
    }
}
