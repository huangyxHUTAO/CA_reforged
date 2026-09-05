// Updater 占位 —— ca/modules/network/Updater.js 的 Web 端等价
// 原版负责检查版本更新，Web 端不需要

MapScript.loadModule("Updater", {
  isConnected: function () { return false; },
  showNewVersionInfo: function () {},
  showCurrentVersionInfo: function () {},
  getVersionInfo: function () { return null; },
  checkUpdate: function (cb) { cb && cb('Web 端不支持更新检查'); },
  checkUpdateBeta: function (cb) { cb && cb('Web 端不支持更新检查'); },
  cleanBetaFiles: function () {},
  updateFlag: 1,
  updateFlagBeta: 1
});
