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
  const out = { postType: typeof cmd.post, postSrc: String(cmd.post).slice(0, 80) };
  // 手动 post
  let ran = false;
  cmd.post(() => { ran = true; console.log('probe: manual post ran'); });
  await new Promise(r2 => setTimeout(r2, 100));
  out.manualPostRan = ran;
  // 包 textUpdate 探针 + 再走完整链
  const tu = globalThis.CA.showGen.textUpdate;
  globalThis.CA.showGen.textUpdate = function (...a) {
    console.log('probe: textUpdate', String(a[0]).slice(0, 16), 'cursor', a[1]);
    return tu.apply(this, a);
  };
  cmd.el.value = '/summon ';
  cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 500));
  out.isInput = globalThis.CA.IntelliSense.input?.length ?? -1;
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
