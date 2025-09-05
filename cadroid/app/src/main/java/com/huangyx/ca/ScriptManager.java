package com.huangyx.ca;

import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Kit;
import org.mozilla.javascript.RhinoException;
import org.mozilla.javascript.Script;
import org.mozilla.javascript.ScriptRuntime;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.StackStyle;
import org.mozilla.javascript.WrapFactory;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.lang.ref.WeakReference;
import java.lang.reflect.Field;

public class ScriptManager {
    private static WeakReference<ScriptManager> instance = new WeakReference<>(null);

    static {
        RhinoException.setStackStyle(StackStyle.V8);
        // hack code
        if (Context.emptyArgs == null) {
            try {
                Field field = Context.class.getDeclaredField("emptyArgs");
                field.setAccessible(true);
                field.set(null, ScriptRuntime.emptyArgs);
            } catch (NoSuchFieldException | IllegalAccessException e) {
                Log.e("CADebug", e.toString());
            }
        }
    }

    private Context cx = null;
    private Scriptable scope = null;
    private Handler handler = null;
    private android.content.Context bindContext = null;
    private ScriptInterface scriptInterface = null;
    private String debugFile = null;
    private String cacheDir = null;
    private Hotfix hotfix = null;
    private boolean running = false;
    private String sourceName;
    private Script compiledScript = null;

    private ScriptManager() {}

    public synchronized static boolean hasInstance() {
        return instance.get() != null;
    }

    public synchronized static ScriptManager getInstance() {
        ScriptManager m = instance.get();
        if (m == null) {
            m = new ScriptManager();
            instance = new WeakReference<>(m);
        }
        return m;
    }

    public static ScriptManager createDebuggable(String debugFile) {
        ScriptManager m = instance.get();
        if (m == null || !m.isRunning()) {
            m = new ScriptManager();
            m.debugFile = debugFile;
            instance = new WeakReference<>(m);
            return m;
        } else {
            return null;
        }
    }

    public synchronized void prepareScript(android.content.Context ctx, String srcName, boolean runAfterPrepared) {
        if (running) return;
        running = true;
        bindContext = ctx;
        sourceName = srcName;
        Thread th = new Thread(Thread.currentThread().getThreadGroup(), new PrepareCommand(runAfterPrepared), "Script_Loader", 262144);
        th.start();
    }

    public synchronized void startScript() {
        if (handler == null) return;
        handler.post(new StartCommand());
    }

    public synchronized void endScript(boolean callUnload) {
        if (!running || handler == null) return;
        running = false;
        handler.post(new ExitCommand(callUnload));
    }

    public void endScript() {
        endScript(true);
    }

    public boolean isRunning() {
        return running;
    }

    public synchronized void callScriptHook(String name, Object[] args) {
        if (handler == null) return;
        Object obj = scope.get(name, scope);
        if (obj instanceof Function) {
            try {
                ((Function) obj).call(cx, scope, scope, args);
            } catch (Exception ex) {
                //Ignore this exception
            }
        }
    }

    public void setHotfix(String coreFile, String signFile, byte[] verify, int versionCode) {
        hotfix = new Hotfix(coreFile, signFile, verify, versionCode);
    }

    public void setCacheDir(String cacheDir) {
        this.cacheDir = cacheDir;
    }

    protected synchronized Context initContext() {
        //Context context = Context.enter();
        Context context = new com.faendir.rhino_android.RhinoAndroidHelper().enterContext();
        context.setOptimizationLevel(-1);
        context.setLanguageVersion(Context.VERSION_ES6);
        return context;
    }

    protected Scriptable initScope(Context cx) {
        WrapFactory wrapFactory = cx.getWrapFactory();
        Scriptable s = cx.initStandardObjects();
        s.put("ScriptInterface", s, wrapFactory.wrapAsJavaObject(cx, s, getScriptInterface(), ScriptInterface.class));
        return s;
    }

    protected ScriptInterface initScriptInterface() {
        return new ScriptInterface(this);
    }

    protected Reader getScriptReader() throws IOException {
        if (debugFile != null) {
            try {
                return new FileReader(debugFile);
            } catch (IOException e) {
                Log.e("Script", "Loading debugFile failed", e);
            }
        }
        if (hotfix != null) {
            try {
                return new InputStreamReader(hotfix.getInputStream());
            } catch (IOException e) {
                Log.e("Script", "Loading hotfix failed", e);
            }
        }
        return new InputStreamReader(ScriptFileStream.fromAsset(bindContext, "script.js"));
    }

    public Context getContext() {
        return cx;
    }

    public Scriptable getScope() {
        return scope;
    }

    public android.content.Context getBindContext() {
        return bindContext;
    }

    public ScriptInterface getScriptInterface() {
        return scriptInterface;
    }

    public Handler getHandler() {
        return handler;
    }

    public InputStream open(String path) throws IOException {
        if (debugFile != null) {
            File src = new File(debugFile);
            return new FileInputStream(new File(src.getParent(), path));
        } else if (bindContext != null) {
            return bindContext.getAssets().open(path);
        }
        return null;
    }

    protected Script getCompiledScript() throws IOException {
        String source;
        try (Reader reader = getScriptReader()) {
            source = Kit.readReader(reader);
        }
        if (cacheDir != null && debugFile != null) {
            return cachedCompileScript(source, sourceName, new File(cacheDir, "script.obj"));
        } else {
            return cx.compileString(source, sourceName, 0, null);
        }
    }

    protected Script cachedCompileScript(String source, String sourceName, File cacheFile) {
        byte[] hash = ScriptFileStream.getStringHash(source);
        Script script;
        if (cacheFile.exists()) {
            try {
                return (Script) ScriptFileStream.readScript(cacheFile.getPath(), hash);
            } catch (Exception e) {
                Log.e("Script", "Loading cacheScript failed", e);
            }
        }
        script = cx.compileString(source, sourceName, 0, null);
        try {
            ScriptFileStream.writeScript(cacheFile.getPath(), hash, script);
        } catch (IOException e) {
            Log.e("Script", "Write cacheScript failed", e);
        }
        return script;
    }

    public Object executeScriptCache(String cacheFile, byte[] hash, Scriptable scope) throws IOException, ClassNotFoundException {
        Script script = (Script) ScriptFileStream.readScript(cacheFile, hash);
        return script.exec(cx, scope);
    }

    public void writeScriptCache(String source, String sourceName, String cacheFile, byte[] hash) throws IOException {
        Script script = cx.compileString(source, sourceName, 0, null);
        ScriptFileStream.writeScript(cacheFile, hash, script);
    }

    public Object executeICode(byte[] iCode, byte[] hash, Scriptable scope) throws IOException, ClassNotFoundException {
        Script script = (Script) ScriptFileStream.readICode(iCode, hash);
        return script.exec(cx, scope);
    }

    public byte[] compileICode(String source, String sourceName, byte[] hash) throws IOException {
        Script script = cx.compileString(source, sourceName, 0, null);
        return ScriptFileStream.writeICode(script, hash);
    }

    class PrepareCommand implements Runnable {
        private boolean runAfterPrepared;

        PrepareCommand(boolean runAfterPrepared) {
            this.runAfterPrepared = runAfterPrepared;
        }

        @Override
        public void run() {
            Looper.prepare();
            scriptInterface = initScriptInterface();
            cx = initContext();
            scope = initScope(cx);
            handler = new Handler();
            try {
                long time = SystemClock.uptimeMillis();
                compiledScript = getCompiledScript();
                Log.d("Script", "Script Compiled in " + (SystemClock.uptimeMillis() - time) + "ms");
            } catch (Exception e) {
                XApplication.reportError(bindContext.getApplicationContext(), Thread.currentThread(), new SecurityException("Fail to decode and execute the script.", e));
                return;
            }
            if (runAfterPrepared) {
                startScript();
            } else {
                scriptInterface.onScriptReady();
            }
            Looper.loop();
            Context.exit();
            cx = null;
            scope = null;
            handler = null;
            scriptInterface = null;
        }
    }

    class StartCommand implements Runnable {
        @Override
        public void run() {
            if (compiledScript != null) {
                compiledScript.exec(cx, scope);
                compiledScript = null;
            }
        }
    }

    class ExitCommand implements Runnable {
        boolean callUnload;

        ExitCommand(boolean callUnload) {
            this.callUnload = callUnload;
        }

        @Override
        public void run() {
            if (callUnload) callScriptHook("unload", new Object[]{});
            scriptInterface.clearBridge();
            handler.getLooper().quit();
            debugFile = null;
        }
    }

    class Hotfix {
        Hotfix(String coreFile, String signFile, byte[] verify, int versionCode) {
            this.coreFile = coreFile;
            this.signFile = signFile;
            this.verify = verify;
            this.versionCode = versionCode;
        }

        private String coreFile;
        private String signFile;
        private byte[] verify;
        private int versionCode;

        InputStream getInputStream() throws IOException {
            return ScriptFileStream.fromFile(bindContext, coreFile, signFile, verify, versionCode);
        }
    }
}
