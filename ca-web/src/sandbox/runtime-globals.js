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

  // 2.5) Intl —— 删除浏览器原生 Intl，让 built main.js 的
  //      MapScript.loadModule("Intl", {...}) 能装上引擎版（loadModule 的
  //      `name in global` 检查会把原生 Intl 当已注册而拒绝覆盖）。
  //      引擎版带 lookupLang/loadLang/mapNamespace，Common.onCreate 的
  //      Intl.mapNamespace(this, "intl", "common") 依赖它挂 Common.intl
  delete globalThis.Intl;

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

  // 3) ScriptInterface 替身
  globalThis.ScriptInterface = {
    createFrameLayout: (opts) => makeFrameLayout(opts),
    getGiteeClientId: () => '',
    getGiteeClientSecret: () => '',
    createWebView: (opts) => {
      // 用 android-view 的 WebView（iframe 承载）—— onConsoleMessage 等回调忽略
      try {
        const WV = globalThis.android?.webkit?.WebView;
        if (WV) return new WV();
      } catch (e) {}
      return null;
    },
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
    exitLoading: () => {},
      // Web 端默认离线（无 MC 服务器连接），避免隐藏函数 / 检测逻辑报错
      isOnlineMode: () => false,
      getGameType: () => 0
  };

  // 4) AndroidBridge 替身
  globalThis.AndroidBridge = {
    intentCallback: {},
    permissionRequestData: { start: 0, end: 0 },
    permissionCallback: { length: 0 },
    foregroundTask: {},
    Tiles: {}, // updateDebugAction 会 AndroidBridge.Tiles["debug.tile"]=...
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

  // 5) MCAdapter —— Web 端禁用：只提供安全空实现。
  //    引擎（IntelliSense.procPosition 等）会调 MCAdapter.available() 判断是否有
  //    Minecraft 适配器可取玩家坐标/朝向；返回 false 即走"无适配器"分支，不崩不误插。
  globalThis.MCAdapter = {
    client: null,
    connInit: false,
    version: 0,
    targetVersion: 0,
    bundle: null,
    inLevel: false,
    available: () => false,
    getInfo: () => null,
    updateInfo: () => {},
    callHook: () => {},
    notifyInfoUpdate: () => {},
    listAdapters: () => {},
    applySense: () => {},
    existPackage: () => false,
    createShortcut: () => {},
    initWSServer: () => {},
    onWSPlayerTravelled: () => {}
  };

  // 6) NeteaseAdapter
  globalThis.NeteaseAdapter = { mcVersion: '1.21.0' };
  // cadroid 注入的全局：返回 MC 版本。取高版本让 CA.checkFeatures 走完整功能分支
  globalThis.getMinecraftVersion = function () { return globalThis.NeteaseAdapter.mcVersion; };
  globalThis.getCurrentMcVersion = globalThis.getMinecraftVersion;

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
    getMainLooper: () => globalThis.android?.os?.Looper?.getMainLooper() || ({ getThread: () => ({ currentThread: () => ({}) }) }),
    getWindow: () => ({
      getDecorView: () => ({ getWindowToken: () => null, getWidth: () => window.innerWidth, getHeight: () => window.innerHeight }),
      setSoftInputMode: () => {},
      getWindowManager: () => ({ getDefaultDisplay: () => ({ getWidth: () => window.innerWidth, getHeight: () => window.innerHeight, getMetrics: (m) => { m.widthPixels = window.innerWidth; m.heightPixels = window.innerHeight; } }) }),
      getAttributes: () => ({})
    }),
    getWindowManager: () => ({
      getDefaultDisplay: () => ({ getWidth: () => window.innerWidth, getHeight: () => window.innerHeight, getMetrics: (m) => { m.widthPixels = window.innerWidth; m.heightPixels = window.innerHeight; } })
    }),
    getDir: () => ({ getAbsolutePath: () => '/ca-modules/' }),
    getPackageName: () => 'ca.web',
    getExternalFilesDir: () => '/ca-modules/',
    // Android Context 服务名常量（PWM.wm = ctx.getSystemService(ctx.WINDOW_SERVICE)）
    WINDOW_SERVICE: 'window',
    LAYOUT_INFLATER_SERVICE: 'layout_inflater',
    CLIPBOARD_SERVICE: 'clipboard',
    CONNECTIVITY_SERVICE: 'connectivity',
    NOTIFICATION_SERVICE: 'notification',
    VIBRATOR_SERVICE: 'vibrator',
    AUDIO_SERVICE: 'audio',
    POWER_SERVICE: 'power',
    ALARM_SERVICE: 'alarm',
    INPUT_METHOD_SERVICE: 'input_method',
    TELEPHONY_SERVICE: 'telephony',
    ACCESSIBILITY_SERVICE: 'accessibility',
    getPkgNameForIcon: () => null,
    getSystemService: (name) => {
      if (name === 'window' || name === 'WINDOW_SERVICE') {
        // PWM.wm 就是这个对象：默认给 wm 协议空实现（boot 后 patchWM 替换为挂 DOM 版）
        return {
          addView: () => true,
          removeView: () => true,
          removeViewImmediate: () => true,
          updateViewLayout: () => true,
          getDefaultDisplay: () => ({
            getWidth: () => window.innerWidth,
            getHeight: () => window.innerHeight,
            getRotation: () => 0,
            getMetrics: (m) => { if (m) { m.widthPixels = window.innerWidth; m.heightPixels = window.innerHeight; m.density = 1; m.scaledDensity = 1; } },
            getRealMetrics: (m) => { if (m) { m.widthPixels = window.innerWidth; m.heightPixels = window.innerHeight; } }
          })
        };
      }
      if (name === 'layout_inflater' || name === 'LAYOUT_INFLATER_SERVICE') {
        return { inflate: () => new (globalThis.android.widget.FrameLayout)() };
      }
      if (name === 'input_method' || name === 'INPUT_METHOD_SERVICE') {
        return {
          showSoftInput: (view, flags) => { try { view?.el?.focus?.(); } catch (e) {} return true; },
          hideSoftInputFromWindow: () => true,
          toggleSoftInput: () => true,
          isAcceptingText: () => true,
          isActive: () => true,
          showStatusIcon: () => {},
          restartInput: () => {},
          updateSelection: () => {}
        };
      }
      if (name === 'clipboard' || name === 'CLIPBOARD_SERVICE') {
        return {
          setText: (t) => navigator.clipboard?.writeText(String(t)).catch(() => {}),
          getText: () => null,
          setPrimaryClip: () => {},
          getPrimaryClip: () => null,
          hasPrimaryClip: () => false
        };
      }
      if (name === 'connectivity' || name === 'CONNECTIVITY_SERVICE') {
        return {
          getActiveNetworkInfo: () => ({ isConnected: () => navigator.onLine, isAvailable: () => navigator.onLine }),
          getNetworkInfo: () => null
        };
      }
      return { setText: () => {}, getDefaultDisplay: () => ({ getWidth: () => window.innerWidth, getHeight: () => window.innerHeight, getMetrics: (m) => { if (m) { m.widthPixels = window.innerWidth; m.heightPixels = window.innerHeight; } } }) };
    },
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
    postDelayed: (fn, ms) => setTimeout(fn, ms),
    postAtFrontOfQueue: (fn) => queueMicrotask(fn),
    removeCallbacks: () => {},
    removeCallbacksAndMessages: () => {},
    hasMessages: () => false,
    sendEmptyMessage: () => true,
    sendMessage: () => true,
    obtainMessage: () => ({ sendToTarget: () => {}, replyTo: null }),
    getLooper: () => globalThis.android?.os?.Looper?.getMainLooper?.() || null
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
    throwError: function (err) {
      Error.captureStackTrace && Error.captureStackTrace(err, this.throwError);
      throw err;
    },
    f: (name, args) => { const s = []; for (let i = 0; i < args.length; i++) s.push(args[i]); console.log('[ca Verbose]', name + '(' + s.join(', ') + ')'); },
    debug: (name, o, depth, objs) => o,
    c: function (f, scope) {
      try { return f.apply(scope, [].slice.call(arguments, 2)); }
      catch (e) { console.error('[ca]', e); }
    },
    d: function (...args) { console.debug('[ca Debug]', args.join('; ')); }
  };
}

function makeErp() {
  return function (error, silent, extra) {
    try {
      if (error instanceof Error) {
        console.error('[ca erp]', error.message, '\n', (error.stack || '').split('\n').slice(1, 5).join('\n'));
      } else {
        console.error('[ca erp]', error);
      }
    } catch (e) {}
  };
}

function makeFrameLayout(opts) {
  // 优先：返回真 DOM FrameLayout（android-view.js 注册过 android.widget.FrameLayout）
  try {
    const FL = globalThis.android?.widget?.FrameLayout;
    if (FL) {
      const f = new FL();
      // FrameLayout 需要能接子 View + dispatchKey/Touch（PopupWindow 装饰）
      f.dispatchKeyEvent = opts?.dispatchKeyEvent || (() => 0);
      f.dispatchTouchEvent = opts?.dispatchTouchEvent || (() => 0);
      f.setContentDescription(String('FrameLayout'));
      return f;
    }
    console.warn('[ca-web] makeFrameLayout: android.widget.FrameLayout 未注册，用 fallback');
  } catch (e) {
    console.warn('[ca-web] makeFrameLayout try 失败:', e?.message || e);
  }
  // fallback：带全套 WM 兼容方法
  const lp = {
    width: -2, height: -2, gravity: 0, x: 0, y: 0, type: 0, flags: 0,
    setTitle() { return this; },
    getTitle() { return ''; }
  };
  return {
    setContentDescription: () => {},
    addView: (v, params) => v,
    removeView: () => {},
    setLayoutParams: () => {},
    getLayoutParams: () => lp,
    setVisibility: () => {},
    getVisibility: () => 0,
    getWidth: () => 0,
    getHeight: () => 0,
    getRootView: () => null,
    dispatchKeyEvent: opts?.dispatchKeyEvent || (() => 0),
    dispatchTouchEvent: opts?.dispatchTouchEvent || (() => 0)
  };
}
