/**
 * MapScript 浏览器端 shim
 *
 * 移植自 ca/main.js:48-176。差异：
 * - hooks 列表里的钩子在 Web 端全部是空函数
 * - toSource 保留 _toJSON 全部逻辑
 * - init 接受一个 global scope（默认是 window），并把它作为模块挂载点
 *
 * 用法：
 *   import { MapScript } from './mapscript.js';
 *   MapScript.init(window);
 *   MapScript.loadModule('Foo', { x: 1 });
 *   console.log(window.Foo.x); // 1
 */

const STRTOK = ['\\\\', '\\n', '\\t', '\\r', '\\f', '\\"', "\\'"];

function toJSON(x, lev) {
  if (lev < 0) return toJSON(String(x), 0);
  if (typeof x === 'string') {
    let s = x;
    for (let i = 0; i < STRTOK.length; i++) {
      s = s.replace(new RegExp(STRTOK[i], 'g'), STRTOK[i]);
    }
    return '"' + s + '"';
  }
  if (Array.isArray(x)) {
    const r = new Array(x.length);
    for (let i = 0; i < x.length; i++) r[i] = toJSON(x[i], lev - 1);
    return '[' + r.join(',') + ']';
  }
  if (x instanceof Error) {
    return 'new Error(' + toJSON(x.message) + ')';
  }
  if (x instanceof RegExp) {
    return x.toString();
  }
  if (x instanceof Date) {
    return 'new Date(' + x.getTime() + ')';
  }
  if (x instanceof Function) {
    return x.toString();
  }
  if (x instanceof Object) {
    const r = [];
    for (const i in x) r.push(toJSON(i, lev) + ':' + toJSON(x[i], lev - 1));
    return '{' + r.join(',') + '}';
  }
  if (typeof x === 'object' && x != null) {
    return toJSON(String(x), lev);
  }
  return String(x);
}

function toSource(obj) {
  return toJSON(obj, 32);
}

function clearCode(func) {
  if (!(func in this) || typeof this[func] !== 'function') return null;
  const q = this[func].toString();
  const start = q.indexOf('function');
  const end = q.indexOf('{');
  return (this[func] = eval('(' + q.slice(start, end) + '{})'));
}

function addCode(func, code) {
  if (!(func in this) || typeof this[func] !== 'function') return null;
  const q = this[func].toString();
  const start = q.indexOf('function');
  const end = q.lastIndexOf('}');
  return (this[func] = eval('(' + q.slice(start, end) + code + '})'));
}

function loadModule(name, obj, ignoreHook) {
  console.log('[loadModule]', name, 'this is MapScript?', this === MapScript, 'this.global is globalThis?', this && this.global === globalThis);
  const keys = (obj && typeof obj === 'object') ? Object.keys(obj).length : 'n/a';
  const getMethods = (obj && typeof obj === 'object') ? Object.keys(obj).filter(k => typeof obj[k] === 'function') : [];
  console.log('[MapScript.loadModule]', name, 'keyCount:', keys, 'methods:', getMethods.slice(0, 3), 'modules has name:', this.modules.indexOf(name));
  if (obj === undefined) {
    const dx = this.modules.indexOf(name);
    if (dx >= 0) {
      delete this.global[name];
    }
    return true;
  }
  if (!(name in this.global) || this.modules.indexOf(name) >= 0) {
    if (name === 'JavaReflect') {
      console.log('[JR branch] TAKEN: in global:', name in this.global, 'modules idx:', this.modules.indexOf(name), 'this.global is globalThis:', this.global === globalThis, 'this.global.JavaReflect keys:', this.global.JavaReflect && Object.keys(this.global.JavaReflect).length);
    }
    this.global[name] = obj;
    if (this.modules.indexOf(name) < 0) this.modules.push(name);
    if (name === 'JavaReflect') {
      console.log('[JR assign] name in global:', name in this.global, 'globalThis.JR keys:', Object.keys(globalThis.JavaReflect).length, 'expected keys:', obj && Object.keys(obj).length);
    }
    if (name === 'Intl') {
      console.log('[loadModule Intl] AFTER assign, globalThis.Intl === obj?', globalThis.Intl === obj, 'keys:', Object.keys(globalThis.Intl).length);
    }
    if (!ignoreHook && obj instanceof Object) {
      try {
        if (typeof obj.onCreate === 'function') obj.onCreate();
        const sn = toSource(name);
        for (const i in obj) {
          if (
            typeof obj[i] === 'function' &&
            this.hooks.indexOf(i) >= 0 &&
            this.global[i].length === obj[i].length
          ) {
            addCode.call(this.global, i, 'this[' + sn + '].' + i + '.apply(this[' + sn + '],arguments);');
          }
        }
      } catch (e) {
        console.error('[ca loadModule] onCreate error for', name, e);
      }
    }
  } else {
    return false;
  }
  return true;
}

function initialize() {
  if (typeof this.global.initialize === 'function') {
    this.global.initialize();
  }
}

function init(g) {
  Object.defineProperty(this, 'global', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: g
  });
}

export const MapScript = {
  hooks: [
    'attackHook', 'chatHook', 'continueDestroyBlock', 'destroyBlock',
    'projectileHitEntityHook', 'eatHook', 'entityAddedHook',
    'entityHurtHook', 'entityRemovedHook', 'explodeHook',
    'serverMessageReceiveHook', 'deathHook', 'playerAddExpHook',
    'playerExpLevelChangeHook', 'redstoneUpdateHook', 'screenChangeHook',
    'newLevel', 'startDestroyBlock', 'projectileHitBlockHook',
    'modTick', 'leaveGame', 'useItem', 'initialize', 'unload'
  ],
  modules: [],
  host: 'Web',
  baseDir: '/ca-modules/',
  toSource,
  loadModule,
  clearCode,
  addCode,
  init,
  initialize
};
