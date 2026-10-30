package com.xero.ca

/**
 * 优量汇（GDT）运行期状态。
 *
 * 与 BuildConfig.GDT_ENABLED 的区别：
 *  - GDT_ENABLED  是**构建期**判断：aar 在不在、AppID/POSID 配没配
 *  - GdtState     是**运行期**判断：SDK 是否真的初始化成功
 *
 * 为什么需要后者：GDT 依赖原生库 libturingad.so。用 AAB 分体分发时，
 * 只装 base 包（不带 ABI 分体）的设备上没有这个 .so，初始化会抛
 * UnsatisfiedLinkError（这是 Error，不是 Exception）。
 * 那种情况下应用应该照常运行，只是没有广告。
 */
object GdtState {
    @Volatile
    var ready: Boolean = false
        internal set
}
