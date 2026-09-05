// IntColor 占位 —— ca/modules/utils/IntColor.js 的 Web 端等价
// 真实原版用 Rhino reflection 获取 Android Paint/Color API，
// Web 端用不到（CSS 变量直接给颜色），全部返回 noop。

MapScript.loadModule("IntColor", (function() {
  var r = {};
  r.Color = {
    alpha: function() { return 0; },
    argb: function(a, r, g, b) { return (a << 24) | (r << 16) | (g << 8) | b; },
    blue: function() { return 0; },
    green: function() { return 0; },
    red: function() { return 0; },
    rgb: function(r, g, b) { return (0xff << 24) | (r << 16) | (g << 8) | b; }
  };
  r.Canvas = { drawColor: function() {} };
  r.Bitmap = { eraseColor: function() {}, eraseColorLong: function() {} };
  r.Paint = {
    setColor: function() {},
    setColorLong: function() {},
    setShadowLayer: function() {},
    setShadowLayerLong: function() {}
  };
  r.LinearGradient = { buildFromArray: function() {}, buildFromEnds: function() {}, buildFromArrayLong: function() {}, buildFromEndsLong: function() {} };
  r.RadialGradient = { buildFromArray: function() {}, buildFromCenterEdge: function() {}, buildFromArrayLong: function() {}, buildFromCenterEdgeLong: function() {} };
  r.SweepGradient = { buildFromArray: function() {}, buildFromEnds: function() {}, buildFromArrayLong: function() {}, buildFromEndsLong: function() {} };
  return r;
})());
