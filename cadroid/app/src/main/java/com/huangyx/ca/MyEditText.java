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
}