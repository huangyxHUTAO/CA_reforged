/**
 * Vite 插件：处理 ca/modules 下的源文件
 *
 * 工作：
 * 1. 匹配 ca/modules 下的所有 .js
 * 2. 删掉所有 LOADER 指令注释块（编译期指令，在 Web 端不需要）
 * 3. 不改写 fromFile/require 本身 —— Web 端根本不调用它们（由入口静态 import）
 * 4. 顶部注入：import MapScript+Loader，暴露到 globalThis
 *
 * 故意不做：
 * - 不解析 fromFile 调用并改写为 import —— 走静态入口顺序
 * - 不处理 source 指令这种"编译期注入值" —— 用占位常量代替
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';

// 绝对路径用 process.cwd() 推导（Vite 总是从项目根运行）
// 项目根 = F:/CA-Project/ca-web，ca/modules 在 F:/CA-Project/ca/modules
// 所以从 cwd 出发 ../../ca/modules
const CA_MODULES_ABS = path.resolve(process.cwd(), '..', 'ca', 'modules');
const SHIM_LOADER_PATH = path.resolve(__dirname, 'loader.js');
console.log('[ca-loader] cwd =', process.cwd(), 'CA_MODULES =', CA_MODULES_ABS);
const LOADER_COMMENT_RE = new RegExp('/\\*\\s*LOADER[\\S\\s]*?\\*/', 'g');

/**
 * 扫描顶层 var 声明，收集名字，**不**改写源。改写在末尾追加 globalThis.X = X。
 *
 * 为什么要这么做：
 * - 原版 Rhino：var X = ... 是全局变量，所有脚本共享
 * - Web ESM：var X = ... 是模块作用域，其他模块看不到
 * - 解决方案：本文件保持 var X（保证本文件内的引用还能用），
 *   文件末尾追加 globalThis.X = X; 让其他模块能通过 globalThis.X 访问
 *
 * 注意：只处理顶层（Program.body 第一层）、只处理 `var`、只处理 id 是简单 Identifier 的。
 */
function collectTopLevelVarNames(code) {
  let ast;
  try {
    ast = parse(code, {
      ecmaVersion: 2022,
      sourceType: 'module',
      allowReturnOutsideFunction: false
    });
  } catch (e) {
    return [];
  }
  const names = [];
  for (const node of ast.body) {
    if (
      node.type === 'VariableDeclaration' &&
      node.kind === 'var'
    ) {
      for (const decl of node.declarations) {
        if (decl.id.type === 'Identifier' && decl.init) {
          names.push(decl.id.name);
        }
      }
    }
  }
  return names;
}

/**
 * 检查文件是否是"单个顶层表达式"（被括号包裹的对象字面量或 IIFE）。
 * 如果是，把内容改写为 `export default <inner>`，让 ESM 能 import。
 *
 * 例：CA.Library.js 整个是 `({ inner: {}, ... })`
 *     → 改写为 `export default { inner: {}, ... }`
 *
 *     CA.IntelliSense.js 整个是 `(function() { ... })()`
 *     → 改写为 `export default (function() { ... })()`
 *     但 IIFE 立即执行后没值 —— 这类需要手动改 source
 */
function maybeAddDefaultExport(code) {
  let ast;
  try {
    ast = parse(code, {
      ecmaVersion: 2022,
      sourceType: 'module',
      allowReturnOutsideFunction: false
    });
  } catch (e) {
    return { code, added: false };
  }
  // 必须只有 1 个 body item，且是 ExpressionStatement
  if (ast.body.length !== 1) return { code, added: false };
  const only = ast.body[0];
  if (only.type !== 'ExpressionStatement') return { code, added: false };
  // expression 必须是纯值类型，避免改写后吞掉 loadModule 等副作用
  // - ObjectExpression: ({...})   → 可以
  // - ArrayExpression: [...]      → 可以
  // - Literal: 1, "x"             → 可以
  // 不包括：CallExpression（如 MapScript.loadModule("X", {...}) 不能改写！）
  const e = only.expression;
  if (
    e.type === 'ObjectExpression' ||
    e.type === 'ArrayExpression' ||
    e.type === 'Literal' ||
    e.type === 'TemplateLiteral'
  ) {
    const inner = code.slice(e.start, e.end);
    return {
      code: `export default ${inner};\n`,
      added: true
    };
  }
  return { code, added: false };
}

/**
 * @param {object} [opts]
 * @param {string[]} [opts.moduleDirs] - 哪些绝对目录下的 .js 走插件
 */
export function caLoaderPlugin(opts = {}) {
  const DEFAULT_DIRS = [
    CA_MODULES_ABS,
    path.resolve(__dirname, '../ca-modules-fake')
  ];
  const moduleDirs = (opts.moduleDirs || DEFAULT_DIRS).map(p => path.resolve(p));

  function inModuleDir(absPath) {
    return moduleDirs.some(d => absPath.startsWith(d + path.sep) || absPath === d);
  }

  return {
    name: 'ca-loader',
    enforce: 'pre',

    transform(code, id) {
      const absPath = path.resolve(id.split('?')[0]);
      const match = inModuleDir(absPath);
      if (process.env.CA_DEBUG && absPath.includes('ca/modules')) {
        console.log('[ca-loader] transform?', absPath, 'match=', match, 'in moduleDirs=', moduleDirs);
      }
      if (!match) return null;
      if (!absPath.endsWith('.js')) return null;

      let out = code;

      // 1) 删 LOADER 指令注释块
      out = out.replace(LOADER_COMMENT_RE, '');

      // 2) 检测是否是"单个顶层表达式"，改写为 export default
      const { code: withExport, added } = maybeAddDefaultExport(out);
      out = withExport;

      // 3) 收集顶层 var 名，末尾追加 globalThis.X = X
      //    （如果加了 default export，AST 已经改变，需要重 parse）
      const varNames = added ? [] : collectTopLevelVarNames(out);

      // 4) 算相对路径
      const dir = moduleDirs.find(d => absPath.startsWith(d + path.sep) || absPath === d);
      const rel = path.relative(dir, absPath).replace(/\\/g, '/');

      // 5) 顶部注入：import + 暴露
      const header =
        `import { MapScript as __caMS, Loader as __caLoader, exposeGlobals as __caExpose } from ${JSON.stringify(SHIM_LOADER_PATH)};\n` +
        `__caExpose();\n` +
        `__caLoader.register(${JSON.stringify(rel)});\n` +
        `globalThis.MapScript = __caMS;\n` +
        `globalThis.Loader = __caLoader;\n`;

      out = header + out;

      // 6) 末尾追加 globalThis 暴露
      if (varNames.length) {
        out += '\n' + varNames.map(n => `globalThis.${n} = ${n};`).join('\n') + '\n';
        console.log(`[ca-loader] exposed vars in ${rel}:`, varNames.join(', '));
      }

      return { code: out, map: null };
    }
  };
}
