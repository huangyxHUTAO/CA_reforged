package com.huangyx.ca;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Message;
import android.util.Log;
import android.view.KeyEvent;

import com.huangyx.ca.script.RhinoFrameLayout;
import com.huangyx.ca.script.RhinoWebSocketClientHelper;
import com.huangyx.ca.script.RhinoWebSocketServerHelper;
import com.huangyx.ca.script.RhinoWebView;
import com.huangyx.ca.script.ScriptObject;

import org.mozilla.javascript.Scriptable;

import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;

@ScriptObject
@SuppressWarnings({"WeakerAccess", "unused"})
public class ScriptInterface {
    public static final String ACTION_ADD_LIBRARY = "com.huangyx.ca.ADD_LIBRARY";
    public static final String ACTION_EDIT_COMMAND = "com.huangyx.ca.EDIT_COMMAND";
    public static final String ACTION_START_ON_BOOT = "com.huangyx.ca.START_ON_BOOT";
    public static final String ACTION_START_FROM_BACKGROUND = "com.huangyx.ca.ACTION_START_FROM_BACKGROUND";
    public static final String ACTION_START_FROM_SHORTCUT = "com.huangyx.ca.ACTION_START_FROM_SHORTCUT";
    public static final String ACTION_START_FROM_QS_TILE = "com.huangyx.ca.ACTION_START_FROM_QS_TILE";
    public static final String ACTION_SCRIPT_ACTION = "com.huangyx.ca.ACTION_SCRIPT_ACTION";
    public static final String ACTION_URI_ACTION = "com.huangyx.ca.ACTION_URI_ACTION";
    public static final String ACTION_DEBUG_EXEC = "com.huangyx.ca.DEBUG_EXEC";

    private ScriptManager mManager;
	private Context mContext;
	private SplashActivity mBindActivity;
	private ScriptService mBindService;
	private Thread mUiThread;
	private Handler mUiHandler;
	private Preference mPreference;
    private Bridge mBridge;
    private CallbackProxy mCallbackProxy;
    private boolean mOnlineMode = false;
    private String mOfflineReason = null;

	public ScriptInterface(ScriptManager manager) {
		mManager = manager;
        mContext = mManager.getBindContext();
        if (mContext instanceof ScriptService) {
            mBindService = (ScriptService) mContext;
        }
        mUiHandler = new Handler(mContext.getMainLooper());
        mUiThread = mContext.getMainLooper().getThread();
        mPreference = Preference.getInstance(mContext);
        mCallbackProxy = new CallbackProxy();
	}

    public static void callIntent(Context ctx, Intent intent) {
        ScriptInterface instance = getInstance();
        if (instance != null) {
            Log.d("CA", "Pass intent to script: " + intent);
            if (instance.mBridge != null) instance.mBridge.onNewIntent(intent);
        } else {
            boolean showSplash = !Preference.getInstance(ctx).getHideSplash();
            Intent serviceIntent = new Intent(ctx, ScriptService.class);
            serviceIntent.putExtra(Intent.EXTRA_INTENT, intent);
            Log.d("CA", "Launch service to process intent: " + intent);
            Log.d("CA", "Source context: " + ctx);
            if (ctx instanceof Activity && showSplash) {
                serviceIntent.setAction(ScriptService.ACTION_PREPARE);
                ctx.startActivity(new Intent(ctx, SplashActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            } else {
                serviceIntent.setAction(ScriptService.ACTION_RUN);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(serviceIntent);
            } else {
                ctx.startService(serviceIntent);
            }
        }
    }

    public static boolean onSplashActivityCreate(SplashActivity activity) {
        ScriptInterface instance = getInstance();
        if (instance != null) {
            instance.mBindActivity = activity;
            return true;
        }
        return false;
    }

    public static void onSplashActivityDestroy(SplashActivity activity) {
        ScriptInterface instance = getInstance();
        if (instance != null) {
            instance.mBindActivity = null;
        }
    }

    public static void onActivityResult(int requestCode, int resultCode, Intent data) {
        ScriptInterface instance = getInstance();
        if (instance != null) {
            Bridge bridge = instance.mBridge;
            if (bridge != null) bridge.onActivityResult(requestCode, resultCode, data);
        }
    }

    public static void onBeginPermissionRequest(PermissionRequestActivity activity) {
        ScriptInterface instance = getInstance();
        if (instance != null) {
            Bridge bridge = instance.mBridge;
            if (bridge != null) bridge.onBeginPermissionRequest(activity);
        }
    }

    public static void onBeginForegroundTask(ForegroundTaskActivity activity, Intent intent) {
        ScriptInterface instance = getInstance();
        if (instance != null) {
            Bridge bridge = instance.mBridge;
            if (bridge != null) bridge.onBeginForegroundTask(activity, intent);
        }
    }

    public static boolean applyIntent(Intent intent) {
        ScriptInterface instance = getInstance();
        if (instance != null) {
            Bridge bridge = instance.mBridge;
            if (bridge != null) return bridge.applyIntent(intent);
        }
        return true;
    }

    public static void notifyKeyEvent(KeyEvent event) {
        ScriptInterface instance = getInstance();
        if (instance != null) {
            Bridge bridge = instance.mBridge;
            if (bridge != null) bridge.onKeyEvent(event);
        }
    }

    public void reportError(String techInfo) {
        mContext.getApplicationContext().startActivity(BugReportActivity.createIntent(mContext, techInfo == null ? "" : techInfo, android.os.Process.myPid()));
    }

    public void setLoadingTitle(String title) {
        if (mBindActivity != null) {
            mBindActivity.setLoadingTitle(title);
        }
    }

    public void runOnUiThread(Runnable action) {
        if (Thread.currentThread() != mUiThread) {
            mUiHandler.post(action);
        } else {
            action.run();
        }
    }

    public void setBridge(Bridge bridge) {
        mBridge = bridge;
        GameBridgeService.setCallback(mCallbackProxy);
        AccessibilitySvc.setLifeCycleListener(mCallbackProxy);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ScriptTileService.setTileListener(mCallbackProxy);
        }
    }

    public void clearBridge() {
        mBridge = null;
        GameBridgeService.removeCallback();
        AccessibilitySvc.setLifeCycleListener(null);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ScriptTileService.setTileListener(null);
        }
    }

    public Context getContext() {
	    return mContext;
    }

    public SplashActivity getBindActivity() {
        return mBindActivity;
    }

    public ScriptService getBindService() {
        return mBindService;
    }

    public boolean isActivityRunning() {
        return mBindActivity != null;
    }

    public boolean isServiceRunning() {
	    return mBindService != null;
    }

    public Intent getIntent() {
	    return mBindService != null ? mBindService.getLastIntent() : null;
    }

    public void quit() {
	    if (mBindService != null) {
            mBindService.stopSelf();
        }
        if (mBindActivity != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                mBindActivity.finishAndRemoveTask();
            } else {
                mBindActivity.finish();
            }
        }
    }

    public int checkSelfPermission(String permission) {
        return mContext.checkPermission(permission, android.os.Process.myPid(), android.os.Process.myUid());
    }

    public void beginPermissionRequest() {
        mContext.startActivity(new Intent(mContext, PermissionRequestActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    public void startActivityForResult(Intent intent, int requestCode) {
        if (mBridge == null || mBridge.applyIntent(intent)) {
            mContext.startActivity(ReturnDataActivity.createIntent(mContext, intent, requestCode));
        }
    }

    public Preference getPreference() {
	    return mPreference;
    }

    public AccessibilitySvc getAccessibilitySvc() {
        return AccessibilitySvc.getInstance();
    }

    public void goToAccessibilitySetting() {
        AccessibilitySvc.goToAccessibilitySetting(mContext);
    }

    public ScriptManager getScriptManager() {
        return mManager;
    }

	public RhinoWebSocketServerHelper createWebSocketHelper(int port, RhinoWebSocketServerHelper.DelegateInterface delegate) {
		return new RhinoWebSocketServerHelper(port, delegate);
	}

	public RhinoWebSocketClientHelper createWSClient(String uri, RhinoWebSocketClientHelper.DelegateInterface delegate) {
        try {
            return new RhinoWebSocketClientHelper(uri, delegate);
        } catch (URISyntaxException e) {
            throw new RuntimeException("Cannot create RhinoWebSocketClientHelper:" + e.getMessage(), e);
        }
    }

	public Uri fileToUri(File file) {
		return UnsafeFileProvider.getUriForFile(file);
	}

	public RhinoFrameLayout createFrameLayout(RhinoFrameLayout.Callback callback) {
		return new RhinoFrameLayout(mContext, callback);
	}

	public int getShellVersion() {
		return BuildConfig.SHELL_VERSION;
	}

	public int getVersionCode() {
		return BuildConfig.VERSION_CODE;
	}

	public String getVersion() {
		return BuildConfig.VERSION_NAME;
	}

	public String getVerifyKey() {
		return "";
	}

	public String getGiteeFeedbackToken() {
		return "";
	}

	public RhinoWebView createWebView(RhinoWebView.Delegee delegee) {
		return new RhinoWebView(mContext).setDelegee(delegee);
	}

	public String getGiteeClientId() {
		return "";
	}

	public String getGiteeClientSecret() {
		return "";
	}

    public boolean isOnlineMode() {
        return mOnlineMode;
    }

    public String getOfflineReason() {
        return mOfflineReason;
    }

    public void onScriptReady() {
	    AdProvider.getInstance().runAfterComplete(mCallbackProxy);
    }

    public void notifyTileUpdate() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ScriptTileService service = ScriptTileService.getInstance();
            if (service != null) service.notifyUpdate();
        }
    }

    public void beginForegroundTask(Intent intent) {
	    mContext.startActivity(intent.setClass(mContext, ForegroundTaskActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    public Object executeScriptCache(String cacheFile, byte[] hash, Scriptable scope) throws IOException, ClassNotFoundException {
        return mManager.executeScriptCache(cacheFile, hash, scope);
    }

    public void writeScriptCache(String source, String sourceName, String cacheFile, byte[] hash) throws IOException {
        mManager.writeScriptCache(source, sourceName, cacheFile, hash);
    }

    public Object executeICode(byte[] iCode, byte[] hash, Scriptable scope) throws IOException, ClassNotFoundException {
	    return mManager.executeICode(iCode, hash, scope);
    }

    public byte[] compileICode(String source, String sourceName, byte[] hash) throws IOException {
	    return mManager.compileICode(source, sourceName, hash);
    }

    public String getUserID() {
	    return mPreference.getUserId();
    }

    public static ScriptInterface getInstance() {
	    return ScriptManager.hasInstance() ? ScriptManager.getInstance().getScriptInterface() : null;
    }

    @ScriptObject
	public interface Bridge {
		boolean applyIntent(Intent intent);

		void onAccessibilitySvcCreate();

		void onAccessibilitySvcDestroy();

		void onActivityResult(int requestCode, int resultCode, Intent data);

		void onBeginPermissionRequest(PermissionRequestActivity activity);

		void onNewIntent(Intent intent);

		void onKeyEvent(KeyEvent event);

		void onRemoteEnabled();

		void onRemoteMessage(Message msg);

		void onRemoteDisabled();

		void onTileReady(ScriptTileService.TileConfig config);

		void onTileClick(ScriptTileService.TileConfig config);

		void onBeginForegroundTask(ForegroundTaskActivity activity, Intent intent);
	}

	class CallbackProxy implements AccessibilitySvc.ServiceLifeCycleListener, GameBridgeService.Callback, AdProvider.OnCompleteListener, ScriptTileService.TileListener {
        @Override
        public void onCreate() {
            if (mBridge != null) mBridge.onAccessibilitySvcCreate();
        }

        @Override
        public void onDestroy() {
            if (mBridge != null) mBridge.onAccessibilitySvcDestroy();
        }

        @Override
        public void onRemoteEnabled() {
            if (mBridge != null) mBridge.onRemoteEnabled();
        }

        @Override
        public void onRemoteMessage(Message msg) {
            if (mBridge != null) mBridge.onRemoteMessage(msg);
        }

        @Override
        public void onRemoteDisabled() {
            if (mBridge != null) mBridge.onRemoteDisabled();
        }

        @Override
        public void onComplete(AdProvider provider, boolean success, String message) {
            if (mOnlineMode) return;
            mOnlineMode = success;
            mOfflineReason = message;
            mManager.startScript();
        }

        @Override
        public void onReady(ScriptTileService.TileConfig config) {
            if (mBridge != null) mBridge.onTileReady(config);
        }

        @Override
        public void onClick(ScriptTileService.TileConfig config) {
            if (mBridge != null) mBridge.onTileClick(config);
        }
    }
}
