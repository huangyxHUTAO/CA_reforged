/**
 * CA-Web 入口
 *
 * 策略：
 * 1. 装所有 android.* / java.* / org.mozilla.* 全局 Proxy
 * 2. 装 ctx / gHandler / Log / erp / MapScript / Loader 等胶水
 * 3. 用 fetch 同步把 ca-built.js 拿到（用 async/await）
 * 4. eval ca-built.js（让 MapScript.loadModule 全部副作用跑）
 * 5. 等 Loader.load 异步完成（initialize）
 * 6. 启动 Lit UI
 *
 * 注意：ca-built.js 来自 ca/build/outputs/releaseSource/main.js，
 * 已经被 cabuildtools 拼过（Loader.fromFile 调用已展开）。
 * Web 端只需保证它引用的 java.io / org.mozilla / android.* 全可用。
 */

import './sandbox/android-shim.js';
import { installAndroidShim, setupJavaIORuntime, setupRhinoRuntime, registerAt } from './sandbox/android-shim.js';
import { registerAndroidViews } from './sandbox/android-view.js';
import { setupRuntimeGlobals } from './sandbox/runtime-globals.js';
import './components/ca-app.js';

async function boot() {
  console.log('[ca-web] booting...');

  // 1) 装 android.* / java.* / org.mozilla.* / com.* / javax.* / Packages. Proxy
  installAndroidShim();
  // 2) 在 Proxy 之上加 java.io / org.mozilla 的真实现（替换关键 API）
  setupJavaIORuntime();
  setupRhinoRuntime();
  // 3) 装 ctx / gHandler / Log / erp / MapScript 初始化等
  setupRuntimeGlobals();
  // 3.5) 装 android.widget.* / android.view.* 真 DOM 实现
  registerAndroidViews(registerAt);

  // 4) 拉 ca-built.js（CA 引擎主体，68K 行 ES5）
  const url = new URL('./ca-built.js', import.meta.url).href;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch ca-built.js: ' + res.status);
  const src = await res.text();

  // 4.5) 建 CA UI 宿主容器（浮窗/弹窗挂这里）
  let caOverlay = document.getElementById('ca-overlay');
  if (!caOverlay) {
    caOverlay = document.createElement('div');
    caOverlay.id = 'ca-overlay';
    caOverlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:visible;';
    document.body.appendChild(caOverlay);
  }
  // ctx 挂 root/overlay，让 ScriptInterface.createFrameLayout 等能挂 DOM
  const attachOverlay = (dom) => {
    if (dom && !dom.isConnected) {
      dom.style.pointerEvents = 'auto';
      caOverlay.appendChild(dom);
    }
  };
  globalThis.__caOverlay = caOverlay;
  globalThis.__caAttachOverlay = attachOverlay;

  // 5) eval —— 让所有 MapScript.loadModule 副作用跑
  //    注意：ca-built.js 顶层定义 var MapScript/Loader/Log/erp/ctx，
  //    所以必须用 var 形式重新声明（Function 不行因为会丢 var）。
  //    改用 indirect eval（global scope）形式：
  //    new Function 不能定义顶层 var —— 改用 indirect eval:
  //    (0, eval)(src) 在 global scope 执行
  console.log('[ca-web] evaluating CA engine (' + src.length + ' bytes)...');

  // 创建 <script> 元素，注入 src，全局执行
  const script = document.createElement('script');
  script.textContent = src;
  document.head.appendChild(script);

  // 5.2) 拦截 PWM.wm —— WindowManager.addView 把 DOM 挂到 body overlay
  const domOf = (view) => (view && (view.el || view.dom)) || null;
  const patchWM = () => {
    const PWM = globalThis.PWM;
    if (!PWM || !PWM.wm || PWM.__caPatchedWM) return;
    PWM.__caPatchedWM = true;
    const wm = PWM.wm;
    wm.addView = (view, lp) => {
      if (globalThis.__caDebugWM) {
        console.log('[ca-web wm.addView] view ctor:', view?.constructor?.name,
          'hasEl:', !!(view && (view.el || view.dom)),
          'lp:', lp && Object.keys(lp).slice(0, 8).join(','),
          'lpHasSetTitle:', !!(lp && typeof lp.setTitle === 'function'));
      }
      const dom = domOf(view);
      if (dom) {
        dom.style.position = 'fixed';
        dom.style.zIndex = '100000';
        dom.style.pointerEvents = 'auto';
        attachOverlay(dom);
      }
      return true;
    };
    wm.removeViewImmediate = (view) => {
      const dom = domOf(view);
      if (dom && dom.isConnected) dom.remove();
      return true;
    };
    wm.removeView = wm.removeViewImmediate;
    wm.updateViewLayout = (view, lp) => {
      const dom = domOf(view);
      if (dom && lp) {
        if (lp.x != null) dom.style.left = lp.x + 'px';
        if (lp.y != null) dom.style.top = lp.y + 'px';
        if (lp.width === -1) dom.style.width = '100%';
        else if (lp.width > 0) dom.style.width = lp.width + 'px';
        if (lp.height === -1) dom.style.height = '100%';
        else if (lp.height > 0) dom.style.height = lp.height + 'px';
        if (lp.gravity === 0x11) {
          dom.style.left = '50%';
          dom.style.top = '50%';
          dom.style.transform = 'translate(-50%, -50%)';
        }
      }
      return true;
    };
    console.log('[ca-web] PWM.wm patched');
  };
  patchWM();
  // 轮询等 PWM 出现
  let wmPolls = 0;
  const wmTimer = setInterval(() => {
    if (globalThis.PWM?.wm && globalThis.PWM?.__caPatchedWM) {
      clearInterval(wmTimer);
      return;
    }
    patchWM();
    if (++wmPolls > 200) clearInterval(wmTimer);
  }, 50);

  // 5.5) 立刻打补丁：ca-built.js 的 var MapScript = {...} 会覆盖 globalThis.MapScript
  //      我们的 readJSON/saveJSON shim 必须重写一次
  if (globalThis.__caMapScriptPatches) {
    for (const k of Object.keys(globalThis.__caMapScriptPatches)) {
      globalThis.MapScript[k] = globalThis.__caMapScriptPatches[k];
    }
    console.log('[ca-web] MapScript patches applied');
  }

  // 5.6) 预加载 builtin JSON 到 globalThis.__caJsonFiles
  //      built main.js 顶层第 46391 行有 CA.Library.inner["default"] = {...} 赋值
  //      但 initLibrary 还会调 readJSON 读 JSON 文件。提供 shim 让它有数据。
  try {
    const [def, basic, states, jsonSchema] = await Promise.all([
      fetch('/ca-json/builtinLibrarys/default.json').then(r => r.json()).catch(() => null),
      fetch('/ca-json/builtinLibrarys/basicedu.json').then(r => r.json()).catch(() => null),
      fetch('/ca-json/builtinLibrarys/states.json').then(r => r.json()).catch(() => null),
      fetch('/ca-json/builtinLibrarys/JSONSchema.json').then(r => r.text().then(t => JSON.parse(t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')))).catch(() => null)
    ]);
    globalThis.__caJsonFiles = {
      'default.json': def,
      'basicedu.json': basic,
      'states.json': states,
      'JSONSchema.json': jsonSchema
    };
    console.log('[ca-web] preloaded builtin JSONs:', Object.keys(globalThis.__caJsonFiles));
  } catch (e) {
    console.warn('[ca-web] failed to preload JSONs:', e);
  }

  // 6) 等所有异步 Loader.load 完成
  await new Promise((resolve) => {
    const check = () => {
      if (globalThis.Loader && !globalThis.Loader.loading) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });

  // 7) 自动调 initLibrary 让 CA.IntelliSense.library 初始化
  //    （built main.js 没自动调，ca-app 用户首次显示时才会调）
  if (globalThis.CA && globalThis.CA.Library && globalThis.CA.Library.initLibrary) {
    await new Promise((resolve) => {
      try {
        globalThis.CA.Library.initLibrary((flag) => {
          console.log('[ca-web] initLibrary done, flag:', flag);
          resolve();
        });
      } catch (e) {
        console.warn('[ca-web] initLibrary failed:', e);
        resolve();
      }
      // 兜底：5 秒后强制 resolve
      setTimeout(resolve, 5000);
    });
  }

  // 7.5) 胶水：模拟 Android shell (cadroid) 在 showGen 之前把 inner 库的 commands 灌进
  //      IntelliSense.library。原版 Android 端这部分由 cadroid 的 Java 代码完成，
  //      Web 端没 cadroid，由这里代为执行。initLibrary 自己设计就不填 commands。
  if (globalThis.CA?.IntelliSense?.library && globalThis.CA?.Library?.inner) {
    const lib = globalThis.CA.IntelliSense.library;
    const inner = globalThis.CA.Library.inner;
    const fields = ['commands', 'enums', 'selectors', 'json', 'jsonSchema', 'states', 'help'];
    for (const field of fields) {
      if (!lib[field] || typeof lib[field] !== 'object') lib[field] = {};
      for (const tag of Object.keys(inner)) {
        const src = inner[tag];
        if (src && src[field] && typeof src[field] === 'object') {
          for (const key of Object.keys(src[field])) {
            if (!(key in lib[field])) {
              lib[field][key] = src[field][key];
            }
          }
        }
      }
    }
    if (Array.isArray(lib.idlist)) {
      for (const tag of Object.keys(inner)) {
        const src = inner[tag];
        if (src && Array.isArray(src.idlist)) {
          for (const item of src.idlist) {
            if (!lib.idlist.some(x => x.name === item.name)) {
              lib.idlist.push(item);
            }
          }
        }
      }
    }
    console.log('[ca-web] IntelliSense.library populated:',
      'commands=' + (lib.commands ? Object.keys(lib.commands).length : 0));
  }

  console.log('[ca-web] CA engine loaded. CA:', typeof globalThis.CA);
  console.log('[ca-web] Common.theme:', globalThis.Common?.theme);
  console.log('[ca-web] IntelliSense:', typeof globalThis.CA?.IntelliSense);

  // 8) 打开命令生成器并把 UI 根挂到页面（模拟 Android 端 showActivityContent）
  //    CA.showGen 由引擎自建整棵 View 树；我们从 mainView 向上找根，挂 overlay
  const mountCAUi = () => {
    try {
      const mv = globalThis.CA?.gen?.mainView;
      if (!mv || !mv.el) return false;
      let root = mv, hops = 0;
      while (root.getParent && root.getParent() && hops < 32) { root = root.getParent(); hops++; }
      if (root.el && !root.el.isConnected) {
        root.el.style.position = 'fixed';
        root.el.style.inset = '0';
        root.el.style.pointerEvents = 'auto';
        root.el.style.zIndex = '100000';
        // 铺满背景：DefaultWindow 本身透明，套上 CA 主题底色看起来像完整应用
        try {
          const th = globalThis.Common?.theme;
          if (th && typeof th.float_bgcolor === 'number') {
            const v = (th.float_bgcolor >>> 0) & 0xffffff;
            root.el.style.background = `rgb(${(v>>16)&255},${(v>>8)&255},${v&255})`;
          } else if (th && typeof th.bgcolor === 'number') {
            const v = (th.bgcolor >>> 0) & 0xffffff;
            root.el.style.background = `rgb(${(v>>16)&255},${(v>>8)&255},${v&255})`;
          }
        } catch (e) {}
        globalThis.__caAttachOverlay(root.el);

        // —— 像素级布局：用 measure/layout 引擎取代 flex 估算 ——
        // 控件结构/事件仍由引擎创建；此引擎按 Android 布局语义把每层写到精确 px。
        // childList 变化（引擎 addView/removeView）触发防抖重排；样式写入不触发。
        try {
          const relayoutRootFn = relayoutRoot; // 顶部已 import
          let rafId = 0;
          const schedule = () => {
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
              rafId = 0;
              try { relayoutRootFn(root); } catch (e) { console.warn('[ca-web] relayout:', e?.message || e); }
            });
          };
          // 首次全树布局
          schedule();
          const mo = new MutationObserver((muts) => {
            if (muts.some(m => m.type === 'childList')) schedule();
          });
          mo.observe(root.el, { childList: true, subtree: true });
          globalThis.__caRelayout = schedule;
          globalThis.__caRelayoutMO = mo;
          console.log('[ca-web] pixel layout engine active');
        } catch (e) {
          console.warn('[ca-web] pixel layout init failed:', e?.message || e);
        }
        console.log('[ca-web] CA UI mounted (root:', root.constructor?.name + ')');
        return true;
      }
      return !!root.el?.isConnected;
    } catch (e) {
      console.warn('[ca-web] mountCAUi failed:', e?.message || e);
      return false;
    }
  };
  globalThis.__caMountCAUi = mountCAUi;

  try {
    globalThis.CA.settings.iiMode = 3;
    globalThis.CA.showGen(true);
    if (!mountCAUi()) {
      // 兜底：等 PopupPage 异步装完再试
      let tries = 0;
      const t = setInterval(() => {
        if (mountCAUi() || ++tries > 100) clearInterval(t);
      }, 100);
    }
  } catch (e) {
    console.warn('[ca-web] showGen failed:', e?.message || e);
  }
}

boot().catch(e => {
  console.error('[ca-web] boot failed:', e);
  document.body.innerHTML = `<pre style="color:red;padding:16px">Boot failed:\n${e.stack || e.message}</pre>`;
});
