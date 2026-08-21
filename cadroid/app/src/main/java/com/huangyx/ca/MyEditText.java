package com.huangyx.ca;

import android.content.Context;
import android.util.AttributeSet;
import android.widget.EditText;

public class MyEditText extends EditText {
    private OnSelectionChangeListener listener;

    public MyEditText(Context context) { super(context); }
    public MyEditText(Context context, AttributeSet attrs) { super(context, attrs); }

    public void setOnSelectionChangeListener(OnSelectionChangeListener l) { listener = l; }

    @Override
    protected void onSelectionChanged(int selStart, int selEnd) {
        super.onSelectionChanged(selStart, selEnd);
        if (listener != null) listener.onSelectionChanged(selStart, selEnd);
    }

    @Override
    public boolean performLongClick() {
        try {
            return super.performLongClick();
        } catch (ArrayIndexOutOfBoundsException e) {
            // 华为 EMUI 系统 bug：长按时 HandleView 注册 PositionListener 返回 -1
            // 崩溃: Editor$PositionListener.addSubscriber -> length=7; index=-1
            return false;
        }
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        try {
            return super.onTouchEvent(event);
        } catch (ArrayIndexOutOfBoundsException e) {
            // 华为 EMUI 系统 bug：触摸事件触发 InsertionHandleView 时 PositionListener 返回 -1
            // 崩溃: Editor$PositionListener.addSubscriber -> length=7; index=-1
            return false;
        }
    }
}