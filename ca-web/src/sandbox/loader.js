/**
 * Loader shim（Web 端）
 *
 * 原版 Loader 的核心职责是：
 * 1) 异步加载并 eval 源文件
 * 2) 维护模块缓存 (this.cache)
 * 3) 提供 fromFile / require / open / readFile / evalSpecial
 *
 * Web 端策略：
 * - 不做 eval，全部走 ESM import（由 Vite 处理）
 * - 保留原版 API 签名，但实现改成"标记已加载 + 触发 onLoad 钩子"
 * - 调用方（main.js 的 Loader.load）改为按顺序静态 import 所有模块
 *
 * 保留的方法：
 *   Loader.open / readFile / fromFile / require / getCanonicalFile
 *   Loader.cache / modules / enableCache / disableCache
 *   Loader.lockProperty / lockMethods / lockFields / freezeObject / ...
 *
 * 详见 ca/main.js:416-607
 */

import { MapScript } from './mapscript.js';
import { installAndroidShim } from './android-shim.js';

// 重新导出，让 main.js 和 Vite 插件都能从同一个模块拿
export { MapScript };

/**
 * 把 Rhino 时代的所有 global（MapScript / Loader / ctx / gHandler / Log / erp 等）
 * 暴露到 globalThis，让 ca/modules 下原版代码能直接引用不 import。
 *
 * 由 vite-plugin-ca-loader.js 在每个 ca/modules 文件顶部注入调用。
 */
export function exposeGlobals() {
  // 第一次调用时初始化 global 绑定
  if (!globalThis.MapScript) {
    installAndroidShim();
    MapScript.init(globalThis);
    globalThis.MapScript = MapScript;
    globalThis.Loader = Loader;
    globalThis.Log = window.__caLog || (window.__caLog = makeLog());
    globalThis.gHandler = window.__caHandler || (window.__caHandler = makeHandler());
    globalThis.erp = window.__caErp || (window.__caErp = makeErp());
    globalThis.ctx = window.__caCtx || (window.__caCtx = makeCtx());
    // Intl 在 ca/modules/Intl.js 里定义，但更早的模块可能引用
    // 先放占位，等真实 Intl.js 加载时会覆盖
    // 注意：浏览器原生 globalThis.Intl 存在，所以必须 delete 再 set
    // 然后也要 push 到 modules（让 loadModule 认为已注册、走覆盖分支）
    delete globalThis.Intl;
    if (!globalThis.Intl) {
      globalThis.Intl = { get: (k) => k, mapNamespace: () => {} };
      MapScript.modules.push('Intl');
    }

    // 注册所有 hook 为空函数（Web 端不会真正触发 MC 事件）
    // 原版 main.js:23-46 定义了一堆全局钩子
    for (const hook of MapScript.hooks) {
      globalThis[hook] = function () { /* noop */ };
    }
  }
}

function makeLog() {
  // 原版 Log 是带 start/stop/setTarget 的对象，这里只暴露 println
  return {
    println(level, msg) {
      const tag = `[ca ${level}]`;
      if (level === 'Error' || level === 'Fatal') console.error(tag, msg);
      else if (level === 'Warning') console.warn(tag, msg);
      else console.log(tag, msg);
    },
    a(a, b, m) { if (a !== b) throw new Error(`assert: ${m}: ${a} !== ${b}`); },
    e(e) { console.error('[ca Error]', e); },
    s(o) { console.log('[ca Tree]', o); return o; },
    t(msg) { console.log('[ca Toast]', String(msg)); },
    r() { return new Error().stack; },
    c(f, scope) {
      try { return f.apply(scope, [].slice.call(arguments, 2)); }
      catch (e) { console.error('[ca]', e); }
    },
    d(...args) { console.debug('[ca Debug]', args.join('; ')); }
  };
}

function makeHandler() {
  return {
    post(fn) {
      // 原版走 Android 主线程，Web 端用微任务即可
      queueMicrotask(fn);
    }
  };
}

function makeErp() {
  // 原版 erp 是错误上报 + 弹 Toast。Web 端简化：只 log
  return function erp(error, silent, extra) {
    console.error('[ca erp]', error, silent ? '(silent)' : '', extra || '');
  };
}

function makeCtx() {
  // 假 Activity，最小接口集
  return {
    runOnUiThread(fn) { fn(); },
    getMainLooper() { return { getThread: () => ({ currentThread: () => ({}) }) }; },
    getDir() { return { getAbsolutePath: () => '/ca-modules/' }; },
    getPackageName() { return 'ca.web' },
    getExternalFilesDir() { return '/ca-modules/' },
    getSystemService() { return { setText: () => {} }; },
    getResources() {
      return { getDisplayMetrics: () => ({ density: 1, scaledDensity: 1, widthPixels: 1024, heightPixels: 768 }) };
    },
    setTheme() {},
    startActivity() { return true; },
    finish() {},
    revokeUriPermission() {}
  };
}

class LoaderImpl {
  constructor() {
    this.cache = null;
    this.modules = {};
    this.loading = false;
    this.modulePath = '/ca-modules/';
    /** @type {Set<string>} 已注册的源文件相对路径 */
    this._loaded = new Set();
  }

  enableCache() {
    if (!this.cache) this.cache = {};
  }
  disableCache() {
    if (this.cache) this.cache = null;
  }

  /** 把模块标记为已加载，触发 onCreate（如果之前未触发过） */
  register(relativePath) {
    if (this._loaded.has(relativePath)) return false;
    this._loaded.add(relativePath);
    return true;
  }

  getCanonicalFile(path) {
    // Web 端 path 已经是相对路径，做最小化处理
    const normalized = path.replace(/\\/g, '/');
    const idx = normalized.lastIndexOf('/');
    return {
      path: normalized,
      name: idx >= 0 ? normalized.slice(idx + 1) : normalized,
      parent: idx >= 0 ? normalized.slice(0, idx) : ''
    };
  }

  open(path) {
    // 仅占位 —— 真正的 IO 由 import() 处理
    throw new Error('Loader.open: Web 端请用 import() 而不是 open()');
  }

  readFile(path) {
    throw new Error('Loader.readFile: Web 端请用 fetch()');
  }

  fromFile(path) {
    if (path.endsWith('.json')) {
      throw new Error(
        `Loader.fromFile("${path}"): JSON 同步加载在 Web 端不支持，` +
        '请改用 await import(...)'
      );
    }
    if (path.endsWith('.js')) {
      // CA.js 末尾用 Loader.fromFile("CA.Library.js") 等"运行时"加载子模块。
      // 我们的 main.js 已提前 import 触发副作用并把 default export 挂到
      // globalThis.__caPreloadedModules[path]。这里同步返回。
      const pre = globalThis.__caPreloadedModules;
      if (pre && path in pre) {
        return pre[path];
      }
      throw new Error(
        `Loader.fromFile("${path}") 未在预加载表里：` +
        '请在 main.js 里先 import 这个文件'
      );
    }
    throw new Error(`Loader.fromFile("${path}"): 未知类型`);
  }

  require(path, module) {
    // 占位。同上。
    throw new Error(`Loader.require("${path}") 在 Web 端未实现`);
  }

  evalSpecial(source, sourceName, lineNumber, scope, thisArg) {
    // 占位。Web 端不需要 evalSpecial
    throw new Error('Loader.evalSpecial 在 Web 端未实现');
  }

  // ---------- 工具方法：原版有，Web 端保留以兼容 ca/modules 内部调用 ----------

  lockProperty(obj, propertyName) {
    Object.defineProperty(obj, propertyName, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: obj[propertyName]
    });
  }

  lockMethods(obj, methods) {
    const a = methods || Object.getOwnPropertyNames(obj);
    for (let i = 0; i < a.length; i++) {
      if (typeof obj[a[i]] === 'function') this.lockProperty(obj, a[i]);
    }
  }

  lockFields(obj, fields) {
    const a = fields || Object.getOwnPropertyNames(obj);
    for (let i = 0; i < a.length; i++) {
      if (typeof obj[a[i]] !== 'function') this.lockProperty(obj, a[i]);
    }
  }

  freezeObject(obj) {
    const a = Object.getOwnPropertyNames(obj);
    for (let i = 0; i < a.length; i++) {
      if (typeof obj[a[i]] === 'object') this.freezeObject(obj[a[i]]);
    }
    Object.freeze(obj);
  }

  freezeProperty(obj, propertyName) {
    if (typeof obj[propertyName] === 'object') this.freezeObject(obj[propertyName]);
    this.lockProperty(obj, propertyName);
  }

  freezeFields(obj, fields) {
    const a = fields || Object.getOwnPropertyNames(obj);
    for (let i = 0; i < a.length; i++) {
      if (typeof obj[a[i]] !== 'function') this.freezeProperty(obj, a[i]);
    }
  }

  ProtectedMethodWrapper(realFunc) {
    const args = new Array(arguments.length - 1);
    for (let i = 0; i < args.length; i++) args[i] = arguments[i + 1];
    return realFunc.apply(this, args);
  }

  protectMethods(parent, objName, publicProp) {
    const obj = parent[objName];
    const target = {};
    for (let i = 0; i < publicProp.length; i++) {
      const propName = publicProp[i];
      const propData = obj[propName];
      if (typeof propData === 'function') {
        target[propName] = this.ProtectedMethodWrapper.bind(obj, propData);
      } else {
        Object.defineProperty(obj, propName, {
          enumerable: true,
          configurable: false,
          get() { return obj[propName]; },
          set(value) { obj[propName] = value; }
        });
      }
    }
    parent[objName] = target;
  }

  /**
   * 异步加载入口。Web 端由 build 入口直接静态 import 所有模块，
   * 这里只是占位 + 调用 onComplete 回调。
   */
  load(loaderFn) {
    this.loading = true;
    this.enableCache();
    Promise.resolve(loaderFn())
      .then(() => {
        this.loading = false;
        this.disableCache();
        MapScript.initialize();
      })
      .catch((e) => {
        console.error('[Loader.load] 加载失败:', e);
        this.loading = false;
        this.disableCache();
      });
  }
}

export const Loader = new LoaderImpl();
export { LoaderImpl };
