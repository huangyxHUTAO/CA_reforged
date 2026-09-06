import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message, e.stack?.split('\n').slice(0, 5).join(' | ')));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2000));
// 模拟 Loader.load 的 Thread 创建和启动
const r = await page.evaluate(() => {
  globalThis.__counter = 0;
  const Th = globalThis.java.lang.Thread;
  const Ru = globalThis.java.lang.Runnable;
  console.log('Thread type:', typeof Th, 'cTor?', Th?.toString().slice(0, 80));
  console.log('Runnable type:', typeof Ru);
  const t = new Th(new Ru({ run: function() { globalThis.__counter++; console.log('thread run'); } }));
  console.log('t created:', !!t, 'has start:', typeof t.start);
  t.start();
  return new Promise(resolve => setTimeout(() => {
    resolve({ counter: globalThis.__counter, tIsAlive: t.isAlive?.() });
  }, 1000));
});
console.log('THREAD TEST:', JSON.stringify(r));
await browser.close();
