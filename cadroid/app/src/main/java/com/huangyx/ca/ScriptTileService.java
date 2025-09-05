package com.huangyx.ca;

import android.annotation.TargetApi;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.SystemClock;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;
import android.support.annotation.NonNull;
import android.util.Log;

import com.huangyx.ca.script.ScriptObject;

import java.lang.ref.WeakReference;

@TargetApi(Build.VERSION_CODES.N)
public class ScriptTileService extends TileService {
    private static WeakReference<ScriptTileService> sInstance = null;
    private static TileListener sListener;
    private static boolean sPending = false;
    private static boolean sPendingLaunch = false;
    private static long sLastLaunch = 0;

    public static ScriptTileService getInstance() {
        return sInstance != null ? sInstance.get() : null;
    }

    public static void setTileListener(TileListener listener) {
        sListener = listener;
        ScriptTileService instance = getInstance();
        if (listener != null) {
            sPendingLaunch = false;
        }
        if (instance != null) {
            instance.notifyUpdate();
        }
    }

    private Handler mHandler;
    private boolean mListening = false;

    @Override
    public void onCreate() {
        sInstance = new WeakReference<>(this);
        mHandler = new Handler(getMainLooper());
        super.onCreate();
    }

    @Override
    public void onDestroy() {
        sInstance = null;
        mHandler = null;
        super.onDestroy();
    }

    @Override
    public void onStartListening() {
        super.onStartListening();
        mListening = true;
        notifyUpdate();
    }

    @Override
    public void onStopListening() {
        mListening = false;
        super.onStopListening();
    }

    @Override
    public void onClick() {
        postCommand(UpdateTileCommand.TYPE_CLICK);
    }

    public void notifyUpdate() {
        if (mListening) {
            postCommand(UpdateTileCommand.TYPE_UPDATE);
        }
    }

    private void postCommand(int type) {
        Log.d("CA","Post Command:" + type + " sPending=" + sPending);
        if (mHandler != null && !sPending) {
            sPending = true;
            mHandler.post(new UpdateTileCommand(type));
        }
    }

    @ScriptObject
    public static class TileConfig {
        public static final int STATE_ACTIVE = Tile.STATE_ACTIVE;
        public static final int STATE_INACTIVE = Tile.STATE_INACTIVE;
        public static final int STATE_UNAVAILABLE = Tile.STATE_UNAVAILABLE;

        public CharSequence label;
        public CharSequence subtitle;
        public int state;

        @NonNull
        @Override
        public String toString() {
            return "[TileConfig@" + Integer.toHexString(hashCode()) + " label=" + label + ",subtitle=" + subtitle + ",state=" + state + "]";
        }
    }

    class UpdateTileCommand implements Runnable {
        static final int TYPE_UPDATE = 0;
        static final int TYPE_CLICK = 1;

        private int mType;
        private TileConfig mConfig;

        UpdateTileCommand(int type) {
            mType = type;
            mConfig = createTileConfig();
        }

        @Override
        public void run() {
            if (sListener != null) {
                if (mType == TYPE_CLICK) {
                    sListener.onClick(mConfig);
                } else {
                    sListener.onReady(mConfig);
                }
            } else {
                if (mType == TYPE_CLICK) {
                    Log.d("CA","Trying to launch service");
                    StartAppCommand command = new StartAppCommand();
                    if (isLocked()) {
                        unlockAndRun(command);
                    } else {
                        mHandler.post(command);
                    }
                } else {
                    updateTileDefault(mConfig);
                }
            }
            updateTile(mConfig);
            sPending = false;
            Log.d("CA","Command Executed:" + mType);
        }

        TileConfig createTileConfig() {
            TileConfig config = new TileConfig();
            Tile tile = getQsTile();
            if (tile != null) {
                config.label = tile.getLabel();
                config.state = tile.getState();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    config.subtitle = tile.getSubtitle();
                }
            }
            Log.d("CA","TileConfig created:" + config);
            return config;
        }

        void updateTile(TileConfig config) {
            Tile tile = getQsTile();
            if (tile == null) return;
            tile.setLabel(config.label);
            tile.setState(config.state);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                tile.setSubtitle(config.subtitle);
            }
            tile.updateTile();
            Log.d("CA","TileConfig updated:" + config);
        }
    }

    private void updateTileDefault(TileConfig config) {
        config.label = getText(R.string.app_name);
        if (sPendingLaunch && SystemClock.uptimeMillis() - sLastLaunch < 30000) {
            config.state = Tile.STATE_UNAVAILABLE;
        } else {
            config.state = Tile.STATE_INACTIVE;
        }
    }

    public interface TileListener {
        void onReady(TileConfig config);

        void onClick(TileConfig config);
    }

    class StartAppCommand implements Runnable {
        @Override
        public void run() {
            if (sPendingLaunch) return;
            ScriptInterface.callIntent(ScriptTileService.this, new Intent(ScriptInterface.ACTION_START_FROM_QS_TILE));
            sPendingLaunch = true;
            sLastLaunch = SystemClock.uptimeMillis();
            notifyUpdate();
        }
    }
}
