// 测试 fixture：模拟 ca/modules 下的文件被 Vite 插件 transform
// 原版文件结构是 MapScript.loadModule("X", { ... })
// 这个文件会被插件注入：import MapScript, Loader, 暴露 globalThis

MapScript.loadModule("Minimal", {
  x: 42,
  greet() { return "hello from Minimal"; }
});

console.log("[minimal.js] MapScript:", typeof MapScript);
console.log("[minimal.js] Loader:", typeof Loader);
console.log("[minimal.js] globalThis.Minimal:", globalThis.Minimal);
