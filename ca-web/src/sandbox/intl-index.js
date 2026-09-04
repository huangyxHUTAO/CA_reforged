/**
 * intl/index.js 的 Web 端等价实现
 *
 * 原版通过 Loader.fromFile 同步读 JSON。
 * Web 端改由 main.js 静态 import JSON 后传进来。
 *
 * 详见 ca/intl/index.js
 */

export function initIntl(zhCNLang, enUSLang) {
  globalThis.Intl.defaultLang = zhCNLang;

  const target = globalThis.Intl.lookupLang({
    zh_CN: { language: 'zh', country: 'CN' },
    en_US: { language: 'en', country: 'US' }
  });

  switch (target) {
    case 'en_US':
      globalThis.Intl.loadLang({ language: 'en', country: 'US' }, enUSLang, false);
      break;
    default:
      globalThis.Intl.loadLang(
        { language: 'zh', country: 'CN', unspecifiedLang: true },
        {},
        false
      );
  }
}
