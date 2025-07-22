MapScript.loadModule("ISegment", {
	alignStringEnd : function(s, len, char) {
		var i, t = "";
		for (i = len - s.length; i > 0; i--) {
			t += char;
		}
		return t + s;
	},
	isStringEOS : function(strStream) {
		return strStream.cur >= strStream.str.length;
	},
	readStreamStr : function(strStream) {
		return strStream.str.charAt(strStream.cur++);
	},
	peekStreamStr : function(strStream) {
		return strStream.str.charAt(strStream.cur);
	},
	readStreamAll : function(strStream) {
		var oldcur = strStream.cur;
		strStream.cur = strStream.str.length;
		return strStream.str.slice(oldcur);
	},
	peekStreamAll : function(strStream) {
		return strStream.str.slice(strStream.cur);
	},
	readLenientString : function(strStream, options) {
		var c, state = 0, r = [], hex, hexn, endchars = options.endChars || "";
		while (strStream.cur < strStream.str.length) {
			c = strStream.str.charAt(strStream.cur++);
			switch (state) {
				case 0:
				if (c == "\\") {
					state = 1;
				} else if (endchars.indexOf(c) >= 0) {
					return r.join("");
				} else {
					r.push(c);
				}
				break;
				case 1:
				if (c == "0") {
					r.push("\0");
				} else if (c == "n") {
					r.push("\n");
				} else if (c == "r") {
					r.push("\r");
				} else if (c == "v") {
					r.push("\v");
				} else if (c == "t") {
					r.push("\t");
				} else if (c == "b") {
					r.push("\b");
				} else if (c == "f") {
					r.push("\f");
				} else if (c == "x") {
					state = 2;
					hex = 0; hexn = 2;
					break;
				} else if (c == "u") {
					state = 3;
					hex = 0; hexn = 4;
					break;
				} else {
					r.push(c);
				}
				state = 0;
				break;
				case 2:
				case 3:
				hex = hex * 16 + parseInt(c, 16);
				hexn--;
				if (hexn <= 0) {
					r.push(String.fromCharCode(hex));
					state = 0;
				}
				break;
			}
		}
		return r.join("");
	},
	writeLenientString : function(s, options) {
		var i = 0, c, r = [], skipchars = options.skipChars || "";
		while (i < s.length) {
			c = s.charAt(i++);
			if (c == "\0") {
				r.push("\\0");
			} else if (c == "\n") {
				r.push("\\n");
			} else if (c == "\r") {
				r.push("\\r");
			} else if (c == "\v") {
				r.push("\\v");
			} else if (c == "\t") {
				r.push("\\t");
			} else if (c == "\b") {
				r.push("\\b");
			} else if (c == "\f") {
				r.push("\\f");
			} else if (skipchars.indexOf(c) >= 0) {
				r.push("\\" + c);
			} else if (c < " " || c > "~") { //not in 0x20-0x7e
				r.push("\\u" + this.alignStringEnd(c.charCodeAt(0).toString(16), 4, "0"));
			} else {
				r.push(c);
			}
		}
		return r.join("");
	},
	readLenientStringArray : function(strStream, options) {
		var i, r = [], opt = {
			endChars : options.splitChars + options.endChars
		};
		while (strStream.cur < strStream.str.length) {
			r.push(this.readLenientString(strStream, opt));
			if (options.endChars.indexOf(strStream.str[strStream.cur - 1]) >= 0) {
				break;
			}
		}
		return r;
	},
	writeLenientStringArray : function(arr, options) {
		var self = this, opt = {
			skipChars : options.splitChar + options.skipChars
		};
		return arr.map(function(e) {
			return self.writeLenientString(e, opt);
		}).join(options.splitChar);
	},
	kvSort : function(k, v, f) {
		var i, e, arr = new Array(Math.max(k.length, v.length));
		for (i = 0; i < arr.length; i++) {
			arr[i] = [k[i], v[i]];
		}
		arr.sort(function(a, b) {
			return f(a[0], b[0]);
		});
		for (i = 0; i < arr.length; i++) {
			e = arr[i];
			k[i] = e[0];
			v[i] = e[1];
		}
	},

	parseUnit : function(str) {
		var p = str.search(/[^\d\s\.]/), num;
		if (p >= 0) {
			num = parseFloat(str.slice(0, p));
			if (!isFinite(num)) return null;
			return {
				number : num,
				unit : str.slice(p).replace(/\s*$/, "")
			};
		} else {
			num = parseFloat(str);
			return {
				number : num,
				unit : null
			};
		}
	},
	rawJson : function self(o, variableMap) {
		if (!self.coverSpan) {
			self.coverSpan = function(src, span) {
				if (span) src.setSpan(span, 0, src.length(), G.Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
			}
			self.parseColor = function(v) {
				if (v in Common.theme) {
					return Common.theme[v];
				} else {
					return G.Color.parseColor(v)
				}
			}
			self.parseTextSize = function(v) {
				var size = ISegment.parseUnit(String(v));
				if (size) {
					switch (size.unit) {
						case "px":
						return new G.AbsoluteSizeSpan(size.number);
						case "dp":
						return new G.AbsoluteSizeSpan(size.number, true);
						case "ts":
						return new G.AbsoluteSizeSpan(Common.theme.textsize[size.number] * G.sp);
						case "%":
						return new G.RelativeSizeSpan(size.number / 100);
						case null:
						return new G.RelativeSizeSpan(size.number);
						default:
						return null;
					}
				} else {
					return null;
				}
			}
			self.parseAlign = function(v) {
				switch (v) {
					case "normal":
					case "left":
					return G.Layout.Alignment.ALIGN_NORMAL;
					case "opposite":
					case "right":
					return G.Layout.Alignment.ALIGN_OPPOSITE;
					case "center":
					return G.Layout.Alignment.ALIGN_CENTER;
					default:
					return null;
				}
			}
			self.parseHtml = function(v) {
				if (android.os.Build.VERSION.SDK_INT >= 24) {
					return G.Html.fromHtml(v, 0); // FROM_HTML_MODE_LEGACY
				} else {
					return G.Html.fromHtml(v);
				}
			}
		}
		var i, result = new G.SpannableStringBuilder();
		if (Array.isArray(o)) {
			for (i in o) {
				result.append(self(o[i], variableMap));
			}
		} else if (typeof o == "function") {
			result.append(self(o(variableMap), variableMap));
		} else if (o instanceof Object) {
			if (o.text) {
				result.append(o.text);
			} else if (o.lines) {
				for (i = 0; i < o.lines.length; i++) {
					if (i > 0) result.append("\n");
					result.append(self(o.lines[i], variableMap));
				}
			} else if (o.variable) {
				result.append(String(variableMap[o.variable]));
			} else if (o.formattedCommand) {
				result.append(o.formattedCommand);
				self.coverSpan(result, new G.ForegroundColorSpan(G.Color.WHITE));
				FCString.colorFC(result, G.Color.WHITE);
				self.coverSpan(result, new G.TypefaceSpan("monospace"));
				self.coverSpan(result, new G.BackgroundColorSpan(G.Color.BLACK));
			} else if (o.formattedText) {
				result.append(FCString.parseFC(o.formattedText));
			} else if (o.command) {
				result.append(o.command);
				self.coverSpan(result, new G.TypefaceSpan("monospace"));
			} else if (o.list) {
				for (i in o.list) {
					result.setSpan(new G.BulletSpan(), result.length(), result.length(), G.Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
					result.append(self(o.list[i], variableMap));
					result.append("\n");
				}
			} else if (o.html) {
				result.append(self.parseHtml(o.html));
			} else if (o.image) {
				result.setSpan(new G.ImageSpan(ctx, android.net.Uri.parse(o.image)), result.length(), result.length(), G.Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
			}
			if (o.extra) {
				result.append(self(o.extra, variableMap));
			}
			if (o.link) self.coverSpan(result, new G.URLSpan(o.link));
			if (o.color) self.coverSpan(result, new G.ForegroundColorSpan(self.parseColor(o.color)));
			if (o.bgcolor) self.coverSpan(result, new G.BackgroundColorSpan(self.parseColor(o.bgcolor)));
			if (o.bold) self.coverSpan(result, new G.StyleSpan(G.Typeface.BOLD));
			if (o.italic) self.coverSpan(result, new G.StyleSpan(G.Typeface.ITALIC));
			if (o.underlined) self.coverSpan(result, new G.UnderlineSpan());
			if (o.strikethrough) self.coverSpan(result, new G.StrikethroughSpan());
			if (o.superscript) self.coverSpan(result, new G.SuperscriptSpan());
			if (o.subscript) self.coverSpan(result, new G.SubscriptSpan());
			if (o.typeface) self.coverSpan(result, new G.TypefaceSpan(o.typeface));
			if (o.size) self.coverSpan(result, self.parseTextSize(o.size));
			if (o.align) self.coverSpan(result, new G.AlignmentSpan.Standard(self.parseAlign(o.align)));
			if (o.tabWidth) self.coverSpan(result, new G.TabStopSpan.Standard(o.tabWidth));
		} else if (o instanceof java.lang.CharSequence) {
			result.append(o);
		} else {
			result.append(String(o));
		}
		return result;
	}
});