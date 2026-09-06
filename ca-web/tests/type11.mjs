import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { if (m.text().includes('probe')) console.log(m.text().slice(0, 300)); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  const cmd = globalThis.CA.cmd;
  // 包 post：捕获微任务异常
  const origPost = cmd.post.bind(cmd);
  cmd.post = (fn) => {
    queueMicrotask(() => {
      try { fn(); console.log('probe: posted fn OK'); }
      catch (e) { console.log('probe: posted fn THREW:', e.message, (e.stack || '').split('\n')[1]); }
    });
    return cmd;
  };
  cmd.el.value = '/summon ';
  cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 500));
  return { isInput: globalThis.CA.IntelliSense.input?.length ?? -1 };
});
console.log(JSON.stringify(r));
await browser.close();
