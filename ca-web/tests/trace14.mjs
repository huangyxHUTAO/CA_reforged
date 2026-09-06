import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => console.log(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => console.log('[ERR]', e.message));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(async () => {
  globalThis.__counter = 0;
  // 直接拿到 java.lang.Thread 是我设的 JThread class
  const Th = globalThis.java.lang.Thread;
  // 它是 class JThread，应该有 start 方法
  // 看 JThread 是不是真的类
  const isClass = typeof Th === 'function' && /^class/.test(Th.toString());
  // 直接 new 它
  const t = new Th({ run: function() { globalThis.__counter++; } });
  // 试直接调 run 同步
  try {
    if (typeof t.run === 'function') t.run();
  } catch (e) { return { err: e.message }; }
  // 调 start
  try {
    t.start();
  } catch (e) { return { err2: e.message }; }
  await new Promise(r => setTimeout(r, 500));
  return {
    isClass, counter: globalThis.__counter,
    tStart: typeof t.start, tRun: typeof t.run,
    tAlive: typeof t.isAlive === 'function' ? t.isAlive() : 'n/a'
  };
});
console.log('TEST:', JSON.stringify(r, null, 2));
await browser.close();
