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
 * Web 端没有真正的类，返回我们的 Proxy 类即可。
 */
function makeJavaReflectShim() {
  const cache = new Map();
  return {
    forName: function (className) {
      if (cache.has(className)) return cache.get(className);
      // 把 "android.graphics.Color" 拆成 ["android", "graphics", "Color"]
      // 顺着 globalThis 的命名空间找
      const parts = className.split('.');
      let cur = globalThis;
      for (const p of parts) {
        if (cur == null) break;
        cur = cur[p];
      }
      if (cur != null) {
        cache.set(className, cur);
        return cur;
      }
      // 找不到：返回代理
      const placeholder = function () {};
      placeholder.__className = className;
      cache.set(className, placeholder);
      return placeholder;
    }
  };
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
  if (!globalThis.JavaReflect || typeof globalThis.JavaReflect.forName !== 'function') {
    globalThis.JavaReflect = makeJavaReflectShim();
  }

  globalThis.__caAndroidShimInstalled = true;
}
