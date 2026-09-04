/**
 * 预加载 CA 的子模块并挂到 globalThis.__caPreloadedModules
 *
 * 必须在 main.js 里先于 import '../../ca/modules/CA.js' 之前 import 本模块。
 * 因为 ESM 的 import 会被 hoist，赋值语句如果写在 main.js 里，
 * 会在 CA.js 执行**之后**才执行，CA.js 调 Loader.fromFile 时找不到。
 */
import CA_Library from '../../../ca/modules/CA.Library.js';
import CA_IntelliSense from '../../../ca/modules/CA.IntelliSense.js';
import CA_Assist from '../../../ca/modules/CA.Assist.js';

globalThis.__caPreloadedModules = {
  'CA.Library.js': CA_Library,
  'CA.IntelliSense.js': CA_IntelliSense,
  'CA.Assist.js': CA_Assist
};

console.log('[ca-web] preloaded CA submodules:', Object.keys(globalThis.__caPreloadedModules));
