import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2000));
// 看 android-shim 内部 PATH_CACHE
const r = await page.evaluate(async () => {
  const m = await import('/src/sandbox/android-shim.js');
  // 不能直接访问 PATH_CACHE —— 试试从 m 拿
  // installAndroidShim 后访问 java.lang.Thread
  m.installAndroidShim();
  // 第一次访问触发 handler.get 创建 java.lang Proxy + 缓存
  const langProxy = globalThis.java.lang;
  console.log('langProxy type:', typeof langProxy);
  // 现在再 R
  m.setupJavaIORuntime();
  // 再访问 java.lang.Thread
  const th = globalThis.java.lang.Thread;
  return {
    thType: typeof th,
    thCtor: th?.toString?.()?.slice(0, 100),
    isMyClass: typeof th === 'function' && /^class/.test(th.toString())
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
