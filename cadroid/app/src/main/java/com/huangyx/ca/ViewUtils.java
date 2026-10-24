package com.huangyx.ca;

import android.widget.TextView;

/**
 * ColorOS 16 的兼容层。
 *
 * 通过 Rhino 反射直接调用 TextView.setTextColor 时，ColorOS 的 hook 会让
 * Paint 内部颜色状态与 mCurTextColor 不同步，表现为「读回正确、绘制时却用默认白」，
 * 最终在 onDraw 里抛 IllegalArgumentException: Invalid ID。
 *
 * 这里用编译期绑定再包一层：JS 依然通过反射调用，但真正落到 setTextColor 上的
 * 是普通 Java 调用，绕开那条有问题的反射路径。
 */
public final class ViewUtils {
    private ViewUtils() {
    }

    public static void setTextColor(TextView tv, int color) {
        tv.setTextColor(color);
    }
}
