package com.xero.ca

import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import org.mozilla.javascript.Context
import org.mozilla.javascript.Function
import org.mozilla.javascript.Kit
import org.mozilla.javascript.RhinoException
import org.mozilla.javascript.Script
import org.mozilla.javascript.ScriptRuntime
import org.mozilla.javascript.Scriptable
import org.mozilla.javascript.StackStyle
import org.mozilla.javascript.WrapFactory
import java.io.File
import java.io.FileInputStream
import java.io.FileReader
import java.io.IOException
import java.io.InputStream
import java.io.InputStreamReader
import java.io.Reader
import java.lang.ref.WeakReference

/**
 * 脚本引擎的管理者：负责创建 Rhino Context、加载/编译脚本、在独立线程里跑事件循环。
 *
 * 注意：这里有几个 Rhino 内部 API 的用法（StackStyle、Context.emptyArgs 反射补丁、
 * Kit.readReader），换引擎时这一整个类都要重写。
 */
class ScriptManager private constructor() {

    private var cx: Context? = null
    private var scope: Scriptable? = null
    private var handler: Handler? = null
    private var bindContext: android.content.Context? = null
    private var scriptInterface: ScriptInterface? = null
    private var debugFile: String? = null
    private var cacheDir: String? = null
    private var hotfix: Hotfix? = null

    @Volatile
    private var running = false
    private var sourceName: String? = null
    private var compiledScript: Script? = null

    @Synchronized
    fun prepareScript(ctx: android.content.Context, srcName: String, runAfterPrepared: Boolean) {
        if (running) return
        running = true
        bindContext = ctx
        sourceName = srcName
        val th = Thread(
            Thread.currentThread().threadGroup,
            PrepareCommand(runAfterPrepared),
            "Script_Loader",
            262144,
        )
        th.start()
    }

    @Synchronized
    fun startScript() {
        val h = handler ?: return
        h.post(StartCommand())
    }

    @Synchronized
    fun endScript(callUnload: Boolean) {
        val h = handler ?: return
        if (!running) return
        running = false
        h.post(ExitCommand(callUnload))
    }

    fun endScript() {
        endScript(true)
    }

    fun isRunning(): Boolean = running

    @Synchronized
    fun callScriptHook(name: String, args: Array<Any?>) {
        handler ?: return
        val s = scope ?: return
        val obj = s.get(name, s)
        if (obj is Function) {
            try {
                obj.call(cx, s, s, args)
            } catch (ex: Exception) {
                //Ignore this exception
            }
        }
    }

    fun setHotfix(coreFile: String, signFile: String, verify: ByteArray, versionCode: Int) {
        hotfix = Hotfix(coreFile, signFile, verify, versionCode)
    }

    fun setCacheDir(cacheDir: String) {
        this.cacheDir = cacheDir
    }

    private fun initContext(): Context {
        val context = com.faendir.rhino_android.RhinoAndroidHelper().enterContext()
        context.setOptimizationLevel(-1)
        context.setLanguageVersion(Context.VERSION_ES6)
        return context
    }

    private fun initScope(cx: Context): Scriptable {
        val wrapFactory: WrapFactory = cx.wrapFactory
        val s = cx.initStandardObjects()
        s.put(
            "ScriptInterface", s,
            wrapFactory.wrapAsJavaObject(cx, s, getScriptInterface(), ScriptInterface::class.java)
        )
        return s
    }

    private fun initScriptInterface(): ScriptInterface = ScriptInterface(this)

    @Throws(IOException::class)
    private fun getScriptReader(): Reader {
        val file = debugFile
        if (file != null) {
            try {
                return FileReader(file)
            } catch (e: IOException) {
                Log.e("Script", "Loading debugFile failed", e)
            }
        }
        val hf = hotfix
        if (hf != null) {
            try {
                return InputStreamReader(hf.getInputStream())
            } catch (e: IOException) {
                Log.e("Script", "Loading hotfix failed", e)
            }
        }
        return InputStreamReader(ScriptFileStream.fromAsset(bindContext!!, "script.js"))
    }

    fun getContext(): Context? = cx

    fun getScope(): Scriptable? = scope

    fun getBindContext(): android.content.Context? = bindContext

    fun getScriptInterface(): ScriptInterface? = scriptInterface

    fun getHandler(): Handler? = handler

    @Throws(IOException::class)
    fun open(path: String): InputStream? {
        val file = debugFile
        if (file != null) {
            val src = File(file)
            return FileInputStream(File(src.parent, path))
        } else if (bindContext != null) {
            return bindContext!!.assets.open(path)
        }
        return null
    }

    @Throws(IOException::class)
    private fun getCompiledScript(): Script {
        val source = getScriptReader().use { reader -> Kit.readReader(reader) }
        val cache = cacheDir
        return if (cache != null && debugFile != null) {
            cachedCompileScript(source, sourceName, File(cache, "script.obj"))
        } else {
            cx!!.compileString(source, sourceName, 0, null)
        }
    }

    private fun cachedCompileScript(source: String, sourceName: String?, cacheFile: File): Script {
        val hash = ScriptFileStream.getStringHash(source)
        if (cacheFile.exists()) {
            try {
                return ScriptFileStream.readScript(cacheFile.path, hash) as Script
            } catch (e: Exception) {
                Log.e("Script", "Loading cacheScript failed", e)
            }
        }
        val script = cx!!.compileString(source, sourceName, 0, null)
        try {
            ScriptFileStream.writeScript(cacheFile.path, hash, script)
        } catch (e: IOException) {
            Log.e("Script", "Write cacheScript failed", e)
        }
        return script
    }

    @Throws(IOException::class, ClassNotFoundException::class)
    fun executeScriptCache(cacheFile: String, hash: ByteArray?, scope: Scriptable?): Any? {
        val script = ScriptFileStream.readScript(cacheFile, hash) as Script
        return script.exec(cx, scope)
    }

    @Throws(IOException::class)
    fun writeScriptCache(source: String, sourceName: String?, cacheFile: String, hash: ByteArray) {
        val script = cx!!.compileString(source, sourceName, 0, null)
        ScriptFileStream.writeScript(cacheFile, hash, script)
    }

    @Throws(IOException::class, ClassNotFoundException::class)
    fun executeICode(iCode: ByteArray, hash: ByteArray?, scope: Scriptable?): Any? {
        val script = ScriptFileStream.readICode(iCode, hash) as Script
        return script.exec(cx, scope)
    }

    @Throws(IOException::class)
    fun compileICode(source: String, sourceName: String?, hash: ByteArray): ByteArray {
        val script = cx!!.compileString(source, sourceName, 0, null)
        return ScriptFileStream.writeICode(script, hash)
    }

    inner class PrepareCommand(private val runAfterPrepared: Boolean) : Runnable {
        override fun run() {
            Looper.prepare()
            // 引擎初始化放在 try 里：Rhino 1.9 用到的 jdk.dynalink / StackWalker 在
            // Android 上不存在，正常情况下（-1 纯解释）不会加载到它们，但万一触发，
            // 抛的是 ExceptionInInitializerError（Error 不是 Exception），这里必须接住，
            // 否则直接崩在启动阶段。
            try {
                scriptInterface = initScriptInterface()
                cx = initContext()
                scope = initScope(cx!!)
                handler = Handler()
            } catch (t: Throwable) {
                Log.e("Script", "脚本引擎初始化失败", t)
                val ctx = bindContext
                if (ctx != null) {
                    XApplication.reportError(
                        ctx.applicationContext, Thread.currentThread(),
                        IllegalStateException("脚本引擎初始化失败（Rhino 运行时不可用）", t)
                    )
                }
                return
            }
            try {
                val time = SystemClock.uptimeMillis()
                compiledScript = getCompiledScript()
                Log.d("Script", "Script Compiled in " + (SystemClock.uptimeMillis() - time) + "ms")
            } catch (e: Exception) {
                val ctx = bindContext ?: return
                XApplication.reportError(
                    ctx.applicationContext, Thread.currentThread(),
                    SecurityException("Fail to decode and execute the script.", e)
                )
                return
            }
            if (runAfterPrepared) {
                startScript()
            } else {
                scriptInterface?.onScriptReady()
            }
            Looper.loop()
            Context.exit()
            cx = null
            scope = null
            handler = null
            scriptInterface = null
        }
    }

    inner class StartCommand : Runnable {
        override fun run() {
            val script = compiledScript
            if (script != null) {
                script.exec(cx, scope)
                compiledScript = null
            }
        }
    }

    inner class ExitCommand(private val callUnload: Boolean) : Runnable {
        override fun run() {
            if (callUnload) callScriptHook("unload", arrayOf())
            scriptInterface?.clearBridge()
            handler?.looper?.quit()
            debugFile = null
        }
    }

    inner class Hotfix(
        private val coreFile: String,
        private val signFile: String,
        private val verify: ByteArray,
        private val versionCode: Int,
    ) {
        @Throws(IOException::class)
        fun getInputStream(): InputStream =
            ScriptFileStream.fromFile(bindContext!!, coreFile, signFile, verify, versionCode)
    }

    companion object {
        private var instance: WeakReference<ScriptManager?> = WeakReference(null)

        init {
            RhinoException.setStackStyle(StackStyle.V8)
            // hack code
            if (Context.emptyArgs == null) {
                try {
                    val field = Context::class.java.getDeclaredField("emptyArgs")
                    field.isAccessible = true
                    field.set(null, ScriptRuntime.emptyArgs)
                } catch (e: NoSuchFieldException) {
                    Log.e("CADebug", e.toString())
                } catch (e: IllegalAccessException) {
                    Log.e("CADebug", e.toString())
                }
            }
        }

        @JvmStatic
        @Synchronized
        fun hasInstance(): Boolean = instance.get() != null

        @JvmStatic
        @Synchronized
        fun getInstance(): ScriptManager {
            var m = instance.get()
            if (m == null) {
                m = ScriptManager()
                instance = WeakReference(m)
            }
            return m
        }

        @JvmStatic
        fun createDebuggable(debugFile: String): ScriptManager? {
            val m = instance.get()
            return if (m == null || !m.isRunning()) {
                val created = ScriptManager()
                created.debugFile = debugFile
                instance = WeakReference(created)
                created
            } else {
                null
            }
        }
    }
}
