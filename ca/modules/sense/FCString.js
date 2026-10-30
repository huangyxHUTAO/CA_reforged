MapScript.loadModule("FCString", {
	JAVA_EDITION : false,
	BEGIN : "\u00a7", //分节符
	COLOR : {
		"0" : Common.rgbInt(0, 0, 0),
		"1" : Common.rgbInt(0, 0, 170),
		"2" : Common.rgbInt(0, 170, 0),
		"3" : Common.rgbInt(0, 170, 170),
		"4" : Common.rgbInt(170, 0, 0),
		"5" : Common.rgbInt(170, 0, 170),
		"6" : Common.rgbInt(255, 170, 0),
		"7" : Common.rgbInt(170, 170, 170),
		"8" : Common.rgbInt(85, 85, 85),
		"9" : Common.rgbInt(85, 85, 255),
		"a" : Common.rgbInt(85, 255, 85),
		"b" : Common.rgbInt(85, 255, 255),
		"c" : Common.rgbInt(255, 85, 85),
		"d" : Common.rgbInt(255, 85, 255),
		"e" : Common.rgbInt(255, 255, 85),
		"f" : Common.rgbInt(255, 255, 255)
	},
	BOLD : "l",
	STRIKETHROUGH : "m",
	UNDERLINE : "n",
	ITALIC : "o",
	RANDOMCHAR : "k",
	RESET : "r",
	parseFC : function self(s) {
		if (!self.tokenize) {
			self.tokenize = function(o, s) {
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
					} else if (c == FCString.BEGIN){
						f = true;
					} else {
						o.result.push(c);
						o.index += 1;
					}
				}
				self.reset(o);
				if (f) o.result.push(FCString.BEGIN);
			}
			self.startColor = function(o, char) {
				if (!isNaN(o.color)) self.endColor(o);
				o.color = FCString.COLOR[char];
				o.colorStart = o.index;
			}
			self.endColor = function(o) {
				if (isNaN(o.color)) return;
				o.spans.push({
					span : new G.ForegroundColorSpan(o.color),
					start : o.colorStart,
					end : o.index
				});
				o.color = NaN;
			}
			self.startStyle = function(o, char) {
				if (!isNaN(o.style[char])) self.endStyle(o, char);
				o.style[char] = o.index;
			}
			self.endStyle = function(o, char) {
				if (isNaN(o.style[char])) return;
				o.spans.push({
					span : self.buildStyleSpan(char),
					start : o.style[char],
					end : o.index
				});
				o.style[char] = NaN;
			}
			self.reset = function(o) {
				var char;
				for (char in o.style) self.endStyle(o, char);
				self.endColor(o);
			}
			self.buildStyleSpan = function(ch) {
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
			color : NaN,
			colorStart : 0,
			style : {},
			spans : [],
			result : [],
			index : 0
		};
		o.style[this.BOLD] = NaN;
		o.style[this.STRIKETHROUGH] = NaN;
		o.style[this.UNDERLINE] = NaN;
		o.style[this.ITALIC] = NaN;
		o.style[this.RANDOMCHAR] = NaN;
		self.tokenize(o, String(s));
		var r = new G.SpannableString(o.result.join(""));
		o.spans.forEach(function(e) {
			r.setSpan(e.span, e.start, e.end, G.Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
		});
		return r;
	},
	colorFC : function self(ss, defaultcolor) {
		if (!self.tokenize) {
			self.tokenize = function(o, s) {
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
					} else if (c == FCString.BEGIN){
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
			self.startColor = function(o, char) {
				if (!isNaN(o.color)) self.endColor(o);
				o.color = FCString.COLOR[char];
				o.colorStart = o.index;
			}
			self.endColor = function(o) {
				if (isNaN(o.color)) return;
				o.spans.push({
					span : new G.ForegroundColorSpan(o.color),
					start : o.colorStart,
					end : o.index
				});
				o.color = NaN;
			}
			self.startStyle = function(o, char) {
				if (!isNaN(o.style[char])) self.endStyle(o, char);
				o.style[char] = o.index;
			}
			self.endStyle = function(o, char) {
				if (isNaN(o.style[char])) return;
				o.spans.push({
					span : self.buildStyleSpan(char),
					start : o.style[char],
					end : o.index
				});
				o.style[char] = NaN;
			}
			self.reset = function(o) {
				var char;
				for (char in o.style) self.endStyle(o, char);
				self.endColor(o);
			}
			self.colorTag = function(o, len) {
				if (!isNaN(o.color)) {
					if (o.colorStart < o.index) {
						o.spans.push({
							span : new G.ForegroundColorSpan(o.color),
							start : o.colorStart,
							end : o.index
						});
					}
					o.colorStart = o.index + len;
				}
				o.spans.push({
					span : new G.ForegroundColorSpan(Common.setAlpha(isNaN(o.color) ? o.defaultcolor : o.color, 0x80)),
					start : o.index,
					end : o.index + len
				});
			}
			self.buildStyleSpan = function(ch) {
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
			defaultcolor : defaultcolor,
			color : NaN,
			colorStart : 0,
			style : {},
			spans : [],
			index : 0
		};
		o.style[this.BOLD] = NaN;
		o.style[this.STRIKETHROUGH] = NaN;
		o.style[this.UNDERLINE] = NaN;
		o.style[this.ITALIC] = NaN;
		o.style[this.RANDOMCHAR] = NaN;
		self.tokenize(o, String(ss));
		o.spans.forEach(function(e) {
			ss.setSpan(e.span, e.start, e.end, G.Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
		});
	},
	clearSpans : function(ss) {
		[
			G.ForegroundColorSpan,
			G.StyleSpan,
			G.StrikethroughSpan,
			G.UnderlineSpan
		].forEach(function(e) {
			var i, a = ss.getSpans(0, ss.length(), e);
			for (i in a) ss.removeSpan(a[i]);
		});
	}
});