import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[ERR]', e.message));
page.on('console', m => {
  const t = m.text();
  if (m.type() === 'error' || t.includes('[ca')) console.log(`[${m.type()}] ${t.slice(0, 200)}`);
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2500));
// 重新手动调 Loader.load，看具体哪里卡
const r = await page.evaluate(() => {
  // 清状态
  globalThis.MapScript.modules = [];
  for (const k of Object.keys(globalThis)) {
    if (['MapScript','Loader','Log','erp','ctx','gHandler','CA','Common','Intl','BuildConfig','Internal','JavaReflect','IntColor','G','L','PWM','PopupPage','EventSender'].includes(k)) {
      delete globalThis[k];
    }
  }
  // 再调一次 Loader.load
  // 同步阻塞等完成（用轮询）
  globalThis.Loader.loading = true;
  globalThis.Loader.load(function() {});
  // 等待最多 10 秒
  return new Promise(resolve => {
    let waited = 0;
    const iv = setInterval(() => {
      waited += 100;
      if (!globalThis.Loader.loading || waited > 10000) {
        clearInterval(iv);
        resolve({
          waited,
          loading: globalThis.Loader.loading,
          modules: globalThis.MapScript.modules,
          Common: typeof globalThis.Common,
          CA: typeof globalThis.CA
        });
      }
    }, 100);
  });
});
console.log('RESULT:', JSON.stringify(r, null, 2));
await browser.close();
