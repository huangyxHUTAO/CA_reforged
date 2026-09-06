/**
 * 给 main.js 装全局：MapScript / Loader / ctx / gHandler / Log / erp / Intl
 *
 * main.js 顶层代码会用到：
 *   - MapScript.loadModule("ctx", fn)
 *   - MapScript.loadModule("gHandler", handler)
 *   - MapScript.loadModule("Log", fn)
 *   - MapScript.loadModule("erp", fn)
 *   - MapScript.loadModule("Loader", {...})  ← Loader 装载自己
 *   - MapScript.init(this)
 *   - Loader.load(function(){...})
 *
 * 注意：MapScript/Loader 是 main.js 内部 var 声明，**会覆盖**我们装的
 * globalThis.X。所以我们的胶水是在 main.js 装载的**之前**就装好，
 * 让 main.js 顶层代码能引用到（它的 var 是 function scope 内）。
 *
 * 不对 —— main.js 在 <script> 标签里执行，是 global scope。
 * 它的 var MapScript = {...} 是 global var。
 * 我们的 globalThis.MapScript 也会被覆盖。
 *
 * 所以正确的顺序是：
 *   1. 我们装 globalThis.__caMapScript = MapScript
 *   2. main.js 顶层 var MapScript = {...} 装到 globalThis.MapScript
 *   3. main.js Loader.load(function(){...}) 调 ctx/Log/erp/Loader/init
 *   4. 我们 hook 一些关键 API
 *
 * 但 Loader.load 里会 createFrameLayout 等很多 Android API —— 我们已经装了。
 */

import { MapScript } from './mapscript.js';

export function setupRuntimeGlobals() {
  if (globalThis.__caRuntimeGlobalsInstalled) return;

  // 1) MapScript
  globalThis.MapScript = MapScript;
  MapScript.init(globalThis);
  globalThis.MapScript = MapScript;
  // 不要预设 globalThis.Loader —— main.js 内部 MapScript.loadModule("Loader", {...})
  // 会判断 "Loader" in this.global，如果 true 就走 else 不赋值
  // 同样不要预设 Intl/UserManager/AndroidBridge/MCAdapter/NeteaseAdapter/SettingsCompat
  // 因为 main.js 会注册它们
  globalThis.ctx = makeCtx();
  globalThis.gHandler = makeHandler();
  globalThis.Log = makeLog();
  globalThis.erp = makeErp();

  // 2) 钩子（main.js 顶层定义了 23 个 noop 函数，var 形式，但我们的 globalThis 上也要有，
  //    以防 main.js 的 `var xxx = function() {}` 被引擎引用）
  for (const hook of MapScript.hooks) {
    if (typeof globalThis[hook] !== 'function') {
      globalThis[hook] = function () {};
    }
  }

  // 2.5) Intl 占位 —— main.js 顶层用 `Intl.lookupLang({...})`。
  //      如果不预设，浏览器原生 Intl（没 lookupLang）会报 not a function
  //      必须预设 + push 到 modules，让 loadModule 走覆盖分支
  globalThis.Intl = {
    get: (k) => k,
    mapNamespace: () => {},
    loadLang: () => {},
    lookupLang: (ranges) => 'zh_CN',
    defaultLang: {}
  };
  if (MapScript.modules.indexOf('Intl') < 0) MapScript.modules.push('Intl');

  // 2.6) MapScript.readJSON / saveJSON shim —— 让 built main.js 里的
  //      CA.Library.initLibrary 能从我们预加载的 JSON 读
  //      注意：built main.js 顶层是 var MapScript = {...}，会覆盖 globalThis.MapScript
  //      所以我们 hook 到原型/方法层面不太合适。
  //      简单办法：把 readJSON/saveJSON 写到 globalThis.__caMapScriptPatch，
  //      main.js 顶层执行完后，boot 再补上。
  //      但更简单：直接 patch globalThis.MapScript.readJSON —— 因为 main.js
  //      的 var MapScript = {...} 也会写到 globalThis.MapScript（global var），
  //      所以我们覆盖 globalThis.MapScript.readJSON 后会被 main.js 的 MapScript
  //      字面量覆盖掉，时序问题。
  //      解决方案：等 main.js 跑完后再 patch。
  globalThis.__caMapScriptPatches = {
    readJSON: function (path, defaultValue, gzipped) {
      // path 形如 'builtinLibrarys/default.json' 或绝对路径
      const fullPath = String(path).replace(/\\/g, '/');
      const fileName = fullPath.split('/').pop();
      const pre = globalThis.__caJsonFiles || {};
      // 试多种 key（带或不带 builtinLibrarys/ 前缀）
      const candidates = [
        fileName,
        'builtinLibrarys/' + fileName
      ];
      for (const k of candidates) {
        if (k in pre) {
          // 用 { data: ..., mode: 0 } 格式（readJSON 返回值约定）
          return { data: pre[k], mode: 0 };
        }
      }
      return defaultValue;
    },
    saveJSON: function (path, object) {
      const fullPath = String(path).replace(/\\/g, '/');
      const fileName = fullPath.split('/').pop();
      globalThis.__caJsonFiles = globalThis.__caJsonFiles || {};
      globalThis.__caJsonFiles[fileName] = object;
      return true;
    }
  };
  //      如果不预设，浏览器原生 Intl（没 lookupLang）会报 not a function
  //      必须预设 + push 到 modules，让 loadModule 走覆盖分支
  globalThis.Intl = {
    get: (k) => k,
    mapNamespace: () => {},
    loadLang: () => {},
    lookupLang: (ranges) => 'zh_CN',
    defaultLang: {}
  };
  if (MapScript.modules.indexOf('Intl') < 0) MapScript.modules.push('Intl');

  // 3) ScriptInterface 替身
  globalThis.ScriptInterface = {
    createFrameLayout: (opts) => makeFrameLayout(opts),
    setLoadingTitle: (s) => console.log('[ca loading]', s),
    setBridge: (b) => { globalThis.__caBridge = b; },
    runOnUiThread: (f) => f(),
    quit: () => {},
    getContext: () => globalThis.ctx,
    getBindActivity: () => null,
    getScriptManager: () => ({ open: (p) => null }),
    getTileService: () => ({ service: { name: 'tile' }, initialized: false }),
    getPreference: () => ({
      getBootStart: () => false,
      setBootStart: () => {},
      getHideSplash: () => false,
      setHideSplash: () => {}
    }),
    notifyTileUpdate: () => {},
    beginPermissionRequest: () => {},
    requestPermissionsCompat: () => {},
    startActivityForResult: () => {},
    beginForegroundTask: () => {},
    setBridgeCallback: () => {},
    reportError: () => {},
    fileToUri: (f) => ({ getPath: () => '/' }),
    uriToFile: () => null,
    getIntent: () => ({ getAction: () => null, getData: () => null, getExtras: () => null }),
    ACTION_ADD_LIBRARY: 'ca.action.ADD_LIBRARY',
    ACTION_EDIT_COMMAND: 'ca.action.EDIT_COMMAND',
    ACTION_START_FROM_SHORTCUT: 'ca.action.START_FROM_SHORTCUT',
    ACTION_SCRIPT_ACTION: 'ca.action.SCRIPT_ACTION',
    ACTION_URI_ACTION: 'ca.action.URI_ACTION',
    verifySign: () => {},
    verifyContext: () => {},
    verifyDex: () => {},
    doCreateShortcut: () => {},
    exitLoading: () => {}
  };

  // 4) AndroidBridge 替身
  globalThis.AndroidBridge = {
    intentCallback: {},
    permissionRequestData: { start: 0, end: 0 },
    permissionCallback: { length: 0 },
    foregroundTask: {},
    callHide: () => {},
    scriptAction: () => {},
    openUriAction: () => {},
    notifySettings: () => {},
    getAppIcon: () => null,
    getAppIconBadged: () => null,
    listLaunchableApp: (cb, inc) => cb && cb(null),
    listApp: (cb) => cb && cb(null),
    startActivity: () => true,
    startActivityForResult: () => {},
    beginForegroundTask: () => {},
    requestPermissionsByGroup: () => {},
    requestPermissions: (perms, exp, cb) => cb && cb(true, perms.slice(), [], true),
    doPermissionRequest: () => {},
    createPendingIntent: () => null,
    getABIs: () => ['x86_64'],
    uriToFile: () => null,
    fileToUri: (f) => ({ getPath: () => '/' }),
    selectFile: (mime, cb) => cb && cb(null),
    selectImage: (cb) => cb && cb(null),
    sendText: () => true,
    sendUri: () => true,
    sendFile: () => true,
    shareText: () => true,
    viewUri: () => true,
    createShortcut: () => {},
    doCreateShortcut: () => {},
    scanMedia: () => {},
    startAccessibilitySvcByRoot: () => true,
    startAccessibilitySvcByRootAsync: () => {},
    shouldForceRemoveTask: () => false,
    notifyTileUpdate: () => {},
    getTileService: () => null,
    getKeeperMenu: () => [],
    defaultKeeperMenu: [],
    showEditTile: () => {},
    HOTFIX: false
  };

  // 5) MCAdapter
  globalThis.MCAdapter = {
    client: null,
    connInit: false,
    version: 0,
    targetVersion: 0,
    bundle: null,
    updateInfo: () => {},
    callHook: () => {},
    listAdapters: () => {}
  };

  // 6) NeteaseAdapter
  globalThis.NeteaseAdapter = { mcVersion: '1.20.0' };

  // 7) SettingsCompat
  globalThis.SettingsCompat = {
    ensureCanFloat: () => true
  };

  // 8) ExternalStorage
  globalThis.ExternalStorage = {
    uriToName: () => 'unknown',
    importFile: () => null,
    toUri: (f) => ({ getPath: () => '/' })
  };

  globalThis.__caRuntimeGlobalsInstalled = true;
}

function makeCtx() {
  return {
    runOnUiThread: (fn) => fn(),
    getMainLooper: () => ({ getThread: () => ({ currentThread: () => ({}) }) }),
    getDir: () => ({ getAbsolutePath: () => '/ca-modules/' }),
    getPackageName: () => 'ca.web',
    getExternalFilesDir: () => '/ca-modules/',
    getSystemService: () => ({ setText: () => {} }),
    getResources: () => ({
      getDisplayMetrics: () => ({ density: 1, scaledDensity: 1, widthPixels: 1024, heightPixels: 768 }),
      getConfiguration: () => ({ getLocales: () => ({ size: () => 0, get: () => ({ getLanguage: () => 'en', getCountry: () => 'US' }) }) }),
      getIdentifier: (name) => 0,
      getString: (id) => ''
    }),
    getContentResolver: () => ({ query: () => null, getString: () => '' }),
    setTheme: () => {},
    startActivity: () => true,
    finish: () => {},
    revokeUriPermission: () => {},
    getPackageManager: () => ({
      getApplicationInfo: () => ({ icon: 0 }),
      getResourcesForApplication: () => ({ getDrawable: () => null }),
      getApplicationLabel: () => 'app',
      getInstalledPackages: () => [],
      queryIntentActivities: () => ({ size: () => 0 }),
      getLaunchIntentForPackage: () => null
    }),
    sendBroadcast: () => {},
    getClassLoader: () => null,
    getClass: () => null,
    getApplicationContext: () => null,
    checkSelfPermission: () => 0
  };
}

function makeHandler() {
  return {
    post: (fn) => queueMicrotask(fn),
    postDelayed: (fn, ms) => setTimeout(fn, ms)
  };
}

function makeLog() {
  return {
    nullFunc: (v) => v,
    start: function (target) {
      this.setTarget(target);
      return this;
    },
    stop: function () {
      this.setTarget('null');
      return this;
    },
    setTarget: function (target) {
      if (target instanceof Function) {
        this.println = target;
      } else {
        this.println = () => {};
      }
    },
    setTargetTarget: () => {},
    println: (level, msg) => {
      if (level === 'Error' || level === 'Fatal') console.error('[ca]', level, msg);
      else if (level === 'Warning') console.warn('[ca]', level, msg);
      else console.log('[ca]', level, msg);
    },
    a: (a, b, m) => { if (a !== b) throw new Error('assert: ' + m + ': ' + a + ' !== ' + b); },
    e: (e) => console.error('[ca Error]', e),
    s: (o) => { console.log('[ca Tree]', o); return o; },
    t: (msg) => console.log('[ca Toast]', msg),
    r: () => new Error().stack,
    c: function (f, scope) {
      try { return f.apply(scope, [].slice.call(arguments, 2)); }
      catch (e) { console.error('[ca]', e); }
    },
    d: function (...args) { console.debug('[ca Debug]', args.join('; ')); }
  };
}

function makeErp() {
  return function (error, silent, extra) {
    // 简单版：log，弹窗省略
    try {
      if (error && error.message) {
        console.error('[ca erp]', error.message);
      } else {
        console.error('[ca erp]', error);
      }
    } catch (e) {}
  };
}

function makeFrameLayout(opts) {
  return {
    setContentDescription: () => {},
    addView: (v, params) => v,
    removeView: () => {},
    setLayoutParams: () => {},
    getLayoutParams: () => ({}),
    setVisibility: () => {},
    getVisibility: () => 0,
    getWidth: () => 0,
    getHeight: () => 0,
    getRootView: () => null,
    dispatchKeyEvent: opts?.dispatchKeyEvent || (() => 0),
    dispatchTouchEvent: opts?.dispatchTouchEvent || (() => 0)
  };
}
