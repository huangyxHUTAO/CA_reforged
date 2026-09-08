import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && /ca erp|ca Error|textwatcher/.test(t)) console.log('[err]', t.slice(0, 180)); });
await page.setViewport({ width: 900, height: 700 });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 11000));

const snap = (tag) => page.evaluate((t) => {
  const IS = globalThis.CA.IntelliSense;
  const rows = [];
  if (IS.ui && IS.ui.el) for (const c of IS.ui.el.children) {
    rows.push({ idx: c.getAttribute('data-idx'), txt: (c.textContent || '').trim().replace(/\n/g, '\\n').slice(0, 44) });
  }
  return { tag: t, value: globalThis.CA.cmd.el.value, cmdname: IS.cmdname, mode: IS.mode,
    inputLen: IS.input ? IS.input.length : -1,
    inputHead: IS.input ? IS.input.slice(0, 3).map(x => (x && x.text !== undefined ? String(x.text).slice(0, 20) : String(x).slice(0, 20))) : [],
    prompt0: IS.prompt && IS.prompt[0] ? String(IS.prompt[0]).replace(/\n/g, '\\n').slice(0, 44) : '',
    rows };
}, tag);

const clickCmd = async () => {
  const p = await page.evaluate(() => { const el = globalThis.CA.cmd.el; const rc = el.getBoundingClientRect(); return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2 }; });
  await page.mouse.click(p.x, p.y);
  await new Promise(r => setTimeout(r, 400));
};
await clickCmd();
await page.keyboard.type('/summon ', { delay: 25 });
await new Promise(r => setTimeout(r, 900));
console.log(JSON.stringify(await snap('A) /summon '), null, 1));
// 追加实体名前几个字符
await page.keyboard.type('a', { delay: 25 });
await new Promise(r => setTimeout(r, 700));
console.log(JSON.stringify(await snap('B) /summon a'), null, 1));
await browser.close();
