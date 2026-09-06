import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => { if (m.text().includes('probe')) console.log(m.text()); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(async () => {
  const cmd = globalThis.CA.cmd;
  const out = {};
  // 包一层 watcher 探针
  const w = cmd._textWatchers?.[0];
  if (w) {
    const orig = w.afterTextChanged.bind(w);
    w.afterTextChanged = (s) => { console.log('probe: afterTextChanged called, value=', cmd.el.value); orig(s); };
  }
  cmd.el.value = '/summon ';
  cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 400));
  out.isInput = globalThis.CA.IntelliSense.input?.length ?? -1;
  // 检查 post 是否执行：直接看 textUpdate 是否被调（包 CA.showGen.textUpdate）
  const tu = globalThis.CA.showGen.textUpdate;
  if (tu) {
    const origTu = tu.bind(globalThis.CA.showGen);
    globalThis.CA.showGen.textUpdate = (...a) => { console.log('probe: textUpdate called', String(a[0]).slice(0, 20)); return origTu(...a); };
  }
  cmd.el.value = '/give ';
  cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 400));
  out.isInput2 = globalThis.CA.IntelliSense.input?.length ?? -1;
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
