MapScript.loadModule("JSONLanguageService", (function() {
    var module = { exports: {} };
    var exports = module.exports;

    // Polyfill for Rhino ES5 compatibility
    if (!Array.from) {
        Array.from = function(o) {
            var r = [], i;
            for (i = 0; i < o.length; i++) r.push(o[i]);
            return r;
        };
    }

    // === Sync Promise for Rhino (no event loop) ===
// 同步 Promise - 用于 Rhino 等无事件循环环境
// .then() 回调立即同步执行，不进入 microtask 队列
function SyncPromise(executor) {
    var self = this;
    this.state = 'pending';
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    function resolve(value) {
        if (self.state !== 'pending') return;
        // 处理 thenable：如果值是 Promise 或 thenable，等待它 resolve
        if (value && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function') {
            value.then(resolve, reject);
            return;
        }
        self.state = 'fulfilled';
        self.value = value;
        self._flush();
    }

    function reject(reason) {
        if (self.state !== 'pending') return;
        self.state = 'rejected';
        self.reason = reason;
        self._flush();
    }

    if (typeof executor === 'function') {
        try {
            executor(resolve, reject);
        } catch (e) {
            reject(e);
        }
    }
}

SyncPromise.prototype._flush = function() {
    var self = this;
    var cb;
    if (self.state === 'fulfilled') {
        while (self.onFulfilledCallbacks.length > 0) {
            cb = self.onFulfilledCallbacks.shift();
            self.onRejectedCallbacks.shift(); // 成对移除
            try {
                var ret = cb.onFulfilled ? cb.onFulfilled(self.value) : self.value;
                cb.resolve(ret);
            } catch (e) {
                cb.reject(e);
            }
        }
    } else if (self.state === 'rejected') {
        while (self.onRejectedCallbacks.length > 0) {
            cb = self.onRejectedCallbacks.shift();
            self.onFulfilledCallbacks.shift(); // 成对移除
            try {
                var ret = cb.onRejected ? cb.onRejected(self.reason) : self.reason;
                cb.resolve(ret);
            } catch (e) {
                cb.reject(e);
            }
        }
    }
};

SyncPromise.prototype.then = function(onFulfilled, onRejected) {
    var self = this;
    return new SyncPromise(function(resolve, reject) {
        self.onFulfilledCallbacks.push({
            onFulfilled: onFulfilled,
            onRejected: onRejected,
            resolve: resolve,
            reject: reject
        });
        self.onRejectedCallbacks.push({
            onFulfilled: onFulfilled,
            onRejected: onRejected,
            resolve: resolve,
            reject: reject
        });
        if (self.state !== 'pending') {
            self._flush();
        }
    });
};

SyncPromise.prototype["catch"] = function(onRejected) {
    return this.then(null, onRejected);
};

SyncPromise.resolve = function(value) {
    return new SyncPromise(function(resolve) {
        resolve(value);
    });
};

SyncPromise.reject = function(reason) {
    return new SyncPromise(function(resolve, reject) {
        reject(reason);
    });
};

SyncPromise.all = function(promises) {
    return new SyncPromise(function(resolve, reject) {
        var results = [];
        var count = 0;
        if (promises.length === 0) {
            resolve(results);
            return;
        }
        promises.forEach(function(p, i) {
            p.then(function(val) {
                results[i] = val;
                count++;
                if (count === promises.length) {
                    resolve(results);
                }
            }, reject);
        });
    });
};

// 注入全局
Promise = SyncPromise;

    // === end of Sync Promise ===

    // === vscode-json-languageservice bundle ===
"use strict";

function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n2 = 0, F = function F() {}; return { s: F, n: function n() { return _n2 >= r.length ? { done: !0 } : { done: !1, value: r[_n2++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _regenerator() { var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
(function (f) {
  if ((typeof exports === "undefined" ? "undefined" : _typeof(exports)) === "object" && typeof module !== "undefined") {
    module.exports = f();
  } else if (typeof define === "function" && define.amd) {
    define([], f);
  } else {
    var g;
    if (typeof window !== "undefined") {
      g = window;
    } else if (typeof global !== "undefined") {
      g = global;
    } else if (typeof self !== "undefined") {
      g = self;
    } else {
      g = this;
    }
    g.jsonLanguageService = f();
  }
})(function () {
  var define, module, exports;
  return function () {
    function r(e, n, t) {
      function o(i, f) {
        if (!n[i]) {
          if (!e[i]) {
            var c = "function" == typeof require && require;
            if (!f && c) return c(i, !0);
            if (u) return u(i, !0);
            var a = new Error("Cannot find module '" + i + "'");
            throw a.code = "MODULE_NOT_FOUND", a;
          }
          var p = n[i] = {
            exports: {}
          };
          e[i][0].call(p.exports, function (r) {
            var n = e[i][1][r];
            return o(n || r);
          }, p, p.exports, r, e, n, t);
        }
        return n[i].exports;
      }
      for (var u = "function" == typeof require && require, i = 0; i < t.length; i++) o(t[i]);
      return o;
    }
    return r;
  }()({
    1: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.config = config;
      exports.t = t;
      function readFileFromUri(_x) {
        return _readFileFromUri.apply(this, arguments);
      }
      function _readFileFromUri() {
        _readFileFromUri = _asyncToGenerator(_regenerator().m(function _callee(uri) {
          var res;
          return _regenerator().w(function (_context) {
            while (1) switch (_context.n) {
              case 0:
                if (!(uri.protocol === "http:" || uri.protocol === "https:")) {
                  _context.n = 3;
                  break;
                }
                _context.n = 1;
                return fetch(uri);
              case 1:
                res = _context.v;
                _context.n = 2;
                return res.text();
              case 2:
                return _context.a(2, _context.v);
              case 3:
                throw new Error("Unsupported protocol");
              case 4:
                return _context.a(2);
            }
          }, _callee);
        }));
        return _readFileFromUri.apply(this, arguments);
      }
      function readFileFromFsPath(_) {
        throw new Error("Unsupported in browser");
      }
      var bundle;
      function config(config2) {
        if ("contents" in config2) {
          if (typeof config2.contents === "string") {
            bundle = JSON.parse(config2.contents);
          } else {
            bundle = config2.contents;
          }
          return;
        }
        if ("fsPath" in config2) {
          var fileContent = readFileFromFsPath(config2.fsPath);
          var content = JSON.parse(fileContent);
          bundle = isBuiltinExtension(content) ? content.contents.bundle : content;
          return;
        }
        if (config2.uri) {
          var uri = config2.uri;
          if (typeof config2.uri === "string") {
            uri = new URL(config2.uri);
          }
          return new Promise(function (resolve, reject) {
            readFileFromUri(uri).then(function (uriContent) {
              try {
                var _content = JSON.parse(uriContent);
                bundle = isBuiltinExtension(_content) ? _content.contents.bundle : _content;
                resolve();
              } catch (err) {
                reject(err);
              }
            })["catch"](function (err) {
              reject(err);
            });
          });
        }
      }
      function t() {
        var _bundle;
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        var firstArg = args[0];
        var key;
        var message;
        var formatArgs;
        if (typeof firstArg === "string") {
          key = firstArg;
          message = firstArg;
          args.splice(0, 1);
          formatArgs = !args || _typeof(args[0]) !== "object" ? args : args[0];
        } else if (firstArg instanceof Array) {
          var replacements = args.slice(1);
          if (firstArg.length !== replacements.length + 1) {
            throw new Error("expected a string as the first argument to l10n.t");
          }
          var str = firstArg[0];
          for (var i = 1; i < firstArg.length; i++) {
            str += "{".concat(i - 1, "}") + firstArg[i];
          }
          return t.apply(void 0, [str].concat(_toConsumableArray(replacements)));
        } else {
          var _firstArg$args;
          message = firstArg.message;
          key = message;
          if (firstArg.comment && firstArg.comment.length > 0) {
            key += "/".concat(Array.isArray(firstArg.comment) ? firstArg.comment.join("") : firstArg.comment);
          }
          formatArgs = (_firstArg$args = firstArg.args) !== null && _firstArg$args !== void 0 ? _firstArg$args : {};
        }
        var messageFromBundle = (_bundle = bundle) === null || _bundle === void 0 ? void 0 : _bundle[key];
        if (!messageFromBundle) {
          return format(message, formatArgs);
        }
        if (typeof messageFromBundle === "string") {
          return format(messageFromBundle, formatArgs);
        }
        if (messageFromBundle.comment) {
          return format(messageFromBundle.message, formatArgs);
        }
        return format(message, formatArgs);
      }
      var _format2Regexp = /{([^}]+)}/g;
      function format(template, values) {
        if (Object.keys(values).length === 0) {
          return template;
        }
        return template.replace(_format2Regexp, function (match, group) {
          var _values$group;
          return (_values$group = values[group]) !== null && _values$group !== void 0 ? _values$group : match;
        });
      }
      function isBuiltinExtension(json) {
        var _json$contents;
        return !!(_typeof(json === null || json === void 0 || (_json$contents = json.contents) === null || _json$contents === void 0 ? void 0 : _json$contents.bundle) === "object" && typeof (json === null || json === void 0 ? void 0 : json.version) === "string");
      }
    }, {}],
    2: [function (require, module, exports) {
      'use strict';

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.applyEdit = applyEdit;
      exports.isWS = isWS;
      exports.removeProperty = removeProperty;
      exports.setProperty = setProperty;
      var _format = require("./format");
      var _parser = require("./parser");
      function removeProperty(text, path, options) {
        return setProperty(text, path, void 0, options);
      }
      function setProperty(text, originalPath, value, options) {
        var path = originalPath.slice();
        var errors = [];
        var root = (0, _parser.parseTree)(text, errors);
        var parent = void 0;
        var lastSegment = void 0;
        while (path.length > 0) {
          lastSegment = path.pop();
          parent = (0, _parser.findNodeAtLocation)(root, path);
          if (parent === void 0 && value !== void 0) {
            if (typeof lastSegment === 'string') {
              value = _defineProperty({}, lastSegment, value);
            } else {
              value = [value];
            }
          } else {
            break;
          }
        }
        if (!parent) {
          if (value === void 0) {
            throw new Error('Can not delete in empty document');
          }
          return withFormatting(text, {
            offset: root ? root.offset : 0,
            length: root ? root.length : 0,
            content: JSON.stringify(value)
          }, options);
        } else if (parent.type === 'object' && typeof lastSegment === 'string' && Array.isArray(parent.children)) {
          var existing = (0, _parser.findNodeAtLocation)(parent, [lastSegment]);
          if (existing !== void 0) {
            if (value === void 0) {
              if (!existing.parent) {
                throw new Error('Malformed AST');
              }
              var propertyIndex = parent.children.indexOf(existing.parent);
              var removeBegin;
              var removeEnd = existing.parent.offset + existing.parent.length;
              if (propertyIndex > 0) {
                var previous = parent.children[propertyIndex - 1];
                removeBegin = previous.offset + previous.length;
              } else {
                removeBegin = parent.offset + 1;
                if (parent.children.length > 1) {
                  var next = parent.children[1];
                  removeEnd = next.offset;
                }
              }
              return withFormatting(text, {
                offset: removeBegin,
                length: removeEnd - removeBegin,
                content: ''
              }, options);
            } else {
              return withFormatting(text, {
                offset: existing.offset,
                length: existing.length,
                content: JSON.stringify(value)
              }, options);
            }
          } else {
            if (value === void 0) {
              return [];
            }
            var newProperty = "".concat(JSON.stringify(lastSegment), ": ").concat(JSON.stringify(value));
            var index = options.getInsertionIndex ? options.getInsertionIndex(parent.children.map(function (p) {
              return p.children[0].value;
            })) : parent.children.length;
            var edit;
            if (index > 0) {
              var _previous = parent.children[index - 1];
              edit = {
                offset: _previous.offset + _previous.length,
                length: 0,
                content: ',' + newProperty
              };
            } else if (parent.children.length === 0) {
              edit = {
                offset: parent.offset + 1,
                length: 0,
                content: newProperty
              };
            } else {
              edit = {
                offset: parent.offset + 1,
                length: 0,
                content: newProperty + ','
              };
            }
            return withFormatting(text, edit, options);
          }
        } else if (parent.type === 'array' && typeof lastSegment === 'number' && Array.isArray(parent.children)) {
          var insertIndex = lastSegment;
          if (insertIndex === -1) {
            var _newProperty = "".concat(JSON.stringify(value));
            var _edit;
            if (parent.children.length === 0) {
              _edit = {
                offset: parent.offset + 1,
                length: 0,
                content: _newProperty
              };
            } else {
              var _previous2 = parent.children[parent.children.length - 1];
              _edit = {
                offset: _previous2.offset + _previous2.length,
                length: 0,
                content: ',' + _newProperty
              };
            }
            return withFormatting(text, _edit, options);
          } else if (value === void 0 && parent.children.length >= 0) {
            var removalIndex = lastSegment;
            var toRemove = parent.children[removalIndex];
            var _edit2;
            if (parent.children.length === 1) {
              _edit2 = {
                offset: parent.offset + 1,
                length: parent.length - 2,
                content: ''
              };
            } else if (parent.children.length - 1 === removalIndex) {
              var _previous3 = parent.children[removalIndex - 1];
              var offset = _previous3.offset + _previous3.length;
              var parentEndOffset = parent.offset + parent.length;
              _edit2 = {
                offset: offset,
                length: parentEndOffset - 2 - offset,
                content: ''
              };
            } else {
              _edit2 = {
                offset: toRemove.offset,
                length: parent.children[removalIndex + 1].offset - toRemove.offset,
                content: ''
              };
            }
            return withFormatting(text, _edit2, options);
          } else if (value !== void 0) {
            var _edit3;
            var _newProperty2 = "".concat(JSON.stringify(value));
            if (!options.isArrayInsertion && parent.children.length > lastSegment) {
              var toModify = parent.children[lastSegment];
              _edit3 = {
                offset: toModify.offset,
                length: toModify.length,
                content: _newProperty2
              };
            } else if (parent.children.length === 0 || lastSegment === 0) {
              _edit3 = {
                offset: parent.offset + 1,
                length: 0,
                content: parent.children.length === 0 ? _newProperty2 : _newProperty2 + ','
              };
            } else {
              var _index = lastSegment > parent.children.length ? parent.children.length : lastSegment;
              var _previous4 = parent.children[_index - 1];
              _edit3 = {
                offset: _previous4.offset + _previous4.length,
                length: 0,
                content: ',' + _newProperty2
              };
            }
            return withFormatting(text, _edit3, options);
          } else {
            throw new Error("Can not ".concat(value === void 0 ? 'remove' : options.isArrayInsertion ? 'insert' : 'modify', " Array index ").concat(insertIndex, " as length is not sufficient"));
          }
        } else {
          throw new Error("Can not add ".concat(typeof lastSegment !== 'number' ? 'index' : 'property', " to parent of type ").concat(parent.type));
        }
      }
      function withFormatting(text, edit, options) {
        if (!options.formattingOptions) {
          return [edit];
        }
        var newText = applyEdit(text, edit);
        var begin = edit.offset;
        var end = edit.offset + edit.content.length;
        if (edit.length === 0 || edit.content.length === 0) {
          while (begin > 0 && !(0, _format.isEOL)(newText, begin - 1)) {
            begin--;
          }
          while (end < newText.length && !(0, _format.isEOL)(newText, end)) {
            end++;
          }
        }
        var edits = (0, _format.format)(newText, {
          offset: begin,
          length: end - begin
        }, _objectSpread(_objectSpread({}, options.formattingOptions), {}, {
          keepLines: false
        }));
        for (var i = edits.length - 1; i >= 0; i--) {
          var _edit4 = edits[i];
          newText = applyEdit(newText, _edit4);
          begin = Math.min(begin, _edit4.offset);
          end = Math.max(end, _edit4.offset + _edit4.length);
          end += _edit4.content.length - _edit4.length;
        }
        var editLength = text.length - (newText.length - end) - begin;
        return [{
          offset: begin,
          length: editLength,
          content: newText.substring(begin, end)
        }];
      }
      function applyEdit(text, edit) {
        return text.substring(0, edit.offset) + edit.content + text.substring(edit.offset + edit.length);
      }
      function isWS(text, offset) {
        return '\r\n \t'.indexOf(text.charAt(offset)) !== -1;
      }
    }, {
      "./format": 3,
      "./parser": 4
    }],
    3: [function (require, module, exports) {
      'use strict';

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.format = format;
      exports.isEOL = isEOL;
      var _scanner = require("./scanner");
      var _stringIntern = require("./string-intern");
      function format(documentText, range, options) {
        var initialIndentLevel;
        var formatText;
        var formatTextStart;
        var rangeStart;
        var rangeEnd;
        if (range) {
          rangeStart = range.offset;
          rangeEnd = rangeStart + range.length;
          formatTextStart = rangeStart;
          while (formatTextStart > 0 && !isEOL(documentText, formatTextStart - 1)) {
            formatTextStart--;
          }
          var endOffset = rangeEnd;
          while (endOffset < documentText.length && !isEOL(documentText, endOffset)) {
            endOffset++;
          }
          formatText = documentText.substring(formatTextStart, endOffset);
          initialIndentLevel = computeIndentLevel(formatText, options);
        } else {
          formatText = documentText;
          initialIndentLevel = 0;
          formatTextStart = 0;
          rangeStart = 0;
          rangeEnd = documentText.length;
        }
        var eol = getEOL(options, documentText);
        var eolFastPathSupported = _stringIntern.supportedEols.includes(eol);
        var numberLineBreaks = 0;
        var indentLevel = 0;
        var indentValue;
        if (options.insertSpaces) {
          var _stringIntern$cachedS;
          indentValue = (_stringIntern$cachedS = _stringIntern.cachedSpaces[options.tabSize || 4]) !== null && _stringIntern$cachedS !== void 0 ? _stringIntern$cachedS : repeat(_stringIntern.cachedSpaces[1], options.tabSize || 4);
        } else {
          indentValue = '\t';
        }
        var indentType = indentValue === '\t' ? '\t' : ' ';
        var scanner = (0, _scanner.createScanner)(formatText, false);
        var hasError = false;
        function newLinesAndIndent() {
          if (numberLineBreaks > 1) {
            return repeat(eol, numberLineBreaks) + repeat(indentValue, initialIndentLevel + indentLevel);
          }
          var amountOfSpaces = indentValue.length * (initialIndentLevel + indentLevel);
          if (!eolFastPathSupported || amountOfSpaces > _stringIntern.cachedBreakLinesWithSpaces[indentType][eol].length) {
            return eol + repeat(indentValue, initialIndentLevel + indentLevel);
          }
          if (amountOfSpaces <= 0) {
            return eol;
          }
          return _stringIntern.cachedBreakLinesWithSpaces[indentType][eol][amountOfSpaces];
        }
        function scanNext() {
          var token = scanner.scan();
          numberLineBreaks = 0;
          while (token === 15 || token === 14) {
            if (token === 14 && options.keepLines) {
              numberLineBreaks += 1;
            } else if (token === 14) {
              numberLineBreaks = 1;
            }
            token = scanner.scan();
          }
          hasError = token === 16 || scanner.getTokenError() !== 0;
          return token;
        }
        var editOperations = [];
        function addEdit(text, startOffset, endOffset) {
          if (!hasError && (!range || startOffset < rangeEnd && endOffset > rangeStart) && documentText.substring(startOffset, endOffset) !== text) {
            editOperations.push({
              offset: startOffset,
              length: endOffset - startOffset,
              content: text
            });
          }
        }
        var firstToken = scanNext();
        if (options.keepLines && numberLineBreaks > 0) {
          addEdit(repeat(eol, numberLineBreaks), 0, 0);
        }
        if (firstToken !== 17) {
          var firstTokenStart = scanner.getTokenOffset() + formatTextStart;
          var initialIndent = indentValue.length * initialIndentLevel < 20 && options.insertSpaces ? _stringIntern.cachedSpaces[indentValue.length * initialIndentLevel] : repeat(indentValue, initialIndentLevel);
          addEdit(initialIndent, formatTextStart, firstTokenStart);
        }
        while (firstToken !== 17) {
          var firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
          var secondToken = scanNext();
          var replaceContent = '';
          var needsLineBreak = false;
          while (numberLineBreaks === 0 && (secondToken === 12 || secondToken === 13)) {
            var commentTokenStart = scanner.getTokenOffset() + formatTextStart;
            addEdit(_stringIntern.cachedSpaces[1], firstTokenEnd, commentTokenStart);
            firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
            needsLineBreak = secondToken === 12;
            replaceContent = needsLineBreak ? newLinesAndIndent() : '';
            secondToken = scanNext();
          }
          if (secondToken === 2) {
            if (firstToken !== 1) {
              indentLevel--;
            }
            ;
            if (options.keepLines && numberLineBreaks > 0 || !options.keepLines && firstToken !== 1) {
              replaceContent = newLinesAndIndent();
            } else if (options.keepLines) {
              replaceContent = _stringIntern.cachedSpaces[1];
            }
          } else if (secondToken === 4) {
            if (firstToken !== 3) {
              indentLevel--;
            }
            ;
            if (options.keepLines && numberLineBreaks > 0 || !options.keepLines && firstToken !== 3) {
              replaceContent = newLinesAndIndent();
            } else if (options.keepLines) {
              replaceContent = _stringIntern.cachedSpaces[1];
            }
          } else {
            switch (firstToken) {
              case 3:
              case 1:
                indentLevel++;
                if (options.keepLines && numberLineBreaks > 0 || !options.keepLines) {
                  replaceContent = newLinesAndIndent();
                } else {
                  replaceContent = _stringIntern.cachedSpaces[1];
                }
                break;
              case 5:
                if (options.keepLines && numberLineBreaks > 0 || !options.keepLines) {
                  replaceContent = newLinesAndIndent();
                } else {
                  replaceContent = _stringIntern.cachedSpaces[1];
                }
                break;
              case 12:
                replaceContent = newLinesAndIndent();
                break;
              case 13:
                if (numberLineBreaks > 0) {
                  replaceContent = newLinesAndIndent();
                } else if (!needsLineBreak) {
                  replaceContent = _stringIntern.cachedSpaces[1];
                }
                break;
              case 6:
                if (options.keepLines && numberLineBreaks > 0) {
                  replaceContent = newLinesAndIndent();
                } else if (!needsLineBreak) {
                  replaceContent = _stringIntern.cachedSpaces[1];
                }
                break;
              case 10:
                if (options.keepLines && numberLineBreaks > 0) {
                  replaceContent = newLinesAndIndent();
                } else if (secondToken === 6 && !needsLineBreak) {
                  replaceContent = '';
                }
                break;
              case 7:
              case 8:
              case 9:
              case 11:
              case 2:
              case 4:
                if (options.keepLines && numberLineBreaks > 0) {
                  replaceContent = newLinesAndIndent();
                } else {
                  if ((secondToken === 12 || secondToken === 13) && !needsLineBreak) {
                    replaceContent = _stringIntern.cachedSpaces[1];
                  } else if (secondToken !== 5 && secondToken !== 17) {
                    hasError = true;
                  }
                }
                break;
              case 16:
                hasError = true;
                break;
            }
            if (numberLineBreaks > 0 && (secondToken === 12 || secondToken === 13)) {
              replaceContent = newLinesAndIndent();
            }
          }
          if (secondToken === 17) {
            if (options.keepLines && numberLineBreaks > 0) {
              replaceContent = newLinesAndIndent();
            } else {
              replaceContent = options.insertFinalNewline ? eol : '';
            }
          }
          var secondTokenStart = scanner.getTokenOffset() + formatTextStart;
          addEdit(replaceContent, firstTokenEnd, secondTokenStart);
          firstToken = secondToken;
        }
        return editOperations;
      }
      function repeat(s, count) {
        var result = '';
        for (var i = 0; i < count; i++) {
          result += s;
        }
        return result;
      }
      function computeIndentLevel(content, options) {
        var i = 0;
        var nChars = 0;
        var tabSize = options.tabSize || 4;
        while (i < content.length) {
          var ch = content.charAt(i);
          if (ch === _stringIntern.cachedSpaces[1]) {
            nChars++;
          } else if (ch === '\t') {
            nChars += tabSize;
          } else {
            break;
          }
          i++;
        }
        return Math.floor(nChars / tabSize);
      }
      function getEOL(options, text) {
        for (var i = 0; i < text.length; i++) {
          var ch = text.charAt(i);
          if (ch === '\r') {
            if (i + 1 < text.length && text.charAt(i + 1) === '\n') {
              return '\r\n';
            }
            return '\r';
          } else if (ch === '\n') {
            return '\n';
          }
        }
        return options && options.eol || '\n';
      }
      function isEOL(text, offset) {
        return '\r\n'.indexOf(text.charAt(offset)) !== -1;
      }
    }, {
      "./scanner": 5,
      "./string-intern": 6
    }],
    4: [function (require, module, exports) {
      'use strict';

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.contains = contains;
      exports.findNodeAtLocation = findNodeAtLocation;
      exports.findNodeAtOffset = findNodeAtOffset;
      exports.getLocation = getLocation;
      exports.getNodePath = getNodePath;
      exports.getNodeType = getNodeType;
      exports.getNodeValue = getNodeValue;
      exports.parse = parse;
      exports.parseTree = parseTree;
      exports.stripComments = stripComments;
      exports.visit = visit;
      var _scanner2 = require("./scanner");
      var ParseOptions;
      (function (ParseOptions) {
        ParseOptions.DEFAULT = {
          allowTrailingComma: false
        };
      })(ParseOptions || (ParseOptions = {}));
      function getLocation(text, position) {
        var segments = [];
        var earlyReturnException = new Object();
        var previousNode = undefined;
        var previousNodeInst = {
          value: {},
          offset: 0,
          length: 0,
          type: 'object',
          parent: undefined
        };
        var isAtPropertyKey = false;
        function setPreviousNode(value, offset, length, type) {
          previousNodeInst.value = value;
          previousNodeInst.offset = offset;
          previousNodeInst.length = length;
          previousNodeInst.type = type;
          previousNodeInst.colonOffset = undefined;
          previousNode = previousNodeInst;
        }
        try {
          visit(text, {
            onObjectBegin: function onObjectBegin(offset, length) {
              if (position <= offset) {
                throw earlyReturnException;
              }
              previousNode = undefined;
              isAtPropertyKey = position > offset;
              segments.push('');
            },
            onObjectProperty: function onObjectProperty(name, offset, length) {
              if (position < offset) {
                throw earlyReturnException;
              }
              setPreviousNode(name, offset, length, 'property');
              segments[segments.length - 1] = name;
              if (position <= offset + length) {
                throw earlyReturnException;
              }
            },
            onObjectEnd: function onObjectEnd(offset, length) {
              if (position <= offset) {
                throw earlyReturnException;
              }
              previousNode = undefined;
              segments.pop();
            },
            onArrayBegin: function onArrayBegin(offset, length) {
              if (position <= offset) {
                throw earlyReturnException;
              }
              previousNode = undefined;
              segments.push(0);
            },
            onArrayEnd: function onArrayEnd(offset, length) {
              if (position <= offset) {
                throw earlyReturnException;
              }
              previousNode = undefined;
              segments.pop();
            },
            onLiteralValue: function onLiteralValue(value, offset, length) {
              if (position < offset) {
                throw earlyReturnException;
              }
              setPreviousNode(value, offset, length, getNodeType(value));
              if (position <= offset + length) {
                throw earlyReturnException;
              }
            },
            onSeparator: function onSeparator(sep, offset, length) {
              if (position <= offset) {
                throw earlyReturnException;
              }
              if (sep === ':' && previousNode && previousNode.type === 'property') {
                previousNode.colonOffset = offset;
                isAtPropertyKey = false;
                previousNode = undefined;
              } else if (sep === ',') {
                var last = segments[segments.length - 1];
                if (typeof last === 'number') {
                  segments[segments.length - 1] = last + 1;
                } else {
                  isAtPropertyKey = true;
                  segments[segments.length - 1] = '';
                }
                previousNode = undefined;
              }
            }
          });
        } catch (e) {
          if (e !== earlyReturnException) {
            throw e;
          }
        }
        return {
          path: segments,
          previousNode: previousNode,
          isAtPropertyKey: isAtPropertyKey,
          matches: function matches(pattern) {
            var k = 0;
            for (var i = 0; k < pattern.length && i < segments.length; i++) {
              if (pattern[k] === segments[i] || pattern[k] === '*') {
                k++;
              } else if (pattern[k] !== '**') {
                return false;
              }
            }
            return k === pattern.length;
          }
        };
      }
      function parse(text) {
        var errors = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ParseOptions.DEFAULT;
        var currentProperty = null;
        var currentParent = [];
        var previousParents = [];
        function onValue(value) {
          if (Array.isArray(currentParent)) {
            currentParent.push(value);
          } else if (currentProperty !== null) {
            currentParent[currentProperty] = value;
          }
        }
        var visitor = {
          onObjectBegin: function onObjectBegin() {
            var object = {};
            onValue(object);
            previousParents.push(currentParent);
            currentParent = object;
            currentProperty = null;
          },
          onObjectProperty: function onObjectProperty(name) {
            currentProperty = name;
          },
          onObjectEnd: function onObjectEnd() {
            currentParent = previousParents.pop();
          },
          onArrayBegin: function onArrayBegin() {
            var array = [];
            onValue(array);
            previousParents.push(currentParent);
            currentParent = array;
            currentProperty = null;
          },
          onArrayEnd: function onArrayEnd() {
            currentParent = previousParents.pop();
          },
          onLiteralValue: onValue,
          onError: function onError(error, offset, length) {
            errors.push({
              error: error,
              offset: offset,
              length: length
            });
          }
        };
        visit(text, visitor, options);
        return currentParent[0];
      }
      function parseTree(text) {
        var errors = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ParseOptions.DEFAULT;
        var currentParent = {
          type: 'array',
          offset: -1,
          length: -1,
          children: [],
          parent: undefined
        };
        function ensurePropertyComplete(endOffset) {
          if (currentParent.type === 'property') {
            currentParent.length = endOffset - currentParent.offset;
            currentParent = currentParent.parent;
          }
        }
        function onValue(valueNode) {
          currentParent.children.push(valueNode);
          return valueNode;
        }
        var visitor = {
          onObjectBegin: function onObjectBegin(offset) {
            currentParent = onValue({
              type: 'object',
              offset: offset,
              length: -1,
              parent: currentParent,
              children: []
            });
          },
          onObjectProperty: function onObjectProperty(name, offset, length) {
            currentParent = onValue({
              type: 'property',
              offset: offset,
              length: -1,
              parent: currentParent,
              children: []
            });
            currentParent.children.push({
              type: 'string',
              value: name,
              offset: offset,
              length: length,
              parent: currentParent
            });
          },
          onObjectEnd: function onObjectEnd(offset, length) {
            ensurePropertyComplete(offset + length);
            currentParent.length = offset + length - currentParent.offset;
            currentParent = currentParent.parent;
            ensurePropertyComplete(offset + length);
          },
          onArrayBegin: function onArrayBegin(offset, length) {
            currentParent = onValue({
              type: 'array',
              offset: offset,
              length: -1,
              parent: currentParent,
              children: []
            });
          },
          onArrayEnd: function onArrayEnd(offset, length) {
            currentParent.length = offset + length - currentParent.offset;
            currentParent = currentParent.parent;
            ensurePropertyComplete(offset + length);
          },
          onLiteralValue: function onLiteralValue(value, offset, length) {
            onValue({
              type: getNodeType(value),
              offset: offset,
              length: length,
              parent: currentParent,
              value: value
            });
            ensurePropertyComplete(offset + length);
          },
          onSeparator: function onSeparator(sep, offset, length) {
            if (currentParent.type === 'property') {
              if (sep === ':') {
                currentParent.colonOffset = offset;
              } else if (sep === ',') {
                ensurePropertyComplete(offset);
              }
            }
          },
          onError: function onError(error, offset, length) {
            errors.push({
              error: error,
              offset: offset,
              length: length
            });
          }
        };
        visit(text, visitor, options);
        var result = currentParent.children[0];
        if (result) {
          delete result.parent;
        }
        return result;
      }
      function findNodeAtLocation(root, path) {
        if (!root) {
          return undefined;
        }
        var node = root;
        var _iterator = _createForOfIteratorHelper(path),
          _step;
        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var segment = _step.value;
            if (typeof segment === 'string') {
              if (node.type !== 'object' || !Array.isArray(node.children)) {
                return undefined;
              }
              var found = false;
              var _iterator2 = _createForOfIteratorHelper(node.children),
                _step2;
              try {
                for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
                  var propertyNode = _step2.value;
                  if (Array.isArray(propertyNode.children) && propertyNode.children[0].value === segment && propertyNode.children.length === 2) {
                    node = propertyNode.children[1];
                    found = true;
                    break;
                  }
                }
              } catch (err) {
                _iterator2.e(err);
              } finally {
                _iterator2.f();
              }
              if (!found) {
                return undefined;
              }
            } else {
              var index = segment;
              if (node.type !== 'array' || index < 0 || !Array.isArray(node.children) || index >= node.children.length) {
                return undefined;
              }
              node = node.children[index];
            }
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
        return node;
      }
      function getNodePath(node) {
        if (!node.parent || !node.parent.children) {
          return [];
        }
        var path = getNodePath(node.parent);
        if (node.parent.type === 'property') {
          var key = node.parent.children[0].value;
          path.push(key);
        } else if (node.parent.type === 'array') {
          var index = node.parent.children.indexOf(node);
          if (index !== -1) {
            path.push(index);
          }
        }
        return path;
      }
      function getNodeValue(node) {
        switch (node.type) {
          case 'array':
            return node.children.map(getNodeValue);
          case 'object':
            var obj = Object.create(null);
            var _iterator3 = _createForOfIteratorHelper(node.children),
              _step3;
            try {
              for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
                var prop = _step3.value;
                var valueNode = prop.children[1];
                if (valueNode) {
                  obj[prop.children[0].value] = getNodeValue(valueNode);
                }
              }
            } catch (err) {
              _iterator3.e(err);
            } finally {
              _iterator3.f();
            }
            return obj;
          case 'null':
          case 'string':
          case 'number':
          case 'boolean':
            return node.value;
          default:
            return undefined;
        }
      }
      function contains(node, offset) {
        var includeRightBound = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        return offset >= node.offset && offset < node.offset + node.length || includeRightBound && offset === node.offset + node.length;
      }
      function findNodeAtOffset(node, offset) {
        var includeRightBound = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        if (contains(node, offset, includeRightBound)) {
          var children = node.children;
          if (Array.isArray(children)) {
            for (var i = 0; i < children.length && children[i].offset <= offset; i++) {
              var item = findNodeAtOffset(children[i], offset, includeRightBound);
              if (item) {
                return item;
              }
            }
          }
          return node;
        }
        return undefined;
      }
      function visit(text, visitor) {
        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ParseOptions.DEFAULT;
        var _scanner = (0, _scanner2.createScanner)(text, false);
        var _jsonPath = [];
        var suppressedCallbacks = 0;
        function toNoArgVisit(visitFunction) {
          return visitFunction ? function () {
            return suppressedCallbacks === 0 && visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter());
          } : function () {
            return true;
          };
        }
        function toOneArgVisit(visitFunction) {
          return visitFunction ? function (arg) {
            return suppressedCallbacks === 0 && visitFunction(arg, _scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter());
          } : function () {
            return true;
          };
        }
        function toOneArgVisitWithPath(visitFunction) {
          return visitFunction ? function (arg) {
            return suppressedCallbacks === 0 && visitFunction(arg, _scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter(), function () {
              return _jsonPath.slice();
            });
          } : function () {
            return true;
          };
        }
        function toBeginVisit(visitFunction) {
          return visitFunction ? function () {
            if (suppressedCallbacks > 0) {
              suppressedCallbacks++;
            } else {
              var cbReturn = visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter(), function () {
                return _jsonPath.slice();
              });
              if (cbReturn === false) {
                suppressedCallbacks = 1;
              }
            }
          } : function () {
            return true;
          };
        }
        function toEndVisit(visitFunction) {
          return visitFunction ? function () {
            if (suppressedCallbacks > 0) {
              suppressedCallbacks--;
            }
            if (suppressedCallbacks === 0) {
              visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter());
            }
          } : function () {
            return true;
          };
        }
        var onObjectBegin = toBeginVisit(visitor.onObjectBegin),
          onObjectProperty = toOneArgVisitWithPath(visitor.onObjectProperty),
          onObjectEnd = toEndVisit(visitor.onObjectEnd),
          onArrayBegin = toBeginVisit(visitor.onArrayBegin),
          onArrayEnd = toEndVisit(visitor.onArrayEnd),
          onLiteralValue = toOneArgVisitWithPath(visitor.onLiteralValue),
          onSeparator = toOneArgVisit(visitor.onSeparator),
          onComment = toNoArgVisit(visitor.onComment),
          onError = toOneArgVisit(visitor.onError);
        var disallowComments = options && options.disallowComments;
        var allowTrailingComma = options && options.allowTrailingComma;
        function scanNext() {
          while (true) {
            var token = _scanner.scan();
            switch (_scanner.getTokenError()) {
              case 4:
                handleError(14);
                break;
              case 5:
                handleError(15);
                break;
              case 3:
                handleError(13);
                break;
              case 1:
                if (!disallowComments) {
                  handleError(11);
                }
                break;
              case 2:
                handleError(12);
                break;
              case 6:
                handleError(16);
                break;
            }
            switch (token) {
              case 12:
              case 13:
                if (disallowComments) {
                  handleError(10);
                } else {
                  onComment();
                }
                break;
              case 16:
                handleError(1);
                break;
              case 15:
              case 14:
                break;
              default:
                return token;
            }
          }
        }
        function handleError(error) {
          var skipUntilAfter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
          var skipUntil = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
          onError(error);
          if (skipUntilAfter.length + skipUntil.length > 0) {
            var token = _scanner.getToken();
            while (token !== 17) {
              if (skipUntilAfter.indexOf(token) !== -1) {
                scanNext();
                break;
              } else if (skipUntil.indexOf(token) !== -1) {
                break;
              }
              token = scanNext();
            }
          }
        }
        function parseString(isValue) {
          var value = _scanner.getTokenValue();
          if (isValue) {
            onLiteralValue(value);
          } else {
            onObjectProperty(value);
            _jsonPath.push(value);
          }
          scanNext();
          return true;
        }
        function parseLiteral() {
          switch (_scanner.getToken()) {
            case 11:
              var tokenValue = _scanner.getTokenValue();
              var value = Number(tokenValue);
              if (isNaN(value)) {
                handleError(2);
                value = 0;
              }
              onLiteralValue(value);
              break;
            case 7:
              onLiteralValue(null);
              break;
            case 8:
              onLiteralValue(true);
              break;
            case 9:
              onLiteralValue(false);
              break;
            default:
              return false;
          }
          scanNext();
          return true;
        }
        function parseProperty() {
          if (_scanner.getToken() !== 10) {
            handleError(3, [], [2, 5]);
            return false;
          }
          parseString(false);
          if (_scanner.getToken() === 6) {
            onSeparator(':');
            scanNext();
            if (!parseValue()) {
              handleError(4, [], [2, 5]);
            }
          } else {
            handleError(5, [], [2, 5]);
          }
          _jsonPath.pop();
          return true;
        }
        function parseObject() {
          onObjectBegin();
          scanNext();
          var needsComma = false;
          while (_scanner.getToken() !== 2 && _scanner.getToken() !== 17) {
            if (_scanner.getToken() === 5) {
              if (!needsComma) {
                handleError(4, [], []);
              }
              onSeparator(',');
              scanNext();
              if (_scanner.getToken() === 2 && allowTrailingComma) {
                break;
              }
            } else if (needsComma) {
              handleError(6, [], []);
            }
            if (!parseProperty()) {
              handleError(4, [], [2, 5]);
            }
            needsComma = true;
          }
          onObjectEnd();
          if (_scanner.getToken() !== 2) {
            handleError(7, [2], []);
          } else {
            scanNext();
          }
          return true;
        }
        function parseArray() {
          onArrayBegin();
          scanNext();
          var isFirstElement = true;
          var needsComma = false;
          while (_scanner.getToken() !== 4 && _scanner.getToken() !== 17) {
            if (_scanner.getToken() === 5) {
              if (!needsComma) {
                handleError(4, [], []);
              }
              onSeparator(',');
              scanNext();
              if (_scanner.getToken() === 4 && allowTrailingComma) {
                break;
              }
            } else if (needsComma) {
              handleError(6, [], []);
            }
            if (isFirstElement) {
              _jsonPath.push(0);
              isFirstElement = false;
            } else {
              _jsonPath[_jsonPath.length - 1]++;
            }
            if (!parseValue()) {
              handleError(4, [], [4, 5]);
            }
            needsComma = true;
          }
          onArrayEnd();
          if (!isFirstElement) {
            _jsonPath.pop();
          }
          if (_scanner.getToken() !== 4) {
            handleError(8, [4], []);
          } else {
            scanNext();
          }
          return true;
        }
        function parseValue() {
          switch (_scanner.getToken()) {
            case 3:
              return parseArray();
            case 1:
              return parseObject();
            case 10:
              return parseString(true);
            default:
              return parseLiteral();
          }
        }
        scanNext();
        if (_scanner.getToken() === 17) {
          if (options.allowEmptyContent) {
            return true;
          }
          handleError(4, [], []);
          return false;
        }
        if (!parseValue()) {
          handleError(4, [], []);
          return false;
        }
        if (_scanner.getToken() !== 17) {
          handleError(9, [], []);
        }
        return true;
      }
      function stripComments(text, replaceCh) {
        var _scanner = (0, _scanner2.createScanner)(text),
          parts = [],
          kind,
          offset = 0,
          pos;
        do {
          pos = _scanner.getPosition();
          kind = _scanner.scan();
          switch (kind) {
            case 12:
            case 13:
            case 17:
              if (offset !== pos) {
                parts.push(text.substring(offset, pos));
              }
              if (replaceCh !== undefined) {
                parts.push(_scanner.getTokenValue().replace(/[^\r\n]/g, replaceCh));
              }
              offset = _scanner.getPosition();
              break;
          }
        } while (kind !== 17);
        return parts.join('');
      }
      function getNodeType(value) {
        switch (_typeof(value)) {
          case 'boolean':
            return 'boolean';
          case 'number':
            return 'number';
          case 'string':
            return 'string';
          case 'object':
            {
              if (!value) {
                return 'null';
              } else if (Array.isArray(value)) {
                return 'array';
              }
              return 'object';
            }
          default:
            return 'null';
        }
      }
    }, {
      "./scanner": 5
    }],
    5: [function (require, module, exports) {
      'use strict';
      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.createScanner = createScanner;
      function createScanner(text) {
        var ignoreTrivia = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        var len = text.length;
        var pos = 0,
          value = '',
          tokenOffset = 0,
          token = 16,
          lineNumber = 0,
          lineStartOffset = 0,
          tokenLineStartOffset = 0,
          prevTokenLineStartOffset = 0,
          scanError = 0;
        function scanHexDigits(count, exact) {
          var digits = 0;
          var value = 0;
          while (digits < count || !exact) {
            var ch = text.charCodeAt(pos);
            if (ch >= 48 && ch <= 57) {
              value = value * 16 + ch - 48;
            } else if (ch >= 65 && ch <= 70) {
              value = value * 16 + ch - 65 + 10;
            } else if (ch >= 97 && ch <= 102) {
              value = value * 16 + ch - 97 + 10;
            } else {
              break;
            }
            pos++;
            digits++;
          }
          if (digits < count) {
            value = -1;
          }
          return value;
        }
        function setPosition(newPosition) {
          pos = newPosition;
          value = '';
          tokenOffset = 0;
          token = 16;
          scanError = 0;
        }
        function scanNumber() {
          var start = pos;
          if (text.charCodeAt(pos) === 48) {
            pos++;
          } else {
            pos++;
            while (pos < text.length && isDigit(text.charCodeAt(pos))) {
              pos++;
            }
          }
          if (pos < text.length && text.charCodeAt(pos) === 46) {
            pos++;
            if (pos < text.length && isDigit(text.charCodeAt(pos))) {
              pos++;
              while (pos < text.length && isDigit(text.charCodeAt(pos))) {
                pos++;
              }
            } else {
              scanError = 3;
              return text.substring(start, pos);
            }
          }
          var end = pos;
          if (pos < text.length && (text.charCodeAt(pos) === 69 || text.charCodeAt(pos) === 101)) {
            pos++;
            if (pos < text.length && text.charCodeAt(pos) === 43 || text.charCodeAt(pos) === 45) {
              pos++;
            }
            if (pos < text.length && isDigit(text.charCodeAt(pos))) {
              pos++;
              while (pos < text.length && isDigit(text.charCodeAt(pos))) {
                pos++;
              }
              end = pos;
            } else {
              scanError = 3;
            }
          }
          return text.substring(start, end);
        }
        function scanString() {
          var result = '',
            start = pos;
          while (true) {
            if (pos >= len) {
              result += text.substring(start, pos);
              scanError = 2;
              break;
            }
            var ch = text.charCodeAt(pos);
            if (ch === 34) {
              result += text.substring(start, pos);
              pos++;
              break;
            }
            if (ch === 92) {
              result += text.substring(start, pos);
              pos++;
              if (pos >= len) {
                scanError = 2;
                break;
              }
              var ch2 = text.charCodeAt(pos++);
              switch (ch2) {
                case 34:
                  result += '\"';
                  break;
                case 92:
                  result += '\\';
                  break;
                case 47:
                  result += '/';
                  break;
                case 98:
                  result += '\b';
                  break;
                case 102:
                  result += '\f';
                  break;
                case 110:
                  result += '\n';
                  break;
                case 114:
                  result += '\r';
                  break;
                case 116:
                  result += '\t';
                  break;
                case 117:
                  var ch3 = scanHexDigits(4, true);
                  if (ch3 >= 0) {
                    result += String.fromCharCode(ch3);
                  } else {
                    scanError = 4;
                  }
                  break;
                default:
                  scanError = 5;
              }
              start = pos;
              continue;
            }
            if (ch >= 0 && ch <= 0x1f) {
              if (isLineBreak(ch)) {
                result += text.substring(start, pos);
                scanError = 2;
                break;
              } else {
                scanError = 6;
              }
            }
            pos++;
          }
          return result;
        }
        function scanNext() {
          value = '';
          scanError = 0;
          tokenOffset = pos;
          lineStartOffset = lineNumber;
          prevTokenLineStartOffset = tokenLineStartOffset;
          if (pos >= len) {
            tokenOffset = len;
            return token = 17;
          }
          var code = text.charCodeAt(pos);
          if (isWhiteSpace(code)) {
            do {
              pos++;
              value += String.fromCharCode(code);
              code = text.charCodeAt(pos);
            } while (isWhiteSpace(code));
            return token = 15;
          }
          if (isLineBreak(code)) {
            pos++;
            value += String.fromCharCode(code);
            if (code === 13 && text.charCodeAt(pos) === 10) {
              pos++;
              value += '\n';
            }
            lineNumber++;
            tokenLineStartOffset = pos;
            return token = 14;
          }
          switch (code) {
            case 123:
              pos++;
              return token = 1;
            case 125:
              pos++;
              return token = 2;
            case 91:
              pos++;
              return token = 3;
            case 93:
              pos++;
              return token = 4;
            case 58:
              pos++;
              return token = 6;
            case 44:
              pos++;
              return token = 5;
            case 34:
              pos++;
              value = scanString();
              return token = 10;
            case 47:
              var start = pos - 1;
              if (text.charCodeAt(pos + 1) === 47) {
                pos += 2;
                while (pos < len) {
                  if (isLineBreak(text.charCodeAt(pos))) {
                    break;
                  }
                  pos++;
                }
                value = text.substring(start, pos);
                return token = 12;
              }
              if (text.charCodeAt(pos + 1) === 42) {
                pos += 2;
                var safeLength = len - 1;
                var commentClosed = false;
                while (pos < safeLength) {
                  var ch = text.charCodeAt(pos);
                  if (ch === 42 && text.charCodeAt(pos + 1) === 47) {
                    pos += 2;
                    commentClosed = true;
                    break;
                  }
                  pos++;
                  if (isLineBreak(ch)) {
                    if (ch === 13 && text.charCodeAt(pos) === 10) {
                      pos++;
                    }
                    lineNumber++;
                    tokenLineStartOffset = pos;
                  }
                }
                if (!commentClosed) {
                  pos++;
                  scanError = 1;
                }
                value = text.substring(start, pos);
                return token = 13;
              }
              value += String.fromCharCode(code);
              pos++;
              return token = 16;
            case 45:
              value += String.fromCharCode(code);
              pos++;
              if (pos === len || !isDigit(text.charCodeAt(pos))) {
                return token = 16;
              }
            case 48:
            case 49:
            case 50:
            case 51:
            case 52:
            case 53:
            case 54:
            case 55:
            case 56:
            case 57:
              value += scanNumber();
              return token = 11;
            default:
              while (pos < len && isUnknownContentCharacter(code)) {
                pos++;
                code = text.charCodeAt(pos);
              }
              if (tokenOffset !== pos) {
                value = text.substring(tokenOffset, pos);
                switch (value) {
                  case 'true':
                    return token = 8;
                  case 'false':
                    return token = 9;
                  case 'null':
                    return token = 7;
                }
                return token = 16;
              }
              value += String.fromCharCode(code);
              pos++;
              return token = 16;
          }
        }
        function isUnknownContentCharacter(code) {
          if (isWhiteSpace(code) || isLineBreak(code)) {
            return false;
          }
          switch (code) {
            case 125:
            case 93:
            case 123:
            case 91:
            case 34:
            case 58:
            case 44:
            case 47:
              return false;
          }
          return true;
        }
        function scanNextNonTrivia() {
          var result;
          do {
            result = scanNext();
          } while (result >= 12 && result <= 15);
          return result;
        }
        return {
          setPosition: setPosition,
          getPosition: function getPosition() {
            return pos;
          },
          scan: ignoreTrivia ? scanNextNonTrivia : scanNext,
          getToken: function getToken() {
            return token;
          },
          getTokenValue: function getTokenValue() {
            return value;
          },
          getTokenOffset: function getTokenOffset() {
            return tokenOffset;
          },
          getTokenLength: function getTokenLength() {
            return pos - tokenOffset;
          },
          getTokenStartLine: function getTokenStartLine() {
            return lineStartOffset;
          },
          getTokenStartCharacter: function getTokenStartCharacter() {
            return tokenOffset - prevTokenLineStartOffset;
          },
          getTokenError: function getTokenError() {
            return scanError;
          }
        };
      }
      function isWhiteSpace(ch) {
        return ch === 32 || ch === 9;
      }
      function isLineBreak(ch) {
        return ch === 10 || ch === 13;
      }
      function isDigit(ch) {
        return ch >= 48 && ch <= 57;
      }
      var CharacterCodes;
      (function (CharacterCodes) {
        CharacterCodes[CharacterCodes["lineFeed"] = 10] = "lineFeed";
        CharacterCodes[CharacterCodes["carriageReturn"] = 13] = "carriageReturn";
        CharacterCodes[CharacterCodes["space"] = 32] = "space";
        CharacterCodes[CharacterCodes["_0"] = 48] = "_0";
        CharacterCodes[CharacterCodes["_1"] = 49] = "_1";
        CharacterCodes[CharacterCodes["_2"] = 50] = "_2";
        CharacterCodes[CharacterCodes["_3"] = 51] = "_3";
        CharacterCodes[CharacterCodes["_4"] = 52] = "_4";
        CharacterCodes[CharacterCodes["_5"] = 53] = "_5";
        CharacterCodes[CharacterCodes["_6"] = 54] = "_6";
        CharacterCodes[CharacterCodes["_7"] = 55] = "_7";
        CharacterCodes[CharacterCodes["_8"] = 56] = "_8";
        CharacterCodes[CharacterCodes["_9"] = 57] = "_9";
        CharacterCodes[CharacterCodes["a"] = 97] = "a";
        CharacterCodes[CharacterCodes["b"] = 98] = "b";
        CharacterCodes[CharacterCodes["c"] = 99] = "c";
        CharacterCodes[CharacterCodes["d"] = 100] = "d";
        CharacterCodes[CharacterCodes["e"] = 101] = "e";
        CharacterCodes[CharacterCodes["f"] = 102] = "f";
        CharacterCodes[CharacterCodes["g"] = 103] = "g";
        CharacterCodes[CharacterCodes["h"] = 104] = "h";
        CharacterCodes[CharacterCodes["i"] = 105] = "i";
        CharacterCodes[CharacterCodes["j"] = 106] = "j";
        CharacterCodes[CharacterCodes["k"] = 107] = "k";
        CharacterCodes[CharacterCodes["l"] = 108] = "l";
        CharacterCodes[CharacterCodes["m"] = 109] = "m";
        CharacterCodes[CharacterCodes["n"] = 110] = "n";
        CharacterCodes[CharacterCodes["o"] = 111] = "o";
        CharacterCodes[CharacterCodes["p"] = 112] = "p";
        CharacterCodes[CharacterCodes["q"] = 113] = "q";
        CharacterCodes[CharacterCodes["r"] = 114] = "r";
        CharacterCodes[CharacterCodes["s"] = 115] = "s";
        CharacterCodes[CharacterCodes["t"] = 116] = "t";
        CharacterCodes[CharacterCodes["u"] = 117] = "u";
        CharacterCodes[CharacterCodes["v"] = 118] = "v";
        CharacterCodes[CharacterCodes["w"] = 119] = "w";
        CharacterCodes[CharacterCodes["x"] = 120] = "x";
        CharacterCodes[CharacterCodes["y"] = 121] = "y";
        CharacterCodes[CharacterCodes["z"] = 122] = "z";
        CharacterCodes[CharacterCodes["A"] = 65] = "A";
        CharacterCodes[CharacterCodes["B"] = 66] = "B";
        CharacterCodes[CharacterCodes["C"] = 67] = "C";
        CharacterCodes[CharacterCodes["D"] = 68] = "D";
        CharacterCodes[CharacterCodes["E"] = 69] = "E";
        CharacterCodes[CharacterCodes["F"] = 70] = "F";
        CharacterCodes[CharacterCodes["G"] = 71] = "G";
        CharacterCodes[CharacterCodes["H"] = 72] = "H";
        CharacterCodes[CharacterCodes["I"] = 73] = "I";
        CharacterCodes[CharacterCodes["J"] = 74] = "J";
        CharacterCodes[CharacterCodes["K"] = 75] = "K";
        CharacterCodes[CharacterCodes["L"] = 76] = "L";
        CharacterCodes[CharacterCodes["M"] = 77] = "M";
        CharacterCodes[CharacterCodes["N"] = 78] = "N";
        CharacterCodes[CharacterCodes["O"] = 79] = "O";
        CharacterCodes[CharacterCodes["P"] = 80] = "P";
        CharacterCodes[CharacterCodes["Q"] = 81] = "Q";
        CharacterCodes[CharacterCodes["R"] = 82] = "R";
        CharacterCodes[CharacterCodes["S"] = 83] = "S";
        CharacterCodes[CharacterCodes["T"] = 84] = "T";
        CharacterCodes[CharacterCodes["U"] = 85] = "U";
        CharacterCodes[CharacterCodes["V"] = 86] = "V";
        CharacterCodes[CharacterCodes["W"] = 87] = "W";
        CharacterCodes[CharacterCodes["X"] = 88] = "X";
        CharacterCodes[CharacterCodes["Y"] = 89] = "Y";
        CharacterCodes[CharacterCodes["Z"] = 90] = "Z";
        CharacterCodes[CharacterCodes["asterisk"] = 42] = "asterisk";
        CharacterCodes[CharacterCodes["backslash"] = 92] = "backslash";
        CharacterCodes[CharacterCodes["closeBrace"] = 125] = "closeBrace";
        CharacterCodes[CharacterCodes["closeBracket"] = 93] = "closeBracket";
        CharacterCodes[CharacterCodes["colon"] = 58] = "colon";
        CharacterCodes[CharacterCodes["comma"] = 44] = "comma";
        CharacterCodes[CharacterCodes["dot"] = 46] = "dot";
        CharacterCodes[CharacterCodes["doubleQuote"] = 34] = "doubleQuote";
        CharacterCodes[CharacterCodes["minus"] = 45] = "minus";
        CharacterCodes[CharacterCodes["openBrace"] = 123] = "openBrace";
        CharacterCodes[CharacterCodes["openBracket"] = 91] = "openBracket";
        CharacterCodes[CharacterCodes["plus"] = 43] = "plus";
        CharacterCodes[CharacterCodes["slash"] = 47] = "slash";
        CharacterCodes[CharacterCodes["formFeed"] = 12] = "formFeed";
        CharacterCodes[CharacterCodes["tab"] = 9] = "tab";
      })(CharacterCodes || (CharacterCodes = {}));
    }, {}],
    6: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.supportedEols = exports.cachedSpaces = exports.cachedBreakLinesWithSpaces = void 0;
      var cachedSpaces = exports.cachedSpaces = new Array(20).fill(0).map(function (_, index) {
        return ' '.repeat(index);
      });
      var maxCachedValues = 200;
      var cachedBreakLinesWithSpaces = exports.cachedBreakLinesWithSpaces = {
        ' ': {
          '\n': new Array(maxCachedValues).fill(0).map(function (_, index) {
            return '\n' + ' '.repeat(index);
          }),
          '\r': new Array(maxCachedValues).fill(0).map(function (_, index) {
            return '\r' + ' '.repeat(index);
          }),
          '\r\n': new Array(maxCachedValues).fill(0).map(function (_, index) {
            return '\r\n' + ' '.repeat(index);
          })
        },
        '\t': {
          '\n': new Array(maxCachedValues).fill(0).map(function (_, index) {
            return '\n' + '\t'.repeat(index);
          }),
          '\r': new Array(maxCachedValues).fill(0).map(function (_, index) {
            return '\r' + '\t'.repeat(index);
          }),
          '\r\n': new Array(maxCachedValues).fill(0).map(function (_, index) {
            return '\r\n' + '\t'.repeat(index);
          })
        }
      };
      var supportedEols = exports.supportedEols = ['\n', '\r', '\r\n'];
    }, {}],
    7: [function (require, module, exports) {
      'use strict';

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.SyntaxKind = exports.ScanError = exports.ParseErrorCode = void 0;
      exports.applyEdits = applyEdits;
      exports.findNodeAtOffset = exports.findNodeAtLocation = exports.createScanner = void 0;
      exports.format = format;
      exports.getNodeValue = exports.getNodePath = exports.getLocation = void 0;
      exports.modify = modify;
      exports.parseTree = exports.parse = void 0;
      exports.printParseErrorCode = printParseErrorCode;
      exports.visit = exports.stripComments = void 0;
      var formatter = _interopRequireWildcard(require("./impl/format"));
      var edit = _interopRequireWildcard(require("./impl/edit"));
      var scanner = _interopRequireWildcard(require("./impl/scanner"));
      var parser = _interopRequireWildcard(require("./impl/parser"));
      function _interopRequireWildcard(e, t) {
        if ("function" == typeof WeakMap) var r = new WeakMap(),
          n = new WeakMap();
        return (_interopRequireWildcard = function _interopRequireWildcard(e, t) {
          if (!t && e && e.__esModule) return e;
          var o,
            i,
            f = {
              __proto__: null,
              "default": e
            };
          if (null === e || "object" != _typeof(e) && "function" != typeof e) return f;
          if (o = t ? n : r) {
            if (o.has(e)) return o.get(e);
            o.set(e, f);
          }
          for (var _t in e) "default" !== _t && {}.hasOwnProperty.call(e, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e[_t]);
          return f;
        })(e, t);
      }
      var createScanner = exports.createScanner = scanner.createScanner;
      var ScanError;
      (function (ScanError) {
        ScanError[ScanError["None"] = 0] = "None";
        ScanError[ScanError["UnexpectedEndOfComment"] = 1] = "UnexpectedEndOfComment";
        ScanError[ScanError["UnexpectedEndOfString"] = 2] = "UnexpectedEndOfString";
        ScanError[ScanError["UnexpectedEndOfNumber"] = 3] = "UnexpectedEndOfNumber";
        ScanError[ScanError["InvalidUnicode"] = 4] = "InvalidUnicode";
        ScanError[ScanError["InvalidEscapeCharacter"] = 5] = "InvalidEscapeCharacter";
        ScanError[ScanError["InvalidCharacter"] = 6] = "InvalidCharacter";
      })(ScanError || (exports.ScanError = ScanError = {}));
      var SyntaxKind;
      (function (SyntaxKind) {
        SyntaxKind[SyntaxKind["OpenBraceToken"] = 1] = "OpenBraceToken";
        SyntaxKind[SyntaxKind["CloseBraceToken"] = 2] = "CloseBraceToken";
        SyntaxKind[SyntaxKind["OpenBracketToken"] = 3] = "OpenBracketToken";
        SyntaxKind[SyntaxKind["CloseBracketToken"] = 4] = "CloseBracketToken";
        SyntaxKind[SyntaxKind["CommaToken"] = 5] = "CommaToken";
        SyntaxKind[SyntaxKind["ColonToken"] = 6] = "ColonToken";
        SyntaxKind[SyntaxKind["NullKeyword"] = 7] = "NullKeyword";
        SyntaxKind[SyntaxKind["TrueKeyword"] = 8] = "TrueKeyword";
        SyntaxKind[SyntaxKind["FalseKeyword"] = 9] = "FalseKeyword";
        SyntaxKind[SyntaxKind["StringLiteral"] = 10] = "StringLiteral";
        SyntaxKind[SyntaxKind["NumericLiteral"] = 11] = "NumericLiteral";
        SyntaxKind[SyntaxKind["LineCommentTrivia"] = 12] = "LineCommentTrivia";
        SyntaxKind[SyntaxKind["BlockCommentTrivia"] = 13] = "BlockCommentTrivia";
        SyntaxKind[SyntaxKind["LineBreakTrivia"] = 14] = "LineBreakTrivia";
        SyntaxKind[SyntaxKind["Trivia"] = 15] = "Trivia";
        SyntaxKind[SyntaxKind["Unknown"] = 16] = "Unknown";
        SyntaxKind[SyntaxKind["EOF"] = 17] = "EOF";
      })(SyntaxKind || (exports.SyntaxKind = SyntaxKind = {}));
      var getLocation = exports.getLocation = parser.getLocation;
      var parse = exports.parse = parser.parse;
      var parseTree = exports.parseTree = parser.parseTree;
      var findNodeAtLocation = exports.findNodeAtLocation = parser.findNodeAtLocation;
      var findNodeAtOffset = exports.findNodeAtOffset = parser.findNodeAtOffset;
      var getNodePath = exports.getNodePath = parser.getNodePath;
      var getNodeValue = exports.getNodeValue = parser.getNodeValue;
      var visit = exports.visit = parser.visit;
      var stripComments = exports.stripComments = parser.stripComments;
      var ParseErrorCode;
      (function (ParseErrorCode) {
        ParseErrorCode[ParseErrorCode["InvalidSymbol"] = 1] = "InvalidSymbol";
        ParseErrorCode[ParseErrorCode["InvalidNumberFormat"] = 2] = "InvalidNumberFormat";
        ParseErrorCode[ParseErrorCode["PropertyNameExpected"] = 3] = "PropertyNameExpected";
        ParseErrorCode[ParseErrorCode["ValueExpected"] = 4] = "ValueExpected";
        ParseErrorCode[ParseErrorCode["ColonExpected"] = 5] = "ColonExpected";
        ParseErrorCode[ParseErrorCode["CommaExpected"] = 6] = "CommaExpected";
        ParseErrorCode[ParseErrorCode["CloseBraceExpected"] = 7] = "CloseBraceExpected";
        ParseErrorCode[ParseErrorCode["CloseBracketExpected"] = 8] = "CloseBracketExpected";
        ParseErrorCode[ParseErrorCode["EndOfFileExpected"] = 9] = "EndOfFileExpected";
        ParseErrorCode[ParseErrorCode["InvalidCommentToken"] = 10] = "InvalidCommentToken";
        ParseErrorCode[ParseErrorCode["UnexpectedEndOfComment"] = 11] = "UnexpectedEndOfComment";
        ParseErrorCode[ParseErrorCode["UnexpectedEndOfString"] = 12] = "UnexpectedEndOfString";
        ParseErrorCode[ParseErrorCode["UnexpectedEndOfNumber"] = 13] = "UnexpectedEndOfNumber";
        ParseErrorCode[ParseErrorCode["InvalidUnicode"] = 14] = "InvalidUnicode";
        ParseErrorCode[ParseErrorCode["InvalidEscapeCharacter"] = 15] = "InvalidEscapeCharacter";
        ParseErrorCode[ParseErrorCode["InvalidCharacter"] = 16] = "InvalidCharacter";
      })(ParseErrorCode || (exports.ParseErrorCode = ParseErrorCode = {}));
      function printParseErrorCode(code) {
        switch (code) {
          case 1:
            return 'InvalidSymbol';
          case 2:
            return 'InvalidNumberFormat';
          case 3:
            return 'PropertyNameExpected';
          case 4:
            return 'ValueExpected';
          case 5:
            return 'ColonExpected';
          case 6:
            return 'CommaExpected';
          case 7:
            return 'CloseBraceExpected';
          case 8:
            return 'CloseBracketExpected';
          case 9:
            return 'EndOfFileExpected';
          case 10:
            return 'InvalidCommentToken';
          case 11:
            return 'UnexpectedEndOfComment';
          case 12:
            return 'UnexpectedEndOfString';
          case 13:
            return 'UnexpectedEndOfNumber';
          case 14:
            return 'InvalidUnicode';
          case 15:
            return 'InvalidEscapeCharacter';
          case 16:
            return 'InvalidCharacter';
        }
        return '<unknown ParseErrorCode>';
      }
      function format(documentText, range, options) {
        return formatter.format(documentText, range, options);
      }
      function modify(text, path, value, options) {
        return edit.setProperty(text, path, value, options);
      }
      function applyEdits(text, edits) {
        var sortedEdits = edits.slice(0).sort(function (a, b) {
          var diff = a.offset - b.offset;
          if (diff === 0) {
            return a.length - b.length;
          }
          return diff;
        });
        var lastModifiedOffset = text.length;
        for (var i = sortedEdits.length - 1; i >= 0; i--) {
          var e = sortedEdits[i];
          if (e.offset + e.length <= lastModifiedOffset) {
            text = edit.applyEdit(text, e);
          } else {
            throw new Error('Overlapping edit');
          }
          lastModifiedOffset = e.offset;
        }
        return text;
      }
    }, {
      "./impl/edit": 2,
      "./impl/format": 3,
      "./impl/parser": 4,
      "./impl/scanner": 5
    }],
    8: [function (require, module, exports) {
      var process = module.exports = {};
      var cachedSetTimeout;
      var cachedClearTimeout;
      function defaultSetTimout() {
        throw new Error('setTimeout has not been defined');
      }
      function defaultClearTimeout() {
        throw new Error('clearTimeout has not been defined');
      }
      (function () {
        try {
          if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
          } else {
            cachedSetTimeout = defaultSetTimout;
          }
        } catch (e) {
          cachedSetTimeout = defaultSetTimout;
        }
        try {
          if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
          } else {
            cachedClearTimeout = defaultClearTimeout;
          }
        } catch (e) {
          cachedClearTimeout = defaultClearTimeout;
        }
      })();
      function runTimeout(fun) {
        if (cachedSetTimeout === setTimeout) {
          return setTimeout(fun, 0);
        }
        if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
          cachedSetTimeout = setTimeout;
          return setTimeout(fun, 0);
        }
        try {
          return cachedSetTimeout(fun, 0);
        } catch (e) {
          try {
            return cachedSetTimeout.call(null, fun, 0);
          } catch (e) {
            return cachedSetTimeout.call(this, fun, 0);
          }
        }
      }
      function runClearTimeout(marker) {
        if (cachedClearTimeout === clearTimeout) {
          return clearTimeout(marker);
        }
        if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
          cachedClearTimeout = clearTimeout;
          return clearTimeout(marker);
        }
        try {
          return cachedClearTimeout(marker);
        } catch (e) {
          try {
            return cachedClearTimeout.call(null, marker);
          } catch (e) {
            return cachedClearTimeout.call(this, marker);
          }
        }
      }
      var queue = [];
      var draining = false;
      var currentQueue;
      var queueIndex = -1;
      function cleanUpNextTick() {
        if (!draining || !currentQueue) {
          return;
        }
        draining = false;
        if (currentQueue.length) {
          queue = currentQueue.concat(queue);
        } else {
          queueIndex = -1;
        }
        if (queue.length) {
          drainQueue();
        }
      }
      function drainQueue() {
        if (draining) {
          return;
        }
        var timeout = runTimeout(cleanUpNextTick);
        draining = true;
        var len = queue.length;
        while (len) {
          currentQueue = queue;
          queue = [];
          while (++queueIndex < len) {
            if (currentQueue) {
              currentQueue[queueIndex].run();
            }
          }
          queueIndex = -1;
          len = queue.length;
        }
        currentQueue = null;
        draining = false;
        runClearTimeout(timeout);
      }
      process.nextTick = function (fun) {
        var args = new Array(arguments.length - 1);
        if (arguments.length > 1) {
          for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
          }
        }
        queue.push(new Item(fun, args));
        if (queue.length === 1 && !draining) {
          runTimeout(drainQueue);
        }
      };
      function Item(fun, array) {
        this.fun = fun;
        this.array = array;
      }
      Item.prototype.run = function () {
        this.fun.apply(null, this.array);
      };
      process.title = 'browser';
      process.browser = true;
      process.env = {};
      process.argv = [];
      process.version = '';
      process.versions = {};
      function noop() {}
      process.on = noop;
      process.addListener = noop;
      process.once = noop;
      process.off = noop;
      process.removeListener = noop;
      process.removeAllListeners = noop;
      process.emit = noop;
      process.prependListener = noop;
      process.prependOnceListener = noop;
      process.listeners = function (name) {
        return [];
      };
      process.binding = function (name) {
        throw new Error('process.binding is not supported');
      };
      process.cwd = function () {
        return '/';
      };
      process.chdir = function (dir) {
        throw new Error('process.chdir is not supported');
      };
      process.umask = function () {
        return 0;
      };
    }, {}],
    9: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.ClientCapabilities = void 0;
      Object.defineProperty(exports, "CodeAction", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.CodeAction;
        }
      });
      Object.defineProperty(exports, "CodeActionContext", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.CodeActionContext;
        }
      });
      Object.defineProperty(exports, "CodeActionKind", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.CodeActionKind;
        }
      });
      Object.defineProperty(exports, "Color", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.Color;
        }
      });
      Object.defineProperty(exports, "ColorInformation", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.ColorInformation;
        }
      });
      Object.defineProperty(exports, "ColorPresentation", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.ColorPresentation;
        }
      });
      Object.defineProperty(exports, "Command", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.Command;
        }
      });
      Object.defineProperty(exports, "CompletionItem", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.CompletionItem;
        }
      });
      Object.defineProperty(exports, "CompletionItemKind", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.CompletionItemKind;
        }
      });
      Object.defineProperty(exports, "CompletionItemTag", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.CompletionItemTag;
        }
      });
      Object.defineProperty(exports, "CompletionList", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.CompletionList;
        }
      });
      Object.defineProperty(exports, "Diagnostic", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.Diagnostic;
        }
      });
      Object.defineProperty(exports, "DiagnosticSeverity", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.DiagnosticSeverity;
        }
      });
      Object.defineProperty(exports, "DocumentHighlight", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.DocumentHighlight;
        }
      });
      Object.defineProperty(exports, "DocumentHighlightKind", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.DocumentHighlightKind;
        }
      });
      Object.defineProperty(exports, "DocumentLink", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.DocumentLink;
        }
      });
      Object.defineProperty(exports, "DocumentSymbol", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.DocumentSymbol;
        }
      });
      Object.defineProperty(exports, "DocumentUri", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.DocumentUri;
        }
      });
      exports.ErrorCode = void 0;
      Object.defineProperty(exports, "FoldingRange", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.FoldingRange;
        }
      });
      Object.defineProperty(exports, "FoldingRangeKind", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.FoldingRangeKind;
        }
      });
      Object.defineProperty(exports, "Hover", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.Hover;
        }
      });
      Object.defineProperty(exports, "InsertTextFormat", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.InsertTextFormat;
        }
      });
      Object.defineProperty(exports, "Location", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.Location;
        }
      });
      Object.defineProperty(exports, "MarkedString", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.MarkedString;
        }
      });
      Object.defineProperty(exports, "MarkupContent", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.MarkupContent;
        }
      });
      Object.defineProperty(exports, "MarkupKind", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.MarkupKind;
        }
      });
      Object.defineProperty(exports, "Position", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.Position;
        }
      });
      Object.defineProperty(exports, "Range", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.Range;
        }
      });
      exports.SchemaDraft = void 0;
      Object.defineProperty(exports, "SelectionRange", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.SelectionRange;
        }
      });
      Object.defineProperty(exports, "SymbolInformation", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.SymbolInformation;
        }
      });
      Object.defineProperty(exports, "SymbolKind", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.SymbolKind;
        }
      });
      Object.defineProperty(exports, "TextDocument", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTextdocument.TextDocument;
        }
      });
      Object.defineProperty(exports, "TextDocumentEdit", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.TextDocumentEdit;
        }
      });
      Object.defineProperty(exports, "TextEdit", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.TextEdit;
        }
      });
      Object.defineProperty(exports, "VersionedTextDocumentIdentifier", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.VersionedTextDocumentIdentifier;
        }
      });
      Object.defineProperty(exports, "WorkspaceEdit", {
        enumerable: true,
        get: function get() {
          return _vscodeLanguageserverTypes.WorkspaceEdit;
        }
      });
      exports.isSchemaResolveError = isSchemaResolveError;
      var _vscodeLanguageserverTypes = require("vscode-languageserver-types");
      var _vscodeLanguageserverTextdocument = require("vscode-languageserver-textdocument");
      var ErrorCode;
      (function (ErrorCode) {
        ErrorCode[ErrorCode["Undefined"] = 0] = "Undefined";
        ErrorCode[ErrorCode["EnumValueMismatch"] = 1] = "EnumValueMismatch";
        ErrorCode[ErrorCode["Deprecated"] = 2] = "Deprecated";
        ErrorCode[ErrorCode["UnexpectedEndOfComment"] = 257] = "UnexpectedEndOfComment";
        ErrorCode[ErrorCode["UnexpectedEndOfString"] = 258] = "UnexpectedEndOfString";
        ErrorCode[ErrorCode["UnexpectedEndOfNumber"] = 259] = "UnexpectedEndOfNumber";
        ErrorCode[ErrorCode["InvalidUnicode"] = 260] = "InvalidUnicode";
        ErrorCode[ErrorCode["InvalidEscapeCharacter"] = 261] = "InvalidEscapeCharacter";
        ErrorCode[ErrorCode["InvalidCharacter"] = 262] = "InvalidCharacter";
        ErrorCode[ErrorCode["PropertyExpected"] = 513] = "PropertyExpected";
        ErrorCode[ErrorCode["CommaExpected"] = 514] = "CommaExpected";
        ErrorCode[ErrorCode["ColonExpected"] = 515] = "ColonExpected";
        ErrorCode[ErrorCode["ValueExpected"] = 516] = "ValueExpected";
        ErrorCode[ErrorCode["CommaOrCloseBacketExpected"] = 517] = "CommaOrCloseBacketExpected";
        ErrorCode[ErrorCode["CommaOrCloseBraceExpected"] = 518] = "CommaOrCloseBraceExpected";
        ErrorCode[ErrorCode["TrailingComma"] = 519] = "TrailingComma";
        ErrorCode[ErrorCode["DuplicateKey"] = 520] = "DuplicateKey";
        ErrorCode[ErrorCode["CommentNotPermitted"] = 521] = "CommentNotPermitted";
        ErrorCode[ErrorCode["PropertyKeysMustBeDoublequoted"] = 528] = "PropertyKeysMustBeDoublequoted";
        ErrorCode[ErrorCode["SchemaUnsupportedFeature"] = 769] = "SchemaUnsupportedFeature";
        ErrorCode[ErrorCode["SchemaResolveError"] = 65536] = "SchemaResolveError";
      })(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
      function isSchemaResolveError(code) {
        return code >= ErrorCode.SchemaResolveError;
      }
      var SchemaDraft;
      (function (SchemaDraft) {
        SchemaDraft[SchemaDraft["v3"] = 3] = "v3";
        SchemaDraft[SchemaDraft["v4"] = 4] = "v4";
        SchemaDraft[SchemaDraft["v6"] = 6] = "v6";
        SchemaDraft[SchemaDraft["v7"] = 7] = "v7";
        SchemaDraft[SchemaDraft["v2019_09"] = 19] = "v2019_09";
        SchemaDraft[SchemaDraft["v2020_12"] = 20] = "v2020_12";
      })(SchemaDraft || (exports.SchemaDraft = SchemaDraft = {}));
      var ClientCapabilities;
      (function (ClientCapabilities) {
        ClientCapabilities.LATEST = {
          textDocument: {
            completion: {
              completionItem: {
                documentationFormat: [_vscodeLanguageserverTypes.MarkupKind.Markdown, _vscodeLanguageserverTypes.MarkupKind.PlainText],
                commitCharactersSupport: true,
                labelDetailsSupport: true
              }
            }
          }
        };
      })(ClientCapabilities || (exports.ClientCapabilities = ClientCapabilities = {}));
    }, {
      "vscode-languageserver-textdocument": 30,
      "vscode-languageserver-types": 31
    }],
    10: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.ValidationResult = exports.StringASTNodeImpl = exports.PropertyASTNodeImpl = exports.ObjectASTNodeImpl = exports.NumberASTNodeImpl = exports.NullASTNodeImpl = exports.JSONDocument = exports.EnumMatch = exports.BooleanASTNodeImpl = exports.ArrayASTNodeImpl = exports.ASTNodeImpl = void 0;
      exports.asSchema = asSchema;
      exports.contains = contains;
      exports.getNodePath = getNodePath;
      exports.getNodeValue = getNodeValue;
      exports.getSchemaDraftFromId = getSchemaDraftFromId;
      exports.newJSONDocument = newJSONDocument;
      exports.normalizeId = normalizeId;
      exports.parse = parse;
      var Json = _interopRequireWildcard(require("jsonc-parser"));
      var _objects = require("../utils/objects");
      var _strings = require("../utils/strings");
      var _jsonLanguageTypes = require("../jsonLanguageTypes");
      var _vscodeUri = require("vscode-uri");
      var l10n = _interopRequireWildcard(require("@vscode/l10n"));
      function _interopRequireWildcard(e, t) {
        if ("function" == typeof WeakMap) var r = new WeakMap(),
          n = new WeakMap();
        return (_interopRequireWildcard = function _interopRequireWildcard(e, t) {
          if (!t && e && e.__esModule) return e;
          var o,
            i,
            f = {
              __proto__: null,
              "default": e
            };
          if (null === e || "object" != _typeof(e) && "function" != typeof e) return f;
          if (o = t ? n : r) {
            if (o.has(e)) return o.get(e);
            o.set(e, f);
          }
          for (var _t2 in e) "default" !== _t2 && {}.hasOwnProperty.call(e, _t2) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t2)) && (i.get || i.set) ? o(f, _t2, i) : f[_t2] = e[_t2]);
          return f;
        })(e, t);
      }
      var formats = {
        'color-hex': {
          errorMessage: l10n.t('Invalid color format. Use #RGB, #RGBA, #RRGGBB or #RRGGBBAA.'),
          pattern: /^#([0-9A-Fa-f]{3,4}|([0-9A-Fa-f]{2}){3,4})$/
        },
        'date-time': {
          errorMessage: l10n.t('String is not a RFC3339 date-time.'),
          pattern: /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)([01][0-9]|2[0-3]):([0-5][0-9]))$/i
        },
        'date': {
          errorMessage: l10n.t('String is not a RFC3339 date.'),
          pattern: /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/i
        },
        'time': {
          errorMessage: l10n.t('String is not a RFC3339 time.'),
          pattern: /^([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)([01][0-9]|2[0-3]):([0-5][0-9]))$/i
        },
        'email': {
          errorMessage: l10n.t('String is not an e-mail address.'),
          pattern: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}))$/
        },
        'hostname': {
          errorMessage: l10n.t('String is not a hostname.'),
          pattern: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i
        },
        'ipv4': {
          errorMessage: l10n.t('String is not an IPv4 address.'),
          pattern: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/
        },
        'ipv6': {
          errorMessage: l10n.t('String is not an IPv6 address.'),
          pattern: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i
        }
      };
      var ASTNodeImpl = function () {
        function ASTNodeImpl(parent, offset) {
          var length = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
          _classCallCheck(this, ASTNodeImpl);
          this.offset = offset;
          this.length = length;
          this.parent = parent;
        }
        return _createClass(ASTNodeImpl, [{
          key: "children",
          get: function get() {
            return [];
          }
        }, {
          key: "toString",
          value: function toString() {
            return 'type: ' + this.type + ' (' + this.offset + '/' + this.length + ')' + (this.parent ? ' parent: {' + this.parent.toString() + '}' : '');
          }
        }]);
      }();
      exports.ASTNodeImpl = ASTNodeImpl;
      var NullASTNodeImpl = function (_ASTNodeImpl) {
        function NullASTNodeImpl(parent, offset) {
          var _this2;
          _classCallCheck(this, NullASTNodeImpl);
          _this2 = _callSuper(this, NullASTNodeImpl, [parent, offset]);
          _this2.type = 'null';
          _this2.value = null;
          return _this2;
        }
        _inherits(NullASTNodeImpl, _ASTNodeImpl);
        return _createClass(NullASTNodeImpl);
      }(ASTNodeImpl);
      exports.NullASTNodeImpl = NullASTNodeImpl;
      var BooleanASTNodeImpl = function (_ASTNodeImpl2) {
        function BooleanASTNodeImpl(parent, boolValue, offset) {
          var _this3;
          _classCallCheck(this, BooleanASTNodeImpl);
          _this3 = _callSuper(this, BooleanASTNodeImpl, [parent, offset]);
          _this3.type = 'boolean';
          _this3.value = boolValue;
          return _this3;
        }
        _inherits(BooleanASTNodeImpl, _ASTNodeImpl2);
        return _createClass(BooleanASTNodeImpl);
      }(ASTNodeImpl);
      exports.BooleanASTNodeImpl = BooleanASTNodeImpl;
      var ArrayASTNodeImpl = function (_ASTNodeImpl3) {
        function ArrayASTNodeImpl(parent, offset) {
          var _this4;
          _classCallCheck(this, ArrayASTNodeImpl);
          _this4 = _callSuper(this, ArrayASTNodeImpl, [parent, offset]);
          _this4.type = 'array';
          _this4.items = [];
          return _this4;
        }
        _inherits(ArrayASTNodeImpl, _ASTNodeImpl3);
        return _createClass(ArrayASTNodeImpl, [{
          key: "children",
          get: function get() {
            return this.items;
          }
        }]);
      }(ASTNodeImpl);
      exports.ArrayASTNodeImpl = ArrayASTNodeImpl;
      var NumberASTNodeImpl = function (_ASTNodeImpl4) {
        function NumberASTNodeImpl(parent, offset) {
          var _this5;
          _classCallCheck(this, NumberASTNodeImpl);
          _this5 = _callSuper(this, NumberASTNodeImpl, [parent, offset]);
          _this5.type = 'number';
          _this5.isInteger = true;
          _this5.value = Number.NaN;
          return _this5;
        }
        _inherits(NumberASTNodeImpl, _ASTNodeImpl4);
        return _createClass(NumberASTNodeImpl);
      }(ASTNodeImpl);
      exports.NumberASTNodeImpl = NumberASTNodeImpl;
      var StringASTNodeImpl = function (_ASTNodeImpl5) {
        function StringASTNodeImpl(parent, offset, length) {
          var _this6;
          _classCallCheck(this, StringASTNodeImpl);
          _this6 = _callSuper(this, StringASTNodeImpl, [parent, offset, length]);
          _this6.type = 'string';
          _this6.value = '';
          return _this6;
        }
        _inherits(StringASTNodeImpl, _ASTNodeImpl5);
        return _createClass(StringASTNodeImpl);
      }(ASTNodeImpl);
      exports.StringASTNodeImpl = StringASTNodeImpl;
      var PropertyASTNodeImpl = function (_ASTNodeImpl6) {
        function PropertyASTNodeImpl(parent, offset, keyNode) {
          var _this7;
          _classCallCheck(this, PropertyASTNodeImpl);
          _this7 = _callSuper(this, PropertyASTNodeImpl, [parent, offset]);
          _this7.type = 'property';
          _this7.colonOffset = -1;
          _this7.keyNode = keyNode;
          return _this7;
        }
        _inherits(PropertyASTNodeImpl, _ASTNodeImpl6);
        return _createClass(PropertyASTNodeImpl, [{
          key: "children",
          get: function get() {
            return this.valueNode ? [this.keyNode, this.valueNode] : [this.keyNode];
          }
        }]);
      }(ASTNodeImpl);
      exports.PropertyASTNodeImpl = PropertyASTNodeImpl;
      var ObjectASTNodeImpl = function (_ASTNodeImpl7) {
        function ObjectASTNodeImpl(parent, offset) {
          var _this8;
          _classCallCheck(this, ObjectASTNodeImpl);
          _this8 = _callSuper(this, ObjectASTNodeImpl, [parent, offset]);
          _this8.type = 'object';
          _this8.properties = [];
          return _this8;
        }
        _inherits(ObjectASTNodeImpl, _ASTNodeImpl7);
        return _createClass(ObjectASTNodeImpl, [{
          key: "children",
          get: function get() {
            return this.properties;
          }
        }]);
      }(ASTNodeImpl);
      exports.ObjectASTNodeImpl = ObjectASTNodeImpl;
      function asSchema(schema) {
        if ((0, _objects.isBoolean)(schema)) {
          return schema ? {} : {
            "not": {}
          };
        }
        return schema;
      }
      var EnumMatch;
      (function (EnumMatch) {
        EnumMatch[EnumMatch["Key"] = 0] = "Key";
        EnumMatch[EnumMatch["Enum"] = 1] = "Enum";
      })(EnumMatch || (exports.EnumMatch = EnumMatch = {}));
      var httpPrefix = "http://json-schema.org/";
      var httpsPrefix = "https://json-schema.org/";
      function normalizeId(id) {
        if (id.startsWith(httpPrefix)) {
          id = httpsPrefix + id.substring(httpPrefix.length);
        }
        try {
          return _vscodeUri.URI.parse(id).toString(true);
        } catch (e) {
          return id;
        }
      }
      function getSchemaDraftFromId(schemaId) {
        var _schemaDraftFromId$no;
        return (_schemaDraftFromId$no = schemaDraftFromId[normalizeId(schemaId)]) !== null && _schemaDraftFromId$no !== void 0 ? _schemaDraftFromId$no : undefined;
      }
      var schemaDraftFromId = {
        'https://json-schema.org/draft-03/schema': _jsonLanguageTypes.SchemaDraft.v3,
        'https://json-schema.org/draft-04/schema': _jsonLanguageTypes.SchemaDraft.v4,
        'https://json-schema.org/draft-06/schema': _jsonLanguageTypes.SchemaDraft.v6,
        'https://json-schema.org/draft-07/schema': _jsonLanguageTypes.SchemaDraft.v7,
        'https://json-schema.org/draft/2019-09/schema': _jsonLanguageTypes.SchemaDraft.v2019_09,
        'https://json-schema.org/draft/2020-12/schema': _jsonLanguageTypes.SchemaDraft.v2020_12
      };
      var EvaluationContext = _createClass(function EvaluationContext(schemaDraft) {
        _classCallCheck(this, EvaluationContext);
        this.schemaDraft = schemaDraft;
      });
      var SchemaCollector = function () {
        function SchemaCollector() {
          var focusOffset = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : -1;
          var exclude = arguments.length > 1 ? arguments[1] : undefined;
          _classCallCheck(this, SchemaCollector);
          this.focusOffset = focusOffset;
          this.exclude = exclude;
          this.schemas = [];
        }
        return _createClass(SchemaCollector, [{
          key: "add",
          value: function add(schema) {
            this.schemas.push(schema);
          }
        }, {
          key: "merge",
          value: function merge(other) {
            Array.prototype.push.apply(this.schemas, other.schemas);
          }
        }, {
          key: "include",
          value: function include(node) {
            return (this.focusOffset === -1 || contains(node, this.focusOffset)) && node !== this.exclude;
          }
        }, {
          key: "newSub",
          value: function newSub() {
            return new SchemaCollector(-1, this.exclude);
          }
        }]);
      }();
      var NoOpSchemaCollector = function () {
        function NoOpSchemaCollector() {
          _classCallCheck(this, NoOpSchemaCollector);
        }
        return _createClass(NoOpSchemaCollector, [{
          key: "schemas",
          get: function get() {
            return [];
          }
        }, {
          key: "add",
          value: function add(_schema) {}
        }, {
          key: "merge",
          value: function merge(_other) {}
        }, {
          key: "include",
          value: function include(_node) {
            return true;
          }
        }, {
          key: "newSub",
          value: function newSub() {
            return this;
          }
        }]);
      }();
      NoOpSchemaCollector.instance = new NoOpSchemaCollector();
      var ValidationResult = function () {
        function ValidationResult() {
          _classCallCheck(this, ValidationResult);
          this.problems = [];
          this.propertiesMatches = 0;
          this.processedProperties = new Set();
          this.propertiesValueMatches = 0;
          this.primaryValueMatches = 0;
          this.enumValueMatch = false;
          this.enumValues = undefined;
        }
        return _createClass(ValidationResult, [{
          key: "hasProblems",
          value: function hasProblems() {
            return !!this.problems.length;
          }
        }, {
          key: "merge",
          value: function merge(validationResult) {
            this.problems = this.problems.concat(validationResult.problems);
            this.propertiesMatches += validationResult.propertiesMatches;
            this.propertiesValueMatches += validationResult.propertiesValueMatches;
            this.mergeProcessedProperties(validationResult);
          }
        }, {
          key: "mergeEnumValues",
          value: function mergeEnumValues(validationResult) {
            if (!this.enumValueMatch && !validationResult.enumValueMatch && this.enumValues && validationResult.enumValues) {
              this.enumValues = this.enumValues.concat(validationResult.enumValues);
            }
          }
        }, {
          key: "updateEnumMismatchProblemMessages",
          value: function updateEnumMismatchProblemMessages() {
            if (!this.enumValueMatch && this.enumValues) {
              var _iterator4 = _createForOfIteratorHelper(this.problems),
                _step4;
              try {
                for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
                  var error = _step4.value;
                  if (error.code === _jsonLanguageTypes.ErrorCode.EnumValueMismatch) {
                    error.message = l10n.t('Value is not accepted. Valid values: {0}.', this.enumValues.map(function (v) {
                      return JSON.stringify(v);
                    }).join(', '));
                  }
                }
              } catch (err) {
                _iterator4.e(err);
              } finally {
                _iterator4.f();
              }
            }
          }
        }, {
          key: "mergePropertyMatch",
          value: function mergePropertyMatch(propertyValidationResult) {
            this.problems = this.problems.concat(propertyValidationResult.problems);
            this.propertiesMatches++;
            if (propertyValidationResult.enumValueMatch || !propertyValidationResult.hasProblems() && propertyValidationResult.propertiesMatches) {
              this.propertiesValueMatches++;
            }
            if (propertyValidationResult.enumValueMatch && propertyValidationResult.enumValues && propertyValidationResult.enumValues.length === 1) {
              this.primaryValueMatches++;
            }
          }
        }, {
          key: "mergeProcessedProperties",
          value: function mergeProcessedProperties(validationResult) {
            var _this9 = this;
            validationResult.processedProperties.forEach(function (p) {
              return _this9.processedProperties.add(p);
            });
          }
        }, {
          key: "compare",
          value: function compare(other) {
            var hasProblems = this.hasProblems();
            if (hasProblems !== other.hasProblems()) {
              return hasProblems ? -1 : 1;
            }
            if (this.enumValueMatch !== other.enumValueMatch) {
              return other.enumValueMatch ? -1 : 1;
            }
            if (this.primaryValueMatches !== other.primaryValueMatches) {
              return this.primaryValueMatches - other.primaryValueMatches;
            }
            if (this.propertiesValueMatches !== other.propertiesValueMatches) {
              return this.propertiesValueMatches - other.propertiesValueMatches;
            }
            return this.propertiesMatches - other.propertiesMatches;
          }
        }]);
      }();
      exports.ValidationResult = ValidationResult;
      function newJSONDocument(root) {
        var diagnostics = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
        var comments = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
        return new JSONDocument(root, diagnostics, comments);
      }
      function getNodeValue(node) {
        return Json.getNodeValue(node);
      }
      function getNodePath(node) {
        return Json.getNodePath(node);
      }
      function contains(node, offset) {
        var includeRightBound = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        return offset >= node.offset && offset < node.offset + node.length || includeRightBound && offset === node.offset + node.length;
      }
      var JSONDocument = function () {
        function JSONDocument(root) {
          var syntaxErrors = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
          var comments = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
          _classCallCheck(this, JSONDocument);
          this.root = root;
          this.syntaxErrors = syntaxErrors;
          this.comments = comments;
        }
        return _createClass(JSONDocument, [{
          key: "getNodeFromOffset",
          value: function getNodeFromOffset(offset) {
            var includeRightBound = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
            if (this.root) {
              return Json.findNodeAtOffset(this.root, offset, includeRightBound);
            }
            return undefined;
          }
        }, {
          key: "visit",
          value: function visit(visitor) {
            if (this.root) {
              var _doVisit = function doVisit(node) {
                var ctn = visitor(node);
                var children = node.children;
                if (Array.isArray(children)) {
                  for (var i = 0; i < children.length && ctn; i++) {
                    ctn = _doVisit(children[i]);
                  }
                }
                return ctn;
              };
              _doVisit(this.root);
            }
          }
        }, {
          key: "validate",
          value: function validate(textDocument, schema) {
            var severity = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _jsonLanguageTypes.DiagnosticSeverity.Warning;
            var schemaDraft = arguments.length > 3 ? arguments[3] : undefined;
            if (this.root && schema) {
              var validationResult = new ValidationResult();
              _validate(this.root, schema, validationResult, NoOpSchemaCollector.instance, new EvaluationContext(schemaDraft !== null && schemaDraft !== void 0 ? schemaDraft : getSchemaDraft(schema)));
              return validationResult.problems.map(function (p) {
                var _p$severity;
                var range = _jsonLanguageTypes.Range.create(textDocument.positionAt(p.location.offset), textDocument.positionAt(p.location.offset + p.location.length));
                return _jsonLanguageTypes.Diagnostic.create(range, p.message, (_p$severity = p.severity) !== null && _p$severity !== void 0 ? _p$severity : severity, p.code);
              });
            }
            return undefined;
          }
        }, {
          key: "getMatchingSchemas",
          value: function getMatchingSchemas(schema) {
            var focusOffset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;
            var exclude = arguments.length > 2 ? arguments[2] : undefined;
            if (this.root && schema) {
              var matchingSchemas = new SchemaCollector(focusOffset, exclude);
              var schemaDraft = getSchemaDraft(schema);
              var context = new EvaluationContext(schemaDraft);
              _validate(this.root, schema, new ValidationResult(), matchingSchemas, context);
              return matchingSchemas.schemas;
            }
            return [];
          }
        }]);
      }();
      exports.JSONDocument = JSONDocument;
      function getSchemaDraft(schema) {
        var fallBack = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _jsonLanguageTypes.SchemaDraft.v2020_12;
        var schemaId = schema.$schema;
        if (schemaId) {
          var _getSchemaDraftFromId;
          return (_getSchemaDraftFromId = getSchemaDraftFromId(schemaId)) !== null && _getSchemaDraftFromId !== void 0 ? _getSchemaDraftFromId : fallBack;
        }
        return fallBack;
      }
      function _validate(n, schema, validationResult, matchingSchemas, context) {
        if (!n || !matchingSchemas.include(n)) {
          return;
        }
        if (n.type === 'property') {
          return _validate(n.valueNode, schema, validationResult, matchingSchemas, context);
        }
        var node = n;
        _validateNode();
        switch (node.type) {
          case 'object':
            _validateObjectNode(node);
            break;
          case 'array':
            _validateArrayNode(node);
            break;
          case 'string':
            _validateStringNode(node);
            break;
          case 'number':
            _validateNumberNode(node);
            break;
        }
        matchingSchemas.add({
          node: node,
          schema: schema
        });
        function _validateNode() {
          function matchesType(type) {
            return node.type === type || type === 'integer' && node.type === 'number' && node.isInteger;
          }
          if (Array.isArray(schema.type)) {
            if (!schema.type.some(matchesType)) {
              validationResult.problems.push({
                location: {
                  offset: node.offset,
                  length: node.length
                },
                message: schema.errorMessage || l10n.t('Incorrect type. Expected one of {0}.', schema.type.join(', '))
              });
            }
          } else if (schema.type) {
            if (!matchesType(schema.type)) {
              validationResult.problems.push({
                location: {
                  offset: node.offset,
                  length: node.length
                },
                message: schema.errorMessage || l10n.t('Incorrect type. Expected "{0}".', schema.type)
              });
            }
          }
          if (Array.isArray(schema.allOf)) {
            var _iterator5 = _createForOfIteratorHelper(schema.allOf),
              _step5;
            try {
              for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
                var subSchemaRef = _step5.value;
                var subValidationResult = new ValidationResult();
                var subMatchingSchemas = matchingSchemas.newSub();
                _validate(node, asSchema(subSchemaRef), subValidationResult, subMatchingSchemas, context);
                validationResult.merge(subValidationResult);
                matchingSchemas.merge(subMatchingSchemas);
              }
            } catch (err) {
              _iterator5.e(err);
            } finally {
              _iterator5.f();
            }
          }
          var notSchema = asSchema(schema.not);
          if (notSchema) {
            var _subValidationResult = new ValidationResult();
            var _subMatchingSchemas = matchingSchemas.newSub();
            _validate(node, notSchema, _subValidationResult, _subMatchingSchemas, context);
            if (!_subValidationResult.hasProblems()) {
              validationResult.problems.push({
                location: {
                  offset: node.offset,
                  length: node.length
                },
                message: schema.errorMessage || l10n.t("Matches a schema that is not allowed.")
              });
            }
            var _iterator6 = _createForOfIteratorHelper(_subMatchingSchemas.schemas),
              _step6;
            try {
              for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
                var ms = _step6.value;
                ms.inverted = !ms.inverted;
                matchingSchemas.add(ms);
              }
            } catch (err) {
              _iterator6.e(err);
            } finally {
              _iterator6.f();
            }
          }
          var testAlternatives = function testAlternatives(alternatives, maxOneMatch) {
            var _tryDiscriminatorOpti;
            var matches = [];
            var alternativesToTest = (_tryDiscriminatorOpti = _tryDiscriminatorOptimization(alternatives)) !== null && _tryDiscriminatorOpti !== void 0 ? _tryDiscriminatorOpti : alternatives;
            var bestMatch = undefined;
            var _iterator7 = _createForOfIteratorHelper(alternativesToTest),
              _step7;
            try {
              for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
                var _subSchemaRef = _step7.value;
                var subSchema = asSchema(_subSchemaRef);
                var _subValidationResult2 = new ValidationResult();
                var _subMatchingSchemas2 = matchingSchemas.newSub();
                _validate(node, subSchema, _subValidationResult2, _subMatchingSchemas2, context);
                if (!_subValidationResult2.hasProblems()) {
                  matches.push(subSchema);
                }
                if (!bestMatch) {
                  bestMatch = {
                    schema: subSchema,
                    validationResult: _subValidationResult2,
                    matchingSchemas: _subMatchingSchemas2
                  };
                } else {
                  if (!maxOneMatch && !_subValidationResult2.hasProblems() && !bestMatch.validationResult.hasProblems()) {
                    bestMatch.matchingSchemas.merge(_subMatchingSchemas2);
                    bestMatch.validationResult.propertiesMatches += _subValidationResult2.propertiesMatches;
                    bestMatch.validationResult.propertiesValueMatches += _subValidationResult2.propertiesValueMatches;
                    bestMatch.validationResult.mergeProcessedProperties(_subValidationResult2);
                  } else {
                    var compareResult = _subValidationResult2.compare(bestMatch.validationResult);
                    if (compareResult > 0) {
                      bestMatch = {
                        schema: subSchema,
                        validationResult: _subValidationResult2,
                        matchingSchemas: _subMatchingSchemas2
                      };
                    } else if (compareResult === 0) {
                      bestMatch.matchingSchemas.merge(_subMatchingSchemas2);
                      bestMatch.validationResult.mergeEnumValues(_subValidationResult2);
                    }
                  }
                }
              }
            } catch (err) {
              _iterator7.e(err);
            } finally {
              _iterator7.f();
            }
            if (matches.length > 1 && maxOneMatch) {
              validationResult.problems.push({
                location: {
                  offset: node.offset,
                  length: 1
                },
                message: l10n.t("Matches multiple schemas when only one must validate.")
              });
            }
            if (bestMatch) {
              bestMatch.validationResult.updateEnumMismatchProblemMessages();
              validationResult.merge(bestMatch.validationResult);
              matchingSchemas.merge(bestMatch.matchingSchemas);
            }
            return matches.length;
          };
          if (Array.isArray(schema.anyOf)) {
            testAlternatives(schema.anyOf, false);
          }
          if (Array.isArray(schema.oneOf)) {
            testAlternatives(schema.oneOf, true);
          }
          var testBranch = function testBranch(schema) {
            var subValidationResult = new ValidationResult();
            var subMatchingSchemas = matchingSchemas.newSub();
            _validate(node, asSchema(schema), subValidationResult, subMatchingSchemas, context);
            validationResult.merge(subValidationResult);
            matchingSchemas.merge(subMatchingSchemas);
          };
          var testCondition = function testCondition(ifSchema, thenSchema, elseSchema) {
            var subSchema = asSchema(ifSchema);
            var subValidationResult = new ValidationResult();
            var subMatchingSchemas = matchingSchemas.newSub();
            _validate(node, subSchema, subValidationResult, subMatchingSchemas, context);
            matchingSchemas.merge(subMatchingSchemas);
            validationResult.mergeProcessedProperties(subValidationResult);
            if (!subValidationResult.hasProblems()) {
              if (thenSchema) {
                testBranch(thenSchema);
              }
            } else if (elseSchema) {
              testBranch(elseSchema);
            }
          };
          var ifSchema = asSchema(schema["if"]);
          if (ifSchema) {
            testCondition(ifSchema, asSchema(schema.then), asSchema(schema["else"]));
          }
          if (Array.isArray(schema["enum"])) {
            var val = getNodeValue(node);
            var enumValueMatch = false;
            var _iterator8 = _createForOfIteratorHelper(schema["enum"]),
              _step8;
            try {
              for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
                var e = _step8.value;
                if ((0, _objects.equals)(val, e)) {
                  enumValueMatch = true;
                  break;
                }
              }
            } catch (err) {
              _iterator8.e(err);
            } finally {
              _iterator8.f();
            }
            validationResult.enumValues = schema["enum"];
            validationResult.enumValueMatch = enumValueMatch;
            if (!enumValueMatch) {
              validationResult.problems.push({
                location: {
                  offset: node.offset,
                  length: node.length
                },
                code: _jsonLanguageTypes.ErrorCode.EnumValueMismatch,
                message: schema.errorMessage || l10n.t('Value is not accepted. Valid values: {0}.', schema["enum"].map(function (v) {
                  return JSON.stringify(v);
                }).join(', '))
              });
            }
          }
          if ((0, _objects.isDefined)(schema["const"])) {
            var _val = getNodeValue(node);
            if (!(0, _objects.equals)(_val, schema["const"])) {
              validationResult.problems.push({
                location: {
                  offset: node.offset,
                  length: node.length
                },
                code: _jsonLanguageTypes.ErrorCode.EnumValueMismatch,
                message: schema.errorMessage || l10n.t('Value must be {0}.', JSON.stringify(schema["const"]))
              });
              validationResult.enumValueMatch = false;
            } else {
              validationResult.enumValueMatch = true;
            }
            validationResult.enumValues = [schema["const"]];
          }
          var deprecationMessage = schema.deprecationMessage;
          if (deprecationMessage || schema.deprecated) {
            var _node$parent;
            deprecationMessage = deprecationMessage || l10n.t('Value is deprecated');
            var targetNode = ((_node$parent = node.parent) === null || _node$parent === void 0 ? void 0 : _node$parent.type) === 'property' ? node.parent : node;
            validationResult.problems.push({
              location: {
                offset: targetNode.offset,
                length: targetNode.length
              },
              severity: _jsonLanguageTypes.DiagnosticSeverity.Warning,
              message: deprecationMessage,
              code: _jsonLanguageTypes.ErrorCode.Deprecated
            });
          }
        }
        function _tryDiscriminatorOptimization(alternatives) {
          var _node$properties, _node$items;
          if (alternatives.length < 2) {
            return undefined;
          }
          var buildConstMap = function buildConstMap(getSchemas) {
            var constMap = new Map();
            var _loop = function _loop(i) {
                var schemas = getSchemas(asSchema(alternatives[i]), i);
                if (!schemas) {
                  return {
                    v: undefined
                  };
                }
                schemas.forEach(function (_ref) {
                  var _ref2 = _slicedToArray(_ref, 2),
                    key = _ref2[0],
                    schema = _ref2[1];
                  if (schema["const"] !== undefined) {
                    if (!constMap.has(key)) {
                      constMap.set(key, new Map());
                    }
                    var valueMap = constMap.get(key);
                    if (!valueMap.has(schema["const"])) {
                      valueMap.set(schema["const"], []);
                    }
                    valueMap.get(schema["const"]).push(i);
                  }
                });
              },
              _ret;
            for (var i = 0; i < alternatives.length; i++) {
              _ret = _loop(i);
              if (_ret) return _ret.v;
            }
            return constMap;
          };
          var findDiscriminator = function findDiscriminator(constMap, getValue) {
            var _iterator9 = _createForOfIteratorHelper(constMap),
              _step9;
            try {
              var _loop2 = function _loop2() {
                  var _step9$value = _slicedToArray(_step9.value, 2),
                    key = _step9$value[0],
                    valueMap = _step9$value[1];
                  var coveredAlts = new Set();
                  valueMap.forEach(function (indices) {
                    return indices.forEach(function (idx) {
                      return coveredAlts.add(idx);
                    });
                  });
                  if (coveredAlts.size === alternatives.length) {
                    var discriminatorValue = getValue(key);
                    var matchingIndices = valueMap.get(discriminatorValue);
                    if (matchingIndices !== null && matchingIndices !== void 0 && matchingIndices.length) {
                      return {
                        v: matchingIndices.map(function (idx) {
                          return alternatives[idx];
                        })
                      };
                    }
                    return 0;
                  }
                },
                _ret2;
              for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
                _ret2 = _loop2();
                if (_ret2 === 0) break;
                if (_ret2) return _ret2.v;
              }
            } catch (err) {
              _iterator9.e(err);
            } finally {
              _iterator9.f();
            }
            return undefined;
          };
          if (node.type === 'object' && (_node$properties = node.properties) !== null && _node$properties !== void 0 && _node$properties.length) {
            var constMap = buildConstMap(function (schema) {
              return schema.properties ? Object.entries(schema.properties).map(function (_ref3) {
                var _ref4 = _slicedToArray(_ref3, 2),
                  k = _ref4[0],
                  v = _ref4[1];
                return [k, asSchema(v)];
              }) : undefined;
            });
            if (constMap) {
              return findDiscriminator(constMap, function (propName) {
                var _prop$valueNode;
                var prop = node.properties.find(function (p) {
                  return p.keyNode.value === propName;
                });
                return (prop === null || prop === void 0 || (_prop$valueNode = prop.valueNode) === null || _prop$valueNode === void 0 ? void 0 : _prop$valueNode.type) === 'string' ? prop.valueNode.value : undefined;
              });
            }
          } else if (node.type === 'array' && (_node$items = node.items) !== null && _node$items !== void 0 && _node$items.length) {
            var _constMap = buildConstMap(function (schema) {
              var itemSchemas = schema.prefixItems || (Array.isArray(schema.items) ? schema.items : undefined);
              return itemSchemas ? itemSchemas.map(function (item, idx) {
                return [idx, asSchema(item)];
              }) : undefined;
            });
            if (_constMap) {
              return findDiscriminator(_constMap, function (itemIndex) {
                var item = node.items[itemIndex];
                return (item === null || item === void 0 ? void 0 : item.type) === 'string' ? item.value : undefined;
              });
            }
          }
          return undefined;
        }
        function _validateNumberNode(node) {
          var val = node.value;
          function normalizeFloats(_float) {
            var _parts$;
            var parts = /^(-?\d+)(?:\.(\d+))?(?:e([-+]\d+))?$/.exec(_float.toString());
            return parts && {
              value: Number(parts[1] + (parts[2] || '')),
              multiplier: (((_parts$ = parts[2]) === null || _parts$ === void 0 ? void 0 : _parts$.length) || 0) - (parseInt(parts[3]) || 0)
            };
          }
          ;
          if ((0, _objects.isNumber)(schema.multipleOf)) {
            var remainder = -1;
            if (Number.isInteger(schema.multipleOf)) {
              remainder = val % schema.multipleOf;
            } else {
              var normMultipleOf = normalizeFloats(schema.multipleOf);
              var normValue = normalizeFloats(val);
              if (normMultipleOf && normValue) {
                var multiplier = Math.pow(10, Math.abs(normValue.multiplier - normMultipleOf.multiplier));
                if (normValue.multiplier < normMultipleOf.multiplier) {
                  normValue.value *= multiplier;
                } else {
                  normMultipleOf.value *= multiplier;
                }
                remainder = normValue.value % normMultipleOf.value;
              }
            }
            if (remainder !== 0) {
              validationResult.problems.push({
                location: {
                  offset: node.offset,
                  length: node.length
                },
                message: l10n.t('Value is not divisible by {0}.', schema.multipleOf)
              });
            }
          }
          function getExclusiveLimit(limit, exclusive) {
            if ((0, _objects.isNumber)(exclusive)) {
              return exclusive;
            }
            if ((0, _objects.isBoolean)(exclusive) && exclusive) {
              return limit;
            }
            return undefined;
          }
          function getLimit(limit, exclusive) {
            if (!(0, _objects.isBoolean)(exclusive) || !exclusive) {
              return limit;
            }
            return undefined;
          }
          var exclusiveMinimum = getExclusiveLimit(schema.minimum, schema.exclusiveMinimum);
          if ((0, _objects.isNumber)(exclusiveMinimum) && val <= exclusiveMinimum) {
            validationResult.problems.push({
              location: {
                offset: node.offset,
                length: node.length
              },
              message: l10n.t('Value is below the exclusive minimum of {0}.', exclusiveMinimum)
            });
          }
          var exclusiveMaximum = getExclusiveLimit(schema.maximum, schema.exclusiveMaximum);
          if ((0, _objects.isNumber)(exclusiveMaximum) && val >= exclusiveMaximum) {
            validationResult.problems.push({
              location: {
                offset: node.offset,
                length: node.length
              },
              message: l10n.t('Value is above the exclusive maximum of {0}.', exclusiveMaximum)
            });
          }
          var minimum = getLimit(schema.minimum, schema.exclusiveMinimum);
          if ((0, _objects.isNumber)(minimum) && val < minimum) {
            validationResult.problems.push({
              location: {
                offset: node.offset,
                length: node.length
              },
              message: l10n.t('Value is below the minimum of {0}.', minimum)
            });
          }
          var maximum = getLimit(schema.maximum, schema.exclusiveMaximum);
          if ((0, _objects.isNumber)(maximum) && val > maximum) {
            validationResult.problems.push({
              location: {
                offset: node.offset,
                length: node.length
              },
              message: l10n.t('Value is above the maximum of {0}.', maximum)
            });
          }
        }
        function _validateStringNode(node) {
          if ((0, _objects.isNumber)(schema.minLength) && (0, _strings.stringLength)(node.value) < schema.minLength) {
            validationResult.problems.push({
              location: {
                offset: node.offset,
                length: node.length
              },
              message: l10n.t('String is shorter than the minimum length of {0}.', schema.minLength)
            });
          }
          if ((0, _objects.isNumber)(schema.maxLength) && (0, _strings.stringLength)(node.value) > schema.maxLength) {
            validationResult.problems.push({
              location: {
                offset: node.offset,
                length: node.length
              },
              message: l10n.t('String is longer than the maximum length of {0}.', schema.maxLength)
            });
          }
          if ((0, _objects.isString)(schema.pattern)) {
            var regex = (0, _strings.extendedRegExp)(schema.pattern);
            if (regex && !regex.test(node.value)) {
              validationResult.problems.push({
                location: {
                  offset: node.offset,
                  length: node.length
                },
                message: schema.patternErrorMessage || schema.errorMessage || l10n.t('String does not match the pattern of "{0}".', schema.pattern)
              });
            }
          }
          if (schema.format) {
            switch (schema.format) {
              case 'uri':
              case 'uri-reference':
                {
                  var errorMessage;
                  if (!node.value) {
                    errorMessage = l10n.t('URI expected.');
                  } else {
                    var match = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/.exec(node.value);
                    if (!match) {
                      errorMessage = l10n.t('URI is expected.');
                    } else if (!match[2] && schema.format === 'uri') {
                      errorMessage = l10n.t('URI with a scheme is expected.');
                    }
                  }
                  if (errorMessage) {
                    validationResult.problems.push({
                      location: {
                        offset: node.offset,
                        length: node.length
                      },
                      message: schema.patternErrorMessage || schema.errorMessage || l10n.t('String is not a URI: {0}', errorMessage)
                    });
                  }
                }
                break;
              case 'color-hex':
              case 'date-time':
              case 'date':
              case 'time':
              case 'email':
              case 'hostname':
              case 'ipv4':
              case 'ipv6':
                var format = formats[schema.format];
                if (!node.value || !format.pattern.exec(node.value)) {
                  validationResult.problems.push({
                    location: {
                      offset: node.offset,
                      length: node.length
                    },
                    message: schema.patternErrorMessage || schema.errorMessage || format.errorMessage
                  });
                }
              default:
            }
          }
        }
        function _validateArrayNode(node) {
          var prefixItemsSchemas;
          var additionalItemSchema;
          if (context.schemaDraft >= _jsonLanguageTypes.SchemaDraft.v2020_12) {
            prefixItemsSchemas = schema.prefixItems;
            additionalItemSchema = !Array.isArray(schema.items) ? schema.items : undefined;
          } else {
            prefixItemsSchemas = Array.isArray(schema.items) ? schema.items : undefined;
            additionalItemSchema = !Array.isArray(schema.items) ? schema.items : schema.additionalItems;
          }
          var index = 0;
          if (prefixItemsSchemas !== undefined) {
            var max = Math.min(prefixItemsSchemas.length, node.items.length);
            for (; index < max; index++) {
              var subSchemaRef = prefixItemsSchemas[index];
              var subSchema = asSchema(subSchemaRef);
              var itemValidationResult = new ValidationResult();
              var item = node.items[index];
              if (item) {
                _validate(item, subSchema, itemValidationResult, matchingSchemas, context);
                validationResult.mergePropertyMatch(itemValidationResult);
              }
              validationResult.processedProperties.add(String(index));
            }
          }
          if (additionalItemSchema !== undefined && index < node.items.length) {
            if (typeof additionalItemSchema === 'boolean') {
              if (additionalItemSchema === false) {
                validationResult.problems.push({
                  location: {
                    offset: node.offset,
                    length: node.length
                  },
                  message: l10n.t('Array has too many items according to schema. Expected {0} or fewer.', index)
                });
              }
              for (; index < node.items.length; index++) {
                validationResult.processedProperties.add(String(index));
                validationResult.propertiesValueMatches++;
              }
            } else {
              for (; index < node.items.length; index++) {
                var _itemValidationResult = new ValidationResult();
                _validate(node.items[index], additionalItemSchema, _itemValidationResult, matchingSchemas, context);
                validationResult.mergePropertyMatch(_itemValidationResult);
                validationResult.processedProperties.add(String(index));
              }
            }
          }
          var containsSchema = asSchema(schema.contains);
          if (containsSchema) {
            var containsCount = 0;
            for (var _index2 = 0; _index2 < node.items.length; _index2++) {
              var _item = node.items[_index2];
              var _itemValidationResult2 = new ValidationResult();
              _validate(_item, containsSchema, _itemValidationResult2, NoOpSchemaCollector.instance, context);
              if (!_itemValidationResult2.hasProblems()) {
                containsCount++;
                if (context.schemaDraft >= _jsonLanguageTypes.SchemaDraft.v2020_12) {
                  validationResult.processedProperties.add(String(_index2));
                }
              }
            }
            if (containsCount === 0 && !(0, _objects.isNumber)(schema.minContains)) {
              validationResult.problems.push({
                location: {
                  offset: node.offset,
                  length: node.length
                },
                message: schema.errorMessage || l10n.t('Array does not contain required item.')
              });
            }
            if ((0, _objects.isNumber)(schema.minContains) && containsCount < schema.minContains) {
              validationResult.problems.push({
                location: {
                  offset: node.offset,
                  length: node.length
                },
                message: schema.errorMessage || l10n.t('Array has too few items that match the contains contraint. Expected {0} or more.', schema.minContains)
              });
            }
            if ((0, _objects.isNumber)(schema.maxContains) && containsCount > schema.maxContains) {
              validationResult.problems.push({
                location: {
                  offset: node.offset,
                  length: node.length
                },
                message: schema.errorMessage || l10n.t('Array has too many items that match the contains contraint. Expected {0} or less.', schema.maxContains)
              });
            }
          }
          var unevaluatedItems = schema.unevaluatedItems;
          if (unevaluatedItems !== undefined) {
            for (var i = 0; i < node.items.length; i++) {
              if (!validationResult.processedProperties.has(String(i))) {
                if (unevaluatedItems === false) {
                  validationResult.problems.push({
                    location: {
                      offset: node.offset,
                      length: node.length
                    },
                    message: l10n.t('Item does not match any validation rule from the array.')
                  });
                } else {
                  var _itemValidationResult3 = new ValidationResult();
                  _validate(node.items[i], schema.unevaluatedItems, _itemValidationResult3, matchingSchemas, context);
                  validationResult.mergePropertyMatch(_itemValidationResult3);
                }
              }
              validationResult.processedProperties.add(String(i));
              validationResult.propertiesValueMatches++;
            }
          }
          if ((0, _objects.isNumber)(schema.minItems) && node.items.length < schema.minItems) {
            validationResult.problems.push({
              location: {
                offset: node.offset,
                length: node.length
              },
              message: l10n.t('Array has too few items. Expected {0} or more.', schema.minItems)
            });
          }
          if ((0, _objects.isNumber)(schema.maxItems) && node.items.length > schema.maxItems) {
            validationResult.problems.push({
              location: {
                offset: node.offset,
                length: node.length
              },
              message: l10n.t('Array has too many items. Expected {0} or fewer.', schema.maxItems)
            });
          }
          if (schema.uniqueItems === true) {
            var hasDuplicates = function hasDuplicates() {
              for (var _i2 = 0; _i2 < values.length - 1; _i2++) {
                var value = values[_i2];
                for (var j = _i2 + 1; j < values.length; j++) {
                  if ((0, _objects.equals)(value, values[j])) {
                    return true;
                  }
                }
              }
              return false;
            };
            var values = getNodeValue(node);
            if (hasDuplicates()) {
              validationResult.problems.push({
                location: {
                  offset: node.offset,
                  length: node.length
                },
                message: l10n.t('Array has duplicate items.')
              });
            }
          }
        }
        function _validateObjectNode(node) {
          var seenKeys = Object.create(null);
          var unprocessedProperties = new Set();
          var _iterator0 = _createForOfIteratorHelper(node.properties),
            _step0;
          try {
            for (_iterator0.s(); !(_step0 = _iterator0.n()).done;) {
              var _propertyNode4 = _step0.value;
              var _key5 = _propertyNode4.keyNode.value;
              seenKeys[_key5] = _propertyNode4.valueNode;
              unprocessedProperties.add(_key5);
            }
          } catch (err) {
            _iterator0.e(err);
          } finally {
            _iterator0.f();
          }
          if (Array.isArray(schema.required)) {
            var _iterator1 = _createForOfIteratorHelper(schema.required),
              _step1;
            try {
              for (_iterator1.s(); !(_step1 = _iterator1.n()).done;) {
                var propertyName = _step1.value;
                if (!seenKeys[propertyName]) {
                  var keyNode = node.parent && node.parent.type === 'property' && node.parent.keyNode;
                  var location = keyNode ? {
                    offset: keyNode.offset,
                    length: keyNode.length
                  } : {
                    offset: node.offset,
                    length: 1
                  };
                  validationResult.problems.push({
                    location: location,
                    message: l10n.t('Missing property "{0}".', propertyName)
                  });
                }
              }
            } catch (err) {
              _iterator1.e(err);
            } finally {
              _iterator1.f();
            }
          }
          var propertyProcessed = function propertyProcessed(prop) {
            unprocessedProperties["delete"](prop);
            validationResult.processedProperties.add(prop);
          };
          if (schema.properties) {
            for (var _i3 = 0, _Object$keys = Object.keys(schema.properties); _i3 < _Object$keys.length; _i3++) {
              var _propertyName = _Object$keys[_i3];
              propertyProcessed(_propertyName);
              var propertySchema = schema.properties[_propertyName];
              var child = seenKeys[_propertyName];
              if (child) {
                if ((0, _objects.isBoolean)(propertySchema)) {
                  if (!propertySchema) {
                    var propertyNode = child.parent;
                    validationResult.problems.push({
                      location: {
                        offset: propertyNode.keyNode.offset,
                        length: propertyNode.keyNode.length
                      },
                      message: schema.errorMessage || l10n.t('Property {0} is not allowed.', _propertyName)
                    });
                  } else {
                    validationResult.propertiesMatches++;
                    validationResult.propertiesValueMatches++;
                  }
                } else {
                  var propertyValidationResult = new ValidationResult();
                  _validate(child, propertySchema, propertyValidationResult, matchingSchemas, context);
                  validationResult.mergePropertyMatch(propertyValidationResult);
                }
              }
            }
          }
          if (schema.patternProperties) {
            for (var _i4 = 0, _Object$keys2 = Object.keys(schema.patternProperties); _i4 < _Object$keys2.length; _i4++) {
              var propertyPattern = _Object$keys2[_i4];
              var regex = (0, _strings.extendedRegExp)(propertyPattern);
              if (regex) {
                var processed = [];
                var _iterator10 = _createForOfIteratorHelper(unprocessedProperties),
                  _step10;
                try {
                  for (_iterator10.s(); !(_step10 = _iterator10.n()).done;) {
                    var _propertyName2 = _step10.value;
                    if (regex.test(_propertyName2)) {
                      processed.push(_propertyName2);
                      var _child = seenKeys[_propertyName2];
                      if (_child) {
                        var _propertySchema = schema.patternProperties[propertyPattern];
                        if ((0, _objects.isBoolean)(_propertySchema)) {
                          if (!_propertySchema) {
                            var _propertyNode = _child.parent;
                            validationResult.problems.push({
                              location: {
                                offset: _propertyNode.keyNode.offset,
                                length: _propertyNode.keyNode.length
                              },
                              message: schema.errorMessage || l10n.t('Property {0} is not allowed.', _propertyName2)
                            });
                          } else {
                            validationResult.propertiesMatches++;
                            validationResult.propertiesValueMatches++;
                          }
                        } else {
                          var _propertyValidationResult = new ValidationResult();
                          _validate(_child, _propertySchema, _propertyValidationResult, matchingSchemas, context);
                          validationResult.mergePropertyMatch(_propertyValidationResult);
                        }
                      }
                    }
                  }
                } catch (err) {
                  _iterator10.e(err);
                } finally {
                  _iterator10.f();
                }
                processed.forEach(propertyProcessed);
              }
            }
          }
          var additionalProperties = schema.additionalProperties;
          if (additionalProperties !== undefined) {
            var _iterator11 = _createForOfIteratorHelper(unprocessedProperties),
              _step11;
            try {
              for (_iterator11.s(); !(_step11 = _iterator11.n()).done;) {
                var _propertyName3 = _step11.value;
                propertyProcessed(_propertyName3);
                var _child2 = seenKeys[_propertyName3];
                if (_child2) {
                  if (additionalProperties === false) {
                    var _propertyNode2 = _child2.parent;
                    validationResult.problems.push({
                      location: {
                        offset: _propertyNode2.keyNode.offset,
                        length: _propertyNode2.keyNode.length
                      },
                      message: schema.errorMessage || l10n.t('Property {0} is not allowed.', _propertyName3)
                    });
                  } else if (additionalProperties !== true) {
                    var _propertyValidationResult2 = new ValidationResult();
                    _validate(_child2, additionalProperties, _propertyValidationResult2, matchingSchemas, context);
                    validationResult.mergePropertyMatch(_propertyValidationResult2);
                  }
                }
              }
            } catch (err) {
              _iterator11.e(err);
            } finally {
              _iterator11.f();
            }
          }
          var unevaluatedProperties = schema.unevaluatedProperties;
          if (unevaluatedProperties !== undefined) {
            var _processed = [];
            var _iterator12 = _createForOfIteratorHelper(unprocessedProperties),
              _step12;
            try {
              for (_iterator12.s(); !(_step12 = _iterator12.n()).done;) {
                var _propertyName4 = _step12.value;
                if (!validationResult.processedProperties.has(_propertyName4)) {
                  _processed.push(_propertyName4);
                  var _child3 = seenKeys[_propertyName4];
                  if (_child3) {
                    if (unevaluatedProperties === false) {
                      var _propertyNode3 = _child3.parent;
                      validationResult.problems.push({
                        location: {
                          offset: _propertyNode3.keyNode.offset,
                          length: _propertyNode3.keyNode.length
                        },
                        message: schema.errorMessage || l10n.t('Property {0} is not allowed.', _propertyName4)
                      });
                    } else if (unevaluatedProperties !== true) {
                      var _propertyValidationResult3 = new ValidationResult();
                      _validate(_child3, unevaluatedProperties, _propertyValidationResult3, matchingSchemas, context);
                      validationResult.mergePropertyMatch(_propertyValidationResult3);
                    }
                  }
                }
              }
            } catch (err) {
              _iterator12.e(err);
            } finally {
              _iterator12.f();
            }
            _processed.forEach(propertyProcessed);
          }
          if ((0, _objects.isNumber)(schema.maxProperties)) {
            if (node.properties.length > schema.maxProperties) {
              validationResult.problems.push({
                location: {
                  offset: node.offset,
                  length: node.length
                },
                message: l10n.t('Object has more properties than limit of {0}.', schema.maxProperties)
              });
            }
          }
          if ((0, _objects.isNumber)(schema.minProperties)) {
            if (node.properties.length < schema.minProperties) {
              validationResult.problems.push({
                location: {
                  offset: node.offset,
                  length: node.length
                },
                message: l10n.t('Object has fewer properties than the required number of {0}', schema.minProperties)
              });
            }
          }
          if (schema.dependentRequired) {
            for (var key in schema.dependentRequired) {
              var prop = seenKeys[key];
              var propertyDeps = schema.dependentRequired[key];
              if (prop && Array.isArray(propertyDeps)) {
                _validatePropertyDependencies(key, propertyDeps);
              }
            }
          }
          if (schema.dependentSchemas) {
            for (var _key2 in schema.dependentSchemas) {
              var _prop = seenKeys[_key2];
              var _propertyDeps = schema.dependentSchemas[_key2];
              if (_prop && (0, _objects.isObject)(_propertyDeps)) {
                _validatePropertyDependencies(_key2, _propertyDeps);
              }
            }
          }
          if (schema.dependencies) {
            for (var _key3 in schema.dependencies) {
              var _prop2 = seenKeys[_key3];
              if (_prop2) {
                _validatePropertyDependencies(_key3, schema.dependencies[_key3]);
              }
            }
          }
          var propertyNames = asSchema(schema.propertyNames);
          if (propertyNames) {
            var _iterator13 = _createForOfIteratorHelper(node.properties),
              _step13;
            try {
              for (_iterator13.s(); !(_step13 = _iterator13.n()).done;) {
                var f = _step13.value;
                var _key4 = f.keyNode;
                if (_key4) {
                  _validate(_key4, propertyNames, validationResult, matchingSchemas, context);
                }
              }
            } catch (err) {
              _iterator13.e(err);
            } finally {
              _iterator13.f();
            }
          }
          function _validatePropertyDependencies(key, propertyDep) {
            if (Array.isArray(propertyDep)) {
              var _iterator14 = _createForOfIteratorHelper(propertyDep),
                _step14;
              try {
                for (_iterator14.s(); !(_step14 = _iterator14.n()).done;) {
                  var requiredProp = _step14.value;
                  if (!seenKeys[requiredProp]) {
                    validationResult.problems.push({
                      location: {
                        offset: node.offset,
                        length: node.length
                      },
                      message: l10n.t('Object is missing property {0} required by property {1}.', requiredProp, key)
                    });
                  } else {
                    validationResult.propertiesValueMatches++;
                  }
                }
              } catch (err) {
                _iterator14.e(err);
              } finally {
                _iterator14.f();
              }
            } else {
              var _propertySchema2 = asSchema(propertyDep);
              if (_propertySchema2) {
                var _propertyValidationResult4 = new ValidationResult();
                _validate(node, _propertySchema2, _propertyValidationResult4, matchingSchemas, context);
                validationResult.mergePropertyMatch(_propertyValidationResult4);
              }
            }
          }
        }
      }
      function parse(textDocument, config) {
        var problems = [];
        var lastProblemOffset = -1;
        var text = textDocument.getText();
        var scanner = Json.createScanner(text, false);
        var commentRanges = config && config.collectComments ? [] : undefined;
        function _scanNext() {
          while (true) {
            var _token = scanner.scan();
            _checkScanError();
            switch (_token) {
              case 12:
              case 13:
                if (Array.isArray(commentRanges)) {
                  commentRanges.push(_jsonLanguageTypes.Range.create(textDocument.positionAt(scanner.getTokenOffset()), textDocument.positionAt(scanner.getTokenOffset() + scanner.getTokenLength())));
                }
                break;
              case 15:
              case 14:
                break;
              default:
                return _token;
            }
          }
        }
        function _accept(token) {
          if (scanner.getToken() === token) {
            _scanNext();
            return true;
          }
          return false;
        }
        function _errorAtRange(message, code, startOffset, endOffset) {
          var severity = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : _jsonLanguageTypes.DiagnosticSeverity.Error;
          if (problems.length === 0 || startOffset !== lastProblemOffset) {
            var range = _jsonLanguageTypes.Range.create(textDocument.positionAt(startOffset), textDocument.positionAt(endOffset));
            problems.push(_jsonLanguageTypes.Diagnostic.create(range, message, severity, code, textDocument.languageId));
            lastProblemOffset = startOffset;
          }
        }
        function _error(message, code) {
          var node = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;
          var skipUntilAfter = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
          var skipUntil = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : [];
          var start = scanner.getTokenOffset();
          var end = scanner.getTokenOffset() + scanner.getTokenLength();
          if (start === end && start > 0) {
            start--;
            while (start > 0 && /\s/.test(text.charAt(start))) {
              start--;
            }
            end = start + 1;
          }
          _errorAtRange(message, code, start, end);
          if (node) {
            _finalize(node, false);
          }
          if (skipUntilAfter.length + skipUntil.length > 0) {
            var _token2 = scanner.getToken();
            while (_token2 !== 17) {
              if (skipUntilAfter.indexOf(_token2) !== -1) {
                _scanNext();
                break;
              } else if (skipUntil.indexOf(_token2) !== -1) {
                break;
              }
              _token2 = _scanNext();
            }
          }
          return node;
        }
        function _checkScanError() {
          switch (scanner.getTokenError()) {
            case 4:
              _error(l10n.t('Invalid unicode sequence in string.'), _jsonLanguageTypes.ErrorCode.InvalidUnicode);
              return true;
            case 5:
              _error(l10n.t('Invalid escape character in string.'), _jsonLanguageTypes.ErrorCode.InvalidEscapeCharacter);
              return true;
            case 3:
              _error(l10n.t('Unexpected end of number.'), _jsonLanguageTypes.ErrorCode.UnexpectedEndOfNumber);
              return true;
            case 1:
              _error(l10n.t('Unexpected end of comment.'), _jsonLanguageTypes.ErrorCode.UnexpectedEndOfComment);
              return true;
            case 2:
              _error(l10n.t('Unexpected end of string.'), _jsonLanguageTypes.ErrorCode.UnexpectedEndOfString);
              return true;
            case 6:
              _error(l10n.t('Invalid characters in string. Control characters must be escaped.'), _jsonLanguageTypes.ErrorCode.InvalidCharacter);
              return true;
          }
          return false;
        }
        function _finalize(node, scanNext) {
          node.length = scanner.getTokenOffset() + scanner.getTokenLength() - node.offset;
          if (scanNext) {
            _scanNext();
          }
          return node;
        }
        function _parseArray(parent) {
          if (scanner.getToken() !== 3) {
            return undefined;
          }
          var node = new ArrayASTNodeImpl(parent, scanner.getTokenOffset());
          _scanNext();
          var count = 0;
          var needsComma = false;
          while (scanner.getToken() !== 4 && scanner.getToken() !== 17) {
            if (scanner.getToken() === 5) {
              if (!needsComma) {
                _error(l10n.t('Value expected'), _jsonLanguageTypes.ErrorCode.ValueExpected);
              }
              var commaOffset = scanner.getTokenOffset();
              _scanNext();
              if (scanner.getToken() === 4) {
                if (needsComma) {
                  _errorAtRange(l10n.t('Trailing comma'), _jsonLanguageTypes.ErrorCode.TrailingComma, commaOffset, commaOffset + 1);
                }
                continue;
              }
            } else if (needsComma) {
              _error(l10n.t('Expected comma'), _jsonLanguageTypes.ErrorCode.CommaExpected);
            }
            var item = _parseValue(node);
            if (!item) {
              _error(l10n.t('Value expected'), _jsonLanguageTypes.ErrorCode.ValueExpected, undefined, [], [4, 5]);
            } else {
              node.items.push(item);
            }
            needsComma = true;
          }
          if (scanner.getToken() !== 4) {
            return _error(l10n.t('Expected comma or closing bracket'), _jsonLanguageTypes.ErrorCode.CommaOrCloseBacketExpected, node);
          }
          return _finalize(node, true);
        }
        var keyPlaceholder = new StringASTNodeImpl(undefined, 0, 0);
        function _parseProperty(parent, keysSeen) {
          var node = new PropertyASTNodeImpl(parent, scanner.getTokenOffset(), keyPlaceholder);
          var key = _parseString(node);
          if (!key) {
            if (scanner.getToken() === 16) {
              _error(l10n.t('Property keys must be doublequoted'), _jsonLanguageTypes.ErrorCode.PropertyKeysMustBeDoublequoted);
              var keyNode = new StringASTNodeImpl(node, scanner.getTokenOffset(), scanner.getTokenLength());
              keyNode.value = scanner.getTokenValue();
              key = keyNode;
              _scanNext();
            } else {
              return undefined;
            }
          }
          node.keyNode = key;
          if (key.value !== "//") {
            var seen = keysSeen[key.value];
            if (seen) {
              _errorAtRange(l10n.t("Duplicate object key"), _jsonLanguageTypes.ErrorCode.DuplicateKey, node.keyNode.offset, node.keyNode.offset + node.keyNode.length, _jsonLanguageTypes.DiagnosticSeverity.Warning);
              if ((0, _objects.isObject)(seen)) {
                _errorAtRange(l10n.t("Duplicate object key"), _jsonLanguageTypes.ErrorCode.DuplicateKey, seen.keyNode.offset, seen.keyNode.offset + seen.keyNode.length, _jsonLanguageTypes.DiagnosticSeverity.Warning);
              }
              keysSeen[key.value] = true;
            } else {
              keysSeen[key.value] = node;
            }
          }
          if (scanner.getToken() === 6) {
            node.colonOffset = scanner.getTokenOffset();
            _scanNext();
          } else {
            _error(l10n.t('Colon expected'), _jsonLanguageTypes.ErrorCode.ColonExpected);
            if (scanner.getToken() === 10 && textDocument.positionAt(key.offset + key.length).line < textDocument.positionAt(scanner.getTokenOffset()).line) {
              node.length = key.length;
              return node;
            }
          }
          var value = _parseValue(node);
          if (!value) {
            return _error(l10n.t('Value expected'), _jsonLanguageTypes.ErrorCode.ValueExpected, node, [], [2, 5]);
          }
          node.valueNode = value;
          node.length = value.offset + value.length - node.offset;
          return node;
        }
        function _parseObject(parent) {
          if (scanner.getToken() !== 1) {
            return undefined;
          }
          var node = new ObjectASTNodeImpl(parent, scanner.getTokenOffset());
          var keysSeen = Object.create(null);
          _scanNext();
          var needsComma = false;
          while (scanner.getToken() !== 2 && scanner.getToken() !== 17) {
            if (scanner.getToken() === 5) {
              if (!needsComma) {
                _error(l10n.t('Property expected'), _jsonLanguageTypes.ErrorCode.PropertyExpected);
              }
              var commaOffset = scanner.getTokenOffset();
              _scanNext();
              if (scanner.getToken() === 2) {
                if (needsComma) {
                  _errorAtRange(l10n.t('Trailing comma'), _jsonLanguageTypes.ErrorCode.TrailingComma, commaOffset, commaOffset + 1);
                }
                continue;
              }
            } else if (needsComma) {
              _error(l10n.t('Expected comma'), _jsonLanguageTypes.ErrorCode.CommaExpected);
            }
            var property = _parseProperty(node, keysSeen);
            if (!property) {
              _error(l10n.t('Property expected'), _jsonLanguageTypes.ErrorCode.PropertyExpected, undefined, [], [2, 5]);
            } else {
              node.properties.push(property);
            }
            needsComma = true;
          }
          if (scanner.getToken() !== 2) {
            return _error(l10n.t('Expected comma or closing brace'), _jsonLanguageTypes.ErrorCode.CommaOrCloseBraceExpected, node);
          }
          return _finalize(node, true);
        }
        function _parseString(parent) {
          if (scanner.getToken() !== 10) {
            return undefined;
          }
          var node = new StringASTNodeImpl(parent, scanner.getTokenOffset());
          node.value = scanner.getTokenValue();
          return _finalize(node, true);
        }
        function _parseNumber(parent) {
          if (scanner.getToken() !== 11) {
            return undefined;
          }
          var node = new NumberASTNodeImpl(parent, scanner.getTokenOffset());
          if (scanner.getTokenError() === 0) {
            var tokenValue = scanner.getTokenValue();
            try {
              var numberValue = JSON.parse(tokenValue);
              if (!(0, _objects.isNumber)(numberValue)) {
                return _error(l10n.t('Invalid number format.'), _jsonLanguageTypes.ErrorCode.Undefined, node);
              }
              node.value = numberValue;
            } catch (e) {
              return _error(l10n.t('Invalid number format.'), _jsonLanguageTypes.ErrorCode.Undefined, node);
            }
            node.isInteger = tokenValue.indexOf('.') === -1;
          }
          return _finalize(node, true);
        }
        function _parseLiteral(parent) {
          var node;
          switch (scanner.getToken()) {
            case 7:
              return _finalize(new NullASTNodeImpl(parent, scanner.getTokenOffset()), true);
            case 8:
              return _finalize(new BooleanASTNodeImpl(parent, true, scanner.getTokenOffset()), true);
            case 9:
              return _finalize(new BooleanASTNodeImpl(parent, false, scanner.getTokenOffset()), true);
            default:
              return undefined;
          }
        }
        function _parseValue(parent) {
          return _parseArray(parent) || _parseObject(parent) || _parseString(parent) || _parseNumber(parent) || _parseLiteral(parent);
        }
        var _root = undefined;
        var token = _scanNext();
        if (token !== 17) {
          _root = _parseValue(_root);
          if (!_root) {
            _error(l10n.t('Expected a JSON object, array or literal.'), _jsonLanguageTypes.ErrorCode.Undefined);
          } else if (scanner.getToken() !== 17) {
            _error(l10n.t('End of file expected.'), _jsonLanguageTypes.ErrorCode.Undefined);
          }
        }
        return new JSONDocument(_root, problems, commentRanges);
      }
    }, {
      "../jsonLanguageTypes": 9,
      "../utils/objects": 26,
      "../utils/strings": 29,
      "@vscode/l10n": 1,
      "jsonc-parser": 7,
      "vscode-uri": 32
    }],
    11: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.schemaContributions = void 0;
      var _draft201909Flat = _interopRequireDefault(require("./schemas/draft-2019-09-flat"));
      var _draft202012Flat = _interopRequireDefault(require("./schemas/draft-2020-12-flat"));
      var l10n = _interopRequireWildcard(require("@vscode/l10n"));
      function _interopRequireWildcard(e, t) {
        if ("function" == typeof WeakMap) var r = new WeakMap(),
          n = new WeakMap();
        return (_interopRequireWildcard = function _interopRequireWildcard(e, t) {
          if (!t && e && e.__esModule) return e;
          var o,
            i,
            f = {
              __proto__: null,
              "default": e
            };
          if (null === e || "object" != _typeof(e) && "function" != typeof e) return f;
          if (o = t ? n : r) {
            if (o.has(e)) return o.get(e);
            o.set(e, f);
          }
          for (var _t3 in e) "default" !== _t3 && {}.hasOwnProperty.call(e, _t3) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t3)) && (i.get || i.set) ? o(f, _t3, i) : f[_t3] = e[_t3]);
          return f;
        })(e, t);
      }
      function _interopRequireDefault(e) {
        return e && e.__esModule ? e : {
          "default": e
        };
      }
      var schemaContributions = exports.schemaContributions = {
        schemaAssociations: [],
        schemas: {
          'https://json-schema.org/draft-04/schema': {
            'definitions': {
              'schemaArray': {
                'type': 'array',
                'minItems': 1,
                'items': {
                  '$ref': '#'
                }
              },
              'positiveInteger': {
                'type': 'integer',
                'minimum': 0
              },
              'positiveIntegerDefault0': {
                'allOf': [{
                  '$ref': '#/definitions/positiveInteger'
                }, {
                  'default': 0
                }]
              },
              'simpleTypes': {
                'type': 'string',
                'enum': ['array', 'boolean', 'integer', 'null', 'number', 'object', 'string']
              },
              'stringArray': {
                'type': 'array',
                'items': {
                  'type': 'string'
                },
                'minItems': 1,
                'uniqueItems': true
              }
            },
            'type': 'object',
            'properties': {
              'id': {
                'type': 'string',
                'format': 'uri'
              },
              '$schema': {
                'type': 'string',
                'format': 'uri'
              },
              'title': {
                'type': 'string'
              },
              'description': {
                'type': 'string'
              },
              'default': {},
              'multipleOf': {
                'type': 'number',
                'minimum': 0,
                'exclusiveMinimum': true
              },
              'maximum': {
                'type': 'number'
              },
              'exclusiveMaximum': {
                'type': 'boolean',
                'default': false
              },
              'minimum': {
                'type': 'number'
              },
              'exclusiveMinimum': {
                'type': 'boolean',
                'default': false
              },
              'maxLength': {
                'allOf': [{
                  '$ref': '#/definitions/positiveInteger'
                }]
              },
              'minLength': {
                'allOf': [{
                  '$ref': '#/definitions/positiveIntegerDefault0'
                }]
              },
              'pattern': {
                'type': 'string',
                'format': 'regex'
              },
              'additionalItems': {
                'anyOf': [{
                  'type': 'boolean'
                }, {
                  '$ref': '#'
                }],
                'default': {}
              },
              'items': {
                'anyOf': [{
                  '$ref': '#'
                }, {
                  '$ref': '#/definitions/schemaArray'
                }],
                'default': {}
              },
              'maxItems': {
                'allOf': [{
                  '$ref': '#/definitions/positiveInteger'
                }]
              },
              'minItems': {
                'allOf': [{
                  '$ref': '#/definitions/positiveIntegerDefault0'
                }]
              },
              'uniqueItems': {
                'type': 'boolean',
                'default': false
              },
              'maxProperties': {
                'allOf': [{
                  '$ref': '#/definitions/positiveInteger'
                }]
              },
              'minProperties': {
                'allOf': [{
                  '$ref': '#/definitions/positiveIntegerDefault0'
                }]
              },
              'required': {
                'allOf': [{
                  '$ref': '#/definitions/stringArray'
                }]
              },
              'additionalProperties': {
                'anyOf': [{
                  'type': 'boolean'
                }, {
                  '$ref': '#'
                }],
                'default': {}
              },
              'definitions': {
                'type': 'object',
                'additionalProperties': {
                  '$ref': '#'
                },
                'default': {}
              },
              'properties': {
                'type': 'object',
                'additionalProperties': {
                  '$ref': '#'
                },
                'default': {}
              },
              'patternProperties': {
                'type': 'object',
                'additionalProperties': {
                  '$ref': '#'
                },
                'default': {}
              },
              'dependencies': {
                'type': 'object',
                'additionalProperties': {
                  'anyOf': [{
                    '$ref': '#'
                  }, {
                    '$ref': '#/definitions/stringArray'
                  }]
                }
              },
              'enum': {
                'type': 'array',
                'minItems': 1,
                'uniqueItems': true
              },
              'type': {
                'anyOf': [{
                  '$ref': '#/definitions/simpleTypes'
                }, {
                  'type': 'array',
                  'items': {
                    '$ref': '#/definitions/simpleTypes'
                  },
                  'minItems': 1,
                  'uniqueItems': true
                }]
              },
              'format': {
                'anyOf': [{
                  'type': 'string',
                  'enum': ['date-time', 'uri', 'email', 'hostname', 'ipv4', 'ipv6', 'regex']
                }, {
                  'type': 'string'
                }]
              },
              'allOf': {
                'allOf': [{
                  '$ref': '#/definitions/schemaArray'
                }]
              },
              'anyOf': {
                'allOf': [{
                  '$ref': '#/definitions/schemaArray'
                }]
              },
              'oneOf': {
                'allOf': [{
                  '$ref': '#/definitions/schemaArray'
                }]
              },
              'not': {
                'allOf': [{
                  '$ref': '#'
                }]
              }
            },
            'dependencies': {
              'exclusiveMaximum': ['maximum'],
              'exclusiveMinimum': ['minimum']
            },
            'default': {}
          },
          'https://json-schema.org/draft-07/schema': {
            'definitions': {
              'schemaArray': {
                'type': 'array',
                'minItems': 1,
                'items': {
                  '$ref': '#'
                }
              },
              'nonNegativeInteger': {
                'type': 'integer',
                'minimum': 0
              },
              'nonNegativeIntegerDefault0': {
                'allOf': [{
                  '$ref': '#/definitions/nonNegativeInteger'
                }, {
                  'default': 0
                }]
              },
              'simpleTypes': {
                'enum': ['array', 'boolean', 'integer', 'null', 'number', 'object', 'string']
              },
              'stringArray': {
                'type': 'array',
                'items': {
                  'type': 'string'
                },
                'uniqueItems': true,
                'default': []
              }
            },
            'type': ['object', 'boolean'],
            'properties': {
              '$id': {
                'type': 'string',
                'format': 'uri-reference'
              },
              '$schema': {
                'type': 'string',
                'format': 'uri'
              },
              '$ref': {
                'type': 'string',
                'format': 'uri-reference'
              },
              '$comment': {
                'type': 'string'
              },
              'title': {
                'type': 'string'
              },
              'description': {
                'type': 'string'
              },
              'default': true,
              'readOnly': {
                'type': 'boolean',
                'default': false
              },
              'examples': {
                'type': 'array',
                'items': true
              },
              'multipleOf': {
                'type': 'number',
                'exclusiveMinimum': 0
              },
              'maximum': {
                'type': 'number'
              },
              'exclusiveMaximum': {
                'type': 'number'
              },
              'minimum': {
                'type': 'number'
              },
              'exclusiveMinimum': {
                'type': 'number'
              },
              'maxLength': {
                '$ref': '#/definitions/nonNegativeInteger'
              },
              'minLength': {
                '$ref': '#/definitions/nonNegativeIntegerDefault0'
              },
              'pattern': {
                'type': 'string',
                'format': 'regex'
              },
              'additionalItems': {
                '$ref': '#'
              },
              'items': {
                'anyOf': [{
                  '$ref': '#'
                }, {
                  '$ref': '#/definitions/schemaArray'
                }],
                'default': true
              },
              'maxItems': {
                '$ref': '#/definitions/nonNegativeInteger'
              },
              'minItems': {
                '$ref': '#/definitions/nonNegativeIntegerDefault0'
              },
              'uniqueItems': {
                'type': 'boolean',
                'default': false
              },
              'contains': {
                '$ref': '#'
              },
              'maxProperties': {
                '$ref': '#/definitions/nonNegativeInteger'
              },
              'minProperties': {
                '$ref': '#/definitions/nonNegativeIntegerDefault0'
              },
              'required': {
                '$ref': '#/definitions/stringArray'
              },
              'additionalProperties': {
                '$ref': '#'
              },
              'definitions': {
                'type': 'object',
                'additionalProperties': {
                  '$ref': '#'
                },
                'default': {}
              },
              'properties': {
                'type': 'object',
                'additionalProperties': {
                  '$ref': '#'
                },
                'default': {}
              },
              'patternProperties': {
                'type': 'object',
                'additionalProperties': {
                  '$ref': '#'
                },
                'propertyNames': {
                  'format': 'regex'
                },
                'default': {}
              },
              'dependencies': {
                'type': 'object',
                'additionalProperties': {
                  'anyOf': [{
                    '$ref': '#'
                  }, {
                    '$ref': '#/definitions/stringArray'
                  }]
                }
              },
              'propertyNames': {
                '$ref': '#'
              },
              'const': true,
              'enum': {
                'type': 'array',
                'items': true,
                'minItems': 1,
                'uniqueItems': true
              },
              'type': {
                'anyOf': [{
                  '$ref': '#/definitions/simpleTypes'
                }, {
                  'type': 'array',
                  'items': {
                    '$ref': '#/definitions/simpleTypes'
                  },
                  'minItems': 1,
                  'uniqueItems': true
                }]
              },
              'format': {
                'type': 'string'
              },
              'contentMediaType': {
                'type': 'string'
              },
              'contentEncoding': {
                'type': 'string'
              },
              'if': {
                '$ref': '#'
              },
              'then': {
                '$ref': '#'
              },
              'else': {
                '$ref': '#'
              },
              'allOf': {
                '$ref': '#/definitions/schemaArray'
              },
              'anyOf': {
                '$ref': '#/definitions/schemaArray'
              },
              'oneOf': {
                '$ref': '#/definitions/schemaArray'
              },
              'not': {
                '$ref': '#'
              }
            },
            'default': true
          },
          'https://json-schema.org/draft/2020-12/schema': _draft202012Flat["default"],
          'https://json-schema.org/draft/2019-09/schema': _draft201909Flat["default"]
        }
      };
      var descriptions = {
        id: l10n.t("A unique identifier for the schema."),
        $schema: l10n.t("The schema to verify this document against."),
        title: l10n.t("A descriptive title of the schema."),
        description: l10n.t("A long description of the schema. Used in hover menus and suggestions."),
        "default": l10n.t("A default value. Used by suggestions."),
        multipleOf: l10n.t("A number that should cleanly divide the current value (i.e. have no remainder)."),
        maximum: l10n.t("The maximum numerical value, inclusive by default."),
        exclusiveMaximum: l10n.t("Makes the maximum property exclusive."),
        minimum: l10n.t("The minimum numerical value, inclusive by default."),
        exclusiveMinimum: l10n.t("Makes the minimum property exclusive."),
        maxLength: l10n.t("The maximum length of a string."),
        minLength: l10n.t("The minimum length of a string."),
        pattern: l10n.t("A regular expression to match the string against. It is not implicitly anchored."),
        additionalItems: l10n.t("For arrays, only when items is set as an array. If items are a schema, this schema validates items after the ones specified by the items schema. If false, additional items will cause validation to fail."),
        items: l10n.t("For arrays. Can either be a schema to validate every element against or an array of schemas to validate each item against in order (the first schema will validate the first element, the second schema will validate the second element, and so on."),
        maxItems: l10n.t("The maximum number of items that can be inside an array. Inclusive."),
        minItems: l10n.t("The minimum number of items that can be inside an array. Inclusive."),
        uniqueItems: l10n.t("If all of the items in the array must be unique. Defaults to false."),
        maxProperties: l10n.t("The maximum number of properties an object can have. Inclusive."),
        minProperties: l10n.t("The minimum number of properties an object can have. Inclusive."),
        required: l10n.t("An array of strings that lists the names of all properties required on this object."),
        additionalProperties: l10n.t("Either a schema or a boolean. If a schema, used to validate all properties not matched by 'properties', 'propertyNames', or 'patternProperties'. If false, any properties not defined by the adjacent keywords will cause this schema to fail."),
        definitions: l10n.t("Not used for validation. Place subschemas here that you wish to reference inline with $ref."),
        properties: l10n.t("A map of property names to schemas for each property."),
        patternProperties: l10n.t("A map of regular expressions on property names to schemas for matching properties."),
        dependencies: l10n.t("A map of property names to either an array of property names or a schema. An array of property names means the property named in the key depends on the properties in the array being present in the object in order to be valid. If the value is a schema, then the schema is only applied to the object if the property in the key exists on the object."),
        "enum": l10n.t("The set of literal values that are valid."),
        type: l10n.t("Either a string of one of the basic schema types (number, integer, null, array, object, boolean, string) or an array of strings specifying a subset of those types."),
        format: l10n.t("Describes the format expected for the value. By default, not used for validation"),
        allOf: l10n.t("An array of schemas, all of which must match."),
        anyOf: l10n.t("An array of schemas, where at least one must match."),
        oneOf: l10n.t("An array of schemas, exactly one of which must match."),
        not: l10n.t("A schema which must not match."),
        $id: l10n.t("A unique identifier for the schema."),
        $ref: l10n.t("Reference a definition hosted on any location."),
        $comment: l10n.t("Comments from schema authors to readers or maintainers of the schema."),
        readOnly: l10n.t("Indicates that the value of the instance is managed exclusively by the owning authority."),
        examples: l10n.t("Sample JSON values associated with a particular schema, for the purpose of illustrating usage."),
        contains: l10n.t("An array instance is valid against \"contains\" if at least one of its elements is valid against the given schema."),
        propertyNames: l10n.t("If the instance is an object, this keyword validates if every property name in the instance validates against the provided schema."),
        "const": l10n.t("An instance validates successfully against this keyword if its value is equal to the value of the keyword."),
        contentMediaType: l10n.t("Describes the media type of a string property."),
        contentEncoding: l10n.t("Describes the content encoding of a string property."),
        "if": l10n.t("The validation outcome of the \"if\" subschema controls which of the \"then\" or \"else\" keywords are evaluated."),
        then: l10n.t("The \"then\" subschema is used for validation when the \"if\" subschema succeeds."),
        "else": l10n.t("The \"else\" subschema is used for validation when the \"if\" subschema fails.")
      };
      for (var schemaName in schemaContributions.schemas) {
        var schema = schemaContributions.schemas[schemaName];
        for (var property in schema.properties) {
          var propertyObject = schema.properties[property];
          if (typeof propertyObject === 'boolean') {
            propertyObject = schema.properties[property] = {};
          }
          var description = descriptions[property];
          if (description) {
            propertyObject['description'] = description;
          }
        }
      }
    }, {
      "./schemas/draft-2019-09-flat": 20,
      "./schemas/draft-2020-12-flat": 21,
      "@vscode/l10n": 1
    }],
    12: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.JSONCompletion = void 0;
      var Parser = _interopRequireWildcard(require("../parser/jsonParser"));
      var Json = _interopRequireWildcard(require("jsonc-parser"));
      var _json = require("../utils/json");
      var _strings = require("../utils/strings");
      var _objects = require("../utils/objects");
      var _jsonLanguageTypes = require("../jsonLanguageTypes");
      var l10n = _interopRequireWildcard(require("@vscode/l10n"));
      function _interopRequireWildcard(e, t) {
        if ("function" == typeof WeakMap) var r = new WeakMap(),
          n = new WeakMap();
        return (_interopRequireWildcard = function _interopRequireWildcard(e, t) {
          if (!t && e && e.__esModule) return e;
          var o,
            i,
            f = {
              __proto__: null,
              "default": e
            };
          if (null === e || "object" != _typeof(e) && "function" != typeof e) return f;
          if (o = t ? n : r) {
            if (o.has(e)) return o.get(e);
            o.set(e, f);
          }
          for (var _t4 in e) "default" !== _t4 && {}.hasOwnProperty.call(e, _t4) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t4)) && (i.get || i.set) ? o(f, _t4, i) : f[_t4] = e[_t4]);
          return f;
        })(e, t);
      }
      var valueCommitCharacters = [',', '}', ']'];
      var propertyCommitCharacters = [':'];
      var JSONCompletion = function () {
        function JSONCompletion(schemaService) {
          var contributions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
          var promiseConstructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Promise;
          var clientCapabilities = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
          _classCallCheck(this, JSONCompletion);
          this.schemaService = schemaService;
          this.contributions = contributions;
          this.promiseConstructor = promiseConstructor;
          this.clientCapabilities = clientCapabilities;
        }
        return _createClass(JSONCompletion, [{
          key: "doResolve",
          value: function doResolve(item) {
            for (var i = this.contributions.length - 1; i >= 0; i--) {
              var resolveCompletion = this.contributions[i].resolveCompletion;
              if (resolveCompletion) {
                var resolver = resolveCompletion(item);
                if (resolver) {
                  return resolver;
                }
              }
            }
            return this.promiseConstructor.resolve(item);
          }
        }, {
          key: "doComplete",
          value: function doComplete(document, position, doc) {
            var _this0 = this;
            var result = {
              items: [],
              isIncomplete: false
            };
            var text = document.getText();
            var offset = document.offsetAt(position);
            var node = doc.getNodeFromOffset(offset, true);
            if (this.isInComment(document, node ? node.offset : 0, offset)) {
              return Promise.resolve(result);
            }
            if (node && offset === node.offset + node.length && offset > 0) {
              var ch = text[offset - 1];
              if (node.type === 'object' && ch === '}' || node.type === 'array' && ch === ']') {
                node = node.parent;
              }
            }
            var currentWord = this.getCurrentWord(document, offset);
            var overwriteRange;
            if (node && (node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'null')) {
              overwriteRange = _jsonLanguageTypes.Range.create(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
            } else {
              var overwriteStart = offset - currentWord.length;
              if (overwriteStart > 0 && text[overwriteStart - 1] === '"') {
                overwriteStart--;
              }
              overwriteRange = _jsonLanguageTypes.Range.create(document.positionAt(overwriteStart), position);
            }
            var supportsCommitCharacters = false;
            var proposed = new Map();
            var collector = {
              add: function add(suggestion) {
                var label = suggestion.label;
                var existing = proposed.get(label);
                if (!existing) {
                  label = label.replace(/[\n]/g, '↵');
                  if (label.length > 60) {
                    var shortendedLabel = label.substr(0, 57).trim() + '...';
                    if (!proposed.has(shortendedLabel)) {
                      label = shortendedLabel;
                    }
                  }
                  suggestion.textEdit = _jsonLanguageTypes.TextEdit.replace(overwriteRange, suggestion.insertText);
                  if (supportsCommitCharacters) {
                    suggestion.commitCharacters = suggestion.kind === _jsonLanguageTypes.CompletionItemKind.Property ? propertyCommitCharacters : valueCommitCharacters;
                  }
                  suggestion.label = label;
                  proposed.set(label, suggestion);
                  result.items.push(suggestion);
                } else {
                  if (!existing.documentation) {
                    existing.documentation = suggestion.documentation;
                  }
                  if (!existing.detail) {
                    existing.detail = suggestion.detail;
                  }
                  if (!existing.labelDetails) {
                    existing.labelDetails = suggestion.labelDetails;
                  }
                }
              },
              setAsIncomplete: function setAsIncomplete() {
                result.isIncomplete = true;
              },
              error: function error(message) {
                console.error(message);
              },
              getNumberOfProposals: function getNumberOfProposals() {
                return result.items.length;
              }
            };
            return this.schemaService.getSchemaForResource(document.uri, doc).then(function (schema) {
              var collectionPromises = [];
              var addValue = true;
              var currentKey = '';
              var currentProperty = undefined;
              if (node) {
                if (node.type === 'string') {
                  var parent = node.parent;
                  if (parent && parent.type === 'property' && parent.keyNode === node) {
                    addValue = !parent.valueNode;
                    currentProperty = parent;
                    currentKey = text.substr(node.offset + 1, node.length - 2);
                    if (parent) {
                      node = parent.parent;
                    }
                  }
                }
              }
              if (node && node.type === 'object') {
                if (node.offset === offset) {
                  return result;
                }
                var properties = node.properties;
                properties.forEach(function (p) {
                  if (!currentProperty || currentProperty !== p) {
                    proposed.set(p.keyNode.value, _jsonLanguageTypes.CompletionItem.create('__'));
                  }
                });
                var separatorAfter = '';
                if (addValue) {
                  separatorAfter = _this0.evaluateSeparatorAfter(document, document.offsetAt(overwriteRange.end));
                }
                if (schema) {
                  _this0.getPropertyCompletions(schema, doc, node, addValue, separatorAfter, collector);
                } else {
                  _this0.getSchemaLessPropertyCompletions(doc, node, currentKey, collector);
                }
                var location = Parser.getNodePath(node);
                _this0.contributions.forEach(function (contribution) {
                  var collectPromise = contribution.collectPropertyCompletions(document.uri, location, currentWord, addValue, separatorAfter === '', collector);
                  if (collectPromise) {
                    collectionPromises.push(collectPromise);
                  }
                });
                if (!schema && currentWord.length > 0 && text.charAt(offset - currentWord.length - 1) !== '"') {
                  collector.add({
                    kind: _jsonLanguageTypes.CompletionItemKind.Property,
                    label: _this0.getLabelForValue(currentWord),
                    insertText: _this0.getInsertTextForProperty(currentWord, undefined, false, separatorAfter),
                    insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
                    documentation: ''
                  });
                  collector.setAsIncomplete();
                }
              }
              var types = {};
              if (schema) {
                _this0.getValueCompletions(schema, doc, node, offset, document, collector, types);
              } else {
                _this0.getSchemaLessValueCompletions(doc, node, offset, document, collector);
              }
              if (_this0.contributions.length > 0) {
                _this0.getContributedValueCompletions(doc, node, offset, document, collector, collectionPromises);
              }
              return _this0.promiseConstructor.all(collectionPromises).then(function () {
                if (collector.getNumberOfProposals() === 0) {
                  var offsetForSeparator = offset;
                  if (node && (node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'null')) {
                    offsetForSeparator = node.offset + node.length;
                  }
                  var _separatorAfter = _this0.evaluateSeparatorAfter(document, offsetForSeparator);
                  _this0.addFillerValueCompletions(types, _separatorAfter, collector);
                }
                return result;
              });
            });
          }
        }, {
          key: "getPropertyCompletions",
          value: function getPropertyCompletions(schema, doc, node, addValue, separatorAfter, collector) {
            var _this1 = this;
            var matchingSchemas = doc.getMatchingSchemas(schema.schema, node.offset);
            matchingSchemas.forEach(function (s) {
              if (s.node === node && !s.inverted) {
                var schemaProperties = s.schema.properties;
                if (schemaProperties) {
                  Object.keys(schemaProperties).forEach(function (key) {
                    var propertySchema = schemaProperties[key];
                    if (_typeof(propertySchema) === 'object' && !propertySchema.deprecationMessage && !propertySchema.doNotSuggest) {
                      var proposal = {
                        kind: _jsonLanguageTypes.CompletionItemKind.Property,
                        label: key,
                        insertText: _this1.getInsertTextForProperty(key, propertySchema, addValue, separatorAfter),
                        insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
                        filterText: _this1.getFilterTextForValue(key),
                        documentation: _this1.fromMarkup(propertySchema.markdownDescription) || propertySchema.description || ''
                      };
                      if (propertySchema.completionDetail !== undefined) {
                        proposal.detail = propertySchema.completionDetail;
                      }
                      if (propertySchema.suggestSortText !== undefined) {
                        proposal.sortText = propertySchema.suggestSortText;
                      }
                      if (proposal.insertText && (0, _strings.endsWith)(proposal.insertText, "$1".concat(separatorAfter))) {
                        proposal.command = {
                          title: 'Suggest',
                          command: 'editor.action.triggerSuggest'
                        };
                      }
                      collector.add(proposal);
                    }
                  });
                }
                var schemaPropertyNames = s.schema.propertyNames;
                if (_typeof(schemaPropertyNames) === 'object' && !schemaPropertyNames.deprecationMessage && !schemaPropertyNames.doNotSuggest) {
                  var propertyNameCompletionItem = function propertyNameCompletionItem(name, documentation, detail, sortText) {
                    var proposal = {
                      kind: _jsonLanguageTypes.CompletionItemKind.Property,
                      label: name,
                      insertText: _this1.getInsertTextForProperty(name, undefined, addValue, separatorAfter),
                      insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
                      filterText: _this1.getFilterTextForValue(name),
                      documentation: documentation || _this1.fromMarkup(schemaPropertyNames.markdownDescription) || schemaPropertyNames.description || '',
                      sortText: sortText,
                      detail: detail
                    };
                    if (proposal.insertText && (0, _strings.endsWith)(proposal.insertText, "$1".concat(separatorAfter))) {
                      proposal.command = {
                        title: 'Suggest',
                        command: 'editor.action.triggerSuggest'
                      };
                    }
                    collector.add(proposal);
                  };
                  if (schemaPropertyNames["enum"]) {
                    for (var i = 0; i < schemaPropertyNames["enum"].length; i++) {
                      var _schemaPropertyNames$, _schemaPropertyNames$2;
                      var enumDescription = undefined;
                      if (schemaPropertyNames.markdownEnumDescriptions && i < schemaPropertyNames.markdownEnumDescriptions.length) {
                        enumDescription = _this1.fromMarkup(schemaPropertyNames.markdownEnumDescriptions[i]);
                      } else if (schemaPropertyNames.enumDescriptions && i < schemaPropertyNames.enumDescriptions.length) {
                        enumDescription = schemaPropertyNames.enumDescriptions[i];
                      }
                      var enumSortText = (_schemaPropertyNames$ = schemaPropertyNames.enumSortTexts) === null || _schemaPropertyNames$ === void 0 ? void 0 : _schemaPropertyNames$[i];
                      var enumDetails = (_schemaPropertyNames$2 = schemaPropertyNames.enumDetails) === null || _schemaPropertyNames$2 === void 0 ? void 0 : _schemaPropertyNames$2[i];
                      propertyNameCompletionItem(schemaPropertyNames["enum"][i], enumDescription, enumDetails, enumSortText);
                    }
                  }
                  if (schemaPropertyNames.examples) {
                    for (var _i5 = 0; _i5 < schemaPropertyNames.examples.length; _i5++) {
                      propertyNameCompletionItem(schemaPropertyNames.examples[_i5], undefined, undefined, undefined);
                    }
                  }
                  if (schemaPropertyNames["const"]) {
                    propertyNameCompletionItem(schemaPropertyNames["const"], undefined, schemaPropertyNames.completionDetail, schemaPropertyNames.suggestSortText);
                  }
                }
              }
            });
          }
        }, {
          key: "getSchemaLessPropertyCompletions",
          value: function getSchemaLessPropertyCompletions(doc, node, currentKey, collector) {
            var _this10 = this;
            var collectCompletionsForSimilarObject = function collectCompletionsForSimilarObject(obj) {
              obj.properties.forEach(function (p) {
                var key = p.keyNode.value;
                collector.add({
                  kind: _jsonLanguageTypes.CompletionItemKind.Property,
                  label: key,
                  insertText: _this10.getInsertTextForValue(key, ''),
                  insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
                  filterText: _this10.getFilterTextForValue(key),
                  documentation: ''
                });
              });
            };
            if (node.parent) {
              if (node.parent.type === 'property') {
                var parentKey = node.parent.keyNode.value;
                doc.visit(function (n) {
                  if (n.type === 'property' && n !== node.parent && n.keyNode.value === parentKey && n.valueNode && n.valueNode.type === 'object') {
                    collectCompletionsForSimilarObject(n.valueNode);
                  }
                  return true;
                });
              } else if (node.parent.type === 'array') {
                node.parent.items.forEach(function (n) {
                  if (n.type === 'object' && n !== node) {
                    collectCompletionsForSimilarObject(n);
                  }
                });
              }
            } else if (node.type === 'object') {
              collector.add({
                kind: _jsonLanguageTypes.CompletionItemKind.Property,
                label: '$schema',
                insertText: this.getInsertTextForProperty('$schema', undefined, true, ''),
                insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
                documentation: '',
                filterText: this.getFilterTextForValue("$schema")
              });
            }
          }
        }, {
          key: "getSchemaLessValueCompletions",
          value: function getSchemaLessValueCompletions(doc, node, offset, document, collector) {
            var _this11 = this;
            var offsetForSeparator = offset;
            if (node && (node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'null')) {
              offsetForSeparator = node.offset + node.length;
              node = node.parent;
            }
            if (!node) {
              collector.add({
                kind: this.getSuggestionKind('object'),
                label: 'Empty object',
                insertText: this.getInsertTextForValue({}, ''),
                insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
                documentation: ''
              });
              collector.add({
                kind: this.getSuggestionKind('array'),
                label: 'Empty array',
                insertText: this.getInsertTextForValue([], ''),
                insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
                documentation: ''
              });
              return;
            }
            var separatorAfter = this.evaluateSeparatorAfter(document, offsetForSeparator);
            var collectSuggestionsForValues = function collectSuggestionsForValues(value) {
              if (value.parent && !Parser.contains(value.parent, offset, true)) {
                collector.add({
                  kind: _this11.getSuggestionKind(value.type),
                  label: _this11.getLabelTextForMatchingNode(value, document),
                  insertText: _this11.getInsertTextForMatchingNode(value, document, separatorAfter),
                  insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
                  documentation: ''
                });
              }
              if (value.type === 'boolean') {
                _this11.addBooleanValueCompletion(!value.value, separatorAfter, collector);
              }
            };
            if (node.type === 'property') {
              if (offset > (node.colonOffset || 0)) {
                var valueNode = node.valueNode;
                if (valueNode && (offset > valueNode.offset + valueNode.length || valueNode.type === 'object' || valueNode.type === 'array')) {
                  return;
                }
                var parentKey = node.keyNode.value;
                doc.visit(function (n) {
                  if (n.type === 'property' && n.keyNode.value === parentKey && n.valueNode) {
                    collectSuggestionsForValues(n.valueNode);
                  }
                  return true;
                });
                if (parentKey === '$schema' && node.parent && !node.parent.parent) {
                  this.addDollarSchemaCompletions(separatorAfter, collector);
                }
              }
            }
            if (node.type === 'array') {
              if (node.parent && node.parent.type === 'property') {
                var _parentKey = node.parent.keyNode.value;
                doc.visit(function (n) {
                  if (n.type === 'property' && n.keyNode.value === _parentKey && n.valueNode && n.valueNode.type === 'array') {
                    n.valueNode.items.forEach(collectSuggestionsForValues);
                  }
                  return true;
                });
              } else {
                node.items.forEach(collectSuggestionsForValues);
              }
            }
          }
        }, {
          key: "getValueCompletions",
          value: function getValueCompletions(schema, doc, node, offset, document, collector, types) {
            var _this12 = this;
            var offsetForSeparator = offset;
            var parentKey = undefined;
            var valueNode = undefined;
            if (node && (node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'null')) {
              offsetForSeparator = node.offset + node.length;
              valueNode = node;
              node = node.parent;
            }
            if (!node) {
              this.addSchemaValueCompletions(schema.schema, '', collector, types);
              return;
            }
            if (node.type === 'property' && offset > (node.colonOffset || 0)) {
              var _valueNode = node.valueNode;
              if (_valueNode && offset > _valueNode.offset + _valueNode.length) {
                return;
              }
              parentKey = node.keyNode.value;
              node = node.parent;
            }
            if (node && (parentKey !== undefined || node.type === 'array')) {
              var separatorAfter = this.evaluateSeparatorAfter(document, offsetForSeparator);
              var matchingSchemas = doc.getMatchingSchemas(schema.schema, node.offset, valueNode);
              var _iterator15 = _createForOfIteratorHelper(matchingSchemas),
                _step15;
              try {
                var _loop3 = function _loop3() {
                  var s = _step15.value;
                  if (s.node === node && !s.inverted && s.schema) {
                    if (node.type === 'array' && s.schema.items) {
                      var c = collector;
                      if (s.schema.uniqueItems) {
                        var existingValues = new Set();
                        node.children.forEach(function (n) {
                          if (n.type !== 'array' && n.type !== 'object') {
                            existingValues.add(_this12.getLabelForValue(Parser.getNodeValue(n)));
                          }
                        });
                        c = _objectSpread(_objectSpread({}, collector), {}, {
                          add: function add(suggestion) {
                            if (!existingValues.has(suggestion.label)) {
                              collector.add(suggestion);
                            }
                          }
                        });
                      }
                      if (Array.isArray(s.schema.items)) {
                        var index = _this12.findItemAtOffset(node, document, offset);
                        if (index < s.schema.items.length) {
                          _this12.addSchemaValueCompletions(s.schema.items[index], separatorAfter, c, types);
                        }
                      } else {
                        _this12.addSchemaValueCompletions(s.schema.items, separatorAfter, c, types);
                      }
                    }
                    if (parentKey !== undefined) {
                      var propertyMatched = false;
                      if (s.schema.properties) {
                        var propertySchema = s.schema.properties[parentKey];
                        if (propertySchema) {
                          propertyMatched = true;
                          _this12.addSchemaValueCompletions(propertySchema, separatorAfter, collector, types);
                        }
                      }
                      if (s.schema.patternProperties && !propertyMatched) {
                        for (var _i6 = 0, _Object$keys3 = Object.keys(s.schema.patternProperties); _i6 < _Object$keys3.length; _i6++) {
                          var pattern = _Object$keys3[_i6];
                          var regex = (0, _strings.extendedRegExp)(pattern);
                          if (regex !== null && regex !== void 0 && regex.test(parentKey)) {
                            propertyMatched = true;
                            var _propertySchema3 = s.schema.patternProperties[pattern];
                            _this12.addSchemaValueCompletions(_propertySchema3, separatorAfter, collector, types);
                          }
                        }
                      }
                      if (s.schema.additionalProperties && !propertyMatched) {
                        var _propertySchema4 = s.schema.additionalProperties;
                        _this12.addSchemaValueCompletions(_propertySchema4, separatorAfter, collector, types);
                      }
                    }
                  }
                };
                for (_iterator15.s(); !(_step15 = _iterator15.n()).done;) {
                  _loop3();
                }
              } catch (err) {
                _iterator15.e(err);
              } finally {
                _iterator15.f();
              }
              if (parentKey === '$schema' && !node.parent) {
                this.addDollarSchemaCompletions(separatorAfter, collector);
              }
              if (types['boolean']) {
                this.addBooleanValueCompletion(true, separatorAfter, collector);
                this.addBooleanValueCompletion(false, separatorAfter, collector);
              }
              if (types['null']) {
                this.addNullValueCompletion(separatorAfter, collector);
              }
            }
          }
        }, {
          key: "getContributedValueCompletions",
          value: function getContributedValueCompletions(doc, node, offset, document, collector, collectionPromises) {
            if (!node) {
              this.contributions.forEach(function (contribution) {
                var collectPromise = contribution.collectDefaultCompletions(document.uri, collector);
                if (collectPromise) {
                  collectionPromises.push(collectPromise);
                }
              });
            } else {
              if (node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'null') {
                node = node.parent;
              }
              if (node && node.type === 'property' && offset > (node.colonOffset || 0)) {
                var parentKey = node.keyNode.value;
                var valueNode = node.valueNode;
                if ((!valueNode || offset <= valueNode.offset + valueNode.length) && node.parent) {
                  var location = Parser.getNodePath(node.parent);
                  this.contributions.forEach(function (contribution) {
                    var collectPromise = contribution.collectValueCompletions(document.uri, location, parentKey, collector);
                    if (collectPromise) {
                      collectionPromises.push(collectPromise);
                    }
                  });
                }
              }
            }
          }
        }, {
          key: "addSchemaValueCompletions",
          value: function addSchemaValueCompletions(schema, separatorAfter, collector, types) {
            var _this13 = this;
            if (_typeof(schema) === 'object') {
              this.addEnumValueCompletions(schema, separatorAfter, collector);
              this.addDefaultValueCompletions(schema, separatorAfter, collector);
              this.collectTypes(schema, types);
              if (Array.isArray(schema.allOf)) {
                schema.allOf.forEach(function (s) {
                  return _this13.addSchemaValueCompletions(s, separatorAfter, collector, types);
                });
              }
              if (Array.isArray(schema.anyOf)) {
                schema.anyOf.forEach(function (s) {
                  return _this13.addSchemaValueCompletions(s, separatorAfter, collector, types);
                });
              }
              if (Array.isArray(schema.oneOf)) {
                schema.oneOf.forEach(function (s) {
                  return _this13.addSchemaValueCompletions(s, separatorAfter, collector, types);
                });
              }
            }
          }
        }, {
          key: "addDefaultValueCompletions",
          value: function addDefaultValueCompletions(schema, separatorAfter, collector) {
            var _this14 = this;
            var arrayDepth = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
            var hasProposals = false;
            if ((0, _objects.isDefined)(schema["default"])) {
              var type = schema.type;
              var value = schema["default"];
              for (var i = arrayDepth; i > 0; i--) {
                value = [value];
                type = 'array';
              }
              var completionItem = {
                kind: this.getSuggestionKind(type),
                label: this.getLabelForValue(value),
                insertText: this.getInsertTextForValue(value, separatorAfter),
                insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet
              };
              if (this.doesSupportsLabelDetails()) {
                completionItem.labelDetails = {
                  description: l10n.t('Default value')
                };
              } else {
                completionItem.detail = l10n.t('Default value');
              }
              collector.add(completionItem);
              hasProposals = true;
            }
            if (Array.isArray(schema.examples)) {
              schema.examples.forEach(function (example) {
                var type = schema.type;
                var value = example;
                for (var _i7 = arrayDepth; _i7 > 0; _i7--) {
                  value = [value];
                  type = 'array';
                }
                collector.add({
                  kind: _this14.getSuggestionKind(type),
                  label: _this14.getLabelForValue(value),
                  insertText: _this14.getInsertTextForValue(value, separatorAfter),
                  insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet
                });
                hasProposals = true;
              });
            }
            if (Array.isArray(schema.defaultSnippets)) {
              schema.defaultSnippets.forEach(function (s) {
                var type = schema.type;
                var value = s.body;
                var label = s.label;
                var insertText;
                var filterText;
                if ((0, _objects.isDefined)(value)) {
                  var _type = schema.type;
                  for (var _i8 = arrayDepth; _i8 > 0; _i8--) {
                    value = [value];
                    _type = 'array';
                  }
                  insertText = _this14.getInsertTextForSnippetValue(value, separatorAfter);
                  filterText = _this14.getFilterTextForSnippetValue(value);
                  label = label || _this14.getLabelForSnippetValue(value);
                } else if (typeof s.bodyText === 'string') {
                  var prefix = '',
                    suffix = '',
                    indent = '';
                  for (var _i9 = arrayDepth; _i9 > 0; _i9--) {
                    prefix = prefix + indent + '[\n';
                    suffix = suffix + '\n' + indent + ']';
                    indent += '\t';
                    type = 'array';
                  }
                  insertText = prefix + indent + s.bodyText.split('\n').join('\n' + indent) + suffix + separatorAfter;
                  label = label || insertText, filterText = insertText.replace(/[\n]/g, '');
                } else {
                  return;
                }
                collector.add({
                  kind: _this14.getSuggestionKind(type),
                  label: label,
                  documentation: _this14.fromMarkup(s.markdownDescription) || s.description,
                  insertText: insertText,
                  insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
                  filterText: filterText
                });
                hasProposals = true;
              });
            }
            if (!hasProposals && _typeof(schema.items) === 'object' && !Array.isArray(schema.items) && arrayDepth < 5) {
              this.addDefaultValueCompletions(schema.items, separatorAfter, collector, arrayDepth + 1);
            }
          }
        }, {
          key: "addEnumValueCompletions",
          value: function addEnumValueCompletions(schema, separatorAfter, collector) {
            if ((0, _objects.isDefined)(schema["const"])) {
              collector.add({
                kind: this.getSuggestionKind(schema.type),
                label: this.getLabelForValue(schema["const"]),
                insertText: this.getInsertTextForValue(schema["const"], separatorAfter),
                insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
                documentation: this.fromMarkup(schema.markdownDescription) || schema.description
              });
            }
            if (Array.isArray(schema["enum"])) {
              for (var i = 0, length = schema["enum"].length; i < length; i++) {
                var _schema$enumSortTexts, _schema$enumDetails;
                var enm = schema["enum"][i];
                var documentation = this.fromMarkup(schema.markdownDescription) || schema.description;
                if (schema.markdownEnumDescriptions && i < schema.markdownEnumDescriptions.length && this.doesSupportMarkdown()) {
                  documentation = this.fromMarkup(schema.markdownEnumDescriptions[i]);
                } else if (schema.enumDescriptions && i < schema.enumDescriptions.length) {
                  documentation = schema.enumDescriptions[i];
                }
                collector.add({
                  kind: this.getSuggestionKind(schema.type),
                  label: this.getLabelForValue(enm),
                  insertText: this.getInsertTextForValue(enm, separatorAfter),
                  insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
                  sortText: (_schema$enumSortTexts = schema.enumSortTexts) === null || _schema$enumSortTexts === void 0 ? void 0 : _schema$enumSortTexts[i],
                  detail: (_schema$enumDetails = schema.enumDetails) === null || _schema$enumDetails === void 0 ? void 0 : _schema$enumDetails[i],
                  documentation: documentation
                });
              }
            }
          }
        }, {
          key: "collectTypes",
          value: function collectTypes(schema, types) {
            if (Array.isArray(schema["enum"]) || (0, _objects.isDefined)(schema["const"])) {
              return;
            }
            var type = schema.type;
            if (Array.isArray(type)) {
              type.forEach(function (t) {
                return types[t] = true;
              });
            } else if (type) {
              types[type] = true;
            }
          }
        }, {
          key: "addFillerValueCompletions",
          value: function addFillerValueCompletions(types, separatorAfter, collector) {
            if (types['object']) {
              collector.add({
                kind: this.getSuggestionKind('object'),
                label: '{}',
                insertText: this.getInsertTextForGuessedValue({}, separatorAfter),
                insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
                detail: l10n.t('New object'),
                documentation: ''
              });
            }
            if (types['array']) {
              collector.add({
                kind: this.getSuggestionKind('array'),
                label: '[]',
                insertText: this.getInsertTextForGuessedValue([], separatorAfter),
                insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
                detail: l10n.t('New array'),
                documentation: ''
              });
            }
          }
        }, {
          key: "addBooleanValueCompletion",
          value: function addBooleanValueCompletion(value, separatorAfter, collector) {
            collector.add({
              kind: this.getSuggestionKind('boolean'),
              label: value ? 'true' : 'false',
              insertText: this.getInsertTextForValue(value, separatorAfter),
              insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
              documentation: ''
            });
          }
        }, {
          key: "addNullValueCompletion",
          value: function addNullValueCompletion(separatorAfter, collector) {
            collector.add({
              kind: this.getSuggestionKind('null'),
              label: 'null',
              insertText: 'null' + separatorAfter,
              insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
              documentation: ''
            });
          }
        }, {
          key: "addDollarSchemaCompletions",
          value: function addDollarSchemaCompletions(separatorAfter, collector) {
            var _this15 = this;
            var schemaIds = this.schemaService.getRegisteredSchemaIds(function (schema) {
              return schema === 'http' || schema === 'https';
            });
            schemaIds.forEach(function (schemaId) {
              if (schemaId.startsWith('https://json-schema.org/draft-')) {
                schemaId = schemaId + '#';
              }
              collector.add({
                kind: _jsonLanguageTypes.CompletionItemKind.Module,
                label: _this15.getLabelForValue(schemaId),
                filterText: _this15.getFilterTextForValue(schemaId),
                insertText: _this15.getInsertTextForValue(schemaId, separatorAfter),
                insertTextFormat: _jsonLanguageTypes.InsertTextFormat.Snippet,
                documentation: ''
              });
            });
          }
        }, {
          key: "getLabelForValue",
          value: function getLabelForValue(value) {
            return JSON.stringify(value);
          }
        }, {
          key: "getValueFromLabel",
          value: function getValueFromLabel(value) {
            return JSON.parse(value);
          }
        }, {
          key: "getFilterTextForValue",
          value: function getFilterTextForValue(value) {
            return JSON.stringify(value);
          }
        }, {
          key: "getFilterTextForSnippetValue",
          value: function getFilterTextForSnippetValue(value) {
            return JSON.stringify(value).replace(/\$\{\d+:([^}]+)\}|\$\d+/g, '$1');
          }
        }, {
          key: "getLabelForSnippetValue",
          value: function getLabelForSnippetValue(value) {
            var label = JSON.stringify(value);
            return label.replace(/\$\{\d+:([^}]+)\}|\$\d+/g, '$1');
          }
        }, {
          key: "getInsertTextForPlainText",
          value: function getInsertTextForPlainText(text) {
            return text.replace(/[\\\$\}]/g, '\\$&');
          }
        }, {
          key: "getInsertTextForValue",
          value: function getInsertTextForValue(value, separatorAfter) {
            var text = JSON.stringify(value, null, '\t');
            if (text === '{}') {
              return '{$1}' + separatorAfter;
            } else if (text === '[]') {
              return '[$1]' + separatorAfter;
            }
            return this.getInsertTextForPlainText(text + separatorAfter);
          }
        }, {
          key: "getInsertTextForSnippetValue",
          value: function getInsertTextForSnippetValue(value, separatorAfter) {
            var replacer = function replacer(value) {
              if (typeof value === 'string') {
                if (value[0] === '^') {
                  return value.substr(1);
                }
              }
              return JSON.stringify(value);
            };
            return (0, _json.stringifyObject)(value, '', replacer) + separatorAfter;
          }
        }, {
          key: "getInsertTextForGuessedValue",
          value: function getInsertTextForGuessedValue(value, separatorAfter) {
            switch (_typeof(value)) {
              case 'object':
                if (value === null) {
                  return '${1:null}' + separatorAfter;
                }
                return this.getInsertTextForValue(value, separatorAfter);
              case 'string':
                var snippetValue = JSON.stringify(value);
                snippetValue = snippetValue.substr(1, snippetValue.length - 2);
                snippetValue = this.getInsertTextForPlainText(snippetValue);
                return '"${1:' + snippetValue + '}"' + separatorAfter;
              case 'number':
              case 'boolean':
                return '${1:' + JSON.stringify(value) + '}' + separatorAfter;
            }
            return this.getInsertTextForValue(value, separatorAfter);
          }
        }, {
          key: "getSuggestionKind",
          value: function getSuggestionKind(type) {
            if (Array.isArray(type)) {
              var array = type;
              type = array.length > 0 ? array[0] : undefined;
            }
            if (!type) {
              return _jsonLanguageTypes.CompletionItemKind.Value;
            }
            switch (type) {
              case 'string':
                return _jsonLanguageTypes.CompletionItemKind.Value;
              case 'object':
                return _jsonLanguageTypes.CompletionItemKind.Module;
              case 'property':
                return _jsonLanguageTypes.CompletionItemKind.Property;
              default:
                return _jsonLanguageTypes.CompletionItemKind.Value;
            }
          }
        }, {
          key: "getLabelTextForMatchingNode",
          value: function getLabelTextForMatchingNode(node, document) {
            switch (node.type) {
              case 'array':
                return '[]';
              case 'object':
                return '{}';
              default:
                var content = document.getText().substr(node.offset, node.length);
                return content;
            }
          }
        }, {
          key: "getInsertTextForMatchingNode",
          value: function getInsertTextForMatchingNode(node, document, separatorAfter) {
            switch (node.type) {
              case 'array':
                return this.getInsertTextForValue([], separatorAfter);
              case 'object':
                return this.getInsertTextForValue({}, separatorAfter);
              default:
                var content = document.getText().substr(node.offset, node.length) + separatorAfter;
                return this.getInsertTextForPlainText(content);
            }
          }
        }, {
          key: "getInsertTextForProperty",
          value: function getInsertTextForProperty(key, propertySchema, addValue, separatorAfter) {
            var propertyText = this.getInsertTextForValue(key, '');
            if (!addValue) {
              return propertyText;
            }
            var resultText = propertyText + ': ';
            var value;
            var nValueProposals = 0;
            if (propertySchema) {
              if (Array.isArray(propertySchema.defaultSnippets)) {
                if (propertySchema.defaultSnippets.length === 1) {
                  var body = propertySchema.defaultSnippets[0].body;
                  if ((0, _objects.isDefined)(body)) {
                    value = this.getInsertTextForSnippetValue(body, '');
                  }
                }
                nValueProposals += propertySchema.defaultSnippets.length;
              }
              if (propertySchema["enum"]) {
                if (!value && propertySchema["enum"].length === 1) {
                  value = this.getInsertTextForGuessedValue(propertySchema["enum"][0], '');
                }
                nValueProposals += propertySchema["enum"].length;
              }
              if ((0, _objects.isDefined)(propertySchema["const"])) {
                if (!value) {
                  value = this.getInsertTextForGuessedValue(propertySchema["const"], '');
                }
                nValueProposals++;
              }
              if ((0, _objects.isDefined)(propertySchema["default"])) {
                if (!value) {
                  value = this.getInsertTextForGuessedValue(propertySchema["default"], '');
                }
                nValueProposals++;
              }
              if (Array.isArray(propertySchema.examples) && propertySchema.examples.length) {
                if (!value) {
                  value = this.getInsertTextForGuessedValue(propertySchema.examples[0], '');
                }
                nValueProposals += propertySchema.examples.length;
              }
              if (nValueProposals === 0) {
                var type = Array.isArray(propertySchema.type) ? propertySchema.type[0] : propertySchema.type;
                if (!type) {
                  if (propertySchema.properties) {
                    type = 'object';
                  } else if (propertySchema.items) {
                    type = 'array';
                  }
                }
                switch (type) {
                  case 'boolean':
                    value = '$1';
                    break;
                  case 'string':
                    value = '"$1"';
                    break;
                  case 'object':
                    value = '{$1}';
                    break;
                  case 'array':
                    value = '[$1]';
                    break;
                  case 'number':
                  case 'integer':
                    value = '${1:0}';
                    break;
                  case 'null':
                    value = '${1:null}';
                    break;
                  default:
                    return propertyText;
                }
              }
            }
            if (!value || nValueProposals > 1) {
              value = '$1';
            }
            return resultText + value + separatorAfter;
          }
        }, {
          key: "getCurrentWord",
          value: function getCurrentWord(document, offset) {
            var i = offset - 1;
            var text = document.getText();
            while (i >= 0 && ' \t\n\r\v":{[,]}'.indexOf(text.charAt(i)) === -1) {
              i--;
            }
            return text.substring(i + 1, offset);
          }
        }, {
          key: "evaluateSeparatorAfter",
          value: function evaluateSeparatorAfter(document, offset) {
            var scanner = Json.createScanner(document.getText(), true);
            scanner.setPosition(offset);
            var token = scanner.scan();
            switch (token) {
              case 5:
              case 2:
              case 4:
              case 17:
                return '';
              default:
                return ',';
            }
          }
        }, {
          key: "findItemAtOffset",
          value: function findItemAtOffset(node, document, offset) {
            var scanner = Json.createScanner(document.getText(), true);
            var children = node.items;
            for (var i = children.length - 1; i >= 0; i--) {
              var child = children[i];
              if (offset > child.offset + child.length) {
                scanner.setPosition(child.offset + child.length);
                var token = scanner.scan();
                if (token === 5 && offset >= scanner.getTokenOffset() + scanner.getTokenLength()) {
                  return i + 1;
                }
                return i;
              } else if (offset >= child.offset) {
                return i;
              }
            }
            return 0;
          }
        }, {
          key: "isInComment",
          value: function isInComment(document, start, offset) {
            var scanner = Json.createScanner(document.getText(), false);
            scanner.setPosition(start);
            var token = scanner.scan();
            while (token !== 17 && scanner.getTokenOffset() + scanner.getTokenLength() < offset) {
              token = scanner.scan();
            }
            return (token === 12 || token === 13) && scanner.getTokenOffset() <= offset;
          }
        }, {
          key: "fromMarkup",
          value: function fromMarkup(markupString) {
            if (markupString && this.doesSupportMarkdown()) {
              return {
                kind: _jsonLanguageTypes.MarkupKind.Markdown,
                value: markupString
              };
            }
            return undefined;
          }
        }, {
          key: "doesSupportMarkdown",
          value: function doesSupportMarkdown() {
            if (!(0, _objects.isDefined)(this.supportsMarkdown)) {
              var _this$clientCapabilit;
              var documentationFormat = (_this$clientCapabilit = this.clientCapabilities.textDocument) === null || _this$clientCapabilit === void 0 || (_this$clientCapabilit = _this$clientCapabilit.completion) === null || _this$clientCapabilit === void 0 || (_this$clientCapabilit = _this$clientCapabilit.completionItem) === null || _this$clientCapabilit === void 0 ? void 0 : _this$clientCapabilit.documentationFormat;
              this.supportsMarkdown = Array.isArray(documentationFormat) && documentationFormat.indexOf(_jsonLanguageTypes.MarkupKind.Markdown) !== -1;
            }
            return this.supportsMarkdown;
          }
        }, {
          key: "doesSupportsCommitCharacters",
          value: function doesSupportsCommitCharacters() {
            if (!(0, _objects.isDefined)(this.supportsCommitCharacters)) {
              var _this$clientCapabilit2;
              this.labelDetailsSupport = (_this$clientCapabilit2 = this.clientCapabilities.textDocument) === null || _this$clientCapabilit2 === void 0 || (_this$clientCapabilit2 = _this$clientCapabilit2.completion) === null || _this$clientCapabilit2 === void 0 || (_this$clientCapabilit2 = _this$clientCapabilit2.completionItem) === null || _this$clientCapabilit2 === void 0 ? void 0 : _this$clientCapabilit2.commitCharactersSupport;
            }
            return this.supportsCommitCharacters;
          }
        }, {
          key: "doesSupportsLabelDetails",
          value: function doesSupportsLabelDetails() {
            if (!(0, _objects.isDefined)(this.labelDetailsSupport)) {
              var _this$clientCapabilit3;
              this.labelDetailsSupport = (_this$clientCapabilit3 = this.clientCapabilities.textDocument) === null || _this$clientCapabilit3 === void 0 || (_this$clientCapabilit3 = _this$clientCapabilit3.completion) === null || _this$clientCapabilit3 === void 0 || (_this$clientCapabilit3 = _this$clientCapabilit3.completionItem) === null || _this$clientCapabilit3 === void 0 ? void 0 : _this$clientCapabilit3.labelDetailsSupport;
            }
            return this.labelDetailsSupport;
          }
        }]);
      }();
      exports.JSONCompletion = JSONCompletion;
    }, {
      "../jsonLanguageTypes": 9,
      "../parser/jsonParser": 10,
      "../utils/json": 25,
      "../utils/objects": 26,
      "../utils/strings": 29,
      "@vscode/l10n": 1,
      "jsonc-parser": 7
    }],
    13: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.JSONDocumentSymbols = void 0;
      var Parser = _interopRequireWildcard(require("../parser/jsonParser"));
      var Strings = _interopRequireWildcard(require("../utils/strings"));
      var _colors = require("../utils/colors");
      var l10n = _interopRequireWildcard(require("@vscode/l10n"));
      var _jsonLanguageTypes = require("../jsonLanguageTypes");
      function _interopRequireWildcard(e, t) {
        if ("function" == typeof WeakMap) var r = new WeakMap(),
          n = new WeakMap();
        return (_interopRequireWildcard = function _interopRequireWildcard(e, t) {
          if (!t && e && e.__esModule) return e;
          var o,
            i,
            f = {
              __proto__: null,
              "default": e
            };
          if (null === e || "object" != _typeof(e) && "function" != typeof e) return f;
          if (o = t ? n : r) {
            if (o.has(e)) return o.get(e);
            o.set(e, f);
          }
          for (var _t5 in e) "default" !== _t5 && {}.hasOwnProperty.call(e, _t5) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t5)) && (i.get || i.set) ? o(f, _t5, i) : f[_t5] = e[_t5]);
          return f;
        })(e, t);
      }
      var JSONDocumentSymbols = function () {
        function JSONDocumentSymbols(schemaService) {
          _classCallCheck(this, JSONDocumentSymbols);
          this.schemaService = schemaService;
        }
        return _createClass(JSONDocumentSymbols, [{
          key: "findDocumentSymbols",
          value: function findDocumentSymbols(document, doc) {
            var _this16 = this;
            var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
              resultLimit: Number.MAX_VALUE
            };
            var root = doc.root;
            if (!root) {
              return [];
            }
            var limit = context.resultLimit || Number.MAX_VALUE;
            var resourceString = document.uri;
            if (resourceString === 'vscode://defaultsettings/keybindings.json' || Strings.endsWith(resourceString.toLowerCase(), '/user/keybindings.json')) {
              if (root.type === 'array') {
                var _result = [];
                var _iterator16 = _createForOfIteratorHelper(root.items),
                  _step16;
                try {
                  for (_iterator16.s(); !(_step16 = _iterator16.n()).done;) {
                    var item = _step16.value;
                    if (item.type === 'object') {
                      var _iterator17 = _createForOfIteratorHelper(item.properties),
                        _step17;
                      try {
                        for (_iterator17.s(); !(_step17 = _iterator17.n()).done;) {
                          var property = _step17.value;
                          if (property.keyNode.value === 'key' && property.valueNode) {
                            var location = _jsonLanguageTypes.Location.create(document.uri, getRange(document, item));
                            _result.push({
                              name: getName(property.valueNode),
                              kind: _jsonLanguageTypes.SymbolKind.Function,
                              location: location
                            });
                            limit--;
                            if (limit <= 0) {
                              if (context && context.onResultLimitExceeded) {
                                context.onResultLimitExceeded(resourceString);
                              }
                              return _result;
                            }
                          }
                        }
                      } catch (err) {
                        _iterator17.e(err);
                      } finally {
                        _iterator17.f();
                      }
                    }
                  }
                } catch (err) {
                  _iterator16.e(err);
                } finally {
                  _iterator16.f();
                }
                return _result;
              }
            }
            var toVisit = [{
              node: root,
              containerName: ''
            }];
            var nextToVisit = 0;
            var limitExceeded = false;
            var result = [];
            var collectOutlineEntries = function collectOutlineEntries(node, containerName) {
              if (node.type === 'array') {
                node.items.forEach(function (node) {
                  if (node) {
                    toVisit.push({
                      node: node,
                      containerName: containerName
                    });
                  }
                });
              } else if (node.type === 'object') {
                node.properties.forEach(function (property) {
                  var valueNode = property.valueNode;
                  if (valueNode) {
                    if (limit > 0) {
                      limit--;
                      var _location = _jsonLanguageTypes.Location.create(document.uri, getRange(document, property));
                      var childContainerName = containerName ? containerName + '.' + property.keyNode.value : property.keyNode.value;
                      result.push({
                        name: _this16.getKeyLabel(property),
                        kind: _this16.getSymbolKind(valueNode.type),
                        location: _location,
                        containerName: containerName
                      });
                      toVisit.push({
                        node: valueNode,
                        containerName: childContainerName
                      });
                    } else {
                      limitExceeded = true;
                    }
                  }
                });
              }
            };
            while (nextToVisit < toVisit.length) {
              var next = toVisit[nextToVisit++];
              collectOutlineEntries(next.node, next.containerName);
            }
            if (limitExceeded && context && context.onResultLimitExceeded) {
              context.onResultLimitExceeded(resourceString);
            }
            return result;
          }
        }, {
          key: "findDocumentSymbols2",
          value: function findDocumentSymbols2(document, doc) {
            var _this17 = this;
            var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
              resultLimit: Number.MAX_VALUE
            };
            var root = doc.root;
            if (!root) {
              return [];
            }
            var limit = context.resultLimit || Number.MAX_VALUE;
            var resourceString = document.uri;
            if (resourceString === 'vscode://defaultsettings/keybindings.json' || Strings.endsWith(resourceString.toLowerCase(), '/user/keybindings.json')) {
              if (root.type === 'array') {
                var _result2 = [];
                var _iterator18 = _createForOfIteratorHelper(root.items),
                  _step18;
                try {
                  for (_iterator18.s(); !(_step18 = _iterator18.n()).done;) {
                    var item = _step18.value;
                    if (item.type === 'object') {
                      var _iterator19 = _createForOfIteratorHelper(item.properties),
                        _step19;
                      try {
                        for (_iterator19.s(); !(_step19 = _iterator19.n()).done;) {
                          var property = _step19.value;
                          if (property.keyNode.value === 'key' && property.valueNode) {
                            var range = getRange(document, item);
                            var selectionRange = getRange(document, property.keyNode);
                            _result2.push({
                              name: getName(property.valueNode),
                              kind: _jsonLanguageTypes.SymbolKind.Function,
                              range: range,
                              selectionRange: selectionRange
                            });
                            limit--;
                            if (limit <= 0) {
                              if (context && context.onResultLimitExceeded) {
                                context.onResultLimitExceeded(resourceString);
                              }
                              return _result2;
                            }
                          }
                        }
                      } catch (err) {
                        _iterator19.e(err);
                      } finally {
                        _iterator19.f();
                      }
                    }
                  }
                } catch (err) {
                  _iterator18.e(err);
                } finally {
                  _iterator18.f();
                }
                return _result2;
              }
            }
            var result = [];
            var toVisit = [{
              node: root,
              result: result
            }];
            var nextToVisit = 0;
            var limitExceeded = false;
            var collectOutlineEntries = function collectOutlineEntries(node, result) {
              if (node.type === 'array') {
                node.items.forEach(function (node, index) {
                  if (node) {
                    if (limit > 0) {
                      limit--;
                      var _range = getRange(document, node);
                      var _selectionRange = _range;
                      var name = String(index);
                      var symbol = {
                        name: name,
                        kind: _this17.getSymbolKind(node.type),
                        range: _range,
                        selectionRange: _selectionRange,
                        children: []
                      };
                      result.push(symbol);
                      toVisit.push({
                        result: symbol.children,
                        node: node
                      });
                    } else {
                      limitExceeded = true;
                    }
                  }
                });
              } else if (node.type === 'object') {
                node.properties.forEach(function (property) {
                  var valueNode = property.valueNode;
                  if (valueNode) {
                    if (limit > 0) {
                      limit--;
                      var _range2 = getRange(document, property);
                      var _selectionRange2 = getRange(document, property.keyNode);
                      var children = [];
                      var symbol = {
                        name: _this17.getKeyLabel(property),
                        kind: _this17.getSymbolKind(valueNode.type),
                        range: _range2,
                        selectionRange: _selectionRange2,
                        children: children,
                        detail: _this17.getDetail(valueNode)
                      };
                      result.push(symbol);
                      toVisit.push({
                        result: children,
                        node: valueNode
                      });
                    } else {
                      limitExceeded = true;
                    }
                  }
                });
              }
            };
            while (nextToVisit < toVisit.length) {
              var next = toVisit[nextToVisit++];
              collectOutlineEntries(next.node, next.result);
            }
            if (limitExceeded && context && context.onResultLimitExceeded) {
              context.onResultLimitExceeded(resourceString);
            }
            return result;
          }
        }, {
          key: "getSymbolKind",
          value: function getSymbolKind(nodeType) {
            switch (nodeType) {
              case 'object':
                return _jsonLanguageTypes.SymbolKind.Module;
              case 'string':
                return _jsonLanguageTypes.SymbolKind.String;
              case 'number':
                return _jsonLanguageTypes.SymbolKind.Number;
              case 'array':
                return _jsonLanguageTypes.SymbolKind.Array;
              case 'boolean':
                return _jsonLanguageTypes.SymbolKind.Boolean;
              default:
                return _jsonLanguageTypes.SymbolKind.Variable;
            }
          }
        }, {
          key: "getKeyLabel",
          value: function getKeyLabel(property) {
            var name = property.keyNode.value;
            if (name) {
              name = name.replace(/[\n]/g, '↵');
            }
            if (name && name.trim()) {
              return name;
            }
            return "\"".concat(name, "\"");
          }
        }, {
          key: "getDetail",
          value: function getDetail(node) {
            if (!node) {
              return undefined;
            }
            if (node.type === 'boolean' || node.type === 'number' || node.type === 'null' || node.type === 'string') {
              return String(node.value);
            } else {
              if (node.type === 'array') {
                return node.children.length ? undefined : '[]';
              } else if (node.type === 'object') {
                return node.children.length ? undefined : '{}';
              }
            }
            return undefined;
          }
        }, {
          key: "findDocumentColors",
          value: function findDocumentColors(document, doc, context) {
            return this.schemaService.getSchemaForResource(document.uri, doc).then(function (schema) {
              var result = [];
              if (schema) {
                var limit = context && typeof context.resultLimit === 'number' ? context.resultLimit : Number.MAX_VALUE;
                var matchingSchemas = doc.getMatchingSchemas(schema.schema);
                var visitedNode = {};
                var _iterator20 = _createForOfIteratorHelper(matchingSchemas),
                  _step20;
                try {
                  for (_iterator20.s(); !(_step20 = _iterator20.n()).done;) {
                    var s = _step20.value;
                    if (!s.inverted && s.schema && (s.schema.format === 'color' || s.schema.format === 'color-hex') && s.node && s.node.type === 'string') {
                      var nodeId = String(s.node.offset);
                      if (!visitedNode[nodeId]) {
                        var color = (0, _colors.colorFromHex)(Parser.getNodeValue(s.node));
                        if (color) {
                          var range = getRange(document, s.node);
                          result.push({
                            color: color,
                            range: range
                          });
                        }
                        visitedNode[nodeId] = true;
                        limit--;
                        if (limit <= 0) {
                          if (context && context.onResultLimitExceeded) {
                            context.onResultLimitExceeded(document.uri);
                          }
                          return result;
                        }
                      }
                    }
                  }
                } catch (err) {
                  _iterator20.e(err);
                } finally {
                  _iterator20.f();
                }
              }
              return result;
            });
          }
        }, {
          key: "getColorPresentations",
          value: function getColorPresentations(document, doc, color, range) {
            var result = [];
            var red256 = Math.round(color.red * 255),
              green256 = Math.round(color.green * 255),
              blue256 = Math.round(color.blue * 255);
            function toTwoDigitHex(n) {
              var r = n.toString(16);
              return r.length !== 2 ? '0' + r : r;
            }
            var label;
            if (color.alpha === 1) {
              label = "#".concat(toTwoDigitHex(red256)).concat(toTwoDigitHex(green256)).concat(toTwoDigitHex(blue256));
            } else {
              label = "#".concat(toTwoDigitHex(red256)).concat(toTwoDigitHex(green256)).concat(toTwoDigitHex(blue256)).concat(toTwoDigitHex(Math.round(color.alpha * 255)));
            }
            result.push({
              label: label,
              textEdit: _jsonLanguageTypes.TextEdit.replace(range, JSON.stringify(label))
            });
            return result;
          }
        }]);
      }();
      exports.JSONDocumentSymbols = JSONDocumentSymbols;
      function getRange(document, node) {
        return _jsonLanguageTypes.Range.create(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
      }
      function getName(node) {
        return Parser.getNodeValue(node) || l10n.t('<empty>');
      }
    }, {
      "../jsonLanguageTypes": 9,
      "../parser/jsonParser": 10,
      "../utils/colors": 22,
      "../utils/strings": 29,
      "@vscode/l10n": 1
    }],
    14: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.getFoldingRanges = getFoldingRanges;
      var _jsoncParser = require("jsonc-parser");
      var _jsonLanguageTypes = require("../jsonLanguageTypes");
      function getFoldingRanges(document, context) {
        var ranges = [];
        var nestingLevels = [];
        var stack = [];
        var prevStart = -1;
        var scanner = (0, _jsoncParser.createScanner)(document.getText(), false);
        var token = scanner.scan();
        function addRange(range) {
          ranges.push(range);
          nestingLevels.push(stack.length);
        }
        while (token !== 17) {
          switch (token) {
            case 1:
            case 3:
              {
                var startLine = document.positionAt(scanner.getTokenOffset()).line;
                var range = {
                  startLine: startLine,
                  endLine: startLine,
                  kind: token === 1 ? 'object' : 'array'
                };
                stack.push(range);
                break;
              }
            case 2:
            case 4:
              {
                var kind = token === 2 ? 'object' : 'array';
                if (stack.length > 0 && stack[stack.length - 1].kind === kind) {
                  var _range3 = stack.pop();
                  var line = document.positionAt(scanner.getTokenOffset()).line;
                  if (_range3 && line > _range3.startLine + 1 && prevStart !== _range3.startLine) {
                    _range3.endLine = line - 1;
                    addRange(_range3);
                    prevStart = _range3.startLine;
                  }
                }
                break;
              }
            case 13:
              {
                var _startLine = document.positionAt(scanner.getTokenOffset()).line;
                var endLine = document.positionAt(scanner.getTokenOffset() + scanner.getTokenLength()).line;
                if (scanner.getTokenError() === 1 && _startLine + 1 < document.lineCount) {
                  scanner.setPosition(document.offsetAt(_jsonLanguageTypes.Position.create(_startLine + 1, 0)));
                } else {
                  if (_startLine < endLine) {
                    addRange({
                      startLine: _startLine,
                      endLine: endLine,
                      kind: _jsonLanguageTypes.FoldingRangeKind.Comment
                    });
                    prevStart = _startLine;
                  }
                }
                break;
              }
            case 12:
              {
                var text = document.getText().substr(scanner.getTokenOffset(), scanner.getTokenLength());
                var m = text.match(/^\/\/\s*#(region\b)|(endregion\b)/);
                if (m) {
                  var _line = document.positionAt(scanner.getTokenOffset()).line;
                  if (m[1]) {
                    var _range4 = {
                      startLine: _line,
                      endLine: _line,
                      kind: _jsonLanguageTypes.FoldingRangeKind.Region
                    };
                    stack.push(_range4);
                  } else {
                    var i = stack.length - 1;
                    while (i >= 0 && stack[i].kind !== _jsonLanguageTypes.FoldingRangeKind.Region) {
                      i--;
                    }
                    if (i >= 0) {
                      var _range5 = stack[i];
                      stack.length = i;
                      if (_line > _range5.startLine && prevStart !== _range5.startLine) {
                        _range5.endLine = _line;
                        addRange(_range5);
                        prevStart = _range5.startLine;
                      }
                    }
                  }
                }
                break;
              }
          }
          token = scanner.scan();
        }
        var rangeLimit = context && context.rangeLimit;
        if (typeof rangeLimit !== 'number' || ranges.length <= rangeLimit) {
          return ranges;
        }
        if (context && context.onRangeLimitExceeded) {
          context.onRangeLimitExceeded(document.uri);
        }
        var counts = [];
        for (var _i0 = 0, _nestingLevels = nestingLevels; _i0 < _nestingLevels.length; _i0++) {
          var level = _nestingLevels[_i0];
          if (level < 30) {
            counts[level] = (counts[level] || 0) + 1;
          }
        }
        var entries = 0;
        var maxLevel = 0;
        for (var _i1 = 0; _i1 < counts.length; _i1++) {
          var n = counts[_i1];
          if (n) {
            if (n + entries > rangeLimit) {
              maxLevel = _i1;
              break;
            }
            entries += n;
          }
        }
        var result = [];
        for (var _i10 = 0; _i10 < ranges.length; _i10++) {
          var _level = nestingLevels[_i10];
          if (typeof _level === 'number') {
            if (_level < maxLevel || _level === maxLevel && entries++ < rangeLimit) {
              result.push(ranges[_i10]);
            }
          }
        }
        return result;
      }
    }, {
      "../jsonLanguageTypes": 9,
      "jsonc-parser": 7
    }],
    15: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.JSONHover = void 0;
      var Parser = _interopRequireWildcard(require("../parser/jsonParser"));
      var _jsonLanguageTypes = require("../jsonLanguageTypes");
      function _interopRequireWildcard(e, t) {
        if ("function" == typeof WeakMap) var r = new WeakMap(),
          n = new WeakMap();
        return (_interopRequireWildcard = function _interopRequireWildcard(e, t) {
          if (!t && e && e.__esModule) return e;
          var o,
            i,
            f = {
              __proto__: null,
              "default": e
            };
          if (null === e || "object" != _typeof(e) && "function" != typeof e) return f;
          if (o = t ? n : r) {
            if (o.has(e)) return o.get(e);
            o.set(e, f);
          }
          for (var _t6 in e) "default" !== _t6 && {}.hasOwnProperty.call(e, _t6) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t6)) && (i.get || i.set) ? o(f, _t6, i) : f[_t6] = e[_t6]);
          return f;
        })(e, t);
      }
      var JSONHover = function () {
        function JSONHover(schemaService) {
          var contributions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
          var promiseConstructor = arguments.length > 2 ? arguments[2] : undefined;
          _classCallCheck(this, JSONHover);
          this.schemaService = schemaService;
          this.contributions = contributions;
          this.promise = promiseConstructor || Promise;
        }
        return _createClass(JSONHover, [{
          key: "doHover",
          value: function doHover(document, position, doc) {
            var offset = document.offsetAt(position);
            var node = doc.getNodeFromOffset(offset);
            if (!node || (node.type === 'object' || node.type === 'array') && offset > node.offset + 1 && offset < node.offset + node.length - 1) {
              return this.promise.resolve(null);
            }
            var hoverRangeNode = node;
            if (node.type === 'string') {
              var parent = node.parent;
              if (parent && parent.type === 'property' && parent.keyNode === node) {
                node = parent.valueNode;
                if (!node) {
                  return this.promise.resolve(null);
                }
              }
            }
            var hoverRange = _jsonLanguageTypes.Range.create(document.positionAt(hoverRangeNode.offset), document.positionAt(hoverRangeNode.offset + hoverRangeNode.length));
            var createHover = function createHover(contents) {
              var result = {
                contents: contents,
                range: hoverRange
              };
              return result;
            };
            var location = Parser.getNodePath(node);
            for (var i = this.contributions.length - 1; i >= 0; i--) {
              var contribution = this.contributions[i];
              var promise = contribution.getInfoContribution(document.uri, location);
              if (promise) {
                return promise.then(function (htmlContent) {
                  return createHover(htmlContent);
                });
              }
            }
            return this.schemaService.getSchemaForResource(document.uri, doc).then(function (schema) {
              if (!schema) {
                return null;
              }
              var title = undefined;
              var markdownDescription = undefined;
              var markdownEnumValueDescription = undefined,
                enumValue = undefined;
              var matchingSchemas = doc.getMatchingSchemas(schema.schema, node.offset).filter(function (s) {
                return s.node === node && !s.inverted;
              }).map(function (s) {
                return s.schema;
              });
              var _iterator21 = _createForOfIteratorHelper(matchingSchemas),
                _step21;
              try {
                for (_iterator21.s(); !(_step21 = _iterator21.n()).done;) {
                  var _schema2 = _step21.value;
                  title = title || _schema2.title;
                  markdownDescription = markdownDescription || _schema2.markdownDescription || toMarkdown(_schema2.description);
                  if (_schema2["enum"]) {
                    var idx = _schema2["enum"].indexOf(Parser.getNodeValue(node));
                    if (_schema2.markdownEnumDescriptions) {
                      markdownEnumValueDescription = _schema2.markdownEnumDescriptions[idx];
                    } else if (_schema2.enumDescriptions) {
                      markdownEnumValueDescription = toMarkdown(_schema2.enumDescriptions[idx]);
                    }
                    if (markdownEnumValueDescription) {
                      enumValue = _schema2["enum"][idx];
                      if (typeof enumValue !== 'string') {
                        enumValue = JSON.stringify(enumValue);
                      }
                    }
                  }
                }
              } catch (err) {
                _iterator21.e(err);
              } finally {
                _iterator21.f();
              }
              var result = '';
              if (title) {
                result = toMarkdown(title);
              }
              if (markdownDescription) {
                if (result.length > 0) {
                  result += "\n\n";
                }
                result += markdownDescription;
              }
              if (markdownEnumValueDescription) {
                if (result.length > 0) {
                  result += "\n\n";
                }
                result += "`".concat(toMarkdownCodeBlock(enumValue), "`: ").concat(markdownEnumValueDescription);
              }
              return createHover([result]);
            });
          }
        }]);
      }();
      exports.JSONHover = JSONHover;
      function toMarkdown(plain) {
        if (plain) {
          return plain.trim().replace(/[\\`*_{}[\]()<>#+\-.!]/g, '\\$&').replace(/(^ +)/mg, function (_match, g1) {
            return '&nbsp;'.repeat(g1.length);
          }).replace(/( {2,})/g, function (_match, g1) {
            return ' ' + '&nbsp;'.repeat(g1.length - 1);
          }).replace(/(\t+)/g, function (_match, g1) {
            return '&nbsp;'.repeat(g1.length * 4);
          }).replace(/\n/g, '\\\n');
        }
        return undefined;
      }
      function toMarkdownCodeBlock(content) {
        if (content.indexOf('`') !== -1) {
          return '`` ' + content + ' ``';
        }
        return content;
      }
    }, {
      "../jsonLanguageTypes": 9,
      "../parser/jsonParser": 10
    }],
    16: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.findLinks = findLinks;
      var _jsonLanguageTypes = require("../jsonLanguageTypes");
      function findLinks(document, doc) {
        var links = [];
        doc.visit(function (node) {
          var _node$valueNode;
          if (node.type === "property" && node.keyNode.value === "$ref" && ((_node$valueNode = node.valueNode) === null || _node$valueNode === void 0 ? void 0 : _node$valueNode.type) === 'string') {
            var path = node.valueNode.value;
            var targetNode = findTargetNode(doc, path);
            if (targetNode) {
              var targetPos = document.positionAt(targetNode.offset);
              links.push({
                target: "".concat(document.uri, "#").concat(targetPos.line + 1, ",").concat(targetPos.character + 1),
                range: createRange(document, node.valueNode)
              });
            }
          }
          return true;
        });
        return Promise.resolve(links);
      }
      function createRange(document, node) {
        return _jsonLanguageTypes.Range.create(document.positionAt(node.offset + 1), document.positionAt(node.offset + node.length - 1));
      }
      function findTargetNode(doc, path) {
        var tokens = parseJSONPointer(path);
        if (!tokens) {
          return null;
        }
        return findNode(tokens, doc.root);
      }
      function findNode(pointer, node) {
        if (!node) {
          return null;
        }
        if (pointer.length === 0) {
          return node;
        }
        var token = pointer.shift();
        if (node && node.type === 'object') {
          var propertyNode = node.properties.find(function (propertyNode) {
            return propertyNode.keyNode.value === token;
          });
          if (!propertyNode) {
            return null;
          }
          return findNode(pointer, propertyNode.valueNode);
        } else if (node && node.type === 'array') {
          if (token.match(/^(0|[1-9][0-9]*)$/)) {
            var index = Number.parseInt(token);
            var arrayItem = node.items[index];
            if (!arrayItem) {
              return null;
            }
            return findNode(pointer, arrayItem);
          }
        }
        return null;
      }
      function parseJSONPointer(path) {
        if (path === "#") {
          return [];
        }
        if (path[0] !== '#' || path[1] !== '/') {
          return null;
        }
        return path.substring(2).split(/\//).map(unescape);
      }
      function unescape(str) {
        return str.replace(/~1/g, '/').replace(/~0/g, '~');
      }
    }, {
      "../jsonLanguageTypes": 9
    }],
    17: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.UnresolvedSchema = exports.ResolvedSchema = exports.JSONSchemaService = void 0;
      var Json = _interopRequireWildcard(require("jsonc-parser"));
      var _vscodeUri = require("vscode-uri");
      var Strings = _interopRequireWildcard(require("../utils/strings"));
      var _jsonParser = require("../parser/jsonParser");
      var _jsonLanguageTypes = require("../jsonLanguageTypes");
      var l10n = _interopRequireWildcard(require("@vscode/l10n"));
      var _glob = require("../utils/glob");
      var _objects = require("../utils/objects");
      var _vscodeLanguageserverTypes = require("vscode-languageserver-types");
      function _interopRequireWildcard(e, t) {
        if ("function" == typeof WeakMap) var r = new WeakMap(),
          n = new WeakMap();
        return (_interopRequireWildcard = function _interopRequireWildcard(e, t) {
          if (!t && e && e.__esModule) return e;
          var o,
            i,
            f = {
              __proto__: null,
              "default": e
            };
          if (null === e || "object" != _typeof(e) && "function" != typeof e) return f;
          if (o = t ? n : r) {
            if (o.has(e)) return o.get(e);
            o.set(e, f);
          }
          for (var _t7 in e) "default" !== _t7 && {}.hasOwnProperty.call(e, _t7) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t7)) && (i.get || i.set) ? o(f, _t7, i) : f[_t7] = e[_t7]);
          return f;
        })(e, t);
      }
      var BANG = '!';
      var PATH_SEP = '/';
      var FilePatternAssociation = function () {
        function FilePatternAssociation(pattern, folderUri, uris) {
          _classCallCheck(this, FilePatternAssociation);
          this.folderUri = folderUri;
          this.uris = uris;
          this.globWrappers = [];
          try {
            var _iterator22 = _createForOfIteratorHelper(pattern),
              _step22;
            try {
              for (_iterator22.s(); !(_step22 = _iterator22.n()).done;) {
                var patternString = _step22.value;
                var include = patternString[0] !== BANG;
                if (!include) {
                  patternString = patternString.substring(1);
                }
                if (patternString.length > 0) {
                  if (patternString[0] === PATH_SEP) {
                    patternString = patternString.substring(1);
                  }
                  this.globWrappers.push({
                    regexp: (0, _glob.createRegex)('**/' + patternString, {
                      extended: true,
                      globstar: true
                    }),
                    include: include
                  });
                }
              }
            } catch (err) {
              _iterator22.e(err);
            } finally {
              _iterator22.f();
            }
            ;
            if (folderUri) {
              folderUri = normalizeResourceForMatching(folderUri);
              if (!folderUri.endsWith('/')) {
                folderUri = folderUri + '/';
              }
              this.folderUri = folderUri;
            }
          } catch (e) {
            this.globWrappers.length = 0;
            this.uris = [];
          }
        }
        return _createClass(FilePatternAssociation, [{
          key: "matchesPattern",
          value: function matchesPattern(fileName) {
            if (this.folderUri && !fileName.startsWith(this.folderUri)) {
              return false;
            }
            var match = false;
            var _iterator23 = _createForOfIteratorHelper(this.globWrappers),
              _step23;
            try {
              for (_iterator23.s(); !(_step23 = _iterator23.n()).done;) {
                var _step23$value = _step23.value,
                  regexp = _step23$value.regexp,
                  include = _step23$value.include;
                if (regexp.test(fileName)) {
                  match = include;
                }
              }
            } catch (err) {
              _iterator23.e(err);
            } finally {
              _iterator23.f();
            }
            return match;
          }
        }, {
          key: "getURIs",
          value: function getURIs() {
            return this.uris;
          }
        }]);
      }();
      var SchemaHandle = function () {
        function SchemaHandle(service, uri, unresolvedSchemaContent) {
          _classCallCheck(this, SchemaHandle);
          this.service = service;
          this.uri = uri;
          this.dependencies = new Set();
          this.anchors = undefined;
          if (unresolvedSchemaContent) {
            this.unresolvedSchema = this.service.promise.resolve(new UnresolvedSchema(unresolvedSchemaContent));
          }
        }
        return _createClass(SchemaHandle, [{
          key: "getUnresolvedSchema",
          value: function getUnresolvedSchema() {
            if (!this.unresolvedSchema) {
              this.unresolvedSchema = this.service.loadSchema(this.uri);
            }
            return this.unresolvedSchema;
          }
        }, {
          key: "getResolvedSchema",
          value: function getResolvedSchema() {
            var _this18 = this;
            if (!this.resolvedSchema) {
              this.resolvedSchema = this.getUnresolvedSchema().then(function (unresolved) {
                return _this18.service.resolveSchemaContent(unresolved, _this18);
              });
            }
            return this.resolvedSchema;
          }
        }, {
          key: "clearSchema",
          value: function clearSchema() {
            var hasChanges = !!this.unresolvedSchema;
            this.resolvedSchema = undefined;
            this.unresolvedSchema = undefined;
            this.dependencies.clear();
            this.anchors = undefined;
            return hasChanges;
          }
        }]);
      }();
      var UnresolvedSchema = _createClass(function UnresolvedSchema(schema) {
        var errors = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
        _classCallCheck(this, UnresolvedSchema);
        this.schema = schema;
        this.errors = errors;
      });
      exports.UnresolvedSchema = UnresolvedSchema;
      function toDiagnostic(message, code, relatedURL) {
        var relatedInformation = relatedURL ? [{
          location: {
            uri: relatedURL,
            range: _vscodeLanguageserverTypes.Range.create(0, 0, 0, 0)
          },
          message: message
        }] : undefined;
        return {
          message: message,
          code: code,
          relatedInformation: relatedInformation
        };
      }
      var ResolvedSchema = function () {
        function ResolvedSchema(schema) {
          var errors = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
          var warnings = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
          var schemaDraft = arguments.length > 3 ? arguments[3] : undefined;
          _classCallCheck(this, ResolvedSchema);
          this.schema = schema;
          this.errors = errors;
          this.warnings = warnings;
          this.schemaDraft = schemaDraft;
        }
        return _createClass(ResolvedSchema, [{
          key: "getSection",
          value: function getSection(path) {
            var schemaRef = this.getSectionRecursive(path, this.schema);
            if (schemaRef) {
              return (0, _jsonParser.asSchema)(schemaRef);
            }
            return undefined;
          }
        }, {
          key: "getSectionRecursive",
          value: function getSectionRecursive(path, schema) {
            if (!schema || typeof schema === 'boolean' || path.length === 0) {
              return schema;
            }
            var next = path.shift();
            if (schema.properties && _typeof(schema.properties[next])) {
              return this.getSectionRecursive(path, schema.properties[next]);
            } else if (schema.patternProperties) {
              for (var _i11 = 0, _Object$keys4 = Object.keys(schema.patternProperties); _i11 < _Object$keys4.length; _i11++) {
                var pattern = _Object$keys4[_i11];
                var regex = Strings.extendedRegExp(pattern);
                if (regex !== null && regex !== void 0 && regex.test(next)) {
                  return this.getSectionRecursive(path, schema.patternProperties[pattern]);
                }
              }
            } else if (_typeof(schema.additionalProperties) === 'object') {
              return this.getSectionRecursive(path, schema.additionalProperties);
            } else if (next.match('[0-9]+')) {
              if (Array.isArray(schema.items)) {
                var index = parseInt(next, 10);
                if (!isNaN(index) && schema.items[index]) {
                  return this.getSectionRecursive(path, schema.items[index]);
                }
              } else if (schema.items) {
                return this.getSectionRecursive(path, schema.items);
              }
            }
            return undefined;
          }
        }]);
      }();
      exports.ResolvedSchema = ResolvedSchema;
      var JSONSchemaService = function () {
        function JSONSchemaService(requestService, contextService, promiseConstructor) {
          _classCallCheck(this, JSONSchemaService);
          this.contextService = contextService;
          this.requestService = requestService;
          this.promiseConstructor = promiseConstructor || Promise;
          this.callOnDispose = [];
          this.contributionSchemas = {};
          this.contributionAssociations = [];
          this.schemasById = {};
          this.filePatternAssociations = [];
          this.registeredSchemasIds = {};
        }
        return _createClass(JSONSchemaService, [{
          key: "getRegisteredSchemaIds",
          value: function getRegisteredSchemaIds(filter) {
            return Object.keys(this.registeredSchemasIds).filter(function (id) {
              var scheme = _vscodeUri.URI.parse(id).scheme;
              return scheme !== 'schemaservice' && (!filter || filter(scheme));
            });
          }
        }, {
          key: "promise",
          get: function get() {
            return this.promiseConstructor;
          }
        }, {
          key: "dispose",
          value: function dispose() {
            while (this.callOnDispose.length > 0) {
              this.callOnDispose.pop()();
            }
          }
        }, {
          key: "onResourceChange",
          value: function onResourceChange(uri) {
            var _this19 = this;
            this.cachedSchemaForResource = undefined;
            var hasChanges = false;
            uri = (0, _jsonParser.normalizeId)(uri);
            var toWalk = [uri];
            var all = Object.keys(this.schemasById).map(function (key) {
              return _this19.schemasById[key];
            });
            while (toWalk.length) {
              var curr = toWalk.pop();
              for (var i = 0; i < all.length; i++) {
                var handle = all[i];
                if (handle && (handle.uri === curr || handle.dependencies.has(curr))) {
                  if (handle.uri !== curr) {
                    toWalk.push(handle.uri);
                  }
                  if (handle.clearSchema()) {
                    hasChanges = true;
                  }
                  all[i] = undefined;
                }
              }
            }
            return hasChanges;
          }
        }, {
          key: "setSchemaContributions",
          value: function setSchemaContributions(schemaContributions) {
            if (schemaContributions.schemas) {
              var schemas = schemaContributions.schemas;
              for (var id in schemas) {
                var normalizedId = (0, _jsonParser.normalizeId)(id);
                this.contributionSchemas[normalizedId] = this.addSchemaHandle(normalizedId, schemas[id]);
              }
            }
            if (Array.isArray(schemaContributions.schemaAssociations)) {
              var schemaAssociations = schemaContributions.schemaAssociations;
              var _iterator24 = _createForOfIteratorHelper(schemaAssociations),
                _step24;
              try {
                for (_iterator24.s(); !(_step24 = _iterator24.n()).done;) {
                  var schemaAssociation = _step24.value;
                  var uris = schemaAssociation.uris.map(_jsonParser.normalizeId);
                  var association = this.addFilePatternAssociation(schemaAssociation.pattern, schemaAssociation.folderUri, uris);
                  this.contributionAssociations.push(association);
                }
              } catch (err) {
                _iterator24.e(err);
              } finally {
                _iterator24.f();
              }
            }
          }
        }, {
          key: "addSchemaHandle",
          value: function addSchemaHandle(id, unresolvedSchemaContent) {
            var schemaHandle = new SchemaHandle(this, id, unresolvedSchemaContent);
            this.schemasById[id] = schemaHandle;
            return schemaHandle;
          }
        }, {
          key: "getOrAddSchemaHandle",
          value: function getOrAddSchemaHandle(id, unresolvedSchemaContent) {
            return this.schemasById[id] || this.addSchemaHandle(id, unresolvedSchemaContent);
          }
        }, {
          key: "addFilePatternAssociation",
          value: function addFilePatternAssociation(pattern, folderUri, uris) {
            var fpa = new FilePatternAssociation(pattern, folderUri, uris);
            this.filePatternAssociations.push(fpa);
            return fpa;
          }
        }, {
          key: "registerExternalSchema",
          value: function registerExternalSchema(config) {
            var id = (0, _jsonParser.normalizeId)(config.uri);
            this.registeredSchemasIds[id] = true;
            this.cachedSchemaForResource = undefined;
            if (config.fileMatch && config.fileMatch.length) {
              this.addFilePatternAssociation(config.fileMatch, config.folderUri, [id]);
            }
            return config.schema ? this.addSchemaHandle(id, config.schema) : this.getOrAddSchemaHandle(id);
          }
        }, {
          key: "clearExternalSchemas",
          value: function clearExternalSchemas() {
            this.schemasById = {};
            this.filePatternAssociations = [];
            this.registeredSchemasIds = {};
            this.cachedSchemaForResource = undefined;
            for (var id in this.contributionSchemas) {
              this.schemasById[id] = this.contributionSchemas[id];
              this.registeredSchemasIds[id] = true;
            }
            var _iterator25 = _createForOfIteratorHelper(this.contributionAssociations),
              _step25;
            try {
              for (_iterator25.s(); !(_step25 = _iterator25.n()).done;) {
                var contributionAssociation = _step25.value;
                this.filePatternAssociations.push(contributionAssociation);
              }
            } catch (err) {
              _iterator25.e(err);
            } finally {
              _iterator25.f();
            }
          }
        }, {
          key: "getResolvedSchema",
          value: function getResolvedSchema(schemaId) {
            var id = (0, _jsonParser.normalizeId)(schemaId);
            var schemaHandle = this.schemasById[id];
            if (schemaHandle) {
              return schemaHandle.getResolvedSchema();
            }
            return this.promise.resolve(undefined);
          }
        }, {
          key: "loadSchema",
          value: function loadSchema(url) {
            if (!this.requestService) {
              var errorMessage = l10n.t('Unable to load schema from \'{0}\'. No schema request service available', toDisplayString(url));
              return this.promise.resolve(new UnresolvedSchema({}, [toDiagnostic(errorMessage, _jsonLanguageTypes.ErrorCode.SchemaResolveError, url)]));
            }
            return this.requestService(url).then(function (content) {
              if (!content) {
                var _errorMessage = l10n.t('Unable to load schema from \'{0}\': No content.', toDisplayString(url));
                return new UnresolvedSchema({}, [toDiagnostic(_errorMessage, _jsonLanguageTypes.ErrorCode.SchemaResolveError, url)]);
              }
              var errors = [];
              if (content.charCodeAt(0) === 65279) {
                errors.push(toDiagnostic(l10n.t('Problem reading content from \'{0}\': UTF-8 with BOM detected, only UTF 8 is allowed.', toDisplayString(url)), _jsonLanguageTypes.ErrorCode.SchemaResolveError, url));
                content = content.trimStart();
              }
              var schemaContent = {};
              var jsonErrors = [];
              schemaContent = Json.parse(content, jsonErrors);
              if (jsonErrors.length) {
                errors.push(toDiagnostic(l10n.t('Unable to parse content from \'{0}\': Parse error at offset {1}.', toDisplayString(url), jsonErrors[0].offset), _jsonLanguageTypes.ErrorCode.SchemaResolveError, url));
              }
              return new UnresolvedSchema(schemaContent, errors);
            }, function (error) {
              var message = error.message,
                code = error.code;
              if (typeof message !== 'string') {
                var _errorMessage2 = error.toString();
                var errorSplit = error.toString().split('Error: ');
                if (errorSplit.length > 1) {
                  _errorMessage2 = errorSplit[1];
                }
                if (Strings.endsWith(_errorMessage2, '.')) {
                  _errorMessage2 = _errorMessage2.substr(0, _errorMessage2.length - 1);
                }
                message = _errorMessage2;
              }
              var errorCode = _jsonLanguageTypes.ErrorCode.SchemaResolveError;
              if (typeof code === 'number' && code < 0x10000) {
                errorCode += code;
              }
              var errorMessage = l10n.t('Unable to load schema from \'{0}\': {1}.', toDisplayString(url), message);
              return new UnresolvedSchema({}, [toDiagnostic(errorMessage, errorCode, url)]);
            });
          }
        }, {
          key: "resolveSchemaContent",
          value: function resolveSchemaContent(schemaToResolve, handle) {
            var _this20 = this;
            var resolveErrors = schemaToResolve.errors.slice(0);
            var schema = schemaToResolve.schema;
            var schemaDraft = schema.$schema ? (0, _jsonParser.getSchemaDraftFromId)(schema.$schema) : undefined;
            if (schemaDraft === _jsonLanguageTypes.SchemaDraft.v3) {
              return this.promise.resolve(new ResolvedSchema({}, [toDiagnostic(l10n.t("Draft-03 schemas are not supported."), _jsonLanguageTypes.ErrorCode.SchemaUnsupportedFeature)], [], schemaDraft));
            }
            var usesUnsupportedFeatures = new Set();
            var contextService = this.contextService;
            var findSectionByJSONPointer = function findSectionByJSONPointer(schema, path) {
              path = decodeURIComponent(path);
              var current = schema;
              if (path[0] === '/') {
                path = path.substring(1);
              }
              path.split('/').some(function (part) {
                part = part.replace(/~1/g, '/').replace(/~0/g, '~');
                current = current[part];
                return !current;
              });
              return current;
            };
            var findSchemaById = function findSchemaById(schema, handle, id) {
              if (!handle.anchors) {
                handle.anchors = collectAnchors(schema);
              }
              return handle.anchors.get(id);
            };
            var merge = function merge(target, section) {
              for (var key in section) {
                if (section.hasOwnProperty(key) && key !== 'id' && key !== '$id') {
                  target[key] = section[key];
                }
              }
            };
            var mergeRef = function mergeRef(target, sourceRoot, sourceHandle, refSegment) {
              var section;
              if (refSegment === undefined || refSegment.length === 0) {
                section = sourceRoot;
              } else if (refSegment.charAt(0) === '/') {
                section = findSectionByJSONPointer(sourceRoot, refSegment);
              } else {
                section = findSchemaById(sourceRoot, sourceHandle, refSegment);
              }
              if (section) {
                merge(target, section);
              } else {
                var message = l10n.t('$ref \'{0}\' in \'{1}\' can not be resolved.', refSegment || '', sourceHandle.uri);
                resolveErrors.push(toDiagnostic(message, _jsonLanguageTypes.ErrorCode.SchemaResolveError));
              }
            };
            var resolveExternalLink = function resolveExternalLink(node, uri, refSegment, parentHandle) {
              if (contextService && !/^[A-Za-z][A-Za-z0-9+\-.+]*:\/.*/.test(uri)) {
                uri = contextService.resolveRelativePath(uri, parentHandle.uri);
              }
              uri = (0, _jsonParser.normalizeId)(uri);
              var referencedHandle = _this20.getOrAddSchemaHandle(uri);
              return referencedHandle.getUnresolvedSchema().then(function (unresolvedSchema) {
                parentHandle.dependencies.add(uri);
                if (unresolvedSchema.errors.length) {
                  var error = unresolvedSchema.errors[0];
                  var loc = refSegment ? uri + '#' + refSegment : uri;
                  var errorMessage = refSegment ? l10n.t('Problems loading reference \'{0}\': {1}', refSegment, error.message) : error.message;
                  resolveErrors.push(toDiagnostic(errorMessage, error.code, uri));
                }
                mergeRef(node, unresolvedSchema.schema, referencedHandle, refSegment);
                return resolveRefs(node, unresolvedSchema.schema, referencedHandle);
              });
            };
            var resolveRefs = function resolveRefs(node, parentSchema, parentHandle) {
              var openPromises = [];
              _this20.traverseNodes(node, function (next) {
                var seenRefs = new Set();
                while (next.$ref) {
                  var ref = next.$ref;
                  var segments = ref.split('#', 2);
                  delete next.$ref;
                  if (segments[0].length > 0) {
                    openPromises.push(resolveExternalLink(next, segments[0], segments[1], parentHandle));
                    return;
                  } else {
                    if (!seenRefs.has(ref)) {
                      var id = segments[1];
                      mergeRef(next, parentSchema, parentHandle, id);
                      seenRefs.add(ref);
                    }
                  }
                }
                if (next.$recursiveRef) {
                  usesUnsupportedFeatures.add('$recursiveRef');
                }
                if (next.$dynamicRef) {
                  usesUnsupportedFeatures.add('$dynamicRef');
                }
              });
              return _this20.promise.all(openPromises);
            };
            var collectAnchors = function collectAnchors(root) {
              var result = new Map();
              _this20.traverseNodes(root, function (next) {
                var id = next.$id || next.id;
                var anchor = (0, _objects.isString)(id) && id.charAt(0) === '#' ? id.substring(1) : next.$anchor;
                if (anchor) {
                  if (result.has(anchor)) {
                    resolveErrors.push(toDiagnostic(l10n.t('Duplicate anchor declaration: \'{0}\'', anchor), _jsonLanguageTypes.ErrorCode.SchemaResolveError));
                  } else {
                    result.set(anchor, next);
                  }
                }
                if (next.$recursiveAnchor) {
                  usesUnsupportedFeatures.add('$recursiveAnchor');
                }
                if (next.$dynamicAnchor) {
                  usesUnsupportedFeatures.add('$dynamicAnchor');
                }
              });
              return result;
            };
            return resolveRefs(schema, schema, handle).then(function (_) {
              var resolveWarnings = [];
              if (usesUnsupportedFeatures.size) {
                resolveWarnings.push(toDiagnostic(l10n.t('The schema uses meta-schema features ({0}) that are not yet supported by the validator.', Array.from(usesUnsupportedFeatures.keys()).join(', ')), _jsonLanguageTypes.ErrorCode.SchemaUnsupportedFeature));
              }
              return new ResolvedSchema(schema, resolveErrors, resolveWarnings, schemaDraft);
            });
          }
        }, {
          key: "traverseNodes",
          value: function traverseNodes(root, handle) {
            if (!root || _typeof(root) !== 'object') {
              return Promise.resolve(null);
            }
            var seen = new Set();
            var collectEntries = function collectEntries() {
              for (var _len2 = arguments.length, entries = new Array(_len2), _key6 = 0; _key6 < _len2; _key6++) {
                entries[_key6] = arguments[_key6];
              }
              for (var _i12 = 0, _entries = entries; _i12 < _entries.length; _i12++) {
                var entry = _entries[_i12];
                if ((0, _objects.isObject)(entry)) {
                  toWalk.push(entry);
                }
              }
            };
            var collectMapEntries = function collectMapEntries() {
              for (var _len3 = arguments.length, maps = new Array(_len3), _key7 = 0; _key7 < _len3; _key7++) {
                maps[_key7] = arguments[_key7];
              }
              for (var _i13 = 0, _maps = maps; _i13 < _maps.length; _i13++) {
                var map = _maps[_i13];
                if ((0, _objects.isObject)(map)) {
                  for (var k in map) {
                    var key = k;
                    var entry = map[key];
                    if ((0, _objects.isObject)(entry)) {
                      toWalk.push(entry);
                    }
                  }
                }
              }
            };
            var collectArrayEntries = function collectArrayEntries() {
              for (var _len4 = arguments.length, arrays = new Array(_len4), _key8 = 0; _key8 < _len4; _key8++) {
                arrays[_key8] = arguments[_key8];
              }
              for (var _i14 = 0, _arrays = arrays; _i14 < _arrays.length; _i14++) {
                var array = _arrays[_i14];
                if (Array.isArray(array)) {
                  var _iterator26 = _createForOfIteratorHelper(array),
                    _step26;
                  try {
                    for (_iterator26.s(); !(_step26 = _iterator26.n()).done;) {
                      var entry = _step26.value;
                      if ((0, _objects.isObject)(entry)) {
                        toWalk.push(entry);
                      }
                    }
                  } catch (err) {
                    _iterator26.e(err);
                  } finally {
                    _iterator26.f();
                  }
                }
              }
            };
            var collectEntryOrArrayEntries = function collectEntryOrArrayEntries(items) {
              if (Array.isArray(items)) {
                var _iterator27 = _createForOfIteratorHelper(items),
                  _step27;
                try {
                  for (_iterator27.s(); !(_step27 = _iterator27.n()).done;) {
                    var entry = _step27.value;
                    if ((0, _objects.isObject)(entry)) {
                      toWalk.push(entry);
                    }
                  }
                } catch (err) {
                  _iterator27.e(err);
                } finally {
                  _iterator27.f();
                }
              } else if ((0, _objects.isObject)(items)) {
                toWalk.push(items);
              }
            };
            var toWalk = [root];
            var next = toWalk.pop();
            while (next) {
              if (!seen.has(next)) {
                seen.add(next);
                handle(next);
                collectEntries(next.additionalItems, next.additionalProperties, next.not, next.contains, next.propertyNames, next["if"], next.then, next["else"], next.unevaluatedItems, next.unevaluatedProperties);
                collectMapEntries(next.definitions, next.$defs, next.properties, next.patternProperties, next.dependencies, next.dependentSchemas);
                collectArrayEntries(next.anyOf, next.allOf, next.oneOf, next.prefixItems);
                collectEntryOrArrayEntries(next.items);
              }
              next = toWalk.pop();
            }
          }
        }, {
          key: "getSchemaFromProperty",
          value: function getSchemaFromProperty(resource, document) {
            var _document$root;
            if (((_document$root = document.root) === null || _document$root === void 0 ? void 0 : _document$root.type) === 'object') {
              var _iterator28 = _createForOfIteratorHelper(document.root.properties),
                _step28;
              try {
                for (_iterator28.s(); !(_step28 = _iterator28.n()).done;) {
                  var _p$valueNode;
                  var p = _step28.value;
                  if (p.keyNode.value === '$schema' && ((_p$valueNode = p.valueNode) === null || _p$valueNode === void 0 ? void 0 : _p$valueNode.type) === 'string') {
                    var schemaId = p.valueNode.value;
                    if (this.contextService && !/^\w[\w\d+.-]*:/.test(schemaId)) {
                      schemaId = this.contextService.resolveRelativePath(schemaId, resource);
                    }
                    return schemaId;
                  }
                }
              } catch (err) {
                _iterator28.e(err);
              } finally {
                _iterator28.f();
              }
            }
            return undefined;
          }
        }, {
          key: "getAssociatedSchemas",
          value: function getAssociatedSchemas(resource) {
            var seen = Object.create(null);
            var schemas = [];
            var normalizedResource = normalizeResourceForMatching(resource);
            var _iterator29 = _createForOfIteratorHelper(this.filePatternAssociations),
              _step29;
            try {
              for (_iterator29.s(); !(_step29 = _iterator29.n()).done;) {
                var entry = _step29.value;
                if (entry.matchesPattern(normalizedResource)) {
                  var _iterator30 = _createForOfIteratorHelper(entry.getURIs()),
                    _step30;
                  try {
                    for (_iterator30.s(); !(_step30 = _iterator30.n()).done;) {
                      var schemaId = _step30.value;
                      if (!seen[schemaId]) {
                        schemas.push(schemaId);
                        seen[schemaId] = true;
                      }
                    }
                  } catch (err) {
                    _iterator30.e(err);
                  } finally {
                    _iterator30.f();
                  }
                }
              }
            } catch (err) {
              _iterator29.e(err);
            } finally {
              _iterator29.f();
            }
            return schemas;
          }
        }, {
          key: "getSchemaURIsForResource",
          value: function getSchemaURIsForResource(resource, document) {
            var schemeId = document && this.getSchemaFromProperty(resource, document);
            if (schemeId) {
              return [schemeId];
            }
            return this.getAssociatedSchemas(resource);
          }
        }, {
          key: "getSchemaForResource",
          value: function getSchemaForResource(resource, document) {
            if (document) {
              var schemeId = this.getSchemaFromProperty(resource, document);
              if (schemeId) {
                var id = (0, _jsonParser.normalizeId)(schemeId);
                return this.getOrAddSchemaHandle(id).getResolvedSchema();
              }
            }
            if (this.cachedSchemaForResource && this.cachedSchemaForResource.resource === resource) {
              return this.cachedSchemaForResource.resolvedSchema;
            }
            var schemas = this.getAssociatedSchemas(resource);
            var resolvedSchema = schemas.length > 0 ? this.createCombinedSchema(resource, schemas).getResolvedSchema() : this.promise.resolve(undefined);
            this.cachedSchemaForResource = {
              resource: resource,
              resolvedSchema: resolvedSchema
            };
            return resolvedSchema;
          }
        }, {
          key: "createCombinedSchema",
          value: function createCombinedSchema(resource, schemaIds) {
            if (schemaIds.length === 1) {
              return this.getOrAddSchemaHandle(schemaIds[0]);
            } else {
              var combinedSchemaId = 'schemaservice://combinedSchema/' + encodeURIComponent(resource);
              var combinedSchema = {
                allOf: schemaIds.map(function (schemaId) {
                  return {
                    $ref: schemaId
                  };
                })
              };
              return this.addSchemaHandle(combinedSchemaId, combinedSchema);
            }
          }
        }, {
          key: "getMatchingSchemas",
          value: function getMatchingSchemas(document, jsonDocument, schema) {
            if (schema) {
              var id = schema.id || 'schemaservice://untitled/matchingSchemas/' + idCounter++;
              var handle = this.addSchemaHandle(id, schema);
              return handle.getResolvedSchema().then(function (resolvedSchema) {
                return jsonDocument.getMatchingSchemas(resolvedSchema.schema).filter(function (s) {
                  return !s.inverted;
                });
              });
            }
            return this.getSchemaForResource(document.uri, jsonDocument).then(function (schema) {
              if (schema) {
                return jsonDocument.getMatchingSchemas(schema.schema).filter(function (s) {
                  return !s.inverted;
                });
              }
              return [];
            });
          }
        }]);
      }();
      exports.JSONSchemaService = JSONSchemaService;
      var idCounter = 0;
      function normalizeResourceForMatching(resource) {
        try {
          return _vscodeUri.URI.parse(resource)["with"]({
            fragment: null,
            query: null
          }).toString(true);
        } catch (e) {
          return resource;
        }
      }
      function toDisplayString(url) {
        try {
          var uri = _vscodeUri.URI.parse(url);
          if (uri.scheme === 'file') {
            return uri.fsPath;
          }
        } catch (e) {}
        return url;
      }
    }, {
      "../jsonLanguageTypes": 9,
      "../parser/jsonParser": 10,
      "../utils/glob": 24,
      "../utils/objects": 26,
      "../utils/strings": 29,
      "@vscode/l10n": 1,
      "jsonc-parser": 7,
      "vscode-languageserver-types": 31,
      "vscode-uri": 32
    }],
    18: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.getSelectionRanges = getSelectionRanges;
      var _jsonLanguageTypes = require("../jsonLanguageTypes");
      var _jsoncParser = require("jsonc-parser");
      function getSelectionRanges(document, positions, doc) {
        function getSelectionRange(position) {
          var offset = document.offsetAt(position);
          var node = doc.getNodeFromOffset(offset, true);
          var result = [];
          while (node) {
            switch (node.type) {
              case 'string':
              case 'object':
              case 'array':
                var cStart = node.offset + 1,
                  cEnd = node.offset + node.length - 1;
                if (cStart < cEnd && offset >= cStart && offset <= cEnd) {
                  result.push(newRange(cStart, cEnd));
                }
                result.push(newRange(node.offset, node.offset + node.length));
                break;
              case 'number':
              case 'boolean':
              case 'null':
              case 'property':
                result.push(newRange(node.offset, node.offset + node.length));
                break;
            }
            if (node.type === 'property' || node.parent && node.parent.type === 'array') {
              var afterCommaOffset = getOffsetAfterNextToken(node.offset + node.length, 5);
              if (afterCommaOffset !== -1) {
                result.push(newRange(node.offset, afterCommaOffset));
              }
            }
            node = node.parent;
          }
          var current = undefined;
          for (var index = result.length - 1; index >= 0; index--) {
            current = _jsonLanguageTypes.SelectionRange.create(result[index], current);
          }
          if (!current) {
            current = _jsonLanguageTypes.SelectionRange.create(_jsonLanguageTypes.Range.create(position, position));
          }
          return current;
        }
        function newRange(start, end) {
          return _jsonLanguageTypes.Range.create(document.positionAt(start), document.positionAt(end));
        }
        var scanner = (0, _jsoncParser.createScanner)(document.getText(), true);
        function getOffsetAfterNextToken(offset, expectedToken) {
          scanner.setPosition(offset);
          var token = scanner.scan();
          if (token === expectedToken) {
            return scanner.getTokenOffset() + scanner.getTokenLength();
          }
          return -1;
        }
        return positions.map(getSelectionRange);
      }
    }, {
      "../jsonLanguageTypes": 9,
      "jsonc-parser": 7
    }],
    19: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.JSONValidation = void 0;
      var _jsonLanguageTypes = require("../jsonLanguageTypes");
      var l10n = _interopRequireWildcard(require("@vscode/l10n"));
      var _objects = require("../utils/objects");
      function _interopRequireWildcard(e, t) {
        if ("function" == typeof WeakMap) var r = new WeakMap(),
          n = new WeakMap();
        return (_interopRequireWildcard = function _interopRequireWildcard(e, t) {
          if (!t && e && e.__esModule) return e;
          var o,
            i,
            f = {
              __proto__: null,
              "default": e
            };
          if (null === e || "object" != _typeof(e) && "function" != typeof e) return f;
          if (o = t ? n : r) {
            if (o.has(e)) return o.get(e);
            o.set(e, f);
          }
          for (var _t8 in e) "default" !== _t8 && {}.hasOwnProperty.call(e, _t8) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t8)) && (i.get || i.set) ? o(f, _t8, i) : f[_t8] = e[_t8]);
          return f;
        })(e, t);
      }
      var JSONValidation = function () {
        function JSONValidation(jsonSchemaService, promiseConstructor) {
          _classCallCheck(this, JSONValidation);
          this.jsonSchemaService = jsonSchemaService;
          this.promise = promiseConstructor;
          this.validationEnabled = true;
        }
        return _createClass(JSONValidation, [{
          key: "configure",
          value: function configure(raw) {
            if (raw) {
              this.validationEnabled = raw.validate !== false;
              this.commentSeverity = raw.allowComments ? undefined : _jsonLanguageTypes.DiagnosticSeverity.Error;
            }
          }
        }, {
          key: "doValidation",
          value: function doValidation(textDocument, jsonDocument, documentSettings, schema) {
            var _this21 = this;
            if (!this.validationEnabled) {
              return this.promise.resolve([]);
            }
            var diagnostics = [];
            var added = {};
            var addProblem = function addProblem(problem) {
              var signature = problem.range.start.line + ' ' + problem.range.start.character + ' ' + problem.message;
              if (!added[signature]) {
                added[signature] = true;
                diagnostics.push(problem);
              }
            };
            var getDiagnostics = function getDiagnostics(schema) {
              var trailingCommaSeverity = documentSettings !== null && documentSettings !== void 0 && documentSettings.trailingCommas ? toDiagnosticSeverity(documentSettings.trailingCommas) : _jsonLanguageTypes.DiagnosticSeverity.Error;
              var commentSeverity = documentSettings !== null && documentSettings !== void 0 && documentSettings.comments ? toDiagnosticSeverity(documentSettings.comments) : _this21.commentSeverity;
              var schemaValidation = documentSettings !== null && documentSettings !== void 0 && documentSettings.schemaValidation ? toDiagnosticSeverity(documentSettings.schemaValidation) : _jsonLanguageTypes.DiagnosticSeverity.Warning;
              var schemaRequest = documentSettings !== null && documentSettings !== void 0 && documentSettings.schemaRequest ? toDiagnosticSeverity(documentSettings.schemaRequest) : _jsonLanguageTypes.DiagnosticSeverity.Warning;
              if (schema) {
                var addSchemaProblem = function addSchemaProblem(errorMessage, errorCode, relatedInformation) {
                  if (jsonDocument.root && schemaRequest) {
                    var astRoot = jsonDocument.root;
                    var property = astRoot.type === 'object' ? astRoot.properties[0] : undefined;
                    if (property && property.keyNode.value === '$schema') {
                      var node = property.valueNode || property;
                      var range = _jsonLanguageTypes.Range.create(textDocument.positionAt(node.offset), textDocument.positionAt(node.offset + node.length));
                      addProblem(_jsonLanguageTypes.Diagnostic.create(range, errorMessage, schemaRequest, errorCode, 'json', relatedInformation));
                    } else {
                      var _range6 = _jsonLanguageTypes.Range.create(textDocument.positionAt(astRoot.offset), textDocument.positionAt(astRoot.offset + 1));
                      addProblem(_jsonLanguageTypes.Diagnostic.create(_range6, errorMessage, schemaRequest, errorCode, 'json', relatedInformation));
                    }
                  }
                };
                if (schema.errors.length) {
                  var error = schema.errors[0];
                  addSchemaProblem(error.message, error.code, error.relatedInformation);
                } else if (schemaValidation) {
                  var _iterator31 = _createForOfIteratorHelper(schema.warnings),
                    _step31;
                  try {
                    for (_iterator31.s(); !(_step31 = _iterator31.n()).done;) {
                      var warning = _step31.value;
                      addSchemaProblem(warning.message, warning.code, warning.relatedInformation);
                    }
                  } catch (err) {
                    _iterator31.e(err);
                  } finally {
                    _iterator31.f();
                  }
                  var semanticErrors = jsonDocument.validate(textDocument, schema.schema, schemaValidation, documentSettings === null || documentSettings === void 0 ? void 0 : documentSettings.schemaDraft);
                  if (semanticErrors) {
                    semanticErrors.forEach(addProblem);
                  }
                }
                if (schemaAllowsComments(schema.schema)) {
                  commentSeverity = undefined;
                }
                if (schemaAllowsTrailingCommas(schema.schema)) {
                  trailingCommaSeverity = undefined;
                }
              }
              var _iterator32 = _createForOfIteratorHelper(jsonDocument.syntaxErrors),
                _step32;
              try {
                for (_iterator32.s(); !(_step32 = _iterator32.n()).done;) {
                  var p = _step32.value;
                  if (p.code === _jsonLanguageTypes.ErrorCode.TrailingComma) {
                    if (typeof trailingCommaSeverity !== 'number') {
                      continue;
                    }
                    p.severity = trailingCommaSeverity;
                  }
                  addProblem(p);
                }
              } catch (err) {
                _iterator32.e(err);
              } finally {
                _iterator32.f();
              }
              if (typeof commentSeverity === 'number') {
                var message = l10n.t('Comments are not permitted in JSON.');
                jsonDocument.comments.forEach(function (c) {
                  addProblem(_jsonLanguageTypes.Diagnostic.create(c, message, commentSeverity, _jsonLanguageTypes.ErrorCode.CommentNotPermitted));
                });
              }
              return diagnostics;
            };
            if (schema) {
              var uri = schema.id || 'schemaservice://untitled/' + idCounter++;
              var handle = this.jsonSchemaService.registerExternalSchema({
                uri: uri,
                schema: schema
              });
              return handle.getResolvedSchema().then(function (resolvedSchema) {
                return getDiagnostics(resolvedSchema);
              });
            }
            return this.jsonSchemaService.getSchemaForResource(textDocument.uri, jsonDocument).then(function (schema) {
              return getDiagnostics(schema);
            });
          }
        }, {
          key: "getLanguageStatus",
          value: function getLanguageStatus(textDocument, jsonDocument) {
            return {
              schemas: this.jsonSchemaService.getSchemaURIsForResource(textDocument.uri, jsonDocument)
            };
          }
        }]);
      }();
      exports.JSONValidation = JSONValidation;
      var idCounter = 0;
      function schemaAllowsComments(schemaRef) {
        if (schemaRef && _typeof(schemaRef) === 'object') {
          if ((0, _objects.isBoolean)(schemaRef.allowComments)) {
            return schemaRef.allowComments;
          }
          if (schemaRef.allOf) {
            var _iterator33 = _createForOfIteratorHelper(schemaRef.allOf),
              _step33;
            try {
              for (_iterator33.s(); !(_step33 = _iterator33.n()).done;) {
                var schema = _step33.value;
                var allow = schemaAllowsComments(schema);
                if ((0, _objects.isBoolean)(allow)) {
                  return allow;
                }
              }
            } catch (err) {
              _iterator33.e(err);
            } finally {
              _iterator33.f();
            }
          }
        }
        return undefined;
      }
      function schemaAllowsTrailingCommas(schemaRef) {
        if (schemaRef && _typeof(schemaRef) === 'object') {
          if ((0, _objects.isBoolean)(schemaRef.allowTrailingCommas)) {
            return schemaRef.allowTrailingCommas;
          }
          var deprSchemaRef = schemaRef;
          if ((0, _objects.isBoolean)(deprSchemaRef['allowsTrailingCommas'])) {
            return deprSchemaRef['allowsTrailingCommas'];
          }
          if (schemaRef.allOf) {
            var _iterator34 = _createForOfIteratorHelper(schemaRef.allOf),
              _step34;
            try {
              for (_iterator34.s(); !(_step34 = _iterator34.n()).done;) {
                var schema = _step34.value;
                var allow = schemaAllowsTrailingCommas(schema);
                if ((0, _objects.isBoolean)(allow)) {
                  return allow;
                }
              }
            } catch (err) {
              _iterator34.e(err);
            } finally {
              _iterator34.f();
            }
          }
        }
        return undefined;
      }
      function toDiagnosticSeverity(severityLevel) {
        switch (severityLevel) {
          case 'error':
            return _jsonLanguageTypes.DiagnosticSeverity.Error;
          case 'warning':
            return _jsonLanguageTypes.DiagnosticSeverity.Warning;
          case 'ignore':
            return undefined;
        }
        return undefined;
      }
    }, {
      "../jsonLanguageTypes": 9,
      "../utils/objects": 26,
      "@vscode/l10n": 1
    }],
    20: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports["default"] = void 0;
      var _default = exports["default"] = {
        $id: 'https://json-schema.org/draft/2019-09/schema',
        $schema: 'https://json-schema.org/draft/2019-09/schema',
        title: '(Flattened static) Core and Validation specifications meta-schema',
        type: ['object', 'boolean'],
        properties: {
          definitions: {
            $comment: 'While no longer an official keyword as it is replaced by $defs, this keyword is retained in the meta-schema to prevent incompatible extensions as it remains in common use.',
            type: 'object',
            additionalProperties: {
              $ref: '#'
            },
            "default": {}
          },
          dependencies: {
            $comment: '"dependencies" is no longer a keyword, but schema authors should avoid redefining it to facilitate a smooth transition to "dependentSchemas" and "dependentRequired"',
            type: 'object',
            additionalProperties: {
              anyOf: [{
                $ref: '#'
              }, {
                $ref: '#/$defs/stringArray'
              }]
            }
          },
          $id: {
            type: 'string',
            format: 'uri-reference',
            $comment: 'Non-empty fragments not allowed.',
            pattern: '^[^#]*#?$'
          },
          $schema: {
            type: 'string',
            format: 'uri'
          },
          $anchor: {
            type: 'string',
            pattern: '^[A-Za-z][-A-Za-z0-9.:_]*$'
          },
          $ref: {
            type: 'string',
            format: 'uri-reference'
          },
          $recursiveAnchor: {
            type: 'boolean',
            "default": false
          },
          $vocabulary: {
            type: 'object',
            propertyNames: {
              type: 'string',
              format: 'uri'
            },
            additionalProperties: {
              type: 'boolean'
            }
          },
          $comment: {
            type: 'string'
          },
          $defs: {
            type: 'object',
            additionalProperties: {
              $ref: '#'
            },
            "default": {}
          },
          additionalItems: {
            $ref: '#'
          },
          unevaluatedItems: {
            $ref: '#'
          },
          items: {
            anyOf: [{
              $ref: '#'
            }, {
              $ref: '#/$defs/schemaArray'
            }]
          },
          contains: {
            $ref: '#'
          },
          additionalProperties: {
            $ref: '#'
          },
          unevaluatedProperties: {
            $ref: '#'
          },
          properties: {
            type: 'object',
            additionalProperties: {
              $ref: '#'
            },
            "default": {}
          },
          patternProperties: {
            type: 'object',
            additionalProperties: {
              $ref: '#'
            },
            propertyNames: {
              format: 'regex'
            },
            "default": {}
          },
          dependentSchemas: {
            type: 'object',
            additionalProperties: {
              $ref: '#'
            }
          },
          propertyNames: {
            $ref: '#'
          },
          "if": {
            $ref: '#'
          },
          then: {
            $ref: '#'
          },
          "else": {
            $ref: '#'
          },
          allOf: {
            $ref: '#/$defs/schemaArray'
          },
          anyOf: {
            $ref: '#/$defs/schemaArray'
          },
          oneOf: {
            $ref: '#/$defs/schemaArray'
          },
          not: {
            $ref: '#'
          },
          multipleOf: {
            type: 'number',
            exclusiveMinimum: 0
          },
          maximum: {
            type: 'number'
          },
          exclusiveMaximum: {
            type: 'number'
          },
          minimum: {
            type: 'number'
          },
          exclusiveMinimum: {
            type: 'number'
          },
          maxLength: {
            $ref: '#/$defs/nonNegativeInteger'
          },
          minLength: {
            $ref: '#/$defs/nonNegativeIntegerDefault0'
          },
          pattern: {
            type: 'string',
            format: 'regex'
          },
          maxItems: {
            $ref: '#/$defs/nonNegativeInteger'
          },
          minItems: {
            $ref: '#/$defs/nonNegativeIntegerDefault0'
          },
          uniqueItems: {
            type: 'boolean',
            "default": false
          },
          maxContains: {
            $ref: '#/$defs/nonNegativeInteger'
          },
          minContains: {
            $ref: '#/$defs/nonNegativeInteger',
            "default": 1
          },
          maxProperties: {
            $ref: '#/$defs/nonNegativeInteger'
          },
          minProperties: {
            $ref: '#/$defs/nonNegativeIntegerDefault0'
          },
          required: {
            $ref: '#/$defs/stringArray'
          },
          dependentRequired: {
            type: 'object',
            additionalProperties: {
              $ref: '#/$defs/stringArray'
            }
          },
          "const": true,
          "enum": {
            type: 'array',
            items: true
          },
          type: {
            anyOf: [{
              $ref: '#/$defs/simpleTypes'
            }, {
              type: 'array',
              items: {
                $ref: '#/$defs/simpleTypes'
              },
              minItems: 1,
              uniqueItems: true
            }]
          },
          title: {
            type: 'string'
          },
          description: {
            type: 'string'
          },
          "default": true,
          deprecated: {
            type: 'boolean',
            "default": false
          },
          readOnly: {
            type: 'boolean',
            "default": false
          },
          writeOnly: {
            type: 'boolean',
            "default": false
          },
          examples: {
            type: 'array',
            items: true
          },
          format: {
            type: 'string'
          },
          contentMediaType: {
            type: 'string'
          },
          contentEncoding: {
            type: 'string'
          },
          contentSchema: {
            $ref: '#'
          }
        },
        $defs: {
          schemaArray: {
            type: 'array',
            minItems: 1,
            items: {
              $ref: '#'
            }
          },
          nonNegativeInteger: {
            type: 'integer',
            minimum: 0
          },
          nonNegativeIntegerDefault0: {
            $ref: '#/$defs/nonNegativeInteger',
            "default": 0
          },
          simpleTypes: {
            "enum": ['array', 'boolean', 'integer', 'null', 'number', 'object', 'string']
          },
          stringArray: {
            type: 'array',
            items: {
              type: 'string'
            },
            uniqueItems: true,
            "default": []
          }
        }
      };
    }, {}],
    21: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports["default"] = void 0;
      var _default = exports["default"] = {
        $id: 'https://json-schema.org/draft/2020-12/schema',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: '(Flattened static) Core and Validation specifications meta-schema',
        type: ['object', 'boolean'],
        properties: {
          definitions: {
            $comment: 'While no longer an official keyword as it is replaced by $defs, this keyword is retained in the meta-schema to prevent incompatible extensions as it remains in common use.',
            type: 'object',
            additionalProperties: {
              $ref: '#'
            },
            "default": {}
          },
          dependencies: {
            $comment: '"dependencies" is no longer a keyword, but schema authors should avoid redefining it to facilitate a smooth transition to "dependentSchemas" and "dependentRequired"',
            type: 'object',
            additionalProperties: {
              anyOf: [{
                $ref: '#'
              }, {
                $ref: '#/$defs/stringArray'
              }]
            }
          },
          $id: {
            type: 'string',
            format: 'uri-reference',
            $comment: 'Non-empty fragments not allowed.',
            pattern: '^[^#]*#?$'
          },
          $schema: {
            type: 'string',
            format: 'uri'
          },
          $anchor: {
            type: 'string',
            pattern: '^[A-Za-z_][-A-Za-z0-9._]*$'
          },
          $ref: {
            type: 'string',
            format: 'uri-reference'
          },
          $dynamicRef: {
            type: 'string',
            format: 'uri-reference'
          },
          $vocabulary: {
            type: 'object',
            propertyNames: {
              type: 'string',
              format: 'uri'
            },
            additionalProperties: {
              type: 'boolean'
            }
          },
          $comment: {
            type: 'string'
          },
          $defs: {
            type: 'object',
            additionalProperties: {
              $ref: '#'
            },
            "default": {}
          },
          prefixItems: {
            $ref: '#/$defs/schemaArray'
          },
          items: {
            $ref: '#'
          },
          contains: {
            $ref: '#'
          },
          additionalProperties: {
            $ref: '#'
          },
          properties: {
            type: 'object',
            additionalProperties: {
              $ref: '#'
            },
            "default": {}
          },
          patternProperties: {
            type: 'object',
            additionalProperties: {
              $ref: '#'
            },
            propertyNames: {
              format: 'regex'
            },
            "default": {}
          },
          dependentSchemas: {
            type: 'object',
            additionalProperties: {
              $ref: '#'
            }
          },
          propertyNames: {
            $ref: '#'
          },
          "if": {
            $ref: '#'
          },
          then: {
            $ref: '#'
          },
          "else": {
            $ref: '#'
          },
          allOf: {
            $ref: '#/$defs/schemaArray'
          },
          anyOf: {
            $ref: '#/$defs/schemaArray'
          },
          oneOf: {
            $ref: '#/$defs/schemaArray'
          },
          not: {
            $ref: '#'
          },
          unevaluatedItems: {
            $ref: '#'
          },
          unevaluatedProperties: {
            $ref: '#'
          },
          multipleOf: {
            type: 'number',
            exclusiveMinimum: 0
          },
          maximum: {
            type: 'number'
          },
          exclusiveMaximum: {
            type: 'number'
          },
          minimum: {
            type: 'number'
          },
          exclusiveMinimum: {
            type: 'number'
          },
          maxLength: {
            $ref: '#/$defs/nonNegativeInteger'
          },
          minLength: {
            $ref: '#/$defs/nonNegativeIntegerDefault0'
          },
          pattern: {
            type: 'string',
            format: 'regex'
          },
          maxItems: {
            $ref: '#/$defs/nonNegativeInteger'
          },
          minItems: {
            $ref: '#/$defs/nonNegativeIntegerDefault0'
          },
          uniqueItems: {
            type: 'boolean',
            "default": false
          },
          maxContains: {
            $ref: '#/$defs/nonNegativeInteger'
          },
          minContains: {
            $ref: '#/$defs/nonNegativeInteger',
            "default": 1
          },
          maxProperties: {
            $ref: '#/$defs/nonNegativeInteger'
          },
          minProperties: {
            $ref: '#/$defs/nonNegativeIntegerDefault0'
          },
          required: {
            $ref: '#/$defs/stringArray'
          },
          dependentRequired: {
            type: 'object',
            additionalProperties: {
              $ref: '#/$defs/stringArray'
            }
          },
          "const": true,
          "enum": {
            type: 'array',
            items: true
          },
          type: {
            anyOf: [{
              $ref: '#/$defs/simpleTypes'
            }, {
              type: 'array',
              items: {
                $ref: '#/$defs/simpleTypes'
              },
              minItems: 1,
              uniqueItems: true
            }]
          },
          title: {
            type: 'string'
          },
          description: {
            type: 'string'
          },
          "default": true,
          deprecated: {
            type: 'boolean',
            "default": false
          },
          readOnly: {
            type: 'boolean',
            "default": false
          },
          writeOnly: {
            type: 'boolean',
            "default": false
          },
          examples: {
            type: 'array',
            items: true
          },
          format: {
            type: 'string'
          },
          contentMediaType: {
            type: 'string'
          },
          contentEncoding: {
            type: 'string'
          },
          contentSchema: {
            $ref: '#'
          }
        },
        $defs: {
          schemaArray: {
            type: 'array',
            minItems: 1,
            items: {
              $ref: '#'
            }
          },
          nonNegativeInteger: {
            type: 'integer',
            minimum: 0
          },
          nonNegativeIntegerDefault0: {
            $ref: '#/$defs/nonNegativeInteger',
            "default": 0
          },
          simpleTypes: {
            "enum": ['array', 'boolean', 'integer', 'null', 'number', 'object', 'string']
          },
          stringArray: {
            type: 'array',
            items: {
              type: 'string'
            },
            uniqueItems: true,
            "default": []
          }
        }
      };
    }, {}],
    22: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.colorFrom256RGB = colorFrom256RGB;
      exports.colorFromHex = colorFromHex;
      exports.hexDigit = hexDigit;
      var Digit0 = 48;
      var Digit9 = 57;
      var A = 65;
      var a = 97;
      var f = 102;
      function hexDigit(charCode) {
        if (charCode < Digit0) {
          return 0;
        }
        if (charCode <= Digit9) {
          return charCode - Digit0;
        }
        if (charCode < a) {
          charCode += a - A;
        }
        if (charCode >= a && charCode <= f) {
          return charCode - a + 10;
        }
        return 0;
      }
      function colorFromHex(text) {
        if (text[0] !== '#') {
          return undefined;
        }
        switch (text.length) {
          case 4:
            return {
              red: hexDigit(text.charCodeAt(1)) * 0x11 / 255.0,
              green: hexDigit(text.charCodeAt(2)) * 0x11 / 255.0,
              blue: hexDigit(text.charCodeAt(3)) * 0x11 / 255.0,
              alpha: 1
            };
          case 5:
            return {
              red: hexDigit(text.charCodeAt(1)) * 0x11 / 255.0,
              green: hexDigit(text.charCodeAt(2)) * 0x11 / 255.0,
              blue: hexDigit(text.charCodeAt(3)) * 0x11 / 255.0,
              alpha: hexDigit(text.charCodeAt(4)) * 0x11 / 255.0
            };
          case 7:
            return {
              red: (hexDigit(text.charCodeAt(1)) * 0x10 + hexDigit(text.charCodeAt(2))) / 255.0,
              green: (hexDigit(text.charCodeAt(3)) * 0x10 + hexDigit(text.charCodeAt(4))) / 255.0,
              blue: (hexDigit(text.charCodeAt(5)) * 0x10 + hexDigit(text.charCodeAt(6))) / 255.0,
              alpha: 1
            };
          case 9:
            return {
              red: (hexDigit(text.charCodeAt(1)) * 0x10 + hexDigit(text.charCodeAt(2))) / 255.0,
              green: (hexDigit(text.charCodeAt(3)) * 0x10 + hexDigit(text.charCodeAt(4))) / 255.0,
              blue: (hexDigit(text.charCodeAt(5)) * 0x10 + hexDigit(text.charCodeAt(6))) / 255.0,
              alpha: (hexDigit(text.charCodeAt(7)) * 0x10 + hexDigit(text.charCodeAt(8))) / 255.0
            };
        }
        return undefined;
      }
      function colorFrom256RGB(red, green, blue) {
        var alpha = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1.0;
        return {
          red: red / 255.0,
          green: green / 255.0,
          blue: blue / 255.0,
          alpha: alpha
        };
      }
    }, {}],
    23: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.format = format;
      var _jsoncParser = require("jsonc-parser");
      var _jsonLanguageTypes = require("../jsonLanguageTypes");
      function format(documentToFormat, formattingOptions, formattingRange) {
        var range = undefined;
        if (formattingRange) {
          var offset = documentToFormat.offsetAt(formattingRange.start);
          var length = documentToFormat.offsetAt(formattingRange.end) - offset;
          range = {
            offset: offset,
            length: length
          };
        }
        var options = {
          tabSize: formattingOptions ? formattingOptions.tabSize : 4,
          insertSpaces: (formattingOptions === null || formattingOptions === void 0 ? void 0 : formattingOptions.insertSpaces) === true,
          insertFinalNewline: (formattingOptions === null || formattingOptions === void 0 ? void 0 : formattingOptions.insertFinalNewline) === true,
          eol: '\n',
          keepLines: (formattingOptions === null || formattingOptions === void 0 ? void 0 : formattingOptions.keepLines) === true
        };
        return (0, _jsoncParser.format)(documentToFormat.getText(), range, options).map(function (edit) {
          return _jsonLanguageTypes.TextEdit.replace(_jsonLanguageTypes.Range.create(documentToFormat.positionAt(edit.offset), documentToFormat.positionAt(edit.offset + edit.length)), edit.content);
        });
      }
    }, {
      "../jsonLanguageTypes": 9,
      "jsonc-parser": 7
    }],
    24: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.createRegex = createRegex;
      function createRegex(glob, opts) {
        if (typeof glob !== 'string') {
          throw new TypeError('Expected a string');
        }
        var str = String(glob);
        var reStr = "";
        var extended = opts ? !!opts.extended : false;
        var globstar = opts ? !!opts.globstar : false;
        var inGroup = false;
        var flags = opts && typeof opts.flags === "string" ? opts.flags : "";
        var c;
        for (var i = 0, len = str.length; i < len; i++) {
          c = str[i];
          switch (c) {
            case "/":
            case "$":
            case "^":
            case "+":
            case ".":
            case "(":
            case ")":
            case "=":
            case "!":
            case "|":
              reStr += "\\" + c;
              break;
            case "?":
              if (extended) {
                reStr += ".";
                break;
              }
            case "[":
            case "]":
              if (extended) {
                reStr += c;
                break;
              }
            case "{":
              if (extended) {
                inGroup = true;
                reStr += "(";
                break;
              }
            case "}":
              if (extended) {
                inGroup = false;
                reStr += ")";
                break;
              }
            case ",":
              if (inGroup) {
                reStr += "|";
                break;
              }
              reStr += "\\" + c;
              break;
            case "*":
              var prevChar = str[i - 1];
              var starCount = 1;
              while (str[i + 1] === "*") {
                starCount++;
                i++;
              }
              var nextChar = str[i + 1];
              if (!globstar) {
                reStr += ".*";
              } else {
                var isGlobstar = starCount > 1 && (prevChar === "/" || prevChar === undefined || prevChar === '{' || prevChar === ',') && (nextChar === "/" || nextChar === undefined || nextChar === ',' || nextChar === '}');
                if (isGlobstar) {
                  if (nextChar === "/") {
                    i++;
                  } else if (prevChar === '/' && reStr.endsWith('\\/')) {
                    reStr = reStr.substr(0, reStr.length - 2);
                  }
                  reStr += "((?:[^/]*(?:\/|$))*)";
                } else {
                  reStr += "([^/]*)";
                }
              }
              break;
            default:
              reStr += c;
          }
        }
        if (!flags || !~flags.indexOf('g')) {
          reStr = "^" + reStr + "$";
        }
        return new RegExp(reStr, flags);
      }
      ;
    }, {}],
    25: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.stringifyObject = stringifyObject;
      function stringifyObject(obj, indent, stringifyLiteral) {
        if (obj !== null && _typeof(obj) === 'object') {
          var newIndent = indent + '\t';
          if (Array.isArray(obj)) {
            if (obj.length === 0) {
              return '[]';
            }
            var result = '[\n';
            for (var i = 0; i < obj.length; i++) {
              result += newIndent + stringifyObject(obj[i], newIndent, stringifyLiteral);
              if (i < obj.length - 1) {
                result += ',';
              }
              result += '\n';
            }
            result += indent + ']';
            return result;
          } else {
            var keys = Object.keys(obj);
            if (keys.length === 0) {
              return '{}';
            }
            var _result3 = '{\n';
            for (var _i15 = 0; _i15 < keys.length; _i15++) {
              var key = keys[_i15];
              _result3 += newIndent + JSON.stringify(key) + ': ' + stringifyObject(obj[key], newIndent, stringifyLiteral);
              if (_i15 < keys.length - 1) {
                _result3 += ',';
              }
              _result3 += '\n';
            }
            _result3 += indent + '}';
            return _result3;
          }
        }
        return stringifyLiteral(obj);
      }
    }, {}],
    26: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.equals = equals;
      exports.isBoolean = isBoolean;
      exports.isDefined = isDefined;
      exports.isNumber = isNumber;
      exports.isObject = isObject;
      exports.isString = isString;
      function equals(one, other) {
        if (one === other) {
          return true;
        }
        if (one === null || one === undefined || other === null || other === undefined) {
          return false;
        }
        if (_typeof(one) !== _typeof(other)) {
          return false;
        }
        if (_typeof(one) !== 'object') {
          return false;
        }
        if (Array.isArray(one) !== Array.isArray(other)) {
          return false;
        }
        var i, key;
        if (Array.isArray(one)) {
          if (one.length !== other.length) {
            return false;
          }
          for (i = 0; i < one.length; i++) {
            if (!equals(one[i], other[i])) {
              return false;
            }
          }
        } else {
          var oneKeys = [];
          for (key in one) {
            oneKeys.push(key);
          }
          oneKeys.sort();
          var otherKeys = [];
          for (key in other) {
            otherKeys.push(key);
          }
          otherKeys.sort();
          if (!equals(oneKeys, otherKeys)) {
            return false;
          }
          for (i = 0; i < oneKeys.length; i++) {
            if (!equals(one[oneKeys[i]], other[oneKeys[i]])) {
              return false;
            }
          }
        }
        return true;
      }
      function isNumber(val) {
        return typeof val === 'number';
      }
      function isDefined(val) {
        return typeof val !== 'undefined';
      }
      function isBoolean(val) {
        return typeof val === 'boolean';
      }
      function isString(val) {
        return typeof val === 'string';
      }
      function isObject(val) {
        return _typeof(val) === 'object' && val !== null && !Array.isArray(val);
      }
    }, {}],
    27: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.PropertyTree = exports.Container = void 0;
      var Container;
      (function (Container) {
        Container[Container["Object"] = 0] = "Object";
        Container[Container["Array"] = 1] = "Array";
      })(Container || (exports.Container = Container = {}));
      var PropertyTree = function () {
        function PropertyTree(propertyName, beginningLineNumber) {
          _classCallCheck(this, PropertyTree);
          this.propertyName = propertyName !== null && propertyName !== void 0 ? propertyName : '';
          this.beginningLineNumber = beginningLineNumber;
          this.childrenProperties = [];
          this.lastProperty = false;
          this.noKeyName = false;
        }
        return _createClass(PropertyTree, [{
          key: "addChildProperty",
          value: function addChildProperty(childProperty) {
            childProperty.parent = this;
            if (this.childrenProperties.length > 0) {
              var insertionIndex = 0;
              if (childProperty.noKeyName) {
                insertionIndex = this.childrenProperties.length;
              } else {
                insertionIndex = binarySearchOnPropertyArray(this.childrenProperties, childProperty, compareProperties);
              }
              if (insertionIndex < 0) {
                insertionIndex = insertionIndex * -1 - 1;
              }
              this.childrenProperties.splice(insertionIndex, 0, childProperty);
            } else {
              this.childrenProperties.push(childProperty);
            }
            return childProperty;
          }
        }]);
      }();
      exports.PropertyTree = PropertyTree;
      function compareProperties(propertyTree1, propertyTree2) {
        var propertyName1 = propertyTree1.propertyName.toLowerCase();
        var propertyName2 = propertyTree2.propertyName.toLowerCase();
        if (propertyName1 < propertyName2) {
          return -1;
        } else if (propertyName1 > propertyName2) {
          return 1;
        }
        return 0;
      }
      function binarySearchOnPropertyArray(propertyTreeArray, propertyTree, compare_fn) {
        var propertyName = propertyTree.propertyName.toLowerCase();
        var firstPropertyInArrayName = propertyTreeArray[0].propertyName.toLowerCase();
        var lastPropertyInArrayName = propertyTreeArray[propertyTreeArray.length - 1].propertyName.toLowerCase();
        if (propertyName < firstPropertyInArrayName) {
          return 0;
        }
        if (propertyName > lastPropertyInArrayName) {
          return propertyTreeArray.length;
        }
        var m = 0;
        var n = propertyTreeArray.length - 1;
        while (m <= n) {
          var k = n + m >> 1;
          var cmp = compare_fn(propertyTree, propertyTreeArray[k]);
          if (cmp > 0) {
            m = k + 1;
          } else if (cmp < 0) {
            n = k - 1;
          } else {
            return k;
          }
        }
        return -m - 1;
      }
    }, {}],
    28: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.sort = sort;
      var _jsoncParser = require("jsonc-parser");
      var _jsonLanguageTypes = require("../jsonLanguageTypes");
      var _format = require("./format");
      var _propertyTree = require("./propertyTree");
      function sort(documentToSort, formattingOptions) {
        var options = _objectSpread(_objectSpread({}, formattingOptions), {}, {
          keepLines: false
        });
        var formattedJsonString = _jsonLanguageTypes.TextDocument.applyEdits(documentToSort, (0, _format.format)(documentToSort, options, undefined));
        var formattedJsonDocument = _jsonLanguageTypes.TextDocument.create('test://test.json', 'json', 0, formattedJsonString);
        var jsonPropertyTree = findJsoncPropertyTree(formattedJsonDocument);
        var sortedJsonDocument = sortJsoncDocument(formattedJsonDocument, jsonPropertyTree);
        var edits = (0, _format.format)(sortedJsonDocument, options, undefined);
        var sortedAndFormattedJsonDocument = _jsonLanguageTypes.TextDocument.applyEdits(sortedJsonDocument, edits);
        return [_jsonLanguageTypes.TextEdit.replace(_jsonLanguageTypes.Range.create(_jsonLanguageTypes.Position.create(0, 0), documentToSort.positionAt(documentToSort.getText().length)), sortedAndFormattedJsonDocument)];
      }
      function findJsoncPropertyTree(formattedDocument) {
        var formattedString = formattedDocument.getText();
        var scanner = (0, _jsoncParser.createScanner)(formattedString, false);
        var rootTree = new _propertyTree.PropertyTree();
        var currentTree = rootTree;
        var currentProperty = rootTree;
        var lastProperty = rootTree;
        var token = undefined;
        var lastTokenLine = 0;
        var numberOfCharactersOnPreviousLines = 0;
        var lastNonTriviaNonCommentToken = undefined;
        var secondToLastNonTriviaNonCommentToken = undefined;
        var lineOfLastNonTriviaNonCommentToken = -1;
        var endIndexOfLastNonTriviaNonCommentToken = -1;
        var beginningLineNumber = 0;
        var endLineNumber = 0;
        var currentContainerStack = [];
        var updateLastPropertyEndLineNumber = false;
        var updateBeginningLineNumber = false;
        while ((token = scanner.scan()) !== 17) {
          if (updateLastPropertyEndLineNumber === true && token !== 14 && token !== 15 && token !== 12 && token !== 13 && currentProperty.endLineNumber === undefined) {
            var _endLineNumber = scanner.getTokenStartLine();
            if (secondToLastNonTriviaNonCommentToken === 2 || secondToLastNonTriviaNonCommentToken === 4) {
              lastProperty.endLineNumber = _endLineNumber - 1;
            } else {
              currentProperty.endLineNumber = _endLineNumber - 1;
            }
            beginningLineNumber = _endLineNumber;
            updateLastPropertyEndLineNumber = false;
          }
          if (updateBeginningLineNumber === true && token !== 14 && token !== 15 && token !== 12 && token !== 13) {
            beginningLineNumber = scanner.getTokenStartLine();
            updateBeginningLineNumber = false;
          }
          if (scanner.getTokenStartLine() !== lastTokenLine) {
            for (var i = lastTokenLine; i < scanner.getTokenStartLine(); i++) {
              var lengthOfLine = formattedDocument.getText(_jsonLanguageTypes.Range.create(_jsonLanguageTypes.Position.create(i, 0), _jsonLanguageTypes.Position.create(i + 1, 0))).length;
              numberOfCharactersOnPreviousLines = numberOfCharactersOnPreviousLines + lengthOfLine;
            }
            lastTokenLine = scanner.getTokenStartLine();
          }
          switch (token) {
            case 10:
              {
                if (lastNonTriviaNonCommentToken === undefined || lastNonTriviaNonCommentToken === 1 || lastNonTriviaNonCommentToken === 5 && currentContainerStack[currentContainerStack.length - 1] === _propertyTree.Container.Object) {
                  var childProperty = new _propertyTree.PropertyTree(scanner.getTokenValue(), beginningLineNumber);
                  lastProperty = currentProperty;
                  currentProperty = currentTree.addChildProperty(childProperty);
                }
                break;
              }
            case 3:
              {
                if (rootTree.beginningLineNumber === undefined) {
                  rootTree.beginningLineNumber = scanner.getTokenStartLine();
                }
                if (currentContainerStack[currentContainerStack.length - 1] === _propertyTree.Container.Object) {
                  currentTree = currentProperty;
                } else if (currentContainerStack[currentContainerStack.length - 1] === _propertyTree.Container.Array) {
                  var _childProperty = new _propertyTree.PropertyTree(scanner.getTokenValue(), beginningLineNumber);
                  _childProperty.noKeyName = true;
                  lastProperty = currentProperty;
                  currentProperty = currentTree.addChildProperty(_childProperty);
                  currentTree = currentProperty;
                }
                currentContainerStack.push(_propertyTree.Container.Array);
                currentProperty.type = _propertyTree.Container.Array;
                beginningLineNumber = scanner.getTokenStartLine();
                beginningLineNumber++;
                break;
              }
            case 1:
              {
                if (rootTree.beginningLineNumber === undefined) {
                  rootTree.beginningLineNumber = scanner.getTokenStartLine();
                } else if (currentContainerStack[currentContainerStack.length - 1] === _propertyTree.Container.Array) {
                  var _childProperty2 = new _propertyTree.PropertyTree(scanner.getTokenValue(), beginningLineNumber);
                  _childProperty2.noKeyName = true;
                  lastProperty = currentProperty;
                  currentProperty = currentTree.addChildProperty(_childProperty2);
                }
                currentProperty.type = _propertyTree.Container.Object;
                currentContainerStack.push(_propertyTree.Container.Object);
                currentTree = currentProperty;
                beginningLineNumber = scanner.getTokenStartLine();
                beginningLineNumber++;
                break;
              }
            case 4:
              {
                endLineNumber = scanner.getTokenStartLine();
                currentContainerStack.pop();
                if (currentProperty.endLineNumber === undefined && (lastNonTriviaNonCommentToken === 2 || lastNonTriviaNonCommentToken === 4)) {
                  currentProperty.endLineNumber = endLineNumber - 1;
                  currentProperty.lastProperty = true;
                  currentProperty.lineWhereToAddComma = lineOfLastNonTriviaNonCommentToken;
                  currentProperty.indexWhereToAddComa = endIndexOfLastNonTriviaNonCommentToken;
                  lastProperty = currentProperty;
                  currentProperty = currentProperty ? currentProperty.parent : undefined;
                  currentTree = currentProperty;
                }
                rootTree.endLineNumber = endLineNumber;
                beginningLineNumber = endLineNumber + 1;
                break;
              }
            case 2:
              {
                endLineNumber = scanner.getTokenStartLine();
                currentContainerStack.pop();
                if (lastNonTriviaNonCommentToken !== 1) {
                  if (currentProperty.endLineNumber === undefined) {
                    currentProperty.endLineNumber = endLineNumber - 1;
                    currentProperty.lastProperty = true;
                    currentProperty.lineWhereToAddComma = lineOfLastNonTriviaNonCommentToken;
                    currentProperty.indexWhereToAddComa = endIndexOfLastNonTriviaNonCommentToken;
                  }
                  lastProperty = currentProperty;
                  currentProperty = currentProperty ? currentProperty.parent : undefined;
                  currentTree = currentProperty;
                }
                rootTree.endLineNumber = scanner.getTokenStartLine();
                beginningLineNumber = endLineNumber + 1;
                break;
              }
            case 5:
              {
                endLineNumber = scanner.getTokenStartLine();
                if (currentProperty.endLineNumber === undefined && (currentContainerStack[currentContainerStack.length - 1] === _propertyTree.Container.Object || currentContainerStack[currentContainerStack.length - 1] === _propertyTree.Container.Array && (lastNonTriviaNonCommentToken === 2 || lastNonTriviaNonCommentToken === 4))) {
                  currentProperty.endLineNumber = endLineNumber;
                  currentProperty.commaIndex = scanner.getTokenOffset() - numberOfCharactersOnPreviousLines;
                  currentProperty.commaLine = endLineNumber;
                }
                if (lastNonTriviaNonCommentToken === 2 || lastNonTriviaNonCommentToken === 4) {
                  lastProperty = currentProperty;
                  currentProperty = currentProperty ? currentProperty.parent : undefined;
                  currentTree = currentProperty;
                }
                beginningLineNumber = endLineNumber + 1;
                break;
              }
            case 13:
              {
                if (lastNonTriviaNonCommentToken === 5 && lineOfLastNonTriviaNonCommentToken === scanner.getTokenStartLine() && (currentContainerStack[currentContainerStack.length - 1] === _propertyTree.Container.Array && (secondToLastNonTriviaNonCommentToken === 2 || secondToLastNonTriviaNonCommentToken === 4) || currentContainerStack[currentContainerStack.length - 1] === _propertyTree.Container.Object)) {
                  if (currentContainerStack[currentContainerStack.length - 1] === _propertyTree.Container.Array && (secondToLastNonTriviaNonCommentToken === 2 || secondToLastNonTriviaNonCommentToken === 4) || currentContainerStack[currentContainerStack.length - 1] === _propertyTree.Container.Object) {
                    currentProperty.endLineNumber = undefined;
                    updateLastPropertyEndLineNumber = true;
                  }
                }
                if ((lastNonTriviaNonCommentToken === 1 || lastNonTriviaNonCommentToken === 3) && lineOfLastNonTriviaNonCommentToken === scanner.getTokenStartLine()) {
                  updateBeginningLineNumber = true;
                }
                break;
              }
          }
          if (token !== 14 && token !== 13 && token !== 12 && token !== 15) {
            secondToLastNonTriviaNonCommentToken = lastNonTriviaNonCommentToken;
            lastNonTriviaNonCommentToken = token;
            lineOfLastNonTriviaNonCommentToken = scanner.getTokenStartLine();
            endIndexOfLastNonTriviaNonCommentToken = scanner.getTokenOffset() + scanner.getTokenLength() - numberOfCharactersOnPreviousLines;
          }
        }
        return rootTree;
      }
      function sortJsoncDocument(jsonDocument, propertyTree) {
        if (propertyTree.childrenProperties.length === 0) {
          return jsonDocument;
        }
        var sortedJsonDocument = _jsonLanguageTypes.TextDocument.create('test://test.json', 'json', 0, jsonDocument.getText());
        var queueToSort = [];
        updateSortingQueue(queueToSort, propertyTree, propertyTree.beginningLineNumber);
        while (queueToSort.length > 0) {
          var dataToSort = queueToSort.shift();
          var propertyTreeArray = dataToSort.propertyTreeArray;
          var beginningLineNumber = dataToSort.beginningLineNumber;
          for (var i = 0; i < propertyTreeArray.length; i++) {
            var _propertyTree2 = propertyTreeArray[i];
            var range = _jsonLanguageTypes.Range.create(_jsonLanguageTypes.Position.create(_propertyTree2.beginningLineNumber, 0), _jsonLanguageTypes.Position.create(_propertyTree2.endLineNumber + 1, 0));
            var jsonContentToReplace = jsonDocument.getText(range);
            var jsonDocumentToReplace = _jsonLanguageTypes.TextDocument.create('test://test.json', 'json', 0, jsonContentToReplace);
            if (_propertyTree2.lastProperty === true && i !== propertyTreeArray.length - 1) {
              var lineWhereToAddComma = _propertyTree2.lineWhereToAddComma - _propertyTree2.beginningLineNumber;
              var indexWhereToAddComma = _propertyTree2.indexWhereToAddComa;
              var _edit5 = {
                range: _jsonLanguageTypes.Range.create(_jsonLanguageTypes.Position.create(lineWhereToAddComma, indexWhereToAddComma), _jsonLanguageTypes.Position.create(lineWhereToAddComma, indexWhereToAddComma)),
                text: ','
              };
              _jsonLanguageTypes.TextDocument.update(jsonDocumentToReplace, [_edit5], 1);
            } else if (_propertyTree2.lastProperty === false && i === propertyTreeArray.length - 1) {
              var commaIndex = _propertyTree2.commaIndex;
              var commaLine = _propertyTree2.commaLine;
              var lineWhereToRemoveComma = commaLine - _propertyTree2.beginningLineNumber;
              var _edit6 = {
                range: _jsonLanguageTypes.Range.create(_jsonLanguageTypes.Position.create(lineWhereToRemoveComma, commaIndex), _jsonLanguageTypes.Position.create(lineWhereToRemoveComma, commaIndex + 1)),
                text: ''
              };
              _jsonLanguageTypes.TextDocument.update(jsonDocumentToReplace, [_edit6], 1);
            }
            var length = _propertyTree2.endLineNumber - _propertyTree2.beginningLineNumber + 1;
            var edit = {
              range: _jsonLanguageTypes.Range.create(_jsonLanguageTypes.Position.create(beginningLineNumber, 0), _jsonLanguageTypes.Position.create(beginningLineNumber + length, 0)),
              text: jsonDocumentToReplace.getText()
            };
            _jsonLanguageTypes.TextDocument.update(sortedJsonDocument, [edit], 1);
            updateSortingQueue(queueToSort, _propertyTree2, beginningLineNumber);
            beginningLineNumber = beginningLineNumber + length;
          }
        }
        return sortedJsonDocument;
      }
      function sortProperties(properties) {
        properties.sort(function (a, b) {
          return a.propertyName.localeCompare(b.propertyName);
        });
      }
      function updateSortingQueue(queue, propertyTree, beginningLineNumber) {
        if (propertyTree.childrenProperties.length === 0) {
          return;
        }
        if (propertyTree.type === _propertyTree.Container.Object) {
          var minimumBeginningLineNumber = Infinity;
          var _iterator35 = _createForOfIteratorHelper(propertyTree.childrenProperties),
            _step35;
          try {
            for (_iterator35.s(); !(_step35 = _iterator35.n()).done;) {
              var childProperty = _step35.value;
              if (childProperty.beginningLineNumber < minimumBeginningLineNumber) {
                minimumBeginningLineNumber = childProperty.beginningLineNumber;
              }
            }
          } catch (err) {
            _iterator35.e(err);
          } finally {
            _iterator35.f();
          }
          var diff = minimumBeginningLineNumber - propertyTree.beginningLineNumber;
          beginningLineNumber = beginningLineNumber + diff;
          sortProperties(propertyTree.childrenProperties);
          queue.push(new SortingRange(beginningLineNumber, propertyTree.childrenProperties));
        } else if (propertyTree.type === _propertyTree.Container.Array) {
          updateSortingQueueForArrayProperties(queue, propertyTree, beginningLineNumber);
        }
      }
      function updateSortingQueueForArrayProperties(queue, propertyTree, beginningLineNumber) {
        var _iterator36 = _createForOfIteratorHelper(propertyTree.childrenProperties),
          _step36;
        try {
          for (_iterator36.s(); !(_step36 = _iterator36.n()).done;) {
            var subObject = _step36.value;
            if (subObject.type === _propertyTree.Container.Object) {
              var minimumBeginningLineNumber = Infinity;
              var _iterator37 = _createForOfIteratorHelper(subObject.childrenProperties),
                _step37;
              try {
                for (_iterator37.s(); !(_step37 = _iterator37.n()).done;) {
                  var childProperty = _step37.value;
                  if (childProperty.beginningLineNumber < minimumBeginningLineNumber) {
                    minimumBeginningLineNumber = childProperty.beginningLineNumber;
                  }
                }
              } catch (err) {
                _iterator37.e(err);
              } finally {
                _iterator37.f();
              }
              var diff = minimumBeginningLineNumber - subObject.beginningLineNumber;
              queue.push(new SortingRange(beginningLineNumber + subObject.beginningLineNumber - propertyTree.beginningLineNumber + diff, subObject.childrenProperties));
            }
            if (subObject.type === _propertyTree.Container.Array) {
              updateSortingQueueForArrayProperties(queue, subObject, beginningLineNumber + subObject.beginningLineNumber - propertyTree.beginningLineNumber);
            }
          }
        } catch (err) {
          _iterator36.e(err);
        } finally {
          _iterator36.f();
        }
      }
      var SortingRange = _createClass(function SortingRange(beginningLineNumber, propertyTreeArray) {
        _classCallCheck(this, SortingRange);
        this.beginningLineNumber = beginningLineNumber;
        this.propertyTreeArray = propertyTreeArray;
      });
    }, {
      "../jsonLanguageTypes": 9,
      "./format": 23,
      "./propertyTree": 27,
      "jsonc-parser": 7
    }],
    29: [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.convertSimple2RegExpPattern = convertSimple2RegExpPattern;
      exports.endsWith = endsWith;
      exports.extendedRegExp = extendedRegExp;
      exports.repeat = repeat;
      exports.startsWith = startsWith;
      exports.stringLength = stringLength;
      function startsWith(haystack, needle) {
        if (haystack.length < needle.length) {
          return false;
        }
        for (var i = 0; i < needle.length; i++) {
          if (haystack[i] !== needle[i]) {
            return false;
          }
        }
        return true;
      }
      function endsWith(haystack, needle) {
        var diff = haystack.length - needle.length;
        if (diff > 0) {
          return haystack.lastIndexOf(needle) === diff;
        } else if (diff === 0) {
          return haystack === needle;
        } else {
          return false;
        }
      }
      function convertSimple2RegExpPattern(pattern) {
        return pattern.replace(/[\-\\\{\}\+\?\|\^\$\.\,\[\]\(\)\#\s]/g, '\\$&').replace(/[\*]/g, '.*');
      }
      function repeat(value, count) {
        var s = '';
        while (count > 0) {
          if ((count & 1) === 1) {
            s += value;
          }
          value += value;
          count = count >>> 1;
        }
        return s;
      }
      function extendedRegExp(pattern) {
        var flags = '';
        if (startsWith(pattern, '(?i)')) {
          pattern = pattern.substring(4);
          flags = 'i';
        }
        try {
          return new RegExp(pattern, flags + 'u');
        } catch (e) {
          try {
            return new RegExp(pattern, flags);
          } catch (e) {
            return undefined;
          }
        }
      }
      function stringLength(str) {
        var count = 0;
        for (var i = 0; i < str.length; i++) {
          count++;
          var code = str.charCodeAt(i);
          if (0xD800 <= code && code <= 0xDBFF) {
            i++;
          }
        }
        return count;
      }
    }, {}],
    30: [function (require, module, exports) {
      var __spreadArray = this && this.__spreadArray || function (to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
          if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
          }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
      };
      (function (factory) {
        if (_typeof(module) === "object" && _typeof(module.exports) === "object") {
          var v = factory(require, exports);
          if (v !== undefined) module.exports = v;
        } else if (typeof define === "function" && define.amd) {
          define(["require", "exports"], factory);
        }
      })(function (require, exports) {
        'use strict';

        Object.defineProperty(exports, "__esModule", {
          value: true
        });
        exports.TextDocument = void 0;
        var FullTextDocument = function () {
          function FullTextDocument(uri, languageId, version, content) {
            this._uri = uri;
            this._languageId = languageId;
            this._version = version;
            this._content = content;
            this._lineOffsets = undefined;
          }
          Object.defineProperty(FullTextDocument.prototype, "uri", {
            get: function get() {
              return this._uri;
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(FullTextDocument.prototype, "languageId", {
            get: function get() {
              return this._languageId;
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(FullTextDocument.prototype, "version", {
            get: function get() {
              return this._version;
            },
            enumerable: false,
            configurable: true
          });
          FullTextDocument.prototype.getText = function (range) {
            if (range) {
              var start = this.offsetAt(range.start);
              var end = this.offsetAt(range.end);
              return this._content.substring(start, end);
            }
            return this._content;
          };
          FullTextDocument.prototype.update = function (changes, version) {
            for (var _i = 0, changes_1 = changes; _i < changes_1.length; _i++) {
              var change = changes_1[_i];
              if (FullTextDocument.isIncremental(change)) {
                var range = getWellformedRange(change.range);
                var startOffset = this.offsetAt(range.start);
                var endOffset = this.offsetAt(range.end);
                this._content = this._content.substring(0, startOffset) + change.text + this._content.substring(endOffset, this._content.length);
                var startLine = Math.max(range.start.line, 0);
                var endLine = Math.max(range.end.line, 0);
                var lineOffsets = this._lineOffsets;
                var addedLineOffsets = computeLineOffsets(change.text, false, startOffset);
                if (endLine - startLine === addedLineOffsets.length) {
                  for (var i = 0, len = addedLineOffsets.length; i < len; i++) {
                    lineOffsets[i + startLine + 1] = addedLineOffsets[i];
                  }
                } else {
                  if (addedLineOffsets.length < 10000) {
                    lineOffsets.splice.apply(lineOffsets, __spreadArray([startLine + 1, endLine - startLine], addedLineOffsets, false));
                  } else {
                    this._lineOffsets = lineOffsets = lineOffsets.slice(0, startLine + 1).concat(addedLineOffsets, lineOffsets.slice(endLine + 1));
                  }
                }
                var diff = change.text.length - (endOffset - startOffset);
                if (diff !== 0) {
                  for (var i = startLine + 1 + addedLineOffsets.length, len = lineOffsets.length; i < len; i++) {
                    lineOffsets[i] = lineOffsets[i] + diff;
                  }
                }
              } else if (FullTextDocument.isFull(change)) {
                this._content = change.text;
                this._lineOffsets = undefined;
              } else {
                throw new Error('Unknown change event received');
              }
            }
            this._version = version;
          };
          FullTextDocument.prototype.getLineOffsets = function () {
            if (this._lineOffsets === undefined) {
              this._lineOffsets = computeLineOffsets(this._content, true);
            }
            return this._lineOffsets;
          };
          FullTextDocument.prototype.positionAt = function (offset) {
            offset = Math.max(Math.min(offset, this._content.length), 0);
            var lineOffsets = this.getLineOffsets();
            var low = 0,
              high = lineOffsets.length;
            if (high === 0) {
              return {
                line: 0,
                character: offset
              };
            }
            while (low < high) {
              var mid = Math.floor((low + high) / 2);
              if (lineOffsets[mid] > offset) {
                high = mid;
              } else {
                low = mid + 1;
              }
            }
            var line = low - 1;
            offset = this.ensureBeforeEOL(offset, lineOffsets[line]);
            return {
              line: line,
              character: offset - lineOffsets[line]
            };
          };
          FullTextDocument.prototype.offsetAt = function (position) {
            var lineOffsets = this.getLineOffsets();
            if (position.line >= lineOffsets.length) {
              return this._content.length;
            } else if (position.line < 0) {
              return 0;
            }
            var lineOffset = lineOffsets[position.line];
            if (position.character <= 0) {
              return lineOffset;
            }
            var nextLineOffset = position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : this._content.length;
            var offset = Math.min(lineOffset + position.character, nextLineOffset);
            return this.ensureBeforeEOL(offset, lineOffset);
          };
          FullTextDocument.prototype.ensureBeforeEOL = function (offset, lineOffset) {
            while (offset > lineOffset && isEOL(this._content.charCodeAt(offset - 1))) {
              offset--;
            }
            return offset;
          };
          Object.defineProperty(FullTextDocument.prototype, "lineCount", {
            get: function get() {
              return this.getLineOffsets().length;
            },
            enumerable: false,
            configurable: true
          });
          FullTextDocument.isIncremental = function (event) {
            var candidate = event;
            return candidate !== undefined && candidate !== null && typeof candidate.text === 'string' && candidate.range !== undefined && (candidate.rangeLength === undefined || typeof candidate.rangeLength === 'number');
          };
          FullTextDocument.isFull = function (event) {
            var candidate = event;
            return candidate !== undefined && candidate !== null && typeof candidate.text === 'string' && candidate.range === undefined && candidate.rangeLength === undefined;
          };
          return FullTextDocument;
        }();
        var TextDocument;
        (function (TextDocument) {
          function create(uri, languageId, version, content) {
            return new FullTextDocument(uri, languageId, version, content);
          }
          TextDocument.create = create;
          function update(document, changes, version) {
            if (document instanceof FullTextDocument) {
              document.update(changes, version);
              return document;
            } else {
              throw new Error('TextDocument.update: document must be created by TextDocument.create');
            }
          }
          TextDocument.update = update;
          function applyEdits(document, edits) {
            var text = document.getText();
            var sortedEdits = mergeSort(edits.map(getWellformedEdit), function (a, b) {
              var diff = a.range.start.line - b.range.start.line;
              if (diff === 0) {
                return a.range.start.character - b.range.start.character;
              }
              return diff;
            });
            var lastModifiedOffset = 0;
            var spans = [];
            for (var _i = 0, sortedEdits_1 = sortedEdits; _i < sortedEdits_1.length; _i++) {
              var e = sortedEdits_1[_i];
              var startOffset = document.offsetAt(e.range.start);
              if (startOffset < lastModifiedOffset) {
                throw new Error('Overlapping edit');
              } else if (startOffset > lastModifiedOffset) {
                spans.push(text.substring(lastModifiedOffset, startOffset));
              }
              if (e.newText.length) {
                spans.push(e.newText);
              }
              lastModifiedOffset = document.offsetAt(e.range.end);
            }
            spans.push(text.substr(lastModifiedOffset));
            return spans.join('');
          }
          TextDocument.applyEdits = applyEdits;
        })(TextDocument || (exports.TextDocument = TextDocument = {}));
        function mergeSort(data, compare) {
          if (data.length <= 1) {
            return data;
          }
          var p = data.length / 2 | 0;
          var left = data.slice(0, p);
          var right = data.slice(p);
          mergeSort(left, compare);
          mergeSort(right, compare);
          var leftIdx = 0;
          var rightIdx = 0;
          var i = 0;
          while (leftIdx < left.length && rightIdx < right.length) {
            var ret = compare(left[leftIdx], right[rightIdx]);
            if (ret <= 0) {
              data[i++] = left[leftIdx++];
            } else {
              data[i++] = right[rightIdx++];
            }
          }
          while (leftIdx < left.length) {
            data[i++] = left[leftIdx++];
          }
          while (rightIdx < right.length) {
            data[i++] = right[rightIdx++];
          }
          return data;
        }
        function computeLineOffsets(text, isAtLineStart, textOffset) {
          if (textOffset === void 0) {
            textOffset = 0;
          }
          var result = isAtLineStart ? [textOffset] : [];
          for (var i = 0; i < text.length; i++) {
            var ch = text.charCodeAt(i);
            if (isEOL(ch)) {
              if (ch === 13 && i + 1 < text.length && text.charCodeAt(i + 1) === 10) {
                i++;
              }
              result.push(textOffset + i + 1);
            }
          }
          return result;
        }
        function isEOL(_char) {
          return _char === 13 || _char === 10;
        }
        function getWellformedRange(range) {
          var start = range.start;
          var end = range.end;
          if (start.line > end.line || start.line === end.line && start.character > end.character) {
            return {
              start: end,
              end: start
            };
          }
          return range;
        }
        function getWellformedEdit(textEdit) {
          var range = getWellformedRange(textEdit.range);
          if (range !== textEdit.range) {
            return {
              newText: textEdit.newText,
              range: range
            };
          }
          return textEdit;
        }
      });
    }, {}],
    31: [function (require, module, exports) {
      "use strict";

      (function (factory) {
        if (_typeof(module) === "object" && _typeof(module.exports) === "object") {
          var v = factory(require, exports);
          if (v !== undefined) module.exports = v;
        } else if (typeof define === "function" && define.amd) {
          define(["require", "exports"], factory);
        }
      })(function (require, exports) {
        'use strict';

        Object.defineProperty(exports, "__esModule", {
          value: true
        });
        exports.TextDocument = exports.EOL = exports.WorkspaceFolder = exports.InlineCompletionContext = exports.SelectedCompletionInfo = exports.InlineCompletionTriggerKind = exports.InlineCompletionList = exports.InlineCompletionItem = exports.StringValue = exports.InlayHint = exports.InlayHintLabelPart = exports.InlayHintKind = exports.InlineValueContext = exports.InlineValueEvaluatableExpression = exports.InlineValueVariableLookup = exports.InlineValueText = exports.SemanticTokens = exports.SemanticTokenModifiers = exports.SemanticTokenTypes = exports.SelectionRange = exports.DocumentLink = exports.FormattingOptions = exports.CodeLens = exports.CodeAction = exports.CodeActionContext = exports.CodeActionTriggerKind = exports.CodeActionKind = exports.DocumentSymbol = exports.WorkspaceSymbol = exports.SymbolInformation = exports.SymbolTag = exports.SymbolKind = exports.DocumentHighlight = exports.DocumentHighlightKind = exports.SignatureInformation = exports.ParameterInformation = exports.Hover = exports.MarkedString = exports.CompletionList = exports.CompletionItem = exports.CompletionItemLabelDetails = exports.InsertTextMode = exports.InsertReplaceEdit = exports.CompletionItemTag = exports.InsertTextFormat = exports.CompletionItemKind = exports.MarkupContent = exports.MarkupKind = exports.TextDocumentItem = exports.OptionalVersionedTextDocumentIdentifier = exports.VersionedTextDocumentIdentifier = exports.TextDocumentIdentifier = exports.WorkspaceChange = exports.WorkspaceEdit = exports.DeleteFile = exports.RenameFile = exports.CreateFile = exports.TextDocumentEdit = exports.AnnotatedTextEdit = exports.ChangeAnnotationIdentifier = exports.ChangeAnnotation = exports.TextEdit = exports.Command = exports.Diagnostic = exports.CodeDescription = exports.DiagnosticTag = exports.DiagnosticSeverity = exports.DiagnosticRelatedInformation = exports.FoldingRange = exports.FoldingRangeKind = exports.ColorPresentation = exports.ColorInformation = exports.Color = exports.LocationLink = exports.Location = exports.Range = exports.Position = exports.uinteger = exports.integer = exports.URI = exports.DocumentUri = void 0;
        var DocumentUri;
        (function (DocumentUri) {
          function is(value) {
            return typeof value === 'string';
          }
          DocumentUri.is = is;
        })(DocumentUri || (exports.DocumentUri = DocumentUri = {}));
        var URI;
        (function (URI) {
          function is(value) {
            return typeof value === 'string';
          }
          URI.is = is;
        })(URI || (exports.URI = URI = {}));
        var integer;
        (function (integer) {
          integer.MIN_VALUE = -2147483648;
          integer.MAX_VALUE = 2147483647;
          function is(value) {
            return typeof value === 'number' && integer.MIN_VALUE <= value && value <= integer.MAX_VALUE;
          }
          integer.is = is;
        })(integer || (exports.integer = integer = {}));
        var uinteger;
        (function (uinteger) {
          uinteger.MIN_VALUE = 0;
          uinteger.MAX_VALUE = 2147483647;
          function is(value) {
            return typeof value === 'number' && uinteger.MIN_VALUE <= value && value <= uinteger.MAX_VALUE;
          }
          uinteger.is = is;
        })(uinteger || (exports.uinteger = uinteger = {}));
        var Position;
        (function (Position) {
          function create(line, character) {
            if (line === Number.MAX_VALUE) {
              line = uinteger.MAX_VALUE;
            }
            if (character === Number.MAX_VALUE) {
              character = uinteger.MAX_VALUE;
            }
            return {
              line: line,
              character: character
            };
          }
          Position.create = create;
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && Is.uinteger(candidate.line) && Is.uinteger(candidate.character);
          }
          Position.is = is;
        })(Position || (exports.Position = Position = {}));
        var Range;
        (function (Range) {
          function create(one, two, three, four) {
            if (Is.uinteger(one) && Is.uinteger(two) && Is.uinteger(three) && Is.uinteger(four)) {
              return {
                start: Position.create(one, two),
                end: Position.create(three, four)
              };
            } else if (Position.is(one) && Position.is(two)) {
              return {
                start: one,
                end: two
              };
            } else {
              throw new Error("Range#create called with invalid arguments[".concat(one, ", ").concat(two, ", ").concat(three, ", ").concat(four, "]"));
            }
          }
          Range.create = create;
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && Position.is(candidate.start) && Position.is(candidate.end);
          }
          Range.is = is;
        })(Range || (exports.Range = Range = {}));
        var Location;
        (function (Location) {
          function create(uri, range) {
            return {
              uri: uri,
              range: range
            };
          }
          Location.create = create;
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && Range.is(candidate.range) && (Is.string(candidate.uri) || Is.undefined(candidate.uri));
          }
          Location.is = is;
        })(Location || (exports.Location = Location = {}));
        var LocationLink;
        (function (LocationLink) {
          function create(targetUri, targetRange, targetSelectionRange, originSelectionRange) {
            return {
              targetUri: targetUri,
              targetRange: targetRange,
              targetSelectionRange: targetSelectionRange,
              originSelectionRange: originSelectionRange
            };
          }
          LocationLink.create = create;
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && Range.is(candidate.targetRange) && Is.string(candidate.targetUri) && Range.is(candidate.targetSelectionRange) && (Range.is(candidate.originSelectionRange) || Is.undefined(candidate.originSelectionRange));
          }
          LocationLink.is = is;
        })(LocationLink || (exports.LocationLink = LocationLink = {}));
        var Color;
        (function (Color) {
          function create(red, green, blue, alpha) {
            return {
              red: red,
              green: green,
              blue: blue,
              alpha: alpha
            };
          }
          Color.create = create;
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && Is.numberRange(candidate.red, 0, 1) && Is.numberRange(candidate.green, 0, 1) && Is.numberRange(candidate.blue, 0, 1) && Is.numberRange(candidate.alpha, 0, 1);
          }
          Color.is = is;
        })(Color || (exports.Color = Color = {}));
        var ColorInformation;
        (function (ColorInformation) {
          function create(range, color) {
            return {
              range: range,
              color: color
            };
          }
          ColorInformation.create = create;
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && Range.is(candidate.range) && Color.is(candidate.color);
          }
          ColorInformation.is = is;
        })(ColorInformation || (exports.ColorInformation = ColorInformation = {}));
        var ColorPresentation;
        (function (ColorPresentation) {
          function create(label, textEdit, additionalTextEdits) {
            return {
              label: label,
              textEdit: textEdit,
              additionalTextEdits: additionalTextEdits
            };
          }
          ColorPresentation.create = create;
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && Is.string(candidate.label) && (Is.undefined(candidate.textEdit) || TextEdit.is(candidate)) && (Is.undefined(candidate.additionalTextEdits) || Is.typedArray(candidate.additionalTextEdits, TextEdit.is));
          }
          ColorPresentation.is = is;
        })(ColorPresentation || (exports.ColorPresentation = ColorPresentation = {}));
        var FoldingRangeKind;
        (function (FoldingRangeKind) {
          FoldingRangeKind.Comment = 'comment';
          FoldingRangeKind.Imports = 'imports';
          FoldingRangeKind.Region = 'region';
        })(FoldingRangeKind || (exports.FoldingRangeKind = FoldingRangeKind = {}));
        var FoldingRange;
        (function (FoldingRange) {
          function create(startLine, endLine, startCharacter, endCharacter, kind, collapsedText) {
            var result = {
              startLine: startLine,
              endLine: endLine
            };
            if (Is.defined(startCharacter)) {
              result.startCharacter = startCharacter;
            }
            if (Is.defined(endCharacter)) {
              result.endCharacter = endCharacter;
            }
            if (Is.defined(kind)) {
              result.kind = kind;
            }
            if (Is.defined(collapsedText)) {
              result.collapsedText = collapsedText;
            }
            return result;
          }
          FoldingRange.create = create;
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && Is.uinteger(candidate.startLine) && Is.uinteger(candidate.startLine) && (Is.undefined(candidate.startCharacter) || Is.uinteger(candidate.startCharacter)) && (Is.undefined(candidate.endCharacter) || Is.uinteger(candidate.endCharacter)) && (Is.undefined(candidate.kind) || Is.string(candidate.kind));
          }
          FoldingRange.is = is;
        })(FoldingRange || (exports.FoldingRange = FoldingRange = {}));
        var DiagnosticRelatedInformation;
        (function (DiagnosticRelatedInformation) {
          function create(location, message) {
            return {
              location: location,
              message: message
            };
          }
          DiagnosticRelatedInformation.create = create;
          function is(value) {
            var candidate = value;
            return Is.defined(candidate) && Location.is(candidate.location) && Is.string(candidate.message);
          }
          DiagnosticRelatedInformation.is = is;
        })(DiagnosticRelatedInformation || (exports.DiagnosticRelatedInformation = DiagnosticRelatedInformation = {}));
        var DiagnosticSeverity;
        (function (DiagnosticSeverity) {
          DiagnosticSeverity.Error = 1;
          DiagnosticSeverity.Warning = 2;
          DiagnosticSeverity.Information = 3;
          DiagnosticSeverity.Hint = 4;
        })(DiagnosticSeverity || (exports.DiagnosticSeverity = DiagnosticSeverity = {}));
        var DiagnosticTag;
        (function (DiagnosticTag) {
          DiagnosticTag.Unnecessary = 1;
          DiagnosticTag.Deprecated = 2;
        })(DiagnosticTag || (exports.DiagnosticTag = DiagnosticTag = {}));
        var CodeDescription;
        (function (CodeDescription) {
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && Is.string(candidate.href);
          }
          CodeDescription.is = is;
        })(CodeDescription || (exports.CodeDescription = CodeDescription = {}));
        var Diagnostic;
        (function (Diagnostic) {
          function create(range, message, severity, code, source, relatedInformation) {
            var result = {
              range: range,
              message: message
            };
            if (Is.defined(severity)) {
              result.severity = severity;
            }
            if (Is.defined(code)) {
              result.code = code;
            }
            if (Is.defined(source)) {
              result.source = source;
            }
            if (Is.defined(relatedInformation)) {
              result.relatedInformation = relatedInformation;
            }
            return result;
          }
          Diagnostic.create = create;
          function is(value) {
            var _a;
            var candidate = value;
            return Is.defined(candidate) && Range.is(candidate.range) && Is.string(candidate.message) && (Is.number(candidate.severity) || Is.undefined(candidate.severity)) && (Is.integer(candidate.code) || Is.string(candidate.code) || Is.undefined(candidate.code)) && (Is.undefined(candidate.codeDescription) || Is.string((_a = candidate.codeDescription) === null || _a === void 0 ? void 0 : _a.href)) && (Is.string(candidate.source) || Is.undefined(candidate.source)) && (Is.undefined(candidate.relatedInformation) || Is.typedArray(candidate.relatedInformation, DiagnosticRelatedInformation.is));
          }
          Diagnostic.is = is;
        })(Diagnostic || (exports.Diagnostic = Diagnostic = {}));
        var Command;
        (function (Command) {
          function create(title, command) {
            var args = [];
            for (var _i = 2; _i < arguments.length; _i++) {
              args[_i - 2] = arguments[_i];
            }
            var result = {
              title: title,
              command: command
            };
            if (Is.defined(args) && args.length > 0) {
              result.arguments = args;
            }
            return result;
          }
          Command.create = create;
          function is(value) {
            var candidate = value;
            return Is.defined(candidate) && Is.string(candidate.title) && Is.string(candidate.command);
          }
          Command.is = is;
        })(Command || (exports.Command = Command = {}));
        var TextEdit;
        (function (TextEdit) {
          function replace(range, newText) {
            return {
              range: range,
              newText: newText
            };
          }
          TextEdit.replace = replace;
          function insert(position, newText) {
            return {
              range: {
                start: position,
                end: position
              },
              newText: newText
            };
          }
          TextEdit.insert = insert;
          function del(range) {
            return {
              range: range,
              newText: ''
            };
          }
          TextEdit.del = del;
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && Is.string(candidate.newText) && Range.is(candidate.range);
          }
          TextEdit.is = is;
        })(TextEdit || (exports.TextEdit = TextEdit = {}));
        var ChangeAnnotation;
        (function (ChangeAnnotation) {
          function create(label, needsConfirmation, description) {
            var result = {
              label: label
            };
            if (needsConfirmation !== undefined) {
              result.needsConfirmation = needsConfirmation;
            }
            if (description !== undefined) {
              result.description = description;
            }
            return result;
          }
          ChangeAnnotation.create = create;
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && Is.string(candidate.label) && (Is["boolean"](candidate.needsConfirmation) || candidate.needsConfirmation === undefined) && (Is.string(candidate.description) || candidate.description === undefined);
          }
          ChangeAnnotation.is = is;
        })(ChangeAnnotation || (exports.ChangeAnnotation = ChangeAnnotation = {}));
        var ChangeAnnotationIdentifier;
        (function (ChangeAnnotationIdentifier) {
          function is(value) {
            var candidate = value;
            return Is.string(candidate);
          }
          ChangeAnnotationIdentifier.is = is;
        })(ChangeAnnotationIdentifier || (exports.ChangeAnnotationIdentifier = ChangeAnnotationIdentifier = {}));
        var AnnotatedTextEdit;
        (function (AnnotatedTextEdit) {
          function replace(range, newText, annotation) {
            return {
              range: range,
              newText: newText,
              annotationId: annotation
            };
          }
          AnnotatedTextEdit.replace = replace;
          function insert(position, newText, annotation) {
            return {
              range: {
                start: position,
                end: position
              },
              newText: newText,
              annotationId: annotation
            };
          }
          AnnotatedTextEdit.insert = insert;
          function del(range, annotation) {
            return {
              range: range,
              newText: '',
              annotationId: annotation
            };
          }
          AnnotatedTextEdit.del = del;
          function is(value) {
            var candidate = value;
            return TextEdit.is(candidate) && (ChangeAnnotation.is(candidate.annotationId) || ChangeAnnotationIdentifier.is(candidate.annotationId));
          }
          AnnotatedTextEdit.is = is;
        })(AnnotatedTextEdit || (exports.AnnotatedTextEdit = AnnotatedTextEdit = {}));
        var TextDocumentEdit;
        (function (TextDocumentEdit) {
          function create(textDocument, edits) {
            return {
              textDocument: textDocument,
              edits: edits
            };
          }
          TextDocumentEdit.create = create;
          function is(value) {
            var candidate = value;
            return Is.defined(candidate) && OptionalVersionedTextDocumentIdentifier.is(candidate.textDocument) && Array.isArray(candidate.edits);
          }
          TextDocumentEdit.is = is;
        })(TextDocumentEdit || (exports.TextDocumentEdit = TextDocumentEdit = {}));
        var CreateFile;
        (function (CreateFile) {
          function create(uri, options, annotation) {
            var result = {
              kind: 'create',
              uri: uri
            };
            if (options !== undefined && (options.overwrite !== undefined || options.ignoreIfExists !== undefined)) {
              result.options = options;
            }
            if (annotation !== undefined) {
              result.annotationId = annotation;
            }
            return result;
          }
          CreateFile.create = create;
          function is(value) {
            var candidate = value;
            return candidate && candidate.kind === 'create' && Is.string(candidate.uri) && (candidate.options === undefined || (candidate.options.overwrite === undefined || Is["boolean"](candidate.options.overwrite)) && (candidate.options.ignoreIfExists === undefined || Is["boolean"](candidate.options.ignoreIfExists))) && (candidate.annotationId === undefined || ChangeAnnotationIdentifier.is(candidate.annotationId));
          }
          CreateFile.is = is;
        })(CreateFile || (exports.CreateFile = CreateFile = {}));
        var RenameFile;
        (function (RenameFile) {
          function create(oldUri, newUri, options, annotation) {
            var result = {
              kind: 'rename',
              oldUri: oldUri,
              newUri: newUri
            };
            if (options !== undefined && (options.overwrite !== undefined || options.ignoreIfExists !== undefined)) {
              result.options = options;
            }
            if (annotation !== undefined) {
              result.annotationId = annotation;
            }
            return result;
          }
          RenameFile.create = create;
          function is(value) {
            var candidate = value;
            return candidate && candidate.kind === 'rename' && Is.string(candidate.oldUri) && Is.string(candidate.newUri) && (candidate.options === undefined || (candidate.options.overwrite === undefined || Is["boolean"](candidate.options.overwrite)) && (candidate.options.ignoreIfExists === undefined || Is["boolean"](candidate.options.ignoreIfExists))) && (candidate.annotationId === undefined || ChangeAnnotationIdentifier.is(candidate.annotationId));
          }
          RenameFile.is = is;
        })(RenameFile || (exports.RenameFile = RenameFile = {}));
        var DeleteFile;
        (function (DeleteFile) {
          function create(uri, options, annotation) {
            var result = {
              kind: 'delete',
              uri: uri
            };
            if (options !== undefined && (options.recursive !== undefined || options.ignoreIfNotExists !== undefined)) {
              result.options = options;
            }
            if (annotation !== undefined) {
              result.annotationId = annotation;
            }
            return result;
          }
          DeleteFile.create = create;
          function is(value) {
            var candidate = value;
            return candidate && candidate.kind === 'delete' && Is.string(candidate.uri) && (candidate.options === undefined || (candidate.options.recursive === undefined || Is["boolean"](candidate.options.recursive)) && (candidate.options.ignoreIfNotExists === undefined || Is["boolean"](candidate.options.ignoreIfNotExists))) && (candidate.annotationId === undefined || ChangeAnnotationIdentifier.is(candidate.annotationId));
          }
          DeleteFile.is = is;
        })(DeleteFile || (exports.DeleteFile = DeleteFile = {}));
        var WorkspaceEdit;
        (function (WorkspaceEdit) {
          function is(value) {
            var candidate = value;
            return candidate && (candidate.changes !== undefined || candidate.documentChanges !== undefined) && (candidate.documentChanges === undefined || candidate.documentChanges.every(function (change) {
              if (Is.string(change.kind)) {
                return CreateFile.is(change) || RenameFile.is(change) || DeleteFile.is(change);
              } else {
                return TextDocumentEdit.is(change);
              }
            }));
          }
          WorkspaceEdit.is = is;
        })(WorkspaceEdit || (exports.WorkspaceEdit = WorkspaceEdit = {}));
        var TextEditChangeImpl = function () {
          function TextEditChangeImpl(edits, changeAnnotations) {
            this.edits = edits;
            this.changeAnnotations = changeAnnotations;
          }
          TextEditChangeImpl.prototype.insert = function (position, newText, annotation) {
            var edit;
            var id;
            if (annotation === undefined) {
              edit = TextEdit.insert(position, newText);
            } else if (ChangeAnnotationIdentifier.is(annotation)) {
              id = annotation;
              edit = AnnotatedTextEdit.insert(position, newText, annotation);
            } else {
              this.assertChangeAnnotations(this.changeAnnotations);
              id = this.changeAnnotations.manage(annotation);
              edit = AnnotatedTextEdit.insert(position, newText, id);
            }
            this.edits.push(edit);
            if (id !== undefined) {
              return id;
            }
          };
          TextEditChangeImpl.prototype.replace = function (range, newText, annotation) {
            var edit;
            var id;
            if (annotation === undefined) {
              edit = TextEdit.replace(range, newText);
            } else if (ChangeAnnotationIdentifier.is(annotation)) {
              id = annotation;
              edit = AnnotatedTextEdit.replace(range, newText, annotation);
            } else {
              this.assertChangeAnnotations(this.changeAnnotations);
              id = this.changeAnnotations.manage(annotation);
              edit = AnnotatedTextEdit.replace(range, newText, id);
            }
            this.edits.push(edit);
            if (id !== undefined) {
              return id;
            }
          };
          TextEditChangeImpl.prototype["delete"] = function (range, annotation) {
            var edit;
            var id;
            if (annotation === undefined) {
              edit = TextEdit.del(range);
            } else if (ChangeAnnotationIdentifier.is(annotation)) {
              id = annotation;
              edit = AnnotatedTextEdit.del(range, annotation);
            } else {
              this.assertChangeAnnotations(this.changeAnnotations);
              id = this.changeAnnotations.manage(annotation);
              edit = AnnotatedTextEdit.del(range, id);
            }
            this.edits.push(edit);
            if (id !== undefined) {
              return id;
            }
          };
          TextEditChangeImpl.prototype.add = function (edit) {
            this.edits.push(edit);
          };
          TextEditChangeImpl.prototype.all = function () {
            return this.edits;
          };
          TextEditChangeImpl.prototype.clear = function () {
            this.edits.splice(0, this.edits.length);
          };
          TextEditChangeImpl.prototype.assertChangeAnnotations = function (value) {
            if (value === undefined) {
              throw new Error("Text edit change is not configured to manage change annotations.");
            }
          };
          return TextEditChangeImpl;
        }();
        var ChangeAnnotations = function () {
          function ChangeAnnotations(annotations) {
            this._annotations = annotations === undefined ? Object.create(null) : annotations;
            this._counter = 0;
            this._size = 0;
          }
          ChangeAnnotations.prototype.all = function () {
            return this._annotations;
          };
          Object.defineProperty(ChangeAnnotations.prototype, "size", {
            get: function get() {
              return this._size;
            },
            enumerable: false,
            configurable: true
          });
          ChangeAnnotations.prototype.manage = function (idOrAnnotation, annotation) {
            var id;
            if (ChangeAnnotationIdentifier.is(idOrAnnotation)) {
              id = idOrAnnotation;
            } else {
              id = this.nextId();
              annotation = idOrAnnotation;
            }
            if (this._annotations[id] !== undefined) {
              throw new Error("Id ".concat(id, " is already in use."));
            }
            if (annotation === undefined) {
              throw new Error("No annotation provided for id ".concat(id));
            }
            this._annotations[id] = annotation;
            this._size++;
            return id;
          };
          ChangeAnnotations.prototype.nextId = function () {
            this._counter++;
            return this._counter.toString();
          };
          return ChangeAnnotations;
        }();
        var WorkspaceChange = function () {
          function WorkspaceChange(workspaceEdit) {
            var _this = this;
            this._textEditChanges = Object.create(null);
            if (workspaceEdit !== undefined) {
              this._workspaceEdit = workspaceEdit;
              if (workspaceEdit.documentChanges) {
                this._changeAnnotations = new ChangeAnnotations(workspaceEdit.changeAnnotations);
                workspaceEdit.changeAnnotations = this._changeAnnotations.all();
                workspaceEdit.documentChanges.forEach(function (change) {
                  if (TextDocumentEdit.is(change)) {
                    var textEditChange = new TextEditChangeImpl(change.edits, _this._changeAnnotations);
                    _this._textEditChanges[change.textDocument.uri] = textEditChange;
                  }
                });
              } else if (workspaceEdit.changes) {
                Object.keys(workspaceEdit.changes).forEach(function (key) {
                  var textEditChange = new TextEditChangeImpl(workspaceEdit.changes[key]);
                  _this._textEditChanges[key] = textEditChange;
                });
              }
            } else {
              this._workspaceEdit = {};
            }
          }
          Object.defineProperty(WorkspaceChange.prototype, "edit", {
            get: function get() {
              this.initDocumentChanges();
              if (this._changeAnnotations !== undefined) {
                if (this._changeAnnotations.size === 0) {
                  this._workspaceEdit.changeAnnotations = undefined;
                } else {
                  this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
                }
              }
              return this._workspaceEdit;
            },
            enumerable: false,
            configurable: true
          });
          WorkspaceChange.prototype.getTextEditChange = function (key) {
            if (OptionalVersionedTextDocumentIdentifier.is(key)) {
              this.initDocumentChanges();
              if (this._workspaceEdit.documentChanges === undefined) {
                throw new Error('Workspace edit is not configured for document changes.');
              }
              var textDocument = {
                uri: key.uri,
                version: key.version
              };
              var result = this._textEditChanges[textDocument.uri];
              if (!result) {
                var edits = [];
                var textDocumentEdit = {
                  textDocument: textDocument,
                  edits: edits
                };
                this._workspaceEdit.documentChanges.push(textDocumentEdit);
                result = new TextEditChangeImpl(edits, this._changeAnnotations);
                this._textEditChanges[textDocument.uri] = result;
              }
              return result;
            } else {
              this.initChanges();
              if (this._workspaceEdit.changes === undefined) {
                throw new Error('Workspace edit is not configured for normal text edit changes.');
              }
              var result = this._textEditChanges[key];
              if (!result) {
                var edits = [];
                this._workspaceEdit.changes[key] = edits;
                result = new TextEditChangeImpl(edits);
                this._textEditChanges[key] = result;
              }
              return result;
            }
          };
          WorkspaceChange.prototype.initDocumentChanges = function () {
            if (this._workspaceEdit.documentChanges === undefined && this._workspaceEdit.changes === undefined) {
              this._changeAnnotations = new ChangeAnnotations();
              this._workspaceEdit.documentChanges = [];
              this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
            }
          };
          WorkspaceChange.prototype.initChanges = function () {
            if (this._workspaceEdit.documentChanges === undefined && this._workspaceEdit.changes === undefined) {
              this._workspaceEdit.changes = Object.create(null);
            }
          };
          WorkspaceChange.prototype.createFile = function (uri, optionsOrAnnotation, options) {
            this.initDocumentChanges();
            if (this._workspaceEdit.documentChanges === undefined) {
              throw new Error('Workspace edit is not configured for document changes.');
            }
            var annotation;
            if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
              annotation = optionsOrAnnotation;
            } else {
              options = optionsOrAnnotation;
            }
            var operation;
            var id;
            if (annotation === undefined) {
              operation = CreateFile.create(uri, options);
            } else {
              id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
              operation = CreateFile.create(uri, options, id);
            }
            this._workspaceEdit.documentChanges.push(operation);
            if (id !== undefined) {
              return id;
            }
          };
          WorkspaceChange.prototype.renameFile = function (oldUri, newUri, optionsOrAnnotation, options) {
            this.initDocumentChanges();
            if (this._workspaceEdit.documentChanges === undefined) {
              throw new Error('Workspace edit is not configured for document changes.');
            }
            var annotation;
            if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
              annotation = optionsOrAnnotation;
            } else {
              options = optionsOrAnnotation;
            }
            var operation;
            var id;
            if (annotation === undefined) {
              operation = RenameFile.create(oldUri, newUri, options);
            } else {
              id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
              operation = RenameFile.create(oldUri, newUri, options, id);
            }
            this._workspaceEdit.documentChanges.push(operation);
            if (id !== undefined) {
              return id;
            }
          };
          WorkspaceChange.prototype.deleteFile = function (uri, optionsOrAnnotation, options) {
            this.initDocumentChanges();
            if (this._workspaceEdit.documentChanges === undefined) {
              throw new Error('Workspace edit is not configured for document changes.');
            }
            var annotation;
            if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
              annotation = optionsOrAnnotation;
            } else {
              options = optionsOrAnnotation;
            }
            var operation;
            var id;
            if (annotation === undefined) {
              operation = DeleteFile.create(uri, options);
            } else {
              id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
              operation = DeleteFile.create(uri, options, id);
            }
            this._workspaceEdit.documentChanges.push(operation);
            if (id !== undefined) {
              return id;
            }
          };
          return WorkspaceChange;
        }();
        exports.WorkspaceChange = WorkspaceChange;
        var TextDocumentIdentifier;
        (function (TextDocumentIdentifier) {
          function create(uri) {
            return {
              uri: uri
            };
          }
          TextDocumentIdentifier.create = create;
          function is(value) {
            var candidate = value;
            return Is.defined(candidate) && Is.string(candidate.uri);
          }
          TextDocumentIdentifier.is = is;
        })(TextDocumentIdentifier || (exports.TextDocumentIdentifier = TextDocumentIdentifier = {}));
        var VersionedTextDocumentIdentifier;
        (function (VersionedTextDocumentIdentifier) {
          function create(uri, version) {
            return {
              uri: uri,
              version: version
            };
          }
          VersionedTextDocumentIdentifier.create = create;
          function is(value) {
            var candidate = value;
            return Is.defined(candidate) && Is.string(candidate.uri) && Is.integer(candidate.version);
          }
          VersionedTextDocumentIdentifier.is = is;
        })(VersionedTextDocumentIdentifier || (exports.VersionedTextDocumentIdentifier = VersionedTextDocumentIdentifier = {}));
        var OptionalVersionedTextDocumentIdentifier;
        (function (OptionalVersionedTextDocumentIdentifier) {
          function create(uri, version) {
            return {
              uri: uri,
              version: version
            };
          }
          OptionalVersionedTextDocumentIdentifier.create = create;
          function is(value) {
            var candidate = value;
            return Is.defined(candidate) && Is.string(candidate.uri) && (candidate.version === null || Is.integer(candidate.version));
          }
          OptionalVersionedTextDocumentIdentifier.is = is;
        })(OptionalVersionedTextDocumentIdentifier || (exports.OptionalVersionedTextDocumentIdentifier = OptionalVersionedTextDocumentIdentifier = {}));
        var TextDocumentItem;
        (function (TextDocumentItem) {
          function create(uri, languageId, version, text) {
            return {
              uri: uri,
              languageId: languageId,
              version: version,
              text: text
            };
          }
          TextDocumentItem.create = create;
          function is(value) {
            var candidate = value;
            return Is.defined(candidate) && Is.string(candidate.uri) && Is.string(candidate.languageId) && Is.integer(candidate.version) && Is.string(candidate.text);
          }
          TextDocumentItem.is = is;
        })(TextDocumentItem || (exports.TextDocumentItem = TextDocumentItem = {}));
        var MarkupKind;
        (function (MarkupKind) {
          MarkupKind.PlainText = 'plaintext';
          MarkupKind.Markdown = 'markdown';
          function is(value) {
            var candidate = value;
            return candidate === MarkupKind.PlainText || candidate === MarkupKind.Markdown;
          }
          MarkupKind.is = is;
        })(MarkupKind || (exports.MarkupKind = MarkupKind = {}));
        var MarkupContent;
        (function (MarkupContent) {
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(value) && MarkupKind.is(candidate.kind) && Is.string(candidate.value);
          }
          MarkupContent.is = is;
        })(MarkupContent || (exports.MarkupContent = MarkupContent = {}));
        var CompletionItemKind;
        (function (CompletionItemKind) {
          CompletionItemKind.Text = 1;
          CompletionItemKind.Method = 2;
          CompletionItemKind.Function = 3;
          CompletionItemKind.Constructor = 4;
          CompletionItemKind.Field = 5;
          CompletionItemKind.Variable = 6;
          CompletionItemKind.Class = 7;
          CompletionItemKind.Interface = 8;
          CompletionItemKind.Module = 9;
          CompletionItemKind.Property = 10;
          CompletionItemKind.Unit = 11;
          CompletionItemKind.Value = 12;
          CompletionItemKind.Enum = 13;
          CompletionItemKind.Keyword = 14;
          CompletionItemKind.Snippet = 15;
          CompletionItemKind.Color = 16;
          CompletionItemKind.File = 17;
          CompletionItemKind.Reference = 18;
          CompletionItemKind.Folder = 19;
          CompletionItemKind.EnumMember = 20;
          CompletionItemKind.Constant = 21;
          CompletionItemKind.Struct = 22;
          CompletionItemKind.Event = 23;
          CompletionItemKind.Operator = 24;
          CompletionItemKind.TypeParameter = 25;
        })(CompletionItemKind || (exports.CompletionItemKind = CompletionItemKind = {}));
        var InsertTextFormat;
        (function (InsertTextFormat) {
          InsertTextFormat.PlainText = 1;
          InsertTextFormat.Snippet = 2;
        })(InsertTextFormat || (exports.InsertTextFormat = InsertTextFormat = {}));
        var CompletionItemTag;
        (function (CompletionItemTag) {
          CompletionItemTag.Deprecated = 1;
        })(CompletionItemTag || (exports.CompletionItemTag = CompletionItemTag = {}));
        var InsertReplaceEdit;
        (function (InsertReplaceEdit) {
          function create(newText, insert, replace) {
            return {
              newText: newText,
              insert: insert,
              replace: replace
            };
          }
          InsertReplaceEdit.create = create;
          function is(value) {
            var candidate = value;
            return candidate && Is.string(candidate.newText) && Range.is(candidate.insert) && Range.is(candidate.replace);
          }
          InsertReplaceEdit.is = is;
        })(InsertReplaceEdit || (exports.InsertReplaceEdit = InsertReplaceEdit = {}));
        var InsertTextMode;
        (function (InsertTextMode) {
          InsertTextMode.asIs = 1;
          InsertTextMode.adjustIndentation = 2;
        })(InsertTextMode || (exports.InsertTextMode = InsertTextMode = {}));
        var CompletionItemLabelDetails;
        (function (CompletionItemLabelDetails) {
          function is(value) {
            var candidate = value;
            return candidate && (Is.string(candidate.detail) || candidate.detail === undefined) && (Is.string(candidate.description) || candidate.description === undefined);
          }
          CompletionItemLabelDetails.is = is;
        })(CompletionItemLabelDetails || (exports.CompletionItemLabelDetails = CompletionItemLabelDetails = {}));
        var CompletionItem;
        (function (CompletionItem) {
          function create(label) {
            return {
              label: label
            };
          }
          CompletionItem.create = create;
        })(CompletionItem || (exports.CompletionItem = CompletionItem = {}));
        var CompletionList;
        (function (CompletionList) {
          function create(items, isIncomplete) {
            return {
              items: items ? items : [],
              isIncomplete: !!isIncomplete
            };
          }
          CompletionList.create = create;
        })(CompletionList || (exports.CompletionList = CompletionList = {}));
        var MarkedString;
        (function (MarkedString) {
          function fromPlainText(plainText) {
            return plainText.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
          }
          MarkedString.fromPlainText = fromPlainText;
          function is(value) {
            var candidate = value;
            return Is.string(candidate) || Is.objectLiteral(candidate) && Is.string(candidate.language) && Is.string(candidate.value);
          }
          MarkedString.is = is;
        })(MarkedString || (exports.MarkedString = MarkedString = {}));
        var Hover;
        (function (Hover) {
          function is(value) {
            var candidate = value;
            return !!candidate && Is.objectLiteral(candidate) && (MarkupContent.is(candidate.contents) || MarkedString.is(candidate.contents) || Is.typedArray(candidate.contents, MarkedString.is)) && (value.range === undefined || Range.is(value.range));
          }
          Hover.is = is;
        })(Hover || (exports.Hover = Hover = {}));
        var ParameterInformation;
        (function (ParameterInformation) {
          function create(label, documentation) {
            return documentation ? {
              label: label,
              documentation: documentation
            } : {
              label: label
            };
          }
          ParameterInformation.create = create;
        })(ParameterInformation || (exports.ParameterInformation = ParameterInformation = {}));
        var SignatureInformation;
        (function (SignatureInformation) {
          function create(label, documentation) {
            var parameters = [];
            for (var _i = 2; _i < arguments.length; _i++) {
              parameters[_i - 2] = arguments[_i];
            }
            var result = {
              label: label
            };
            if (Is.defined(documentation)) {
              result.documentation = documentation;
            }
            if (Is.defined(parameters)) {
              result.parameters = parameters;
            } else {
              result.parameters = [];
            }
            return result;
          }
          SignatureInformation.create = create;
        })(SignatureInformation || (exports.SignatureInformation = SignatureInformation = {}));
        var DocumentHighlightKind;
        (function (DocumentHighlightKind) {
          DocumentHighlightKind.Text = 1;
          DocumentHighlightKind.Read = 2;
          DocumentHighlightKind.Write = 3;
        })(DocumentHighlightKind || (exports.DocumentHighlightKind = DocumentHighlightKind = {}));
        var DocumentHighlight;
        (function (DocumentHighlight) {
          function create(range, kind) {
            var result = {
              range: range
            };
            if (Is.number(kind)) {
              result.kind = kind;
            }
            return result;
          }
          DocumentHighlight.create = create;
        })(DocumentHighlight || (exports.DocumentHighlight = DocumentHighlight = {}));
        var SymbolKind;
        (function (SymbolKind) {
          SymbolKind.File = 1;
          SymbolKind.Module = 2;
          SymbolKind.Namespace = 3;
          SymbolKind.Package = 4;
          SymbolKind.Class = 5;
          SymbolKind.Method = 6;
          SymbolKind.Property = 7;
          SymbolKind.Field = 8;
          SymbolKind.Constructor = 9;
          SymbolKind.Enum = 10;
          SymbolKind.Interface = 11;
          SymbolKind.Function = 12;
          SymbolKind.Variable = 13;
          SymbolKind.Constant = 14;
          SymbolKind.String = 15;
          SymbolKind.Number = 16;
          SymbolKind.Boolean = 17;
          SymbolKind.Array = 18;
          SymbolKind.Object = 19;
          SymbolKind.Key = 20;
          SymbolKind.Null = 21;
          SymbolKind.EnumMember = 22;
          SymbolKind.Struct = 23;
          SymbolKind.Event = 24;
          SymbolKind.Operator = 25;
          SymbolKind.TypeParameter = 26;
        })(SymbolKind || (exports.SymbolKind = SymbolKind = {}));
        var SymbolTag;
        (function (SymbolTag) {
          SymbolTag.Deprecated = 1;
        })(SymbolTag || (exports.SymbolTag = SymbolTag = {}));
        var SymbolInformation;
        (function (SymbolInformation) {
          function create(name, kind, range, uri, containerName) {
            var result = {
              name: name,
              kind: kind,
              location: {
                uri: uri,
                range: range
              }
            };
            if (containerName) {
              result.containerName = containerName;
            }
            return result;
          }
          SymbolInformation.create = create;
        })(SymbolInformation || (exports.SymbolInformation = SymbolInformation = {}));
        var WorkspaceSymbol;
        (function (WorkspaceSymbol) {
          function create(name, kind, uri, range) {
            return range !== undefined ? {
              name: name,
              kind: kind,
              location: {
                uri: uri,
                range: range
              }
            } : {
              name: name,
              kind: kind,
              location: {
                uri: uri
              }
            };
          }
          WorkspaceSymbol.create = create;
        })(WorkspaceSymbol || (exports.WorkspaceSymbol = WorkspaceSymbol = {}));
        var DocumentSymbol;
        (function (DocumentSymbol) {
          function create(name, detail, kind, range, selectionRange, children) {
            var result = {
              name: name,
              detail: detail,
              kind: kind,
              range: range,
              selectionRange: selectionRange
            };
            if (children !== undefined) {
              result.children = children;
            }
            return result;
          }
          DocumentSymbol.create = create;
          function is(value) {
            var candidate = value;
            return candidate && Is.string(candidate.name) && Is.number(candidate.kind) && Range.is(candidate.range) && Range.is(candidate.selectionRange) && (candidate.detail === undefined || Is.string(candidate.detail)) && (candidate.deprecated === undefined || Is["boolean"](candidate.deprecated)) && (candidate.children === undefined || Array.isArray(candidate.children)) && (candidate.tags === undefined || Array.isArray(candidate.tags));
          }
          DocumentSymbol.is = is;
        })(DocumentSymbol || (exports.DocumentSymbol = DocumentSymbol = {}));
        var CodeActionKind;
        (function (CodeActionKind) {
          CodeActionKind.Empty = '';
          CodeActionKind.QuickFix = 'quickfix';
          CodeActionKind.Refactor = 'refactor';
          CodeActionKind.RefactorExtract = 'refactor.extract';
          CodeActionKind.RefactorInline = 'refactor.inline';
          CodeActionKind.RefactorRewrite = 'refactor.rewrite';
          CodeActionKind.Source = 'source';
          CodeActionKind.SourceOrganizeImports = 'source.organizeImports';
          CodeActionKind.SourceFixAll = 'source.fixAll';
        })(CodeActionKind || (exports.CodeActionKind = CodeActionKind = {}));
        var CodeActionTriggerKind;
        (function (CodeActionTriggerKind) {
          CodeActionTriggerKind.Invoked = 1;
          CodeActionTriggerKind.Automatic = 2;
        })(CodeActionTriggerKind || (exports.CodeActionTriggerKind = CodeActionTriggerKind = {}));
        var CodeActionContext;
        (function (CodeActionContext) {
          function create(diagnostics, only, triggerKind) {
            var result = {
              diagnostics: diagnostics
            };
            if (only !== undefined && only !== null) {
              result.only = only;
            }
            if (triggerKind !== undefined && triggerKind !== null) {
              result.triggerKind = triggerKind;
            }
            return result;
          }
          CodeActionContext.create = create;
          function is(value) {
            var candidate = value;
            return Is.defined(candidate) && Is.typedArray(candidate.diagnostics, Diagnostic.is) && (candidate.only === undefined || Is.typedArray(candidate.only, Is.string)) && (candidate.triggerKind === undefined || candidate.triggerKind === CodeActionTriggerKind.Invoked || candidate.triggerKind === CodeActionTriggerKind.Automatic);
          }
          CodeActionContext.is = is;
        })(CodeActionContext || (exports.CodeActionContext = CodeActionContext = {}));
        var CodeAction;
        (function (CodeAction) {
          function create(title, kindOrCommandOrEdit, kind) {
            var result = {
              title: title
            };
            var checkKind = true;
            if (typeof kindOrCommandOrEdit === 'string') {
              checkKind = false;
              result.kind = kindOrCommandOrEdit;
            } else if (Command.is(kindOrCommandOrEdit)) {
              result.command = kindOrCommandOrEdit;
            } else {
              result.edit = kindOrCommandOrEdit;
            }
            if (checkKind && kind !== undefined) {
              result.kind = kind;
            }
            return result;
          }
          CodeAction.create = create;
          function is(value) {
            var candidate = value;
            return candidate && Is.string(candidate.title) && (candidate.diagnostics === undefined || Is.typedArray(candidate.diagnostics, Diagnostic.is)) && (candidate.kind === undefined || Is.string(candidate.kind)) && (candidate.edit !== undefined || candidate.command !== undefined) && (candidate.command === undefined || Command.is(candidate.command)) && (candidate.isPreferred === undefined || Is["boolean"](candidate.isPreferred)) && (candidate.edit === undefined || WorkspaceEdit.is(candidate.edit));
          }
          CodeAction.is = is;
        })(CodeAction || (exports.CodeAction = CodeAction = {}));
        var CodeLens;
        (function (CodeLens) {
          function create(range, data) {
            var result = {
              range: range
            };
            if (Is.defined(data)) {
              result.data = data;
            }
            return result;
          }
          CodeLens.create = create;
          function is(value) {
            var candidate = value;
            return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.command) || Command.is(candidate.command));
          }
          CodeLens.is = is;
        })(CodeLens || (exports.CodeLens = CodeLens = {}));
        var FormattingOptions;
        (function (FormattingOptions) {
          function create(tabSize, insertSpaces) {
            return {
              tabSize: tabSize,
              insertSpaces: insertSpaces
            };
          }
          FormattingOptions.create = create;
          function is(value) {
            var candidate = value;
            return Is.defined(candidate) && Is.uinteger(candidate.tabSize) && Is["boolean"](candidate.insertSpaces);
          }
          FormattingOptions.is = is;
        })(FormattingOptions || (exports.FormattingOptions = FormattingOptions = {}));
        var DocumentLink;
        (function (DocumentLink) {
          function create(range, target, data) {
            return {
              range: range,
              target: target,
              data: data
            };
          }
          DocumentLink.create = create;
          function is(value) {
            var candidate = value;
            return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.target) || Is.string(candidate.target));
          }
          DocumentLink.is = is;
        })(DocumentLink || (exports.DocumentLink = DocumentLink = {}));
        var SelectionRange;
        (function (SelectionRange) {
          function create(range, parent) {
            return {
              range: range,
              parent: parent
            };
          }
          SelectionRange.create = create;
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && Range.is(candidate.range) && (candidate.parent === undefined || SelectionRange.is(candidate.parent));
          }
          SelectionRange.is = is;
        })(SelectionRange || (exports.SelectionRange = SelectionRange = {}));
        var SemanticTokenTypes;
        (function (SemanticTokenTypes) {
          SemanticTokenTypes["namespace"] = "namespace";
          SemanticTokenTypes["type"] = "type";
          SemanticTokenTypes["class"] = "class";
          SemanticTokenTypes["enum"] = "enum";
          SemanticTokenTypes["interface"] = "interface";
          SemanticTokenTypes["struct"] = "struct";
          SemanticTokenTypes["typeParameter"] = "typeParameter";
          SemanticTokenTypes["parameter"] = "parameter";
          SemanticTokenTypes["variable"] = "variable";
          SemanticTokenTypes["property"] = "property";
          SemanticTokenTypes["enumMember"] = "enumMember";
          SemanticTokenTypes["event"] = "event";
          SemanticTokenTypes["function"] = "function";
          SemanticTokenTypes["method"] = "method";
          SemanticTokenTypes["macro"] = "macro";
          SemanticTokenTypes["keyword"] = "keyword";
          SemanticTokenTypes["modifier"] = "modifier";
          SemanticTokenTypes["comment"] = "comment";
          SemanticTokenTypes["string"] = "string";
          SemanticTokenTypes["number"] = "number";
          SemanticTokenTypes["regexp"] = "regexp";
          SemanticTokenTypes["operator"] = "operator";
          SemanticTokenTypes["decorator"] = "decorator";
        })(SemanticTokenTypes || (exports.SemanticTokenTypes = SemanticTokenTypes = {}));
        var SemanticTokenModifiers;
        (function (SemanticTokenModifiers) {
          SemanticTokenModifiers["declaration"] = "declaration";
          SemanticTokenModifiers["definition"] = "definition";
          SemanticTokenModifiers["readonly"] = "readonly";
          SemanticTokenModifiers["static"] = "static";
          SemanticTokenModifiers["deprecated"] = "deprecated";
          SemanticTokenModifiers["abstract"] = "abstract";
          SemanticTokenModifiers["async"] = "async";
          SemanticTokenModifiers["modification"] = "modification";
          SemanticTokenModifiers["documentation"] = "documentation";
          SemanticTokenModifiers["defaultLibrary"] = "defaultLibrary";
        })(SemanticTokenModifiers || (exports.SemanticTokenModifiers = SemanticTokenModifiers = {}));
        var SemanticTokens;
        (function (SemanticTokens) {
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && (candidate.resultId === undefined || typeof candidate.resultId === 'string') && Array.isArray(candidate.data) && (candidate.data.length === 0 || typeof candidate.data[0] === 'number');
          }
          SemanticTokens.is = is;
        })(SemanticTokens || (exports.SemanticTokens = SemanticTokens = {}));
        var InlineValueText;
        (function (InlineValueText) {
          function create(range, text) {
            return {
              range: range,
              text: text
            };
          }
          InlineValueText.create = create;
          function is(value) {
            var candidate = value;
            return candidate !== undefined && candidate !== null && Range.is(candidate.range) && Is.string(candidate.text);
          }
          InlineValueText.is = is;
        })(InlineValueText || (exports.InlineValueText = InlineValueText = {}));
        var InlineValueVariableLookup;
        (function (InlineValueVariableLookup) {
          function create(range, variableName, caseSensitiveLookup) {
            return {
              range: range,
              variableName: variableName,
              caseSensitiveLookup: caseSensitiveLookup
            };
          }
          InlineValueVariableLookup.create = create;
          function is(value) {
            var candidate = value;
            return candidate !== undefined && candidate !== null && Range.is(candidate.range) && Is["boolean"](candidate.caseSensitiveLookup) && (Is.string(candidate.variableName) || candidate.variableName === undefined);
          }
          InlineValueVariableLookup.is = is;
        })(InlineValueVariableLookup || (exports.InlineValueVariableLookup = InlineValueVariableLookup = {}));
        var InlineValueEvaluatableExpression;
        (function (InlineValueEvaluatableExpression) {
          function create(range, expression) {
            return {
              range: range,
              expression: expression
            };
          }
          InlineValueEvaluatableExpression.create = create;
          function is(value) {
            var candidate = value;
            return candidate !== undefined && candidate !== null && Range.is(candidate.range) && (Is.string(candidate.expression) || candidate.expression === undefined);
          }
          InlineValueEvaluatableExpression.is = is;
        })(InlineValueEvaluatableExpression || (exports.InlineValueEvaluatableExpression = InlineValueEvaluatableExpression = {}));
        var InlineValueContext;
        (function (InlineValueContext) {
          function create(frameId, stoppedLocation) {
            return {
              frameId: frameId,
              stoppedLocation: stoppedLocation
            };
          }
          InlineValueContext.create = create;
          function is(value) {
            var candidate = value;
            return Is.defined(candidate) && Range.is(value.stoppedLocation);
          }
          InlineValueContext.is = is;
        })(InlineValueContext || (exports.InlineValueContext = InlineValueContext = {}));
        var InlayHintKind;
        (function (InlayHintKind) {
          InlayHintKind.Type = 1;
          InlayHintKind.Parameter = 2;
          function is(value) {
            return value === 1 || value === 2;
          }
          InlayHintKind.is = is;
        })(InlayHintKind || (exports.InlayHintKind = InlayHintKind = {}));
        var InlayHintLabelPart;
        (function (InlayHintLabelPart) {
          function create(value) {
            return {
              value: value
            };
          }
          InlayHintLabelPart.create = create;
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && (candidate.tooltip === undefined || Is.string(candidate.tooltip) || MarkupContent.is(candidate.tooltip)) && (candidate.location === undefined || Location.is(candidate.location)) && (candidate.command === undefined || Command.is(candidate.command));
          }
          InlayHintLabelPart.is = is;
        })(InlayHintLabelPart || (exports.InlayHintLabelPart = InlayHintLabelPart = {}));
        var InlayHint;
        (function (InlayHint) {
          function create(position, label, kind) {
            var result = {
              position: position,
              label: label
            };
            if (kind !== undefined) {
              result.kind = kind;
            }
            return result;
          }
          InlayHint.create = create;
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && Position.is(candidate.position) && (Is.string(candidate.label) || Is.typedArray(candidate.label, InlayHintLabelPart.is)) && (candidate.kind === undefined || InlayHintKind.is(candidate.kind)) && candidate.textEdits === undefined || Is.typedArray(candidate.textEdits, TextEdit.is) && (candidate.tooltip === undefined || Is.string(candidate.tooltip) || MarkupContent.is(candidate.tooltip)) && (candidate.paddingLeft === undefined || Is["boolean"](candidate.paddingLeft)) && (candidate.paddingRight === undefined || Is["boolean"](candidate.paddingRight));
          }
          InlayHint.is = is;
        })(InlayHint || (exports.InlayHint = InlayHint = {}));
        var StringValue;
        (function (StringValue) {
          function createSnippet(value) {
            return {
              kind: 'snippet',
              value: value
            };
          }
          StringValue.createSnippet = createSnippet;
        })(StringValue || (exports.StringValue = StringValue = {}));
        var InlineCompletionItem;
        (function (InlineCompletionItem) {
          function create(insertText, filterText, range, command) {
            return {
              insertText: insertText,
              filterText: filterText,
              range: range,
              command: command
            };
          }
          InlineCompletionItem.create = create;
        })(InlineCompletionItem || (exports.InlineCompletionItem = InlineCompletionItem = {}));
        var InlineCompletionList;
        (function (InlineCompletionList) {
          function create(items) {
            return {
              items: items
            };
          }
          InlineCompletionList.create = create;
        })(InlineCompletionList || (exports.InlineCompletionList = InlineCompletionList = {}));
        var InlineCompletionTriggerKind;
        (function (InlineCompletionTriggerKind) {
          InlineCompletionTriggerKind.Invoked = 0;
          InlineCompletionTriggerKind.Automatic = 1;
        })(InlineCompletionTriggerKind || (exports.InlineCompletionTriggerKind = InlineCompletionTriggerKind = {}));
        var SelectedCompletionInfo;
        (function (SelectedCompletionInfo) {
          function create(range, text) {
            return {
              range: range,
              text: text
            };
          }
          SelectedCompletionInfo.create = create;
        })(SelectedCompletionInfo || (exports.SelectedCompletionInfo = SelectedCompletionInfo = {}));
        var InlineCompletionContext;
        (function (InlineCompletionContext) {
          function create(triggerKind, selectedCompletionInfo) {
            return {
              triggerKind: triggerKind,
              selectedCompletionInfo: selectedCompletionInfo
            };
          }
          InlineCompletionContext.create = create;
        })(InlineCompletionContext || (exports.InlineCompletionContext = InlineCompletionContext = {}));
        var WorkspaceFolder;
        (function (WorkspaceFolder) {
          function is(value) {
            var candidate = value;
            return Is.objectLiteral(candidate) && URI.is(candidate.uri) && Is.string(candidate.name);
          }
          WorkspaceFolder.is = is;
        })(WorkspaceFolder || (exports.WorkspaceFolder = WorkspaceFolder = {}));
        exports.EOL = ['\n', '\r\n', '\r'];
        var TextDocument;
        (function (TextDocument) {
          function create(uri, languageId, version, content) {
            return new FullTextDocument(uri, languageId, version, content);
          }
          TextDocument.create = create;
          function is(value) {
            var candidate = value;
            return Is.defined(candidate) && Is.string(candidate.uri) && (Is.undefined(candidate.languageId) || Is.string(candidate.languageId)) && Is.uinteger(candidate.lineCount) && Is.func(candidate.getText) && Is.func(candidate.positionAt) && Is.func(candidate.offsetAt) ? true : false;
          }
          TextDocument.is = is;
          function applyEdits(document, edits) {
            var text = document.getText();
            var sortedEdits = mergeSort(edits, function (a, b) {
              var diff = a.range.start.line - b.range.start.line;
              if (diff === 0) {
                return a.range.start.character - b.range.start.character;
              }
              return diff;
            });
            var lastModifiedOffset = text.length;
            for (var i = sortedEdits.length - 1; i >= 0; i--) {
              var e = sortedEdits[i];
              var startOffset = document.offsetAt(e.range.start);
              var endOffset = document.offsetAt(e.range.end);
              if (endOffset <= lastModifiedOffset) {
                text = text.substring(0, startOffset) + e.newText + text.substring(endOffset, text.length);
              } else {
                throw new Error('Overlapping edit');
              }
              lastModifiedOffset = startOffset;
            }
            return text;
          }
          TextDocument.applyEdits = applyEdits;
          function mergeSort(data, compare) {
            if (data.length <= 1) {
              return data;
            }
            var p = data.length / 2 | 0;
            var left = data.slice(0, p);
            var right = data.slice(p);
            mergeSort(left, compare);
            mergeSort(right, compare);
            var leftIdx = 0;
            var rightIdx = 0;
            var i = 0;
            while (leftIdx < left.length && rightIdx < right.length) {
              var ret = compare(left[leftIdx], right[rightIdx]);
              if (ret <= 0) {
                data[i++] = left[leftIdx++];
              } else {
                data[i++] = right[rightIdx++];
              }
            }
            while (leftIdx < left.length) {
              data[i++] = left[leftIdx++];
            }
            while (rightIdx < right.length) {
              data[i++] = right[rightIdx++];
            }
            return data;
          }
        })(TextDocument || (exports.TextDocument = TextDocument = {}));
        var FullTextDocument = function () {
          function FullTextDocument(uri, languageId, version, content) {
            this._uri = uri;
            this._languageId = languageId;
            this._version = version;
            this._content = content;
            this._lineOffsets = undefined;
          }
          Object.defineProperty(FullTextDocument.prototype, "uri", {
            get: function get() {
              return this._uri;
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(FullTextDocument.prototype, "languageId", {
            get: function get() {
              return this._languageId;
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(FullTextDocument.prototype, "version", {
            get: function get() {
              return this._version;
            },
            enumerable: false,
            configurable: true
          });
          FullTextDocument.prototype.getText = function (range) {
            if (range) {
              var start = this.offsetAt(range.start);
              var end = this.offsetAt(range.end);
              return this._content.substring(start, end);
            }
            return this._content;
          };
          FullTextDocument.prototype.update = function (event, version) {
            this._content = event.text;
            this._version = version;
            this._lineOffsets = undefined;
          };
          FullTextDocument.prototype.getLineOffsets = function () {
            if (this._lineOffsets === undefined) {
              var lineOffsets = [];
              var text = this._content;
              var isLineStart = true;
              for (var i = 0; i < text.length; i++) {
                if (isLineStart) {
                  lineOffsets.push(i);
                  isLineStart = false;
                }
                var ch = text.charAt(i);
                isLineStart = ch === '\r' || ch === '\n';
                if (ch === '\r' && i + 1 < text.length && text.charAt(i + 1) === '\n') {
                  i++;
                }
              }
              if (isLineStart && text.length > 0) {
                lineOffsets.push(text.length);
              }
              this._lineOffsets = lineOffsets;
            }
            return this._lineOffsets;
          };
          FullTextDocument.prototype.positionAt = function (offset) {
            offset = Math.max(Math.min(offset, this._content.length), 0);
            var lineOffsets = this.getLineOffsets();
            var low = 0,
              high = lineOffsets.length;
            if (high === 0) {
              return Position.create(0, offset);
            }
            while (low < high) {
              var mid = Math.floor((low + high) / 2);
              if (lineOffsets[mid] > offset) {
                high = mid;
              } else {
                low = mid + 1;
              }
            }
            var line = low - 1;
            return Position.create(line, offset - lineOffsets[line]);
          };
          FullTextDocument.prototype.offsetAt = function (position) {
            var lineOffsets = this.getLineOffsets();
            if (position.line >= lineOffsets.length) {
              return this._content.length;
            } else if (position.line < 0) {
              return 0;
            }
            var lineOffset = lineOffsets[position.line];
            var nextLineOffset = position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : this._content.length;
            return Math.max(Math.min(lineOffset + position.character, nextLineOffset), lineOffset);
          };
          Object.defineProperty(FullTextDocument.prototype, "lineCount", {
            get: function get() {
              return this.getLineOffsets().length;
            },
            enumerable: false,
            configurable: true
          });
          return FullTextDocument;
        }();
        var Is;
        (function (Is) {
          var toString = Object.prototype.toString;
          function defined(value) {
            return typeof value !== 'undefined';
          }
          Is.defined = defined;
          function undefined(value) {
            return typeof value === 'undefined';
          }
          Is.undefined = undefined;
          function _boolean(value) {
            return value === true || value === false;
          }
          Is["boolean"] = _boolean;
          function string(value) {
            return toString.call(value) === '[object String]';
          }
          Is.string = string;
          function number(value) {
            return toString.call(value) === '[object Number]';
          }
          Is.number = number;
          function numberRange(value, min, max) {
            return toString.call(value) === '[object Number]' && min <= value && value <= max;
          }
          Is.numberRange = numberRange;
          function integer(value) {
            return toString.call(value) === '[object Number]' && -2147483648 <= value && value <= 2147483647;
          }
          Is.integer = integer;
          function uinteger(value) {
            return toString.call(value) === '[object Number]' && 0 <= value && value <= 2147483647;
          }
          Is.uinteger = uinteger;
          function func(value) {
            return toString.call(value) === '[object Function]';
          }
          Is.func = func;
          function objectLiteral(value) {
            return value !== null && _typeof(value) === 'object';
          }
          Is.objectLiteral = objectLiteral;
          function typedArray(value, check) {
            return Array.isArray(value) && value.every(check);
          }
          Is.typedArray = typedArray;
        })(Is || (Is = {}));
      });
    }, {}],
    32: [function (require, module, exports) {
      (function (process) {
        (function () {
          !function (t, e) {
            if ("object" == _typeof(exports) && "object" == _typeof(module)) module.exports = e();else if ("function" == typeof define && define.amd) define([], e);else {
              var r = e();
              for (var n in r) ("object" == _typeof(exports) ? exports : t)[n] = r[n];
            }
          }(this, function () {
            return function () {
              "use strict";

              var t = {
                  975: function _(t) {
                    function e(t) {
                      if ("string" != typeof t) throw new TypeError("Path must be a string. Received " + JSON.stringify(t));
                    }
                    function r(t, e) {
                      for (var r, n = "", i = 0, o = -1, s = 0, a = 0; a <= t.length; ++a) {
                        if (a < t.length) r = t.charCodeAt(a);else {
                          if (47 === r) break;
                          r = 47;
                        }
                        if (47 === r) {
                          if (o === a - 1 || 1 === s) ;else if (o !== a - 1 && 2 === s) {
                            if (n.length < 2 || 2 !== i || 46 !== n.charCodeAt(n.length - 1) || 46 !== n.charCodeAt(n.length - 2)) if (n.length > 2) {
                              var h = n.lastIndexOf("/");
                              if (h !== n.length - 1) {
                                -1 === h ? (n = "", i = 0) : i = (n = n.slice(0, h)).length - 1 - n.lastIndexOf("/"), o = a, s = 0;
                                continue;
                              }
                            } else if (2 === n.length || 1 === n.length) {
                              n = "", i = 0, o = a, s = 0;
                              continue;
                            }
                            e && (n.length > 0 ? n += "/.." : n = "..", i = 2);
                          } else n.length > 0 ? n += "/" + t.slice(o + 1, a) : n = t.slice(o + 1, a), i = a - o - 1;
                          o = a, s = 0;
                        } else 46 === r && -1 !== s ? ++s : s = -1;
                      }
                      return n;
                    }
                    var n = {
                      resolve: function resolve() {
                        for (var t, n = "", i = !1, o = arguments.length - 1; o >= -1 && !i; o--) {
                          var s;
                          o >= 0 ? s = arguments[o] : (void 0 === t && (t = process.cwd()), s = t), e(s), 0 !== s.length && (n = s + "/" + n, i = 47 === s.charCodeAt(0));
                        }
                        return n = r(n, !i), i ? n.length > 0 ? "/" + n : "/" : n.length > 0 ? n : ".";
                      },
                      normalize: function normalize(t) {
                        if (e(t), 0 === t.length) return ".";
                        var n = 47 === t.charCodeAt(0),
                          i = 47 === t.charCodeAt(t.length - 1);
                        return 0 !== (t = r(t, !n)).length || n || (t = "."), t.length > 0 && i && (t += "/"), n ? "/" + t : t;
                      },
                      isAbsolute: function isAbsolute(t) {
                        return e(t), t.length > 0 && 47 === t.charCodeAt(0);
                      },
                      join: function join() {
                        if (0 === arguments.length) return ".";
                        for (var t, r = 0; r < arguments.length; ++r) {
                          var i = arguments[r];
                          e(i), i.length > 0 && (void 0 === t ? t = i : t += "/" + i);
                        }
                        return void 0 === t ? "." : n.normalize(t);
                      },
                      relative: function relative(t, r) {
                        if (e(t), e(r), t === r) return "";
                        if ((t = n.resolve(t)) === (r = n.resolve(r))) return "";
                        for (var i = 1; i < t.length && 47 === t.charCodeAt(i); ++i);
                        for (var o = t.length, s = o - i, a = 1; a < r.length && 47 === r.charCodeAt(a); ++a);
                        for (var h = r.length - a, c = s < h ? s : h, f = -1, u = 0; u <= c; ++u) {
                          if (u === c) {
                            if (h > c) {
                              if (47 === r.charCodeAt(a + u)) return r.slice(a + u + 1);
                              if (0 === u) return r.slice(a + u);
                            } else s > c && (47 === t.charCodeAt(i + u) ? f = u : 0 === u && (f = 0));
                            break;
                          }
                          var l = t.charCodeAt(i + u);
                          if (l !== r.charCodeAt(a + u)) break;
                          47 === l && (f = u);
                        }
                        var d = "";
                        for (u = i + f + 1; u <= o; ++u) u !== o && 47 !== t.charCodeAt(u) || (0 === d.length ? d += ".." : d += "/..");
                        return d.length > 0 ? d + r.slice(a + f) : (a += f, 47 === r.charCodeAt(a) && ++a, r.slice(a));
                      },
                      _makeLong: function _makeLong(t) {
                        return t;
                      },
                      dirname: function dirname(t) {
                        if (e(t), 0 === t.length) return ".";
                        for (var r = t.charCodeAt(0), n = 47 === r, i = -1, o = !0, s = t.length - 1; s >= 1; --s) if (47 === (r = t.charCodeAt(s))) {
                          if (!o) {
                            i = s;
                            break;
                          }
                        } else o = !1;
                        return -1 === i ? n ? "/" : "." : n && 1 === i ? "//" : t.slice(0, i);
                      },
                      basename: function basename(t, r) {
                        if (void 0 !== r && "string" != typeof r) throw new TypeError('"ext" argument must be a string');
                        e(t);
                        var n,
                          i = 0,
                          o = -1,
                          s = !0;
                        if (void 0 !== r && r.length > 0 && r.length <= t.length) {
                          if (r.length === t.length && r === t) return "";
                          var a = r.length - 1,
                            h = -1;
                          for (n = t.length - 1; n >= 0; --n) {
                            var c = t.charCodeAt(n);
                            if (47 === c) {
                              if (!s) {
                                i = n + 1;
                                break;
                              }
                            } else -1 === h && (s = !1, h = n + 1), a >= 0 && (c === r.charCodeAt(a) ? -1 == --a && (o = n) : (a = -1, o = h));
                          }
                          return i === o ? o = h : -1 === o && (o = t.length), t.slice(i, o);
                        }
                        for (n = t.length - 1; n >= 0; --n) if (47 === t.charCodeAt(n)) {
                          if (!s) {
                            i = n + 1;
                            break;
                          }
                        } else -1 === o && (s = !1, o = n + 1);
                        return -1 === o ? "" : t.slice(i, o);
                      },
                      extname: function extname(t) {
                        e(t);
                        for (var r = -1, n = 0, i = -1, o = !0, s = 0, a = t.length - 1; a >= 0; --a) {
                          var h = t.charCodeAt(a);
                          if (47 !== h) -1 === i && (o = !1, i = a + 1), 46 === h ? -1 === r ? r = a : 1 !== s && (s = 1) : -1 !== r && (s = -1);else if (!o) {
                            n = a + 1;
                            break;
                          }
                        }
                        return -1 === r || -1 === i || 0 === s || 1 === s && r === i - 1 && r === n + 1 ? "" : t.slice(r, i);
                      },
                      format: function format(t) {
                        if (null === t || "object" != _typeof(t)) throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + _typeof(t));
                        return function (t, e) {
                          var r = e.dir || e.root,
                            n = e.base || (e.name || "") + (e.ext || "");
                          return r ? r === e.root ? r + n : r + "/" + n : n;
                        }(0, t);
                      },
                      parse: function parse(t) {
                        e(t);
                        var r = {
                          root: "",
                          dir: "",
                          base: "",
                          ext: "",
                          name: ""
                        };
                        if (0 === t.length) return r;
                        var n,
                          i = t.charCodeAt(0),
                          o = 47 === i;
                        o ? (r.root = "/", n = 1) : n = 0;
                        for (var s = -1, a = 0, h = -1, c = !0, f = t.length - 1, u = 0; f >= n; --f) if (47 !== (i = t.charCodeAt(f))) -1 === h && (c = !1, h = f + 1), 46 === i ? -1 === s ? s = f : 1 !== u && (u = 1) : -1 !== s && (u = -1);else if (!c) {
                          a = f + 1;
                          break;
                        }
                        return -1 === s || -1 === h || 0 === u || 1 === u && s === h - 1 && s === a + 1 ? -1 !== h && (r.base = r.name = 0 === a && o ? t.slice(1, h) : t.slice(a, h)) : (0 === a && o ? (r.name = t.slice(1, s), r.base = t.slice(1, h)) : (r.name = t.slice(a, s), r.base = t.slice(a, h)), r.ext = t.slice(s, h)), a > 0 ? r.dir = t.slice(0, a - 1) : o && (r.dir = "/"), r;
                      },
                      sep: "/",
                      delimiter: ":",
                      win32: null,
                      posix: null
                    };
                    n.posix = n, t.exports = n;
                  },
                  70: function _(t, e) {
                    if (Object.defineProperty(e, "__esModule", {
                      value: !0
                    }), e.isWindows = void 0, "object" == _typeof(process)) e.isWindows = "win32" === process.platform;else if ("object" == (typeof navigator === "undefined" ? "undefined" : _typeof(navigator))) {
                      var _t9 = navigator.userAgent;
                      e.isWindows = _t9.indexOf("Windows") >= 0;
                    }
                  },
                  231: function _(t, e, r) {
                    Object.defineProperty(e, "__esModule", {
                      value: !0
                    }), e.uriToFsPath = e.URI = void 0;
                    var n = r(70),
                      i = /^\w[\w\d+.-]*$/,
                      o = /^\//,
                      s = /^\/\//;
                    function a(t, e) {
                      if (!t.scheme && e) throw new Error("[UriError]: Scheme is missing: {scheme: \"\", authority: \"".concat(t.authority, "\", path: \"").concat(t.path, "\", query: \"").concat(t.query, "\", fragment: \"").concat(t.fragment, "\"}"));
                      if (t.scheme && !i.test(t.scheme)) throw new Error("[UriError]: Scheme contains illegal characters.");
                      if (t.path) if (t.authority) {
                        if (!o.test(t.path)) throw new Error('[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character');
                      } else if (s.test(t.path)) throw new Error('[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")');
                    }
                    var h = "",
                      c = "/",
                      f = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
                    var u = function () {
                      function u(t, e, r, n, i) {
                        var o = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : !1;
                        _classCallCheck(this, u);
                        _defineProperty(this, "scheme", void 0);
                        _defineProperty(this, "authority", void 0);
                        _defineProperty(this, "path", void 0);
                        _defineProperty(this, "query", void 0);
                        _defineProperty(this, "fragment", void 0);
                        "object" == _typeof(t) ? (this.scheme = t.scheme || h, this.authority = t.authority || h, this.path = t.path || h, this.query = t.query || h, this.fragment = t.fragment || h) : (this.scheme = function (t, e) {
                          return t || e ? t : "file";
                        }(t, o), this.authority = e || h, this.path = function (t, e) {
                          switch (t) {
                            case "https":
                            case "http":
                            case "file":
                              e ? e[0] !== c && (e = c + e) : e = c;
                          }
                          return e;
                        }(this.scheme, r || h), this.query = n || h, this.fragment = i || h, a(this, o));
                      }
                      return _createClass(u, [{
                        key: "fsPath",
                        get: function get() {
                          return v(this, !1);
                        }
                      }, {
                        key: "with",
                        value: function _with(t) {
                          if (!t) return this;
                          var e = t.scheme,
                            r = t.authority,
                            n = t.path,
                            i = t.query,
                            o = t.fragment;
                          return void 0 === e ? e = this.scheme : null === e && (e = h), void 0 === r ? r = this.authority : null === r && (r = h), void 0 === n ? n = this.path : null === n && (n = h), void 0 === i ? i = this.query : null === i && (i = h), void 0 === o ? o = this.fragment : null === o && (o = h), e === this.scheme && r === this.authority && n === this.path && i === this.query && o === this.fragment ? this : new d(e, r, n, i, o);
                        }
                      }, {
                        key: "toString",
                        value: function toString() {
                          var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !1;
                          return y(this, t);
                        }
                      }, {
                        key: "toJSON",
                        value: function toJSON() {
                          return this;
                        }
                      }], [{
                        key: "isUri",
                        value: function isUri(t) {
                          return t instanceof u || !!t && "string" == typeof t.authority && "string" == typeof t.fragment && "string" == typeof t.path && "string" == typeof t.query && "string" == typeof t.scheme && "string" == typeof t.fsPath && "function" == typeof t["with"] && "function" == typeof t.toString;
                        }
                      }, {
                        key: "parse",
                        value: function parse(t) {
                          var e = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : !1;
                          var r = f.exec(t);
                          return r ? new d(r[2] || h, w(r[4] || h), w(r[5] || h), w(r[7] || h), w(r[9] || h), e) : new d(h, h, h, h, h);
                        }
                      }, {
                        key: "file",
                        value: function file(t) {
                          var e = h;
                          if (n.isWindows && (t = t.replace(/\\/g, c)), t[0] === c && t[1] === c) {
                            var _r = t.indexOf(c, 2);
                            -1 === _r ? (e = t.substring(2), t = c) : (e = t.substring(2, _r), t = t.substring(_r) || c);
                          }
                          return new d("file", e, t, h, h);
                        }
                      }, {
                        key: "from",
                        value: function from(t) {
                          var e = new d(t.scheme, t.authority, t.path, t.query, t.fragment);
                          return a(e, !0), e;
                        }
                      }, {
                        key: "revive",
                        value: function revive(t) {
                          if (t) {
                            if (t instanceof u) return t;
                            {
                              var _e = new d(t);
                              return _e._formatted = t.external, _e._fsPath = t._sep === l ? t.fsPath : null, _e;
                            }
                          }
                          return t;
                        }
                      }]);
                    }();
                    e.URI = u;
                    var l = n.isWindows ? 1 : void 0;
                    var d = function (_u2) {
                      function d() {
                        var _this22;
                        _classCallCheck(this, d);
                        for (var _len5 = arguments.length, args = new Array(_len5), _key9 = 0; _key9 < _len5; _key9++) {
                          args[_key9] = arguments[_key9];
                        }
                        _this22 = _callSuper(this, d, [].concat(args));
                        _defineProperty(_this22, "_formatted", null);
                        _defineProperty(_this22, "_fsPath", null);
                        return _this22;
                      }
                      _inherits(d, _u2);
                      return _createClass(d, [{
                        key: "fsPath",
                        get: function get() {
                          return this._fsPath || (this._fsPath = v(this, !1)), this._fsPath;
                        }
                      }, {
                        key: "toString",
                        value: function toString() {
                          var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : !1;
                          return t ? y(this, !0) : (this._formatted || (this._formatted = y(this, !1)), this._formatted);
                        }
                      }, {
                        key: "toJSON",
                        value: function toJSON() {
                          var t = {
                            $mid: 1
                          };
                          return this._fsPath && (t.fsPath = this._fsPath, t._sep = l), this._formatted && (t.external = this._formatted), this.path && (t.path = this.path), this.scheme && (t.scheme = this.scheme), this.authority && (t.authority = this.authority), this.query && (t.query = this.query), this.fragment && (t.fragment = this.fragment), t;
                        }
                      }]);
                    }(u);
                    var p = {
                      58: "%3A",
                      47: "%2F",
                      63: "%3F",
                      35: "%23",
                      91: "%5B",
                      93: "%5D",
                      64: "%40",
                      33: "%21",
                      36: "%24",
                      38: "%26",
                      39: "%27",
                      40: "%28",
                      41: "%29",
                      42: "%2A",
                      43: "%2B",
                      44: "%2C",
                      59: "%3B",
                      61: "%3D",
                      32: "%20"
                    };
                    function g(t, e, r) {
                      var n,
                        i = -1;
                      for (var _o = 0; _o < t.length; _o++) {
                        var _s = t.charCodeAt(_o);
                        if (_s >= 97 && _s <= 122 || _s >= 65 && _s <= 90 || _s >= 48 && _s <= 57 || 45 === _s || 46 === _s || 95 === _s || 126 === _s || e && 47 === _s || r && 91 === _s || r && 93 === _s || r && 58 === _s) -1 !== i && (n += encodeURIComponent(t.substring(i, _o)), i = -1), void 0 !== n && (n += t.charAt(_o));else {
                          void 0 === n && (n = t.substr(0, _o));
                          var _e2 = p[_s];
                          void 0 !== _e2 ? (-1 !== i && (n += encodeURIComponent(t.substring(i, _o)), i = -1), n += _e2) : -1 === i && (i = _o);
                        }
                      }
                      return -1 !== i && (n += encodeURIComponent(t.substring(i))), void 0 !== n ? n : t;
                    }
                    function m(t) {
                      var e;
                      for (var _r2 = 0; _r2 < t.length; _r2++) {
                        var _n = t.charCodeAt(_r2);
                        35 === _n || 63 === _n ? (void 0 === e && (e = t.substr(0, _r2)), e += p[_n]) : void 0 !== e && (e += t[_r2]);
                      }
                      return void 0 !== e ? e : t;
                    }
                    function v(t, e) {
                      var r;
                      return r = t.authority && t.path.length > 1 && "file" === t.scheme ? "//".concat(t.authority).concat(t.path) : 47 === t.path.charCodeAt(0) && (t.path.charCodeAt(1) >= 65 && t.path.charCodeAt(1) <= 90 || t.path.charCodeAt(1) >= 97 && t.path.charCodeAt(1) <= 122) && 58 === t.path.charCodeAt(2) ? e ? t.path.substr(1) : t.path[1].toLowerCase() + t.path.substr(2) : t.path, n.isWindows && (r = r.replace(/\//g, "\\")), r;
                    }
                    function y(t, e) {
                      var r = e ? m : g;
                      var n = "",
                        i = t.scheme,
                        o = t.authority,
                        s = t.path,
                        a = t.query,
                        h = t.fragment;
                      if (i && (n += i, n += ":"), (o || "file" === i) && (n += c, n += c), o) {
                        var _t0 = o.indexOf("@");
                        if (-1 !== _t0) {
                          var _e3 = o.substr(0, _t0);
                          o = o.substr(_t0 + 1), _t0 = _e3.lastIndexOf(":"), -1 === _t0 ? n += r(_e3, !1, !1) : (n += r(_e3.substr(0, _t0), !1, !1), n += ":", n += r(_e3.substr(_t0 + 1), !1, !0)), n += "@";
                        }
                        o = o.toLowerCase(), _t0 = o.lastIndexOf(":"), -1 === _t0 ? n += r(o, !1, !0) : (n += r(o.substr(0, _t0), !1, !0), n += o.substr(_t0));
                      }
                      if (s) {
                        if (s.length >= 3 && 47 === s.charCodeAt(0) && 58 === s.charCodeAt(2)) {
                          var _t1 = s.charCodeAt(1);
                          _t1 >= 65 && _t1 <= 90 && (s = "/".concat(String.fromCharCode(_t1 + 32), ":").concat(s.substr(3)));
                        } else if (s.length >= 2 && 58 === s.charCodeAt(1)) {
                          var _t10 = s.charCodeAt(0);
                          _t10 >= 65 && _t10 <= 90 && (s = "".concat(String.fromCharCode(_t10 + 32), ":").concat(s.substr(2)));
                        }
                        n += r(s, !0, !1);
                      }
                      return a && (n += "?", n += r(a, !1, !1)), h && (n += "#", n += e ? h : g(h, !1, !1)), n;
                    }
                    function b(t) {
                      try {
                        return decodeURIComponent(t);
                      } catch (_unused) {
                        return t.length > 3 ? t.substr(0, 3) + b(t.substr(3)) : t;
                      }
                    }
                    e.uriToFsPath = v;
                    var C = /(%[0-9A-Za-z][0-9A-Za-z])+/g;
                    function w(t) {
                      return t.match(C) ? t.replace(C, function (t) {
                        return b(t);
                      }) : t;
                    }
                  },
                  552: function _(t, e, r) {
                    var n = this && this.__createBinding || (Object.create ? function (t, e, r, n) {
                        void 0 === n && (n = r);
                        var i = Object.getOwnPropertyDescriptor(e, r);
                        i && !("get" in i ? !e.__esModule : i.writable || i.configurable) || (i = {
                          enumerable: !0,
                          get: function get() {
                            return e[r];
                          }
                        }), Object.defineProperty(t, n, i);
                      } : function (t, e, r, n) {
                        void 0 === n && (n = r), t[n] = e[r];
                      }),
                      i = this && this.__setModuleDefault || (Object.create ? function (t, e) {
                        Object.defineProperty(t, "default", {
                          enumerable: !0,
                          value: e
                        });
                      } : function (t, e) {
                        t["default"] = e;
                      }),
                      o = this && this.__importStar || function (t) {
                        if (t && t.__esModule) return t;
                        var e = {};
                        if (null != t) for (var r in t) "default" !== r && Object.prototype.hasOwnProperty.call(t, r) && n(e, t, r);
                        return i(e, t), e;
                      };
                    Object.defineProperty(e, "__esModule", {
                      value: !0
                    }), e.Utils = void 0;
                    var s = o(r(975)),
                      a = s.posix || s,
                      h = "/";
                    var c;
                    !function (t) {
                      t.joinPath = function (t) {
                        for (var _len6 = arguments.length, e = new Array(_len6 > 1 ? _len6 - 1 : 0), _key0 = 1; _key0 < _len6; _key0++) {
                          e[_key0 - 1] = arguments[_key0];
                        }
                        return t["with"]({
                          path: a.join.apply(a, [t.path].concat(e))
                        });
                      }, t.resolvePath = function (t) {
                        var r = t.path,
                          n = !1;
                        r[0] !== h && (r = h + r, n = !0);
                        for (var _len7 = arguments.length, e = new Array(_len7 > 1 ? _len7 - 1 : 0), _key1 = 1; _key1 < _len7; _key1++) {
                          e[_key1 - 1] = arguments[_key1];
                        }
                        var i = a.resolve.apply(a, [r].concat(e));
                        return n && i[0] === h && !t.authority && (i = i.substring(1)), t["with"]({
                          path: i
                        });
                      }, t.dirname = function (t) {
                        if (0 === t.path.length || t.path === h) return t;
                        var e = a.dirname(t.path);
                        return 1 === e.length && 46 === e.charCodeAt(0) && (e = ""), t["with"]({
                          path: e
                        });
                      }, t.basename = function (t) {
                        return a.basename(t.path);
                      }, t.extname = function (t) {
                        return a.extname(t.path);
                      };
                    }(c || (e.Utils = c = {}));
                  }
                },
                e = {};
              function r(n) {
                var i = e[n];
                if (void 0 !== i) return i.exports;
                var o = e[n] = {
                  exports: {}
                };
                return t[n].call(o.exports, o, o.exports, r), o.exports;
              }
              var n = {};
              return function () {
                var t = n;
                Object.defineProperty(t, "__esModule", {
                  value: !0
                }), t.Utils = t.URI = void 0;
                var e = r(231);
                Object.defineProperty(t, "URI", {
                  enumerable: !0,
                  get: function get() {
                    return e.URI;
                  }
                });
                var i = r(552);
                Object.defineProperty(t, "Utils", {
                  enumerable: !0,
                  get: function get() {
                    return i.Utils;
                  }
                });
              }(), n;
            }();
          });
        }).call(this);
      }).call(this, require('_process'));
    }, {
      "_process": 8
    }],
    "vscode-json-languageservice": [function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      var _exportNames = {
        getLanguageService: true
      };
      exports.getLanguageService = getLanguageService;
      var _jsonCompletion = require("./services/jsonCompletion");
      var _jsonHover = require("./services/jsonHover");
      var _jsonValidation = require("./services/jsonValidation");
      var _jsonDocumentSymbols = require("./services/jsonDocumentSymbols");
      var _jsonParser = require("./parser/jsonParser");
      var _configuration = require("./services/configuration");
      var _jsonSchemaService = require("./services/jsonSchemaService");
      var _jsonFolding = require("./services/jsonFolding");
      var _jsonSelectionRanges = require("./services/jsonSelectionRanges");
      var _sort = require("./utils/sort");
      var _format = require("./utils/format");
      var _jsonLinks = require("./services/jsonLinks");
      var _jsonLanguageTypes = require("./jsonLanguageTypes");
      Object.keys(_jsonLanguageTypes).forEach(function (key) {
        if (key === "default" || key === "__esModule") return;
        if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
        if (key in exports && exports[key] === _jsonLanguageTypes[key]) return;
        Object.defineProperty(exports, key, {
          enumerable: true,
          get: function get() {
            return _jsonLanguageTypes[key];
          }
        });
      });
      function getLanguageService(params) {
        var promise = params.promiseConstructor || Promise;
        var jsonSchemaService = new _jsonSchemaService.JSONSchemaService(params.schemaRequestService, params.workspaceContext, promise);
        jsonSchemaService.setSchemaContributions(_configuration.schemaContributions);
        var jsonCompletion = new _jsonCompletion.JSONCompletion(jsonSchemaService, params.contributions, promise, params.clientCapabilities);
        var jsonHover = new _jsonHover.JSONHover(jsonSchemaService, params.contributions, promise);
        var jsonDocumentSymbols = new _jsonDocumentSymbols.JSONDocumentSymbols(jsonSchemaService);
        var jsonValidation = new _jsonValidation.JSONValidation(jsonSchemaService, promise);
        return {
          configure: function configure(settings) {
            var _settings$schemas;
            jsonSchemaService.clearExternalSchemas();
            (_settings$schemas = settings.schemas) === null || _settings$schemas === void 0 || _settings$schemas.forEach(jsonSchemaService.registerExternalSchema.bind(jsonSchemaService));
            jsonValidation.configure(settings);
          },
          resetSchema: function resetSchema(uri) {
            return jsonSchemaService.onResourceChange(uri);
          },
          doValidation: jsonValidation.doValidation.bind(jsonValidation),
          getLanguageStatus: jsonValidation.getLanguageStatus.bind(jsonValidation),
          parseJSONDocument: function parseJSONDocument(document) {
            return (0, _jsonParser.parse)(document, {
              collectComments: true
            });
          },
          newJSONDocument: function newJSONDocument(root, diagnostics, comments) {
            return (0, _jsonParser.newJSONDocument)(root, diagnostics, comments);
          },
          getMatchingSchemas: jsonSchemaService.getMatchingSchemas.bind(jsonSchemaService),
          doResolve: jsonCompletion.doResolve.bind(jsonCompletion),
          doComplete: jsonCompletion.doComplete.bind(jsonCompletion),
          findDocumentSymbols: jsonDocumentSymbols.findDocumentSymbols.bind(jsonDocumentSymbols),
          findDocumentSymbols2: jsonDocumentSymbols.findDocumentSymbols2.bind(jsonDocumentSymbols),
          findDocumentColors: jsonDocumentSymbols.findDocumentColors.bind(jsonDocumentSymbols),
          getColorPresentations: jsonDocumentSymbols.getColorPresentations.bind(jsonDocumentSymbols),
          doHover: jsonHover.doHover.bind(jsonHover),
          getFoldingRanges: _jsonFolding.getFoldingRanges,
          getSelectionRanges: _jsonSelectionRanges.getSelectionRanges,
          findDefinition: function findDefinition() {
            return Promise.resolve([]);
          },
          findLinks: _jsonLinks.findLinks,
          format: function format(document, range, options) {
            return (0, _format.format)(document, options, range);
          },
          sort: function sort(document, options) {
            return (0, _sort.sort)(document, options);
          }
        };
      }
    }, {
      "./jsonLanguageTypes": 9,
      "./parser/jsonParser": 10,
      "./services/configuration": 11,
      "./services/jsonCompletion": 12,
      "./services/jsonDocumentSymbols": 13,
      "./services/jsonFolding": 14,
      "./services/jsonHover": 15,
      "./services/jsonLinks": 16,
      "./services/jsonSchemaService": 17,
      "./services/jsonSelectionRanges": 18,
      "./services/jsonValidation": 19,
      "./utils/format": 23,
      "./utils/sort": 28
    }]
  }, {}, [])("vscode-json-languageservice");
});
    // === end of bundle ===

    return module.exports;
})());
