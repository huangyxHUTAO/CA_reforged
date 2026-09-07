import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { if (m.text().includes('probe')) console.log(m.text().slice(0, 500)); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
await page.evaluate(async () => {
  // 包 showAssist 抓内部异常
  const orig = globalThis.CA.showAssist;
  globalThis.CA.showAssist = function (...a) {
    try {
      const r = orig.apply(this, a);
      console.log('probe: showAssist ok');
      return r;
    } catch (e) {
      console.log('probe: showAssist THREW', e.message, (e.stack || '').split('\n').slice(1, 5).join(' | '));
      throw e;
    }
  };
  globalThis.CA.cmd.el.value = '/summon ';
  globalThis.CA.cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 800));
  const IS = globalThis.CA.IntelliSense;
  console.log('probe: ui=', IS.ui ? 'set' : 'null', 'listEl=', !!(IS.list && IS.list.el));
});
await browser.close();
