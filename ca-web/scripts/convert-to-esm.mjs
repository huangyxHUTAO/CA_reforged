// 把 ca-built.js 转成 ESM
// 处理：jsmin 输出的多变量声明 var X = ..., Y = ..., Z = ...; 和单 var X = ...;
import fs from 'node:fs';

const src = fs.readFileSync('src/ca-built.js', 'utf8');
const lines = src.split('\n');

const out = [];
const foundVars = [];

for (let line of lines) {
  // 匹配行首 var X = ..., Y = ..., Z = ...;
  // 简化：只处理单 var X = expr; 或 var X = expr, Y = expr, Z = expr;
  // 但内部 expr 包含 'function' / '{' / '[' 跨行可能挂——保守只处理单行
  const m = line.match(/^(\s*)var\s+([A-Za-z_$][\w$]*)\s*=\s*(.*)$/);
  if (m) {
    const indent = m[1];
    const name = m[2];
    const rest = m[3];
    // 改写成 export const
    // 注意：原 var X = 后面可能是函数体 / 数组 / 对象等复杂结构
    foundVars.push(name);
    out.push(`${indent}export const ${name} = ${rest}`);
  } else {
    // 处理 var X = expr,
    //          Y = expr,
    //          Z = expr; 多行 var
    const mMulti = line.match(/^(\s*)var\s+([A-Za-z_$][\w$]*)\s*=\s*(.*)$/);
    if (mMulti) {
      const indent = mMulti[1];
      const name = mMulti[2];
      const rest = mMulti[3];
      // 多行 var 的第一行
      foundVars.push(name);
      out.push(`${indent}export const ${name} = ${rest}`);
    } else {
      out.push(line);
    }
  }
}

console.log('Found vars:', foundVars.length);
console.log('First 10:', foundVars.slice(0, 10).join(', '));

// 但 \n 内的 var X = expr, Y = expr, Z = expr; 这种单行多变量我们没拆
// 检测这种：
const reSingle = /var\s+([A-Za-z_$][\w$]*)\s*=\s*([^,;]+?)(?=,\s*[A-Za-z_$]|;)/g;
let m;
const singleLineVars = [];
while ((m = reSingle.exec(src)) !== null) {
  // m[1] = name, m[2] = 表达式
  // 确保是行首 var（不在函数体内）。简化：从 src 找到位置 m.index，往前看直到最近 \n，若中间无 {/} 则是顶层
  const before = src.slice(0, m.index);
  const lastNl = before.lastIndexOf('\n');
  const lastBrace = before.lastIndexOf('{');
  if (lastBrace < lastNl) {
    // 顶层
    singleLineVars.push(m[1]);
  }
}
console.log('Top-level single-line var entries found:', singleLineVars.length);

// 这种 var X = ..., Y = ..., Z = ...; 一行多变量改写要复杂
// 因为分号分割 + 表达式里可能含逗号（对象/函数参数）
// 简化策略：先不动手改写，let ca-built.js 当成 classic script 来跑
// 决定：放弃 ESM 转换，回到经典 <script> 注入

// 写回（基本等价）
fs.writeFileSync('src/ca-built.js', out.join('\n'));
console.log('Done. Total lines:', out.length);
