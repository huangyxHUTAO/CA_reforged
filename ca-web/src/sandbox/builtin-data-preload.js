/**
 * 预加载 builtinLibrarys 下的所有 JSON
 * builtinData.js 会运行时调 Loader.fromFile 同步加载，必须提前 import 触发副作用
 *
 * JSONSchema.json 含 // 注释（JSONC），用 ?raw 读文本后用 strip-json-comments 处理
 */
import defaultLib from '../../../ca/modules/builtinLibrarys/default.json';
import basiceduLib from '../../../ca/modules/builtinLibrarys/basicedu.json';
import statesLib from '../../../ca/modules/builtinLibrarys/states.json';
import jsonSchemaRaw from '../../../ca/modules/builtinLibrarys/JSONSchema.json?raw';

function stripJsonComments(text) {
  // 去掉 // 单行注释和 /* */ 块注释（JSONC 简易处理）
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const jsonSchemaLib = JSON.parse(stripJsonComments(jsonSchemaRaw));

globalThis.__caJsonFiles = {
  'builtinLibrarys/default.json': defaultLib,
  'builtinLibrarys/basicedu.json': basiceduLib,
  'builtinLibrarys/states.json': statesLib,
  'builtinLibrarys/JSONSchema.json': jsonSchemaLib
};

console.log('[ca-web] preloaded builtin libraries:',
  Object.keys(globalThis.__caJsonFiles).length);
