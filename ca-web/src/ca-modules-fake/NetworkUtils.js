// NetworkUtils 占位
MapScript.loadModule("NetworkUtils", {
  isConnected: function () { return navigator.onLine; },
  httpGet: function (url, cb) {
    fetch(url).then(r => r.text()).then(t => cb && cb(t)).catch(e => cb && cb(null, e));
  }
});
