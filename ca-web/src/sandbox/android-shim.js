/**
 * android.* / java.* 占位 shim
 *
 * 任意属性链都返回 Proxy，链式访问不会断。
 */

const PATH_CACHE = new Map();

function makeProxy(path) {
  // target 用函数：保证 Proxy 本身可调用
  const target = function () {};
  target.__path__ = path;
  return new Proxy(target, handler);
}

const handler = {
  get(target, prop) {
    if (typeof prop === 'symbol') {
      if (prop === Symbol.toPrimitive) return () => '[android-shim ' + target.__path__ + ']';
      if (prop === Symbol.hasInstance) return () => true;
      return target[prop];
    }
    // JS 内部探测
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
  // 根节点特殊：path 空
  const target = { __path__: '' };
  return new Proxy(target, handler);
}

/**
 * JavaReflect shim —— 给 ca/modules/utils/JavaReflect.js 用
 * 原版是 Rhino 的 reflection，把字符串 "android.graphics.Color" 解析成类对象。
 * Web 端没有真正的类，返回 Proxy 类即可。
 *
 * 关键：staticMethod / method / constructor 必须**永不抛错**，否则
 * IntColor.js 的 try/catch 会中断初始化，导致后续模块缺字段。
 */
function makeJavaReflectShim() {
  const cache = new Map();
  // parseClass 替身：把字符串 className 解析成 Proxy
  function parseClassSafe(type) {
    if (type && typeof type === 'string') {
      if (cache.has(type)) return cache.get(type);
      // 试着顺着 globalThis 找
      const parts = type.split('.');
      let cur = globalThis;
      for (const p of parts) {
        if (cur == null) break;
        cur = cur[p];
      }
      if (cur != null) {
        cache.set(type, cur);
        return cur;
      }
      // 找不到：返回 Proxy 类
      const placeholder = makeAndroidClassProxy(type);
      cache.set(type, placeholder);
      return placeholder;
    }
    // 已经是个类对象：直接返回
    return type || makeAndroidClassProxy('?');
  }

  return {
    forName: function (className) {
      return parseClassSafe(className);
    },
    // staticMethod / method / constructor 都返回 noop 函数
    // 调用时直接返回 undefined（不执行实际逻辑）
    staticMethod: function () {
      return function () {};
    },
    method: function () {
      return function () {};
    },
    constructor: function () {
      return function () { return {}; };
    },
    declaredMethod: function () { return function () {}; },
    declaredStaticMethod: function () { return function () {}; },
    declaredConstructor: function () { return function () { return {}; }; },
    field: function () { return { get: function () {}, set: function () {} }; },
    declaredField: function () { return { get: function () {}, set: function () {} }; },
    parseClass: parseClassSafe
  };
}

function makeAndroidClassProxy(name) {
  const target = function () {};
  target.__path__ = name;
  target.__isClass = true;
  // getMethod / getField 等都返回 Proxy
  return new Proxy(target, {
    get(t, prop) {
      if (typeof prop === 'symbol') return t[prop];
      if (prop === 'name' || prop === 'length' || prop === 'prototype') return t[prop];
      if (prop === 'isPrimitive' || prop === 'isArray') return () => false;
      // 链式：返回 new Proxy 作为"方法"
      const m = function () {};
      m.__path__ = (t.__path__ || '') + '.' + prop;
      return m;
    }
  });
}

export function installAndroidShim() {
  if (globalThis.__caAndroidShimInstalled) return;
  globalThis.android = makeAndroidRoot();
  globalThis.java = makeAndroidRoot();
  globalThis.com = makeAndroidRoot();
  globalThis.Packages = makeAndroidRoot();
  globalThis.org = makeAndroidRoot();
  globalThis.javax = makeAndroidRoot();

  // JavaReflect 是 ca/modules/utils/JavaReflect.js 的全局名
  // 如果原版模块还没加载（占位），给个最小 shim 避免 "Unable to parse X to class"
  // JavaReflect.js 加载后会通过 MapScript.loadModule 覆盖
  // 注意：占位 shim 必须 push 到 MapScript.modules，否则 loadModule 走 else 分支拒绝覆盖
  if (!globalThis.JavaReflect || typeof globalThis.JavaReflect.forName !== 'function') {
    globalThis.JavaReflect = makeJavaReflectShim();
    // 同步推 modules（注意：调用 installAndroidShim 时 MapScript 可能未定义）
    if (typeof globalThis.MapScript !== 'undefined' && globalThis.MapScript.modules) {
      if (globalThis.MapScript.modules.indexOf('JavaReflect') < 0) {
        globalThis.MapScript.modules.push('JavaReflect');
      }
    }
  }

  globalThis.__caAndroidShimInstalled = true;
}
