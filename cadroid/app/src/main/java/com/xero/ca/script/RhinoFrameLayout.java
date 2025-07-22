package com.huangyx.ca.script;

import android.annotation.TargetApi;
import android.content.Context;
import android.graphics.Outline;
import android.os.Build;
import android.util.AttributeSet;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewOutlineProvider;
import android.widget.FrameLayout;

@ScriptObject
public class RhinoFrameLayout extends FrameLayout {
    public static final int RETURN_TRUE = 1;
    public static final int RETURN_FALSE = -1;
    public static final int RETURN_DEFAULT = 0;

    public static final int DIRECTION_ALL = 0;
    public static final int DIRECTION_LEFT = 1;
    public static final int DIRECTION_TOP = 2;
    public static final int DIRECTION_RIGHT = 3;
    public static final int DIRECTION_BOTTOM = 4;

    private Callback mCallback;

    public RhinoFrameLayout(Context context, Callback callback) {
        super(context);
        if (callback == null) throw new IllegalArgumentException();
        mCallback = callback;
    }


    public RhinoFrameLayout(Context context) {
        super(context);
        mCallback = new DefaultCallback();
    }

    public RhinoFrameLayout(Context context, AttributeSet attrs) {
        super(context, attrs);
        mCallback = new DefaultCallback();
    }

    public RhinoFrameLayout(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        mCallback = new DefaultCallback();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int r = mCallback.dispatchKeyEvent(event, this);
        if (r == RETURN_TRUE) {
            return true;
        } else if (r == RETURN_FALSE) {
            return false;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        int r = mCallback.dispatchTouchEvent(ev, this);
        if (r == RETURN_TRUE) {
            return true;
        } else if (r == RETURN_FALSE) {
            return false;
        }
        return super.dispatchTouchEvent(ev);
    }

    public void setRoundRectRadius(int radius) {
        setRoundRectRadius(radius, DIRECTION_ALL);
    }

    public void setRoundRectRadius(int radius, int direction) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return;
        if (radius <= 0) {
            setClipToOutline(false);
        } else {
            setOutlineProvider(new RadiusProvider(radius, direction));
            setClipToOutline(true);
        }
    }

    @TargetApi(21)
	private static class RadiusProvider extends ViewOutlineProvider {
        float radius;
        int direction;

        public RadiusProvider(float radius, int direction) {
            this.radius = radius;
            this.direction = direction;
        }

        @Override
        public void getOutline(View view, Outline outline) {
            int intRadius = (int) Math.ceil(radius);
            switch (direction) {
                case DIRECTION_LEFT:
                    outline.setRoundRect(0, 0, view.getWidth() + intRadius, view.getHeight(), radius);
                    break;
                case DIRECTION_TOP:
                    outline.setRoundRect(0, 0, view.getWidth(), view.getHeight() + intRadius, radius);
                    break;
                case DIRECTION_RIGHT:
                    outline.setRoundRect(intRadius, 0, view.getWidth(), view.getHeight(), radius);
                    break;
                case DIRECTION_BOTTOM:
                    outline.setRoundRect(0, intRadius, view.getWidth() + intRadius, view.getHeight(), radius);
                    break;
                default:
                    outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), radius);
            }
        }
    }

    @ScriptObject
    public interface Callback {
        int dispatchKeyEvent(KeyEvent event, RhinoFrameLayout thisObj);
        int dispatchTouchEvent(MotionEvent ev, RhinoFrameLayout thisObj);
    }

    private static class DefaultCallback implements Callback {
        @Override
        public int dispatchKeyEvent(KeyEvent event, RhinoFrameLayout thisObj) {
            return RETURN_DEFAULT;
        }

        @Override
        public int dispatchTouchEvent(MotionEvent ev, RhinoFrameLayout thisObj) {
            return RETURN_DEFAULT;
        }
    }
}
