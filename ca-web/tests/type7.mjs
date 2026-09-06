import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => console.log(m.text().slice(0, 120)));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 10000));
const r = await page.evaluate(() => {
  const cmd = globalThis.CA.cmd;
  const out = { elTag: cmd.el.tagName, hooked: !!cmd.__caInputHooked };
  // 独立监听验证派发
  let got = false;
  cmd.el.addEventListener('input', () => { got = true; console.log('probe: raw listener got input'); });
  cmd.el.value = 'x';
  cmd.el.dispatchEvent(new Event('input', { bubbles: true }));
  out.rawGot = got;
  // hook 里的 watcher 数组现状
  out.watchers = (cmd._textWatchers || []).length;
  // 手动调 after 绕过事件层
  try {
    cmd._textWatchers[0].afterTextChanged({ toString: () => '/give ', length: () => 6 });
    console.log('probe: manual after done');
  } catch (e) { console.log('probe: manual after threw', e.message); }
  return out;
});
await new Promise(r2 => setTimeout(r2, 800));
const after = await page.evaluate(() => ({
  isInput: globalThis.CA.IntelliSense.input?.length ?? -1,
  val: globalThis.CA.cmd.el.value
}));
console.log(JSON.stringify({ ...r, after }, null, 2));
await browser.close();
