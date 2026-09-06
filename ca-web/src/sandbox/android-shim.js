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
function R(fullPath, value) {
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
  isFile() { return true; } // Web 端所有 path 都"存在"
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
  }
  start() {
    this._alive = true;
    queueMicrotask(() => {
      try {
        this._runnable.run();
      } catch (e) {
        console.error('[ca thread error]', e);
      } finally {
        this._alive = false;
      }
    });
  }
  run() { this._runnable && this._runnable.run(); }
  sleep() {}
  interrupt() {}
  join() {}
  isAlive() { return this._alive; }
}

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
  R('java.io.File', JFile);
  R('java.io.FileInputStream', JFileInputStream);
  R('java.io.FileOutputStream', JFileOutputStream);
  R('java.io.BufferedReader', JBufferedReader);
  R('java.io.InputStreamReader', JInputStreamReader);
  R('java.io.InputStream', JInputStream);
  R('java.io.PrintWriter', JPrintWriter);
  R('java.io.OutputStreamWriter', JOutputStreamWriter);
  R('java.io.FileWriter', JOutputStreamWriter);
  R('java.io.BufferedWriter', JOutputStreamWriter);

  // java.lang.*
  R('java.lang.String', String);
  R('java.lang.Integer', JInteger);
  R('java.lang.Long', JInteger);
  R('java.lang.Float', JInteger);
  R('java.lang.Double', JInteger);
  R('java.lang.Short', JInteger);
  R('java.lang.Byte', JInteger);
  R('java.lang.Character', JInteger);
  R('java.lang.Boolean', JInteger);
  R('java.lang.Void', JInteger);

  // 各种 .TYPE
  R('java.lang.Boolean.TYPE', JInteger);
  R('java.lang.Integer.TYPE', JInteger);
  R('java.lang.Long.TYPE', JInteger);
  R('java.lang.Float.TYPE', JInteger);
  R('java.lang.Double.TYPE', JInteger);
  R('java.lang.Character.TYPE', JInteger);
  R('java.lang.Byte.TYPE', JInteger);
  R('java.lang.Short.TYPE', JInteger);
  R('java.lang.Void.TYPE', JInteger);

  R('java.lang.System', {
    getProperty: (k) => '',
    currentTimeMillis: () => Date.now(),
    nanoTime: () => performance.now() * 1e6,
    getenv: () => ({})
  });

  R('java.lang.Thread', JThread);
  R('java.lang.Runnable', class { constructor(r) { this.run = r.run || r; } });

  // java.util.*
  R('java.util.ArrayList', Array);
  R('java.util.HashMap', Map);
  R('java.util.LinkedHashMap', Map);
  R('java.util.HashSet', Set);
  R('java.util.Iterator', { hasNext: () => false, next: () => null });
  R('java.util.regex.Pattern', { compile: (s) => new RegExp(s), matches: () => false });
  R('java.util.zip.GZIPInputStream', JInputStream);
  R('java.util.zip.GZIPOutputStream', JOutputStreamWriter);
  R('java.util.zip.ZipFile', class { constructor() {} getEntry() { return null; } close() {} });

  // java.util.concurrent.Executors —— CA 的 Threads.run 依赖
  // 用 queueMicrotask 实现的简单线程池
  R('java.util.concurrent.Executors', {
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
  R('java.util.concurrent.TimeUnit', { MILLISECONDS: 'ms', SECONDS: 's' });

  R('java.text.SimpleDateFormat', class {
    constructor(p) { this._p = p; }
    format(d) { return d ? d.toLocaleString() : ''; }
    parse(s) { return new Date(s); }
  });

  R('java.net.URL', class {
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

  R('java.security.MessageDigest', class {
    static getInstance() { return { update(){}, digest: () => new Uint8Array(32) }; }
  });

  // android.text.SpannableStringBuilder —— IntelliSense 大量用
  // appendSSB 调 length() / append() / setSpan()
  R('android.text.SpannableStringBuilder', class {
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
  R('android.text.SpannableString', class {
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
  R('android.text.ForegroundColorSpan', class {
    constructor(color) { this._color = color; }
  });
  R('android.text.StyleSpan', class { constructor() {} });
  R('android.text.AbsoluteSizeSpan', class { constructor() {} });
  R('android.text.BackgroundColorSpan', class { constructor() {} });
  R('android.text.AlignmentSpan', class { constructor() {} });
  R('android.text.BulletSpan', class { constructor() {} });
  R('android.text.SubscriptSpan', class { constructor() {} });
  R('android.text.SuperscriptSpan', class { constructor() {} });
  R('android.text.UnderlineSpan', class { constructor() {} });
  R('android.text.StrikethroughSpan', class { constructor() {} });
  R('android.text.URLSpan', class { constructor() {} });

  // android.os.*
  R('android.os.Handler', JHandler);
  R('android.os.Looper', { getMainLooper: () => ({ getThread: () => ({ currentThread: () => ({}) }) }) });
  R('android.os.Build', {
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
  R('org.mozilla.javascript.Context', fakeCx);

  R('org.mozilla.javascript.ScriptRuntime', {
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
