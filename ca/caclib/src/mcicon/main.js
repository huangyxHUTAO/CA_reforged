Plugins.inject(function(o) {
o.name = "MC图标";
o.author = "ProjectXero";
o.version = [2, 0, 1];
o.uuid = "06b2fb31-668e-4693-92ad-c0ac8da3e7a9";
o.description = "在命令助手中添加MC图标\n\n用法：在菜单里点击“显示样式代码栏”，然后点击省略号，再点击“MC图标”\n或者在菜单里点击“插入……”，然后点击“短语”，再点击“MC图标”";
o.feature("userExpressionMenuAppendable");
o.init = function() {
	Plugins.addExpressionMenu({
		text : "MC图标",
		get : function() {
			MCIcon.show(function(text) {
				Common.replaceSelection(CA.cmd.getText(), text);
			});
		}
	});
}
function fixZero(s, n) {
	while (n > s.length) {
		s = "0" + s;
	}
	return s;
}
function readAsset(zf, path) {
	var entry = zf.getEntry(path);
	if (entry == null) return null;
	return new java.io.BufferedReader(new java.io.InputStreamReader(zf.getInputStream(entry)));
}
function readAssetJSON(zf, path, defaultValue) {
	try{
		var rd = readAsset(zf, path);
		var s = [], q;
		while (q = rd.readLine()) s.push(q);
		rd.close();
		return JSON.parse(s.join("\n"));
	} catch(e) {
		return defaultValue;
	}
}
MapScript.loadModule("MCIcon", {
	preload : function() {
		var pkg = NeteaseAdapter.mcPackage;
		if (!pkg) throw "未找到Minecraft应用";
		this.zipFile = new java.util.zip.ZipFile(ctx.getPackageManager().getApplicationInfo(pkg, 128).publicSourceDir);
		this.emoticons = readAssetJSON(this.zipFile, "assets/resource_packs/vanilla/font/emoticons.json", []);
		this.initCache();
		this.ready = true;
	},
	checkReady : function() {
		if (this.ready) return;
		this.preload();
	},
	getGlyphSheet : function(index) {
		var entry = this.zipFile.getEntry("assets/resource_packs/vanilla/font/glyph_" + fixZero(index.toString(16).toUpperCase(), 2) + ".png");
		if (!entry) Log.throwError(new Error("GlyphSheet not exist. index=" + index));
		var stream = this.zipFile.getInputStream(entry);
		var bmp = G.BitmapFactory.decodeStream(stream);
		stream.close();
		return bmp;
	},
	getGlyphSheetCached : function(index) {
		if (this.glyphSheet[index]) {
			return this.glyphSheet[index];
		} else {
			return this.glyphSheet[index] = this.getGlyphSheet(index);
		}
	},
	getGlyphBitmap : function(code) {
		var sheet = this.getGlyphSheetCached(code >> 8);
		var width = sheet.getWidth() >> 4, height = sheet.getHeight() >> 4;
		var cn = code & 0xf, rn = (code >> 4) & 0xf;
		return G.Bitmap.createBitmap(sheet, cn * width, rn * height, width, height);
	},
	getGlyphBitmapCached : function(code) {
		if (this.glyph[code]) {
			return this.glyph[code];
		} else {
			return this.glyph[code] = this.getGlyphBitmap(code);
		}
	},
	initCache : function() {
		this.glyph = new Array(65536);
		this.glyphSheet = new Array(256);
	},
	releaseCache : function() {
		var i;
		for (i in this.glyph) {
			if (this.glyph[i]) {
				this.glyph[i].recycle();
			}
		}
		for (i in this.glyphSheet) {
			if (this.glyphSheet[i]) {
				this.glyphSheet[i].recycle();
			}
		}
		this.initCache();
	},
	getGlyphDrawable : function(code, heightPixels) {
		var bmp = this.getGlyphBitmapCached(code);
		var drawable = new G.BitmapDrawable(ctx.getResources(), bmp);
		drawable.setFilterBitmap(false);
		var scaleFactor = heightPixels / bmp.getHeight();
		drawable.setBounds(0, 0, bmp.getWidth() * scaleFactor, bmp.getHeight() * scaleFactor);
		return drawable;
	},
	getGlyphSpannable : function(code, heightPixels) {
		var span = new G.ImageSpan(this.getGlyphDrawable(code, heightPixels));
		var spannableStr = new G.SpannableString(String.fromCharCode(code));
		spannableStr.setSpan(span, 0, spannableStr.length(), G.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
		return spannableStr;
	},
	getFontHeightPixel : function(textSize, typeface) {
		var pt = new G.Paint();
		textSize *= G.sp;
		pt.setTextSize(textSize);
		if (typeface) pt.setTypeface(typeface);
		var fm = pt.getFontMetrics();
		return fm.descent - fm.ascent;
	},
	show : function self(callback) {
		if (!self.linear) {
			self.vmaker = function(holder) {
				var view = new G.ImageView(ctx);
				view.setLayoutParams(new G.AbsListView.LayoutParams(64 * G.dp, 64 * G.dp));
				view.setPadding(5 * G.dp, 5 * G.dp, 5 * G.dp, 5 * G.dp);
				view.setScaleType(G.ImageView.ScaleType.FIT_CENTER);
				return view;
			}
			self.vbinder = function(holder, e) {
				if (!e.drawable) e.drawable = MCIcon.getGlyphDrawable(e.code, 64 * G.dp);
				holder.self.setImageDrawable(e.drawable);
			}
			self.init = function() {
				MCIcon.checkReady();
				self.icons = MCIcon.emoticons.map(function(e) {
					return {
						name : e.name,
						lcname : e.name.toLowerCase(),
						code : parseInt(e.code)
					};
				});
				self.fontHeight = MCIcon.getFontHeightPixel(Common.theme.textsize[3]) * 1.5;
				self.update("");
			}
			self.update = function(s) {
				s = s.toLowerCase();
				self.adpt.setArray(self.icons.filter(function(e) {
					return e.lcname.indexOf(s) >= 0;
				}));
			}
			self.adpt = SimpleListAdapter.getController(new SimpleListAdapter([], self.vmaker, self.vbinder));
			self.linear = new G.LinearLayout(ctx);
			self.linear.setOrientation(G.LinearLayout.VERTICAL);
			Common.applyStyle(self.linear, "container_default");
			self.header = new G.LinearLayout(ctx);
			self.header.setOrientation(G.LinearLayout.HORIZONTAL);
			self.header.setPadding(5 * G.dp, 0, 0, 0)
			self.header.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
			Common.applyStyle(self.header, "bar_float");
			self.edit = new G.EditText(ctx);
			self.edit.setSingleLine(true);
			self.edit.setLayoutParams(new G.LinearLayout.LayoutParams(0, -2, 1.0));
			self.edit.setImeOptions(G.EditorInfo.IME_FLAG_NO_FULLSCREEN);
			self.edit.setTypeface(G.Typeface.MONOSPACE);
			Common.applyStyle(self.edit, "edittext_default", 3);
			self.edit.addTextChangedListener(new G.TextWatcher({
				afterTextChanged : function(s) {try {
					self.update(String(s));
				} catch(e) {erp(e)}}
			}));
			self.header.addView(self.edit);
			self.exit = new G.TextView(ctx);
			self.exit.setText("×");
			self.exit.setGravity(G.Gravity.CENTER);
			self.exit.setPadding(10 * G.dp, 0, 10 * G.dp, 0)
			self.exit.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
			Common.applyStyle(self.exit, "button_critical", 3);
			self.exit.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
				self.popup.exit();
			} catch(e) {erp(e)}}}));
			self.header.addView(self.exit);
			self.linear.addView(self.header);
			self.list = new G.GridView(ctx);
			self.list.setAdapter(self.adpt.self);
			self.list.setGravity(G.Gravity.CENTER);
			self.list.setNumColumns(4);
			self.list.setStretchMode(2);
			self.list.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -1));
			self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({onItemClick : function(parent, view, pos, id) {try {
				var e = self.adpt.array[pos];
				if (self.callback) {
					self.popup.exit();
					self.callback(MCIcon.getGlyphSpannable(e.code, self.fontHeight));
				} else {
					self.edit.setText(e.name);
					self.edit.setSelection(self.edit.length());
				}
			} catch(e) {erp(e)}}}));
			self.list.setOnItemLongClickListener(new G.AdapterView.OnItemLongClickListener({onItemLongClick : function(parent, view, pos, id) {try {
				var e = self.adpt.array[pos];
				self.edit.setText(e.name);
				self.edit.setSelection(self.edit.length());
				return true;
			} catch(e) {return erp(e), true}}}));
			if (G.style == "Material") {
				self.list.setFastScrollEnabled(true);
				self.list.setFastScrollAlwaysVisible(false);
			}
			self.linear.addView(self.list);

			self.popup = new PopupPage(self.linear, "mcicon.SelectIcon");

			PWM.registerResetFlag(self, "linear");
		}
		try {
			self.init();
		} catch(e) {
			Common.toast("加载MC图标列表失败\n" + e);
			return;
		}
		self.callback = callback;
		self.popup.enter();
	}
});
})