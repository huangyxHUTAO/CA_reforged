import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('console', m => { const t=m.text(); if(m.type()==='error'&&(t.includes('ca erp')||t.includes('ca Error'))) console.log('[err]', t.slice(0,160)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));
const r = await page.evaluate(async () => {
  const cmd = globalThis.CA.cmd;
  const snap = () => document.body.innerText.replace(/\s+/g,' ').slice(0, 200);
  const before = snap();
  cmd.el.value = '/aaaaaa';
  cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 1000));
  const after = snap();
  // 引擎状态
  const IS = globalThis.CA.IntelliSense;
  const st = { input: (IS.input||[]).length, cmdname: IS.cmdname,
    prompt: IS.prompt&&IS.prompt[0]?String(IS.prompt[0]).slice(0,50):'' };
  // 找到可见列表节点与文本
  const ov = document.getElementById('ca-overlay');
  return { before, after, same: before===after, st };
});
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/ui-refresh.png' });
await browser.close();
