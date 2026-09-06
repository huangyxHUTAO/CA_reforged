import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
page.on('console', m => console.log(m.text()));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(async () => {
  const m = await import('/src/sandbox/android-shim.js');
  m.installAndroidShim();
  // 调用 setupJavaIORuntime
  m.setupJavaIORuntime();
  // 直接看 cache
  return {
    hasJavaLang: !!globalThis.java.lang,
    javaLangType: typeof globalThis.java.lang
  };
});
console.log('R:', JSON.stringify(r));
await browser.close();
