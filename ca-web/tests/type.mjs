import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
page.on('console', m => { const t = m.text(); if (t.includes('[ca-web]') || (m.type() === 'error' && t.includes('[ca erp]'))) console.log(t.slice(0, 200)); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
// 模拟打字：/summon + 空格
const r = await page.evaluate(async () => {
  const cmd = globalThis.CA.cmd;
  const el = cmd.el;
  const out = {};
  el.focus();
  const type = async (s) => {
    el.value = s;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 300));
  };
  await type('/summon');
  await type('/summon ');
  out.isInput = globalThis.CA.IntelliSense.input?.length ?? -1;
  out.cmdname = globalThis.CA.IntelliSense.cmdname;
  out.hasListDom = !!(globalThis.CA.IntelliSense.list && globalThis.CA.IntelliSense.list.el);
  out.listChildren = globalThis.CA.IntelliSense.list?.el?.childElementCount ?? -1;
  out.listSnippet = globalThis.CA.IntelliSense.list?.el?.innerText?.slice(0, 150) ?? '';
  return out;
});
console.log('TYPE RESULT:', JSON.stringify(r, null, 2));
await page.screenshot({ path: 'tests/shot-type.png' });
await browser.close();
