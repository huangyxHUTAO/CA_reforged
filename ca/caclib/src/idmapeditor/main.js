(function self() {try {
	var r = {
		"name": "自定义ID表",
		"author": "ProjectXero",
		"uuid": "41e7d897-8f85-441a-8a81-89573cd6cfaf",
		"version": [0, 0, 8],
		"require": []
	};
	var basePath, filterPath, exportPath, wikiDataPath, resPack;
	function initFiles(rp) {
		resPack = rp;
		basePath = new java.io.File(path).getParent() + "/";
		filterPath = basePath + resPack + "/filter.json";
		exportPath = basePath + resPack + "/export.json";
		wikiDataPath = basePath + "suggestion.json";
	}
	function switchResPack() {
		var r = [{
			text : "普通",
			description : "vanilla"
		}, {
			text : "化学（教育版）",
			description : "chemistry"
		}];
		Common.showListChooser(r, function(i) {
			initFiles(r[i].description);
			Common.toast("资源包已切换为" + resPack);
		});
	}
	function editFilter() {
		var f = loadFilter();
		JSONEdit.show({
			source : f,
			update : function() {
				saveFilter(f);
			}
		});
	}
	function loadFilter() {
		var f = MapScript.readJSON(filterPath, null);
		if (!f) f = importFromCA();
		if (!f.blockname) f.blockname = {};
		if (!f.itemname) f.itemname = {};
		if (!f.soundname) f.soundname = {};
		if (!f.entityname) f.entityname = {};
		if (!f.particlename) f.particlename = {};
		if (!f.blockadd) f.blockadd = [];
		if (!f.blockremove) f.blockremove = [];
		if (!f.itemadd) f.itemadd = [];
		if (!f.itemremove) f.itemremove = [];
		if (!f.entityadd) f.entityadd = [];
		if (!f.entityremove) f.entityremove = [];
		if (!f.entitysummonable) f.entitysummonable = {};
		return f;
	}
	function saveFilter(o) {
		Common.saveFile(filterPath, JSON.stringify(o, null, "\t"));
	}
	function loadExport() {
		return MapScript.readJSON(exportPath, null);
	}
	function saveExport(o) {
		Common.saveFile(exportPath, JSON.stringify(o, null, "\t"));
	}
	function getExportData() {
		var z = loadExport();
		if (!z) return null;
		var i, entities = {}, e, hasMinecraftNamespace = CA.Library.checkPackVer({minSupportVer : "1.8"}) == 0;
		for (i in z.entity) {
			e = z.entity[i];
			if (z.entity_summonable[i] == "unsummonable") {
				e += "(无法用summon生成)";
			}
			if (hasMinecraftNamespace && z.entity_minecraft[i]) {
				entities["minecraft:" + i] = e;
			} else {
				entities[i] = e;
			}
		}
		return {
			"block" : z.block,
			"item" : z.item,
			"sound" : z.sound,
			"entity" : entities,
			"particle_emitter" : z.particle
		}
	}
	function loadWikiData() {
		return MapScript.readJSON(wikiDataPath, null);
	}
	function getPackageName() {
		return NeteaseAdapter.mcPackage;
	}
	function showProgress() {
		var r = Common.showProgressDialog(null, true);
		r.info = "";
		var rf = new java.lang.Runnable(function() {try {
			r.setText(r.info);
			gHandler.postDelayed(this, 50);
		} catch(e) {erp(e)}});
		gHandler.post(rf);
		return r;
	}
	function startTranslate(prg) {try {
		prg.info = "初始化";
		var pkg = getPackageName();
		if (!pkg) {
			Common.toast("未找到合适的Minecraft版本");
			return;
		}
		var zf = new java.util.zip.ZipFile(ctx.getPackageManager().getApplicationInfo(pkg, 128).publicSourceDir);
		prg.info = "正在加载语言数据";
		var lang = initLang(zf, "assets/resource_packs/" + resPack + "/texts/zh_CN.lang", prg);
		prg.info = "正在加载相关JSON";
		var items = Object.keys(readAssetJSON(zf, "assets/resource_packs/" + resPack + "/items_client.json", {}).items || {}),
			blocks = Object.keys(readAssetJSON(zf, "assets/resource_packs/" + resPack + "/blocks.json", {})),
			sounds = Object.keys(readAssetJSON(zf, "assets/resource_packs/" + resPack + "/sounds/sound_definitions.json", {})),
			entities = listAssetFiles(zf, "assets/behavior_packs/" + resPack + "/entities/").map(function(e) {
				try {
					var k = readAssetJSON(zf, e, null)["minecraft:entity"];
					if (k.description) return k.description.identifier;
					return k.components["minecraft:identifier"].id;
				} catch(e) {Log.e(e)}
			}).filter(function(e) {
				return e != null;
			}),
			particles = Log.d([].concat(listAssetFiles(zf, "assets/particles/"), listAssetFiles(zf, "assets/resource_packs/" + resPack + "/particles/"))).map(function(e) {
				var k;
				try {
					var k = readAssetJSON(zf, e, null);
					if (k.particles) return Object.keys(k.particles);
					return k.particle_effect.description.identifier;
				} catch(e) {Log.e(e)}
			}).reduce(function(acc, e) {
				return Array.isArray(e) ? acc.concat(e) : (acc.push(e), acc);
			}, []),
			imports = loadFilter();
		var ret = {
			block : {},
			block_src : {},
			block_notranslation : {},
			item : {},
			item_src : {},
			item_notranslation : {},
			sound : {},
			sound_src : {},
			sound_notranslation : {},
			entity : {},
			entity_src : {},
			entity_notranslation : {},
			entity_minecraft : {},
			entity_summonable : {},
			particle : {},
			particle_src : {},
			particle_notranslation : {}
		};
		prg.info = "正在加载过滤器";
		if (imports.itemremove) imports.itemremove.forEach(function(e) {
			var t = items.indexOf(e);
			if (t >= 0) items.splice(t, 1);
		});
		if (imports.itemadd) imports.itemadd.forEach(function(e) {
			var t = items.indexOf(e);
			if (t < 0) items.push(e);
		});
		if (imports.blockremove) imports.blockremove.forEach(function(e) {
			var t = blocks.indexOf(e);
			if (t >= 0) blocks.splice(t, 1);
		});
		if (imports.blockadd) imports.blockadd.forEach(function(e) {
			var t = blocks.indexOf(e);
			if (t < 0) blocks.push(e);
		});
		if (imports.entityremove) imports.entityremove.forEach(function(e) {
			var t = entities.indexOf(e);
			if (t >= 0) entities.splice(t, 1);
		});
		if (imports.entityadd) imports.entityadd.forEach(function(e) {
			var t = entities.indexOf(e);
			if (t < 0) entities.push(e);
		});
		prg.info = "正在排序";
		blocks.sort(); items.sort(); entities.sort();
		blocks.forEach(function(e, i, a) {
			var el = e.toLowerCase();
			prg.info = "正在翻译方块ID：" + e;
			if (el in imports.blockname) {
				ret.block[el] = imports.blockname[el];
				ret.block_src[el] = ret.block[el] ? "filter" : "filter_void";
			} else if (("tile." + e + ".name") in lang) {
				ret.block[el] = lang["tile." + e + ".name"];
				ret.block_src[el] = "lang_exact";
			} else {
				ret.block[el] = searchObject(lang, new RegExp("tile\\." + e + "\\..*name")).values.join("/");
				if (ret.block[el].length) {
					ret.block_src[el] = "lang";
				} else {
					ret.block_notranslation[e] = "NoTranslation";
				}
			}
		});
		items.forEach(function(e, i, a) {
			var el = e.toLowerCase();
			if (el in ret.block) return;
			prg.info = "正在翻译物品ID：" + e;
			if (el in imports.itemname) {
				ret.item[el] = imports.itemname[el];
				ret.item_src[el] = ret.item[el] ? "filter" : "filter_void";
			} else if (("item." + e + ".name") in lang) {
				ret.item[el] = lang["item." + e + ".name"];
				ret.item_src[el] = "lang_exact";
			} else {
				ret.item[el] = searchObject(lang, new RegExp("item\\." + e + "\\..*name")).values.join("/");
				if (ret.item[el].length) {
					ret.item_src[el] = "lang";
				} else {
					ret.item_notranslation[e] = "NoTranslation";
				}
			}
		});
		sounds.forEach(function(e, i, a) {
			prg.info = "正在翻译声音ID：" + e;
			if (e in imports.soundname) {
				ret.sound[e] = imports.soundname[e];
				ret.sound_src[e] = ret.sound[e] ? "filter" : "filter_void";
			} else {
				ret.sound[e] = "";
				ret.sound_notranslation[e] = "NoTranslation";
			}
		});
		entities.forEach(function(e, i, a) {
			var minecraftOwn = e.startsWith("minecraft:");
			if (minecraftOwn) e = e.slice(10);
			if (e in ret.entity) return;
			prg.info = "正在翻译实体ID：" + e;
			if (e in imports.entityname) {
				ret.entity[e] = imports.entityname[e];
				ret.entity_src[e] = ret.entity[e] ? "filter" : "filter_void";
			} else if (("entity." + e + ".name") in lang) {
				ret.entity[e] = lang["entity." + e + ".name"];
				ret.entity_src[e] = "lang_exact";
			} else {
				ret.entity[e] = "";
				ret.entity_notranslation[e] = "NoTranslation";
			}
			ret.entity_minecraft[e] = minecraftOwn;
			ret.entity_summonable[e] = e in imports.entitysummonable ? imports.entitysummonable[e] : "summonable";
		});
		particles.forEach(function(e, i, a) {
			prg.info = "正在翻译粒子ID：" + e;
			if (e in imports.particlename) {
				ret.particle[e] = imports.particlename[e];
				ret.particle_src[e] = ret.particle[e] ? "filter" : "filter_void";
			} else {
				ret.particle[e] = "";
				ret.particle_notranslation[e] = "NoTranslation";
			}
		});
		prg.info = "正在保存文件";
		saveExport(ret);
		Common.toast("翻译已保存，重启命令助手后将应用");
	} catch(e) {
		Common.toast("翻译出错！\n" + e + "\n" + e.stack);
	}}
	function readAsset(zf, path) {
		var entry = zf.getEntry(path);
		if (entry == null) return null;
		return new java.io.BufferedReader(new java.io.InputStreamReader(zf.getInputStream(entry)));
	}
	function listAssetFiles(zf, path) {
		var entries = zf.entries(), e, r = [];
		while (entries.hasMoreElements()) {
			e = entries.nextElement();
			if (!e.isDirectory() && e.getName().startsWith(path)) {
				r.push(String(e.getName()));
			}
		}
		return r;
	}
	function initLang(zf, path, prg) {
		var rd = readAsset(zf, path), q, di, ei, t, r = {};
		if (!rd) return r;
		while (q = rd.readLine()) {
			if (q.startsWith("##")) continue;
			di = q.indexOf("=");
			if (di < 0) continue;
			ei = q.indexOf("\t", di);
			if (ei < 0) ei = q.length();
			r[t = q.substring(0, di)] = String(q.substring(di + 1, ei));
			prg.info = "正在加载语言ID：" + t;
		}
		rd.close();
		return r;
	}
	function readJSON(path, defaultValue) {
		try{
			var rd = java.io.BufferedReader(new java.io.FileReader(path));
			var s = [], q;
			while (q = rd.readLine()) s.push(q);
			rd.close();
			return eval("(" + s.join("\n") + ")");
		} catch(e) {
			return defaultValue;
		}
	}
	function readAssetJSON(zf, path, defaultValue) {
		try{
			var rd = readAsset(zf, path);
			var s = [], q;
			while (q = rd.readLine()) s.push(q);
			rd.close();
			return eval("(" + s.join("\n") + ")");
		} catch(e) {
			return defaultValue;
		}
	}
	function saveCSV(path, obj) {
		var f = new java.io.File(path).getParentFile();
		if (f) f.mkdirs();
		var wr = new java.io.FileOutputStream(path);
		wr.write(new java.lang.String(Object.keys(obj).map(function(e) {
			return e + "," + obj[e];
		}).join("\n")).getBytes());
		wr.close();
	}
	function searchObject(obj, v) {
		var rk = [], rp = [];
		(Object.keys(obj)).forEach(function(e, i, a) {
			if (e.search(v) >= 0) {
				rk.push(e);
				rp.push(obj[e]);
			}
		});
		return {
			keys : rk,
			values : rp
		};
	}
	function httpGet(url) {
		var url = new java.net.URL(url);
		var conn = url.openConnection();
		conn.setConnectTimeout(5000);
		conn.setUseCaches(true);
		conn.setRequestMethod("GET");
		conn.connect();
		var rd = new java.io.BufferedReader(new java.io.InputStreamReader(conn.getInputStream()));
		var s = [], ln, r;
		while (ln = rd.readLine()) s.push(ln);
		rd.close();
		return s.join("\n");
	}
	function fetchWikiSource(page) {
		var html = httpGet("https://minecraft-zh.gamepedia.com/index.php?title=" + encodeURI(page) + "&action=edit");
		var sp = html.match(/<textarea .* name="wpTextbox1">([^]*)<\/textarea>/);
		return sp[1];
	}
	function convertList(data, prg) {
		var r = {};
		data.split("\n").forEach(function(e) {
			var ret = e.match(/\['(.*)'\] = '(.*)'/);
			if (ret && !e.startsWith("--")) {
				r[ret[1]] = ret[2];
				prg.info = "正在处理列表：" + ret[1];
			}
		});
		return r;
	}
	function fetchTranslation(prg) {try {
		prg.info = "正在获取方块标准化译名列表";
		var blocks = convertList(fetchWikiSource("模块:Autolink/Block"), prg);
		prg.info = "正在获取物品标准化译名列表";
		var items = convertList(fetchWikiSource("模块:Autolink/Item"), prg);
		prg.info = "正在获取其他标准化译名列表";
		var others = convertList(fetchWikiSource("模块:Autolink/Other"), prg);
		prg.info = "正在保存标准化译名列表";
		Common.saveFile(wikiDataPath, JSON.stringify({
			block : blocks,
			item : items,
			others : others
		}, null, "\t"));
		Common.toast("标准化译名数据已保存");
	} catch(e) {
		Common.toast("获取出错！\n" + e + "\n" + e.stack);
	}}
	function exportAsCode() {
		var d = getExportData();
		if (!d) {
			Common.toast("请先启动翻译");
			return;
		}
		Common.setClipboardText(JSON.stringify(getExportData(), null, "\t").replace(/^\{\s*/, "").replace(/\n\}$/, ",").replace(/\n/g, "\n\t"));
		Common.toast("代码已复制");
	}
	function importFromCA() {
		var p = CA.Library.inner.default.enums;
		var i, r = Object.copy({
			blockname : p.block,
			itemname : p.item,
			soundname : p.sound,
			entityname : p.entity,
			particlename : p.particle_emitter
		});
		for (i in r.blockname) if (!r.blockname[i]) delete r.blockname[i];
		for (i in r.itemname) if (!r.itemname[i]) delete r.itemname[i];
		for (i in r.soundname) if (!r.soundname[i]) delete r.soundname[i];
		for (i in r.entityname) if (!r.entityname[i]) delete r.entityname[i];
		for (i in r.particlename) if (!r.particlename[i]) delete r.particlename[i];
		return r;
	}
	var showTranslation = function self(o, onModify) {
		if (!self.popup) {
			self.vmaker = function(holder) {
				var layout = holder.layout = new G.LinearLayout(ctx),
					text1 = holder.text1 = new G.TextView(ctx),
					text2 = holder.text2 = new G.TextView(ctx);
				layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				layout.setOrientation(G.LinearLayout.HORIZONTAL);
				layout.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
				text1.setLayoutParams(new G.LinearLayout.LayoutParams(0, -2, 3));
				text1.setTextSize(Common.theme.textsize[1]);
				layout.addView(text1);
				text2.setLayoutParams(new G.LinearLayout.LayoutParams(0, -2, 1));
				text2.setTextSize(Common.theme.textsize[1]);
				text2.setGravity(G.Gravity.RIGHT);
				layout.addView(text2);
				return layout;
			}
			self.vbinder = function(holder, e) {
				holder.text1.setText(e.name);
				if (e.onClick) {
					holder.text1.setTextColor(Common.theme.highlightcolor);
					holder.text2.setText(">");
					holder.text2.setTextColor(Common.theme.textcolor);
				} else {
					holder.text1.setTextColor(self.textColor[e.state]);
					holder.text2.setText(e.translation);
					holder.text2.setTextColor(e.match ? Common.theme.highlightcolor : Common.theme.textcolor);
				}
			}
			self.textColor = {
				filter : Common.theme.highlightcolor,
				filter_void : Common.theme.highlightcolor,
				lang_exact : Common.theme.textcolor,
				lang : Common.theme.criticalcolor,
				notranslation : Common.theme.promptcolor
			}
			self.menu = [{
				name : "关闭",
				onClick : function() {
					self.popup.exit();
				}
			}, {
				name : "导出为文本",
				onClick : function() {
					self.exportAsText();
				}
			}, {
				name : "查看统计信息（修改前）",
				onClick : function() {
					self.showStat();
				}
			}];
			self.refresh = function() {
				var i, e, t;
				var a, b, c, states = {
					filter : [],
					filter_void : [],
					lang_exact : [],
					lang : [],
					notranslation : []
				}, stat = {
					filter : 0,
					filter_void : 0,
					lang_exact : 0,
					lang : 0,
					wikiMatch : 0,
					translated : 0,
					untranslated : 0,
					total : 0
				}
				a = self.data.items; b = self.data.sources, c = self.data.suggestion;
				for (i in b) {
					e = {
						name : i,
						translation : a[i],
						state : b[i],
						match : a[i] in c
					};
					states[e.state].push(e);
					stat[e.state]++;
					stat.translated++;
					if (e.match) stat.wikiMatch++;
				}
				stat.total = Object.keys(a).length;
				a = self.data.notranslation;
				for (i in a) {
					states.notranslation.push({
						name : i,
						translation : "缺少翻译",
						state : "notranslation"
					});
					stat.untranslated++;
				}
				self.statInfo = stat;
				for (i in states) states[i].sort(function(a, b) {
					return a.name.localeCompare(b.name);
				});Log.s(self.data)
				self.list.setAdapter(t = new SimpleListAdapter(self.menu.concat(states.notranslation, states.lang, states.lang_exact, states.filter_void, states.filter), self.vmaker, self.vbinder));
				self.adpt = SimpleListAdapter.getController(t);
			}
			self.editItem = function(pos, data, modifier) {
				CA.Assist.editParamDialog({
					param : {
						type : "text",
						name : data.name,
						suggestion : self.data.suggestion
					},
					text : data.state == "notranslation" ? "" : data.translation
				}, function(s) {
					data.translation = s;
					data.state = "filter";
					data.match = s in self.data.suggestion;
					self.adpt.rebind(pos);
					modifier(data.name, data.translation);
				});
			}
			self.showStat = function() {
				var i = self.statInfo;
				Common.showTextDialog([
					"总数：" + i.total,
					"未翻译：" + i.untranslated,
					"翻译完成度：" + (i.translated / i.total * 100).toFixed(2) + "% (" + i.translated + "条)",
					"Wiki匹配率：" + (i.wikiMatch / i.total * 100).toFixed(2) + "% (" + i.wikiMatch + "条)",
					"过滤器来源：" + (i.filter + i.filter_void) + " (" + i.filter + "条包含翻译|"+ i.filter_void + "条不包含翻译)",
					"语言文件来源：" + (i.lang + i.lang_exact) + " (精确查找：" + i.lang_exact + "条|模糊查找："+ i.lang + "条)"
				].join("\n"));
			}
			self.saveFileDialog = function(text) {
				Common.showFileDialog({
					type : 1,
					callback : function(f) {
						Common.saveFile(f.result, text);
						Common.toast("文件已保存。");
					}
				});
			}
			self.exportAsText = function() {
				Common.showOperateDialog([{
					text : "JSON文件",
					onclick : function() {
						var kv = self.data.items;
						self.saveFileDialog(JSON.stringify(kv, null, 4));
					}
				}, {
					text : "TXT文件（分隔符：=>）",
					onclick : function() {
						var kv = self.data.items;
						self.saveFileDialog(Object.keys(kv).map(function(k) {
							return k + " => " + kv[k];
						}).join("\n"));
					}
				}, {
					text : "CSV文件（分隔符：,）",
					onclick : function() {
						var kv = self.data.items;
						self.saveFileDialog(Object.keys(kv).map(function(k) {
							return k + "," + kv[k];
						}).join("\n"));
					}
				}, {
					text : "百度输入法自定义符号表（INI文件，分隔符：空格）",
					onclick : function() {
						var kv = self.data.items;
						self.saveFileDialog("[" + self.data.title + ",1,0]\n" + Object.keys(kv).map(function(k) {
							return k + " " + kv[k];
						}).join("\n"));
					}
				}]);
			}
			self.frame = new G.FrameLayout(ctx);
			self.frame.setBackgroundColor(Common.theme.message_bgcolor);
			self.list = new G.ListView(ctx);
			self.list.setLayoutParams(new G.FrameLayout.LayoutParams(-1, -1));
			self.list.setBackgroundColor(G.Color.TRANSPARENT);
			self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({onItemClick : function(parent, view, pos, id) {try {
				var data = parent.getAdapter().getItem(pos);
				if (data.onClick) {
					data.onClick();
					return;
				}
				if (self.onModify) self.editItem(pos, data, self.onModify);
			} catch(e) {erp(e)}}}));
			if (G.style == "Material") {
				self.list.setFastScrollEnabled(true);
				self.list.setFastScrollAlwaysVisible(false);
			}
			self.frame.addView(self.list);
			
			self.popup = new PopupPage(self.frame, "xero.Translation");
			
			PWM.registerResetFlag(self, "popup");
		}
		self.data = o;
		self.onModify = onModify;
		if (!o.suggestion) o.suggestion = {};
		self.popup.enter();
		self.refresh();
	}
	function convertWikiData(o) {
		var i, r = {}, t;
		for (i in o) {
			t = o[i].lastIndexOf("|");
			if (t >= 0) {
				r[o[i].slice(t + 1)] = i;
			} else {
				r[o[i]] = i;
			}
		}
		return r;
	}
	function showExport() {
		var d = loadExport(), w = loadWikiData();
		if (!d) {
			Common.toast("请先启动翻译");
			return;
		}
		Common.showOperateDialog([{
			text : "方块",
			onclick : function() {
				showTranslation({
					title : "方块",
					items : d.block,
					sources : d.block_src,
					notranslation : d.block_notranslation,
					suggestion : w ? convertWikiData(w.block) : null,
				}, function(name, translation) {
					var a = loadFilter();
					a.blockname[name] = translation;
					saveFilter(a);
				});
			}
		}, {
			text : "物品",
			onclick : function() {
				showTranslation({
					title : "物品",
					items : d.item,
					sources : d.item_src,
					notranslation : d.item_notranslation,
					suggestion : w ? convertWikiData(w.item) : null
				}, function(name, translation) {
					var a = loadFilter();
					a.itemname[name] = translation;
					saveFilter(a);
				});
			}
		}, {
			text : "声音",
			onclick : function() {
				showTranslation({
					title : "声音",
					items : d.sound,
					sources : d.sound_src,
					notranslation : d.sound_notranslation
				}, function(name, translation) {
					var a = loadFilter();
					a.soundname[name] = translation;
					saveFilter(a);
				});
			}
		}, {
			text : "实体",
			onclick : function() {
				showTranslation({
					title : "实体",
					items : d.entity,
					sources : d.entity_src,
					notranslation : d.entity_notranslation,
					suggestion : w ? convertWikiData(w.others) : null
				}, function(name, translation) {
					var a = loadFilter();
					a.entityname[name] = translation;
					saveFilter(a);
				});
			}
		}, {
			text : "实体是否可生成",
			onclick : function() {
				var i, sources = {};
				for (i in d.entity_summonable) sources[i] = "filter";
				showTranslation({
					title : "实体是否可生成",
					items : d.entity_summonable,
					sources : sources,
					notranslation : {},
					suggestion : {
						"summonable": "可用summon生成",
						"unsummonable": "不可用summon生成"
					}
				}, function(name, translation) {
					var a = loadFilter();
					a.entitysummonable[name] = translation;
					saveFilter(a);
				});
			}
		}, {
			text : "粒子",
			onclick : function() {
				showTranslation({
					title : "粒子",
					items : d.particle,
					sources : d.particle_src,
					notranslation : d.particle_notranslation
				}, function(name, translation) {
					var a = loadFilter();
					a.particlename[name] = translation;
					saveFilter(a);
				});
			}
		}]);
	}
	function viewJSON(o) {
		JSONEdit.show({
			source : o
		});
	}
	function openApk() {
		var pkg = getPackageName();
		if (!pkg) {
			Common.toast("未找到合适的Minecraft版本");
			return;
		}
		var zf = new java.util.zip.ZipFile(ctx.getPackageManager().getApplicationInfo(pkg, 128).publicSourceDir);
		Common.showOperateDialog([{
			text : "zh_CN.lang",
			onclick : function() {
				var prg = showProgress();
				prg.async(function() {
					viewJSON(initLang(zf, "assets/resource_packs/" + resPack + "/texts/zh_CN.lang", prg));
				});
			}
		}, {
			text : "blocks.json",
			onclick : function() {
				viewJSON(readAssetJSON(zf, "assets/resource_packs/" + resPack + "/blocks.json", {}));
			}
		}, {
			text : "items_client.json",
			onclick : function() {
				viewJSON(readAssetJSON(zf, "assets/resource_packs/" + resPack + "/items_client.json", {}));
			}
		}, {
			text : "sound_definitions.json",
			onclick : function() {
				viewJSON(readAssetJSON(zf, "assets/resource_packs/" + resPack + "/sounds/sound_definitions.json", {}));
			}
		}]);
	}
	initFiles("vanilla");
	var z = getExportData();
	r.description = "已在" + basePath + "上加载";
	r.menu = [{
		text : "切换资源包",
		onclick : function() {
			switchResPack();
		}
	}, {
		text : "编辑过滤器",
		onclick : function() {
			editFilter();
		}
	}, {
		text : "提取Wiki翻译",
		onclick : function() {
			var prg = showProgress();
			prg.async(fetchTranslation);
		}
	}, {
		text : "查看安装包源数据",
		onclick : function() {
			openApk();
		}
	}, {
		text : "启动翻译",
		onclick : function() {
			var prg = showProgress();
			prg.async(startTranslate);
		}
	}, {
		text : "查看翻译",
		onclick : function() {
			showExport();
		}
	}, {
		text : "导出为代码",
		onclick : function() {
			exportAsCode();
		}
	}];
	if (z) {
		r.versionPack = {
			"ids": {
				"mode": "overwrite",
				"enums": z
			},
			"base": {
				"enums": {
					"item": "block"
				}
			}
		}
	}
	return r;
} catch(e) {
	r.description = "加载失败：" + e;
	return r;
}
})()