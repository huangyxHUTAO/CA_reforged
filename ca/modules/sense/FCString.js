MapScript.loadModule("FCString", {
	JAVA_EDITION: false,
	BEGIN: "\u00a7", //分节符
	COLOR: {
		"0": Common.rgbInt(0, 0, 0), // §0 黑色
		"1": Common.rgbInt(0, 0, 170), // §1 深蓝色
		"2": Common.rgbInt(0, 170, 0), // §2 深绿色
		"3": Common.rgbInt(0, 170, 170), // §3 青色
		"4": Common.rgbInt(170, 0, 0), // §4 深红色
		"5": Common.rgbInt(170, 0, 170), // §5 品红色
		"6": Common.rgbInt(255, 170, 0), // §6 金色（JE: 背景#2A2A00 / BE: 背景#402A00）
		"7": Common.rgbInt(170, 170, 170), // §7 灰色
		"8": Common.rgbInt(85, 85, 85), // §8 深灰色
		"9": Common.rgbInt(85, 85, 255), // §9 蓝色
		"a": Common.rgbInt(85, 255, 85), // §a 浅绿色
		"b": Common.rgbInt(85, 255, 255), // §b 天蓝色
		"c": Common.rgbInt(255, 85, 85), // §c 红色
		"d": Common.rgbInt(255, 85, 255), // §d 粉红色
		"e": Common.rgbInt(255, 255, 85), // §e 黄色
		"f": Common.rgbInt(255, 255, 255), // §f 白色

		// ============= 基岩版扩展颜色 (g-v) =============
		"g": Common.rgbInt(221, 214, 5), // §g Minecoin金色
		"h": Common.rgbInt(227, 212, 209), // §h 石英材质色
		"i": Common.rgbInt(206, 202, 202), // §i 铁材质色
		"j": Common.rgbInt(68, 58, 59), // §j 下界合金材质色
		"m": Common.rgbInt(151, 22, 7), // §m 红石材质色
		"n": Common.rgbInt(180, 104, 77), // §n 铜材质色
		"p": Common.rgbInt(222, 177, 45), // §p 金材质色
		"q": Common.rgbInt(17, 160, 54), // §q 绿宝石材质色
		"s": Common.rgbInt(44, 186, 168), // §s 钻石材质色
		"t": Common.rgbInt(33, 73, 123), // §t 青金石材质色
		"u": Common.rgbInt(154, 92, 198), // §u 紫水晶材质色
		"v": Common.rgbInt(235, 114, 20), // §v 树脂材质色  网易未添加
	},
	BOLD: "l",
	// STRIKETHROUGH: "m",
	// UNDERLINE: "n",
	ITALIC: "o",
	RANDOMCHAR: "k",
	RESET: "r",
	parseFC: function self(s) {
		if (!self.tokenize) {
			self.tokenize = function (o, s) {
				var c, i, f = false;
				for (i = 0; i < s.length; i++) {
					c = s.slice(i, i + 1);
					if (f) {
						if (c in FCString.COLOR) {
							if (FCString.JAVA_EDITION) self.reset(o);
							self.startColor(o, c);
						} else if (c in o.style) {
							self.startStyle(o, c);
						} else if (c == FCString.RESET) {
							self.reset(o);
						} else if (c == FCString.BEGIN) {
							o.result.push(FCString.BEGIN);
							o.index += 1;
						} else {
							o.result.push(FCString.BEGIN, c);
							o.index += 2;
						}
						f = false;
					} else if (c == FCString.BEGIN) {
						f = true;
					} else {
						o.result.push(c);
						o.index += 1;
					}
				}
				self.reset(o);
				if (f) o.result.push(FCString.BEGIN);
			}
			self.startColor = function (o, char) {
				if (!isNaN(o.color)) self.endColor(o);
				o.color = FCString.COLOR[char];
				o.colorStart = o.index;
			}
			self.endColor = function (o) {
				if (isNaN(o.color)) return;
				o.spans.push({
					span: new G.ForegroundColorSpan(o.color),
					start: o.colorStart,
					end: o.index
				});
				o.color = NaN;
			}
			self.startStyle = function (o, char) {
				if (!isNaN(o.style[char])) self.endStyle(o, char);
				o.style[char] = o.index;
			}
			self.endStyle = function (o, char) {
				if (isNaN(o.style[char])) return;
				o.spans.push({
					span: self.buildStyleSpan(char),
					start: o.style[char],
					end: o.index
				});
				o.style[char] = NaN;
			}
			self.reset = function (o) {
				var char;
				for (char in o.style) self.endStyle(o, char);
				self.endColor(o);
			}
			self.buildStyleSpan = function (ch) {
				switch (ch) {
					case FCString.BOLD:
						return new G.StyleSpan(G.Typeface.BOLD);
					case FCString.STRIKETHROUGH:
						return new G.StrikethroughSpan();
					case FCString.UNDERLINE:
						return new G.UnderlineSpan();
					case FCString.ITALIC:
						return new G.StyleSpan(G.Typeface.ITALIC);
					case FCString.RANDOMCHAR:
						return new G.StyleSpan(0); //Unknown
				}
			}
		}
		var o = {
			color: NaN,
			colorStart: 0,
			style: {},
			spans: [],
			result: [],
			index: 0
		};
		o.style[this.BOLD] = NaN;
		o.style[this.STRIKETHROUGH] = NaN;
		o.style[this.UNDERLINE] = NaN;
		o.style[this.ITALIC] = NaN;
		o.style[this.RANDOMCHAR] = NaN;
		self.tokenize(o, String(s));
		var r = new G.SpannableString(o.result.join(""));
		o.spans.forEach(function (e) {
			r.setSpan(e.span, e.start, e.end, G.Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
		});
		return r;
	},
	colorFC: function self(ss, defaultcolor) {
		if (!self.tokenize) {
			self.tokenize = function (o, s) {
				var c, i, f = false;
				for (i = 0; i < s.length; o.index = ++i) {
					c = s.slice(i, i + 1);
					if (f) {
						if (c in FCString.COLOR) {
							o.index--;
							if (FCString.JAVA_EDITION) self.reset(o);
							self.startColor(o, c);
							self.colorTag(o, 2);
						} else if (c in o.style) {
							o.index--;
							self.startStyle(o, c);
							self.colorTag(o, 2);
						} else if (c == FCString.RESET) {
							o.index--;
							self.reset(o);
							self.colorTag(o, 2);
						} else if (c == FCString.BEGIN) {
							o.index--;
							self.colorTag(o, 1);
						}
						f = false;
					} else if (c == FCString.BEGIN) {
						f = true;
					}
				}
				if (f) {
					o.index--;
					self.colorTag(o, 1);
					o.index++;
				}
				self.reset(o);
			}
			self.startColor = function (o, char) {
				if (!isNaN(o.color)) self.endColor(o);
				o.color = FCString.COLOR[char];
				o.colorStart = o.index;
			}
			self.endColor = function (o) {
				if (isNaN(o.color)) return;
				o.spans.push({
					span: new G.ForegroundColorSpan(o.color),
					start: o.colorStart,
					end: o.index
				});
				o.color = NaN;
			}
			self.startStyle = function (o, char) {
				if (!isNaN(o.style[char])) self.endStyle(o, char);
				o.style[char] = o.index;
			}
			self.endStyle = function (o, char) {
				if (isNaN(o.style[char])) return;
				o.spans.push({
					span: self.buildStyleSpan(char),
					start: o.style[char],
					end: o.index
				});
				o.style[char] = NaN;
			}
			self.reset = function (o) {
				var char;
				for (char in o.style) self.endStyle(o, char);
				self.endColor(o);
			}
			self.colorTag = function (o, len) {
				if (!isNaN(o.color)) {
					if (o.colorStart < o.index) {
						o.spans.push({
							span: new G.ForegroundColorSpan(o.color),
							start: o.colorStart,
							end: o.index
						});
					}
					o.colorStart = o.index + len;
				}
				o.spans.push({
					span: new G.ForegroundColorSpan(Common.setAlpha(isNaN(o.color) ? o.defaultcolor : o.color, 0x80)),
					start: o.index,
					end: o.index + len
				});
			}
			self.buildStyleSpan = function (ch) {
				switch (ch) {
					case FCString.BOLD:
						return new G.StyleSpan(G.Typeface.BOLD);
					case FCString.STRIKETHROUGH:
						return new G.StrikethroughSpan();
					case FCString.UNDERLINE:
						return new G.UnderlineSpan();
					case FCString.ITALIC:
						return new G.StyleSpan(G.Typeface.ITALIC);
					case FCString.RANDOMCHAR:
						return new G.StyleSpan(0); //Unknown
				}
			}
		}
		var o = {
			defaultcolor: defaultcolor,
			color: NaN,
			colorStart: 0,
			style: {},
			spans: [],
			index: 0
		};
		o.style[this.BOLD] = NaN;
		o.style[this.STRIKETHROUGH] = NaN;
		o.style[this.UNDERLINE] = NaN;
		o.style[this.ITALIC] = NaN;
		o.style[this.RANDOMCHAR] = NaN;
		self.tokenize(o, String(ss));
		o.spans.forEach(function (e) {
			ss.setSpan(e.span, e.start, e.end, G.Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
		});
	},
	clearSpans: function (ss) {
		[
			G.ForegroundColorSpan,
			G.StyleSpan,
			G.StrikethroughSpan,
			G.UnderlineSpan
		].forEach(function (e) {
			var i, a = ss.getSpans(0, ss.length(), e);
			for (i in a) ss.removeSpan(a[i]);
		});
	}
});