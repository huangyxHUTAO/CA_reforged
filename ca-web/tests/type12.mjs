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
  const w = cmd._textWatchers[0];
  const out = {};
  // 1) after 直接调，看它内部是否调 CA.cmd.post
  const origPost = cmd.post;
  let postCalled = false;
  cmd.post = (...a) => { postCalled = true; console.log('probe: engine called post'); return origPost.apply(cmd, a); };
  try { w.afterTextChanged({ toString: () => '/summon ', length: () => 8 }); out.afterCall = 'ok'; }
  catch (e) { out.afterCall = 'threw: ' + e.message; }
  out.postCalledByAfter = postCalled;
  await new Promise(r2 => setTimeout(r2, 400));
  out.isInput = globalThis.CA.IntelliSense.input?.length ?? -1;
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
