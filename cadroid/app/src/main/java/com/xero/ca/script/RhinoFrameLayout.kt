package com.xero.ca.script

import android.content.Context
import android.graphics.Outline
import android.util.AttributeSet
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import kotlin.math.ceil

/**
 * 供脚本接管按键/触摸分发的 FrameLayout。
 *
 * 脚本通过 Callback 返回 RETURN_TRUE / RETURN_FALSE / RETURN_DEFAULT 来决定是否吞掉事件，
 * 也可以用 setRoundRectRadius 给容器加圆角（按方向选择性裁切）。
 */
@ScriptObject
class RhinoFrameLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : FrameLayout(context, attrs, defStyleAttr) {
    private var mCallback: Callback

    constructor(context: Context, callback: Callback?) : this(context) {
        requireNotNull(callback) { "Callback can't be null" }
        mCallback = callback
    }

    init {
        mCallback = DefaultCallback()
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        val r = mCallback.dispatchKeyEvent(event, this)
        if (r == RETURN_TRUE) {
            return true
        } else if (r == RETURN_FALSE) {
            return false
        }
        return super.dispatchKeyEvent(event)
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        val r = mCallback.dispatchTouchEvent(ev, this)
        if (r == RETURN_TRUE) {
            return true
        } else if (r == RETURN_FALSE) {
            return false
        }
        return super.dispatchTouchEvent(ev)
    }

    @JvmOverloads
    fun setRoundRectRadius(radius: Int, direction: Int = DIRECTION_ALL) {
        if (radius <= 0) {
            clipToOutline = false
        } else {
            outlineProvider = RadiusProvider(radius.toFloat(), direction)
            clipToOutline = true
        }
    }

    @ScriptObject
    interface Callback {
        fun dispatchKeyEvent(event: KeyEvent, thisObj: RhinoFrameLayout): Int
        fun dispatchTouchEvent(ev: MotionEvent, thisObj: RhinoFrameLayout): Int
    }

    private class RadiusProvider(
        private val radius: Float,
        private val direction: Int,
    ) : ViewOutlineProvider() {
        override fun getOutline(view: View, outline: Outline) {
            val intRadius = ceil(radius.toDouble()).toInt()
            when (direction) {
                DIRECTION_LEFT -> outline.setRoundRect(0, 0, view.width + intRadius, view.height, radius)
                DIRECTION_TOP -> outline.setRoundRect(0, 0, view.width, view.height + intRadius, radius)
                DIRECTION_RIGHT -> outline.setRoundRect(intRadius, 0, view.width, view.height, radius)
                DIRECTION_BOTTOM -> outline.setRoundRect(0, intRadius, view.width + intRadius, view.height, radius)
                else -> outline.setRoundRect(0, 0, view.width, view.height, radius)
            }
        }
    }

    private class DefaultCallback : Callback {
        override fun dispatchKeyEvent(event: KeyEvent, thisObj: RhinoFrameLayout): Int = RETURN_DEFAULT
        override fun dispatchTouchEvent(ev: MotionEvent, thisObj: RhinoFrameLayout): Int = RETURN_DEFAULT
    }

    companion object {
        const val RETURN_TRUE = 1
        const val RETURN_FALSE = -1
        const val RETURN_DEFAULT = 0

        const val DIRECTION_ALL = 0
        const val DIRECTION_LEFT = 1
        const val DIRECTION_TOP = 2
        const val DIRECTION_RIGHT = 3
        const val DIRECTION_BOTTOM = 4
    }
}
