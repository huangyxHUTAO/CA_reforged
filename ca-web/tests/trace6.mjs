import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => console.log(`[${m.type()}] ${m.text().slice(0, 200)}`));
page.on('pageerror', e => console.log('[ERR]', e.message));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2000));
// hook 一切
const r = await page.evaluate(() => {
  const results = [];
  // 包 loadModule 计数
  const origLM = globalThis.MapScript.loadModule;
  globalThis.MapScript.loadModule = function(name, obj, ignoreHook) {
    results.push('LM: ' + name);
    return origLM.call(this, name, obj, ignoreHook);
  };
  // 手动调用 Loader.load
  try {
    globalThis.Loader.load(function() { results.push('f() start'); });
  } catch (e) { return { err: e.message }; }
  return { sync: results };
});
console.log('SYNC:', JSON.stringify(r));
await new Promise(r => setTimeout(r, 3000));
const after = await page.evaluate(() => ({
  loadedCount: globalThis.MapScript?.modules?.length,
  modules: globalThis.MapScript?.modules,
  LoaderLoading: globalThis.Loader?.loading,
  CA: typeof globalThis.CA
}));
console.log('AFTER:', JSON.stringify(after, null, 2));
await browser.close();
