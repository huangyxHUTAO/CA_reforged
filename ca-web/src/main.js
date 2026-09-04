/**
 * CA-Web Vite 入口
 *
 * 工作流：
 * 1. 安装 android.* / java.* Proxy shim（让 ca/modules 文件能 import 不报 ReferenceError）
 * 2. 暴露 MapScript/Loader/Log/erp/ctx 等到 globalThis
 * 3. 按 ca/main.js 的顺序静态 import ca/modules/* 核心文件
 * 4. 启动 React/Lit UI
 *
 * 阶段 1 核心模块（约 20 个），不需要 MC/Android/Netease 适配器、不需要所有网络模块。
 */

// 1) android shim 必须最早，否则 Loader 里 init 检测到"android"存在会走不同分支
import { installAndroidShim } from './sandbox/android-shim.js';
installAndroidShim();

// 2) MapScript/Loader + globalThis 暴露
import { MapScript, Loader, exposeGlobals } from './sandbox/loader.js';
exposeGlobals();

// 3) 核心模块 —— 严格按 ca/main.js Loader.load(function(){...}) 顺序
//    阶段 1 先只 import 引擎核心，UI 模块够用即可
//
//    注意：原版是 Rhino 环境，模块顶层 `var X = ...` 全部挂到 globalThis。
//    Web 端 ESM 的 `var` 是模块作用域的，必须显式 globalThis.X 暴露给其他模块。
import '../../ca/modules/BuildConfig.js';
globalThis.BuildConfig = (await import('../../ca/modules/BuildConfig.js')).default || globalThis.BuildConfig;
import '../../ca/modules/uiCore/G.js';
import '../../ca/modules/utils/JavaReflect.js';
import '../../ca/modules/utils/IntColor.js';
import '../../ca/modules/core/EventSender.js';
import '../../ca/modules/uiCore/L.js';
import '../../ca/modules/uiCore/PWM.js';
import '../../ca/modules/uiCore/PopupPage.js';
import '../../ca/modules/Intl.js';
// intl/index.js 原版用 Loader.fromFile 同步读 JSON，Web 端不支持。
// 这里直接 import JSON 然后走相同的设置流程。
import zhCNLang from '../../ca/intl/zh_CN/main.json';
import enUSLang from '../../ca/intl/en_US/main.json';
import { initIntl } from './sandbox/intl-index.js';
initIntl(zhCNLang, enUSLang);

// CA.js 末尾会运行时调 Loader.fromFile("CA.Library.js") 等
// 这些子模块整个文件是 ({...})，插件已改写为 export default
// 提前 import 触发副作用，然后把 default 值挂到 globalThis 供 CA.js 用
// 注意：ESM import 会被 hoist，赋值语句必须放到一个独立模块里
// 让 ca-submodules-preload.js 在 import 拓扑中排在 CA.js 之前
import './sandbox/ca-submodules-preload.js';
import '../../ca/modules/CA.js';
import '../../ca/modules/uiCore/PopupWindow.js';
import '../../ca/modules/utils/Threads.js';
import '../../ca/modules/Common.js';
import '../../ca/modules/core/Plugins.js';
import '../../ca/modules/utils/GlobalUtils.js';
import '../../ca/modules/sense/FCString.js';
import '../../ca/modules/sense/ISegment.js';
import '../../ca/modules/listAdapter/EmptyAdapter.js';
import '../../ca/modules/listAdapter/RhinoListAdapter.js';
import '../../ca/modules/listAdapter/FilterListAdapter.js';
import '../../ca/modules/listAdapter/SimpleListAdapter.js';
import '../../ca/modules/listAdapter/MultipleListAdapter.js';
import '../../ca/modules/listAdapter/ExpandableListAdapter.js';
import '../../ca/modules/listAdapter/MoreListAdapter.js';
import '../../ca/modules/builtinData.js';
import '../../ca/modules/LockClasses.js';
// 网络/MC/Android 模块阶段 1 跳过：
// - network/* (Updater/WSServer/UserManager/IssueService/GiteeFeedback/PushService/NetworkUtils)
// - MCAdapter.js, AndroidBridge.js, NeteaseAdapter.js
// - DexPlugin.js, SettingsCompat.js, EasterEgg.js, DebugUtils.js, JSONEdit.js, JSONLanguageService.js
// - FileLogger.js, Tutorial.js, ExternalStorage.js, SafeFileUtils.js
// - uiCore/LPlugins.js, common.js 之后未列出的

// 4) UI 启动
import './components/ca-app.js';
