/**
 * android.* / java.* / org.mozilla.* / com.* / javax.* / Packages. Proxy shim
 * + java.io / java.lang 真实现（java.lang.Thread/Integer/File/...）
 * + android.os.Handler / Build 真实现
 * + org.mozilla.javascript 替身（eval）
 *
 * 关键设计：
 * - globalThis.java / .android / .org 等是 root 代理（Proxy），__path__ = ''
 * - 访问 java.lang.Thread 时，handler.get 拼出 newPath = 'lang.Thread'
 *   （不是 'java.lang.Thread'！root 的 path 是空字符串）
 * - 所以 R(fullPath, value) 内部要去掉第一段（root 名）再存
 */

const PATH_CACHE = new Map();

function makeProxy(path) {
  const target = function () {};
  target.__path__ = path;
  return new Proxy(target, handler);
}

/**
 * 把一个真实类/函数注册到 PATH_CACHE
 * @param {string} fullPath - 完整路径，如 'java.lang.Thread'
 * @param {*} value - 真实函数/类
 */
export function registerAt(fullPath, value) {
  const parts = fullPath.split('.');
  // 去掉第一段（java/android/com/org/javax/Packages —— root 代理）
  const subPath = parts.slice(1).join('.');
  // 主要存 subPath（handler.get 拼出的格式）
  PATH_CACHE.set(subPath, value);
  // 也存全路径（保险，例如直接 globalThis.java.lang.Thread 访问）
  PATH_CACHE.set(fullPath, value);
  return value;
}



const handler = {
  get(target, prop) {
    if (typeof prop === 'symbol') {
      if (prop === Symbol.toPrimitive) return () => '[android-shim ' + target.__path__ + ']';
      if (prop === Symbol.hasInstance) return () => true;
      return target[prop];
    }
    if (prop === 'then' || prop === 'constructor' || prop === 'toString' ||
        prop === 'valueOf' || prop === 'hasOwnProperty' || prop === '__proto__' ||
        prop === 'name' || prop === 'length' || prop === 'prototype' ||
        prop === 'caller' || prop === 'arguments' || prop === 'apply' ||
        prop === 'call' || prop === 'bind') {
      return target[prop];
    }
    const newPath = target.__path__ ? target.__path__ + '.' + prop : String(prop);
    if (PATH_CACHE.has(newPath)) return PATH_CACHE.get(newPath);
    const node = makeProxy(newPath);
    PATH_CACHE.set(newPath, node);
    return node;
  },
  apply(target, thisArg, args) {
    return PATH_CACHE.get(target.__path__) || makeProxy(target.__path__);
  },
  construct(target, args) {
    return PATH_CACHE.get(target.__path__) || makeProxy(target.__path__);
  }
};

function makeAndroidRoot() {
  const target = { __path__: '' };
  return new Proxy(target, handler);
}

export function installAndroidShim() {
  if (globalThis.__caAndroidShimInstalled) return;
  globalThis.android = makeAndroidRoot();
  globalThis.java = makeAndroidRoot();
  globalThis.com = makeAndroidRoot();
  globalThis.Packages = makeAndroidRoot();
  globalThis.org = makeAndroidRoot();
  globalThis.javax = makeAndroidRoot();
  globalThis.__caAndroidShimInstalled = true;
}

// === 内部类定义（先于 R() 调用） ===

class JFile {
  constructor(path) {
    this._path = String(path).replace(/\\/g, '/');
  }
  isFile() { return false; } // Web 端无真实文件系统；内置库走 CA.Library.inner 分支不查 isFile
  isDirectory() { return false; }
  mkdirs() { return this; }
  mkdir() { return this; }
  exists() { return false; }
  getPath() { return this._path; }
  getName() { return this._path.split('/').pop(); }
  getParent() {
    const i = this._path.lastIndexOf('/');
    return i < 0 ? null : this._path.slice(0, i);
  }
  getAbsolutePath() { return this._path; }
  getAbsoluteFile() { return this; }
  getCanonicalFile() { return this; }
  list() { return []; }
  listFiles() { return []; }
  length() { return 0; }
  delete() { return false; }
  renameTo() { return false; }
  toString() { return this._path; }
  toURI() { return { toString: () => 'file://' + this._path }; }
  canRead() { return false; }
  canWrite() { return false; }
  isHidden() { return false; }
  lastModified() { return 0; }
}

class JFileInputStream {
  constructor(file) { this._file = file; }
  read() { return -1; }
  close() {}
  available() { return 0; }
}

class JFileOutputStream {
  constructor(file) { this._file = file; }
  write() {}
  close() {}
  flush() {}
}

class JBufferedReader {
  constructor(reader) { this._reader = reader; this._closed = false; }
  readLine() { return null; }
  close() { this._closed = true; }
}

class JInputStreamReader {
  constructor(stream) { this._stream = stream; }
  read() { return -1; }
  close() {}
}

class JInputStream {
  read() { return -1; }
  close() {}
  available() { return 0; }
}

class JPrintWriter {
  constructor(stream) { this._stream = stream; }
  println() {}
  print() {}
  close() {}
  flush() {}
}

class JOutputStreamWriter { write(){} close(){} flush(){} }

class JInteger {
  constructor(v) { this._v = v; }
  intValue() { return this._v | 0; }
  longValue() { return this._v | 0; }
  doubleValue() { return this._v; }
  floatValue() { return this._v; }
  toString() { return String(this._v); }
}

// JThread —— 关键！Loader.load 异步用它
// 同步实现：start 调 queueMicrotask 异步 run
class JThread {
  constructor(runnable) {
    this._runnable = runnable;
    this._alive = false;
    this._name = 'Thread-' + (++JThread._seq);
  }
  start() {
    this._alive = true;
    queueMicrotask(() => {
      try {
        if (typeof this._runnable === 'function') this._runnable();
        else if (this._runnable && typeof this._runnable.run === 'function') this._runnable.run();
      } catch (e) {
        console.error('[ca thread error]', e);
      } finally {
        this._alive = false;
      }
    });
  }
  run() {
    if (typeof this._runnable === 'function') this._runnable();
    else this._runnable && this._runnable.run();
  }
  sleep() {}
  interrupt() {}
  join() {}
  isAlive() { return this._alive; }
  getId() { return this._id || (this._id = JThread._seq * 1000 + (++JThread._seq)); }
  getName() { return this._name; }
  isInterrupted() { return false; }
  isDaemon() { return false; }
  setDaemon() {}
  setName(n) { this._name = n; }
  getStackTrace() { return []; }
  getPriority() { return 5; }
  setPriority() {}
  getContextClassLoader() { return null; }
  toString() { return 'Thread[' + this._name + ']'; }
  static _seq = 0;
}
// 主线程单例 —— PopupPage.checkThread 用 r.thread === Thread.currentThread() 判定
const mainThreadObj = {
  getId: () => 1,
  getName: () => 'main',
  isInterrupted: () => false,
  isAlive: () => true,
  isDaemon: () => false,
  setDaemon() {},
  setName() {},
  getStackTrace: () => [],
  getPriority: () => 5,
  getContextClassLoader: () => null,
  toString: () => 'Thread[main,5,main]',
  sleep: () => {},
  interrupt: () => {}
};
JThread.currentThread = function () { return mainThreadObj; };
JThread.interrupted = function () { return false; };
JThread.sleep = function () {};
JThread.yield = function () {};
JThread.setDefaultUncaughtExceptionHandler = function () {};

class JHandler {
  constructor(looper) {
    this._looper = looper || { getThread: () => ({ currentThread: () => ({}) }) };
  }
  post(fn) {
    queueMicrotask(() => { try { fn(); } catch (e) { console.error('[ca handler.post]', e); } });
  }
  postDelayed(fn, ms) {
    setTimeout(() => { try { fn(); } catch (e) { console.error('[ca handler.postDelayed]', e); } }, ms);
  }
  removeCallbacks() {}
  sendMessage() {}
}

// === 注册所有真实类 ===

export function setupJavaIORuntime() {
  if (globalThis.__caJavaIORuntimeInstalled) return;

  // java.io.*
  registerAt('java.io.File', JFile);
  registerAt('java.io.FileInputStream', JFileInputStream);
  registerAt('java.io.FileOutputStream', JFileOutputStream);
  registerAt('java.io.BufferedReader', JBufferedReader);
  registerAt('java.io.InputStreamReader', JInputStreamReader);
  registerAt('java.io.InputStream', JInputStream);
  registerAt('java.io.PrintWriter', JPrintWriter);
  registerAt('java.io.OutputStreamWriter', JOutputStreamWriter);
  registerAt('java.io.FileWriter', JOutputStreamWriter);
  registerAt('java.io.BufferedWriter', JOutputStreamWriter);

  // java.lang.*
  registerAt('java.lang.String', String);
  registerAt('java.lang.Integer', JInteger);
  registerAt('java.lang.Long', JInteger);
  registerAt('java.lang.Float', JInteger);
  registerAt('java.lang.Double', JInteger);
  registerAt('java.lang.Short', JInteger);
  registerAt('java.lang.Byte', JInteger);
  registerAt('java.lang.Character', JInteger);
  registerAt('java.lang.Boolean', JInteger);
  registerAt('java.lang.Void', JInteger);

  // 各种 .TYPE
  registerAt('java.lang.Boolean.TYPE', JInteger);
  registerAt('java.lang.Integer.TYPE', JInteger);
  registerAt('java.lang.Long.TYPE', JInteger);
  registerAt('java.lang.Float.TYPE', JInteger);
  registerAt('java.lang.Double.TYPE', JInteger);
  registerAt('java.lang.Character.TYPE', JInteger);
  registerAt('java.lang.Byte.TYPE', JInteger);
  registerAt('java.lang.Short.TYPE', JInteger);
  registerAt('java.lang.Void.TYPE', JInteger);

  registerAt('java.lang.System', {
    getProperty: (k) => '',
    currentTimeMillis: () => Date.now(),
    nanoTime: () => performance.now() * 1e6,
    getenv: () => ({})
  });

  registerAt('java.lang.Thread', JThread);
  registerAt('java.lang.Runnable', class { constructor(r) { this.run = r.run || r; } });

  // java.util.*
  registerAt('java.util.ArrayList', Array);
  registerAt('java.util.HashMap', Map);
  registerAt('java.util.LinkedHashMap', Map);
  registerAt('java.util.HashSet', Set);
  registerAt('java.util.Iterator', { hasNext: () => false, next: () => null });
  registerAt('java.util.regex.Pattern', { compile: (s) => new RegExp(s), matches: () => false });
  registerAt('java.util.zip.GZIPInputStream', JInputStream);
  registerAt('java.util.zip.GZIPOutputStream', JOutputStreamWriter);
  registerAt('java.util.zip.ZipFile', class { constructor() {} getEntry() { return null; } close() {} });

  // java.util.concurrent.Executors —— CA 的 Threads.run 依赖
  // 用 queueMicrotask 实现的简单线程池
  registerAt('java.util.concurrent.Executors', {
    newCachedThreadPool: function () {
      return {
        submit: function (task) {
          // Runnable 或 Callable
          const run = () => {
            try {
              if (typeof task.run === 'function') return task.run();
              if (typeof task.call === 'function') return task.call();
            } catch (e) {
              console.error('[ca executor]', e);
            }
          };
          queueMicrotask(run);
          return {
            get: function () { return undefined; } // 同步 future（Tasks.run 不 await）
          };
        }
      };
    }
  });
  registerAt('java.util.concurrent.TimeUnit', { MILLISECONDS: 'ms', SECONDS: 's' });

  // android.view.WindowManager + WindowManager.LayoutParams
  // 拦截 wm.addView(view, params) 真的把 view.el 挂到 body 顶层 overlay
  class WindowManager {
    constructor() {
      this._overlayRoot = null;
    }
    _root() {
      if (!this._overlayRoot) {
        this._overlayRoot = document.createElement('div');
        this._overlayRoot.id = 'ca-overlay';
        this._overlayRoot.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
        document.body.appendChild(this._overlayRoot);
      }
      return this._overlayRoot;
    }
    addView(view, params) {
      const root = this._root();
      if (view && view.el) {
        if (params) {
          if (params.width !== undefined) view.el.style.width = (params.width === -1 ? '100%' : params.width + 'px');
          if (params.height !== undefined) view.el.style.height = (params.height === -1 ? '100%' : params.height + 'px');
          if (params.x !== undefined) view.el.style.left = params.x + 'px';
          if (params.y !== undefined) view.el.style.top = params.y + 'px';
        }
        view.el.style.pointerEvents = 'auto';
        root.appendChild(view.el);
      }
      return true;
    }
    removeView(view) {
      if (view && view.el && view.el.parentNode) view.el.parentNode.removeChild(view.el);
      return true;
    }
    removeViewImmediate(view) { return this.removeView(view); }
    updateViewLayout(view, params) {
      if (view && view.el && params) {
        if (params.x !== undefined) view.el.style.left = params.x + 'px';
        if (params.y !== undefined) view.el.style.top = params.y + 'px';
        if (params.width !== undefined) view.el.style.width = (params.width === -1 ? '100%' : params.width + 'px');
        if (params.height !== undefined) view.el.style.height = (params.height === -1 ? '100%' : params.height + 'px');
      }
      return true;
    }
  }
  registerAt('android.view.WindowManager', WindowManager);

  class WindowManagerLayoutParams {
    constructor(w, h, type, flags, format) {
      this.width = w !== undefined ? w : -2;
      this.height = h !== undefined ? h : -2;
      this.x = 0;
      this.y = 0;
      this.gravity = 0;
      this.flags = 0;
      this.type = type;
      this.format = format;
    }
    setTitle(t) { this.title = t; return this; }
    copyFrom(other) { Object.assign(this, other); return this; }
  }
  registerAt('android.view.WindowManager.LayoutParams', WindowManagerLayoutParams);

  registerAt('java.text.SimpleDateFormat', class {
    constructor(p) { this._p = p; }
    format(d) { return d ? d.toLocaleString() : ''; }
    parse(s) { return new Date(s); }
  });

  registerAt('java.net.URL', class {
    constructor(u) { this._u = u; }
    openConnection() {
      return {
        setRequestMethod(){}, setConnectTimeout(){}, setUseCaches(){},
        setDoInput(){}, setDoOutput(){},
        getInputStream: () => new JInputStream(),
        getOutputStream: () => new JFileOutputStream()
      };
    }
  });

  registerAt('java.security.MessageDigest', class {
    static getInstance() { return { update(){}, digest: () => new Uint8Array(32) }; }
  });

  // android.text.SpannableStringBuilder —— IntelliSense 大量用
  // appendSSB 调 length() / append() / setSpan()
  registerAt('android.text.SpannableStringBuilder', class {
    constructor(text = '') {
      this._text = String(text);
      this._spans = [];
      this.SPAN_INCLUSIVE_EXCLUSIVE = 0;
    }
    length() { return this._text.length; }
    append(str) { this._text += String(str); return this; }
    setSpan(span, start, end, flags) { this._spans.push({ span, start, end, flags }); return this; }
    toString() { return this._text; }
  });
  // android.text.SpannableString —— G.SpannableString 简单版
  registerAt('android.text.SpannableString', class {
    constructor(text = '') {
      this._text = String(text);
      this._spans = [];
      this.SPAN_INCLUSIVE_EXCLUSIVE = 0;
    }
    length() { return this._text.length; }
    toString() { return this._text; }
    setSpan(span, start, end, flags) { this._spans.push({ span, start, end, flags }); return this; }
  });
  // android.text.ForegroundColorSpan —— 颜色 span
  registerAt('android.text.ForegroundColorSpan', class {
    constructor(color) { this._color = color; }
  });
  registerAt('android.text.StyleSpan', class { constructor() {} });
  registerAt('android.text.AbsoluteSizeSpan', class { constructor() {} });
  registerAt('android.text.BackgroundColorSpan', class { constructor() {} });
  registerAt('android.text.AlignmentSpan', class { constructor() {} });
  registerAt('android.text.BulletSpan', class { constructor() {} });
  registerAt('android.text.SubscriptSpan', class { constructor() {} });
  registerAt('android.text.SuperscriptSpan', class { constructor() {} });
  registerAt('android.text.UnderlineSpan', class { constructor() {} });
  registerAt('android.text.StrikethroughSpan', class { constructor() {} });
  registerAt('android.text.URLSpan', class { constructor() {} });

  // android.os.*
  registerAt('android.os.Handler', JHandler);
  // 主 Looper 单例 —— checkThread 要求 getMainLooper() === myLooper()
const mainLooper = {
  getThread: () => ({ currentThread: () => JThread.currentThread() }),
  getQueue: () => ({})
};
registerAt('android.os.Looper', {
    getMainLooper: () => mainLooper,
    myLooper: () => mainLooper,
    getMyLooper: () => mainLooper,
    myQueue: () => mainLooper.getQueue()
  });

// android.view.WindowManager —— PopupPage/Pwm 用 LayoutParams + TYPE_* 常量
class WMLayoutParams {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.x = 0;
    this.y = 0;
    this.gravity = 0;
    this.type = 0;
    this.flags = 0;
    this.format = 0;
  }
  setTitle(t) { this._title = t; return this; }
  getTitle() { return this._title || ''; }
}
WMLayoutParams.TYPE_PHONE = 2002;
WMLayoutParams.TYPE_APPLICATION_OVERLAY = 2038;
WMLayoutParams.TYPE_APPLICATION_PANEL = 1000;
WMLayoutParams.FLAG_NOT_FOCUSABLE = 8;
WMLayoutParams.FLAG_NOT_TOUCHABLE = 16;
WMLayoutParams.FLAG_WATCH_OUTSIDE_TOUCH = 0x8000;
WMLayoutParams.FLAG_ALT_FOCUSABLE_IM = 0x20000;
WMLayoutParams.FLAG_LAYOUT_IN_SCREEN = 256;
WMLayoutParams.SOFT_INPUT_ADJUST_RESIZE = 0x10;
WMLayoutParams.SOFT_INPUT_STATE_UNSPECIFIED = 0;
registerAt('android.view.WindowManager', {
  LayoutParams: WMLayoutParams,
  addFlags: () => {}
});
registerAt('android.view.WindowManager.LayoutParams', WMLayoutParams);
  registerAt('android.os.Build', {
    VERSION: { SDK_INT: 24, RELEASE: '14', CODENAME: 'REL' },
    MANUFACTURER: 'Web',
    MODEL: 'Browser',
    SUPPORTED_ABIS: ['x86_64', 'wasm32']
  });

  globalThis.__caJavaIORuntimeInstalled = true;
}

/**
 * org.mozilla.javascript 替身
 * Loader.evalSpecial 调 org.mozilla.javascript.Context.getCurrentContext()
 * 用 indirect eval 实现
 */
export function setupRhinoRuntime() {
  if (globalThis.__caRhinoRuntimeInstalled) return;

  const fakeCx = {
    getCurrentContext: function () { return fakeCx; },
    toObject: function (v) { return v; },
    toString: function (v) { return String(v); }
  };
  registerAt('org.mozilla.javascript.Context', fakeCx);

  registerAt('org.mozilla.javascript.ScriptRuntime', {
    evalSpecial: function (cx, scope, thisArg, args, sourceName, lineNumber) {
      const source = String(args[0]);
      try {
        const result = (0, eval)(source);
        return result === undefined ? null : result;
      } catch (e) {
        throw e;
      }
    }
  });

  globalThis.__caRhinoRuntimeInstalled = true;
}
