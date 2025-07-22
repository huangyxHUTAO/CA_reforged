({
	inner : {},
	cache : {},
	loadingStatus : null,
	currentLoadingLibrary : null,
	initLibrary : function(callback) {
		var info, flag = true, t, t2, lib;
		if (this.loadingStatus) return false;
		this.loadingStatus = "core";
		CA.IntelliSense.library = lib = {
			commands : {},
			enums : {},
			selectors : {},
			json : {},
			help : {},
			tutorials : [],
			idlist : [],
			info : info = []
		};
		this.processDeprecated();
		CA.settings.coreLibrarys.forEach(function(e, i, a) {
			CA.Library.currentLoadingLibrary = e;
			var data = CA.Library.loadLibrary(String(e), null);
			data.core = true;
			data.index = i;
			if (data.hasError) flag = false;
			info.push(data);
		});
		this.loadingStatus = "normal";
		Threads.run(function() {try {
			CA.settings.enabledLibrarys.forEach(function(e, i, a) {
				CA.Library.currentLoadingLibrary = e;
				var data = CA.Library.loadLibrary(String(e), lib);
				data.index = i;
				if (data.hasError) flag = false;
				info.push(data);
			});
			//快捷操作
			CA.Library.onLibraryLoadFinished(lib);
			CA.Library.loadingStatus = null;
			if (callback) callback(flag);
		} catch(e) {erp(e)}});
		return true;
	},
	clearCache : function(src) {
		if (src) {
			delete this.cache[src];
		} else {
			this.cache = {};
		}
	},
	isLibrary : function(path) {
		return path in CA.Library.inner || new java.io.File(path).isFile();
	},
	isDeprecated : function(uuid, version) {
		if (!Array.isArray(version)) return true;
		if (uuid == "04a9e9b2-8fae-4f30-84fa-d52f9457f4eb") return true; //自适配ID表：用户瞎加载
		if (uuid == "06b2fb31-668e-4693-92ad-c0ac8da3e7a9" && NeteaseAdapter.compareVersion(version, [2, 0, 0]) < 0) return true; //MC图标：bug
		if (uuid == "5a204d07-4b6d-4c51-9470-a2d8c8676ab8") return true; //调试屏幕：根本没用
		return false;
	},
	enableLibrary : function(path) {
		Common.removeSet(CA.settings.disabledLibrarys, path);
		Common.removeSet(CA.settings.coreLibrarys, path);
		return Common.addSet(CA.settings.enabledLibrarys, path);
	},
	disableLibrary : function(path) {
		Common.removeSet(CA.settings.enabledLibrarys, path);
		Common.removeSet(CA.settings.coreLibrarys, path);
		return Common.addSet(CA.settings.disabledLibrarys, path);
	},
	removeLibrary : function(path) {
		var fl = false;
		fl = Common.removeSet(CA.settings.enabledLibrarys, path) || fl;
		fl = Common.removeSet(CA.settings.coreLibrarys, path) || fl;
		return Common.removeSet(CA.settings.disabledLibrarys, path) || fl;
	},
	enableCoreLibrary : function(path) {
		Common.removeSet(CA.settings.enabledLibrarys, path);
		Common.removeSet(CA.settings.disabledLibrarys, path);
		return Common.addSet(CA.settings.coreLibrarys, path);
	},
	loadLibrary : function(path, targetLib) {
		var m, v, cur, resolved;
		try {
			if (this.cache[path]) {
				cur = this.cache[path].data;
				m = this.cache[path].mode;
			} else {
				cur = this.readLibrary(path);
				if (!cur) throw "无法读取或解析拓展包";
				if (cur.error) throw cur.error;
				if (!(cur.data instanceof Object)) throw "错误的拓展包格式";
				this.cache[path] = cur;
				m = cur.mode;
				cur = cur.data;
			}
			resolved = {
				src : path,
				name : cur.name,
				author : cur.author,
				description : cur.description,
				uuid : cur.uuid,
				version : Array.isArray(cur.version) ? cur.version : [cur.version],
				update : cur.update,
				menu : cur.menu,
				deprecated : cur.deprecated || this.isDeprecated(cur.uuid, cur.version),
				mode : m
			};
			resolved.stat = !cur.noCommand && targetLib ? this.resolveLibrary(targetLib, cur) : null;
			resolved.loaded = true;
			return resolved;
		} catch(err) {
			if (resolved) {
				resolved.hasError = true;
				resolved.error = err;
				return resolved;
			} else {
				return {
					src : path,
					name : m == 0 ? path : (new java.io.File(path)).getName(),
					hasError : true,
					mode : m,
					error : err
				};
			}
		}
	},
	readLibrary : function(path) {
		var t, er, f, securityLevel = CA.settings.securityLevel, requiredSecLevel;
		//-1 禁止所有非内置拓展包
		//0 允许所有拓展包
		//1 仅允许锁定拓展包与官方拓展包
		//2+ 仅允许商店下载的拓展包
		if (t = CA.Library.inner[path]) {
			return {
				data : t,
				mode : 0
			};
		} else {
			er = {
				error : "未知错误"
			};
		}
		if (securityLevel >= 0) {
			f = new java.io.File(path);
			if (!f.isFile()) {
				return {
					error : "拓展包文件不存在"
				};
			}
			requiredSecLevel = this.testSecurityLevel(f);
			if (requiredSecLevel < securityLevel) {
				return {
					error : "您正在使用的安全等级不允许加载此拓展包\n您可以在右上角▼处打开菜单，然后点击“设置安全级别”来调整当前安全级别"
				};
			}
			if (requiredSecLevel >= 2) {
				if (t = CA.Library.loadSignedV1(f, null, er)) {
					return {
						data : t,
						mode : 3
					};
				}
			} else if (requiredSecLevel == 1) {
				if (t = CA.Library.loadPrefixed(f, null, er)) {
					return {
						data : t,
						mode : 2
					};
				}
			} else if (requiredSecLevel == 0) {
				if (t = Common.readFile(f.getPath(), null, false, er)) {
					t = this.safeEval(f, t, er);
					if (t) {
						return {
							data : t,
							mode : 1
						};
					}
				}
			} else {
				return {
					error : "无法解析此命令库"
				};
			}
		}
		return er;
	},
	evalLib : function(file, code) {
		return Loader.evalSpecial("(" + code + ")", file.getName(), 0, {
			path : String(file.getPath()),
			code : code,
			LibInfo : {
				file : file,
				uri : android.net.Uri.fromFile(file),
				code : code
			}
		}, this);
	},
	safeEval :function(file, code, defaultValue, error) {
		try {
			return this.evalLib(file, code);
		} catch(e) {
			if (error) error.error = e;
			return defaultValue;
		}
	},
	testSecurityLevel : function(file) {
		if (this.shouldVerifySigned(file) >= 0) {
			return 2;
		} else if (this.isPrefixed(file)) {
			return 1;
		} else return 0;
	},
	resolveLibrary : function(cur, l) {
		var c, i, t, stat, libinfo = CA.IntelliSense.library.info;
		if ((t = CA.Library.checkPackVer(l)) != 0) throw t > 0 ? "拓展包版本过低" : "游戏版本过低"; //兼容旧版
		if (l.minCAVersion && Date.parse(CA.publishDate) < Date.parse(l.minCAVersion)) throw "命令助手版本过低";
		stat = CA.Library.statLib(l);
		this.checkLibrary(l);
		if (CA.Library.findByUUID(l.uuid)) throw "已存在相同的拓展包";
		if (l.require.some(function(e1) {
			return !libinfo.some(function(e2) {
				return e1 == e2.uuid;
			});
		}, this)) throw "前提包并未全部加载，请检查加载顺序及拓展包列表";
		this.joinPack(cur, Object.copy(l)); //创建副本
		if (!l.versionPack) return;
		c = l.versionPack;
		for (i in c) {
			t = this.joinPack(cur, c[i]); //加载版本包
			if (stat && t) stat.availablePack++;
		}
		return stat;
	},
	onLibraryLoadFinished : function(lib) {
		var t, t2;
		t = lib.commands;
		lib.command_snap = {};
		Object.keys(t).forEach(function(e) {
			t2 = e;
			while (t[t2].alias) t2 = t[t2].alias;
			t2 = t[t2];
			lib.command_snap[e] = t2.description ? t2.description : "";
		});
		Tutorial.library = lib.tutorials;
		this.updateLibraries(CA.settings.libraryAutoUpdate);
		lib.info.forEach(function(e) {
			if (e.deprecated && !e.updateInfo) Common.addSet(CA.settings.deprecatedLibrarys, e.src);
		});
	},
	processDeprecated : function() {
		CA.settings.deprecatedLibrarys.forEach(function(e) {
			CA.Library.disableLibrary(e);
		});
		CA.settings.deprecatedLibrarys.length = 0;
	},
	findByUUID : function(uuid) {
		var i, a = CA.IntelliSense.library.info;
		for (i = 0; i < a.length; i++) {
			if (uuid == a[i].uuid) return a[i];
		}
		return null;
	},
	isPrefixed : function(file) {
		try {
			var rd, q, start = [0x4c, 0x49, 0x42, 0x52, 0x41, 0x52, 0x59];
			rd = new java.io.FileInputStream(file);
			while (start.length) {
				if (rd.read() != start.shift()) {
					rd.close();
					return false;
				}
			}
			rd.skip(8);
			rd = new java.io.BufferedReader(new java.io.InputStreamReader(new java.util.zip.GZIPInputStream(rd)));
			while (q = rd.readLine());
			rd.close();
			return true;
		} catch(e) {
			return false;
		}
	},
	loadPrefixed : function(file, defaultValue, error) {
		try{
			var rd, s = [], q, start = [0x4c, 0x49, 0x42, 0x52, 0x41, 0x52, 0x59];
			rd = new java.io.FileInputStream(file);
			while (start.length) {
				if (rd.read() != start.shift()) {
					rd.close();
					throw "不是已锁定的拓展包";
				}
			}
			rd.skip(8);
			rd = new java.io.BufferedReader(new java.io.InputStreamReader(new java.util.zip.GZIPInputStream(rd)));
			while (q = rd.readLine()) s.push(q);
			rd.close();
			return this.evalLib(file, s.join("\n"));
		} catch(e) {
			if (error) error.error = e;
			return defaultValue;
		}
	},
	savePrefixed : function(path, object) {
		var wr, ar;
		var f = new java.io.File(path).getParentFile();
		if (f) f.mkdirs();
		wr = new java.io.FileOutputStream(path);
		ar = java.nio.ByteBuffer.allocate(15); //LIBRARY
		ar.put([0x4c, 0x49, 0x42, 0x52, 0x41, 0x52, 0x59]).putLong((new java.util.Date()).getTime());
		wr.write(ar.array());
		wr = new java.util.zip.GZIPOutputStream(wr);
		wr.write(new java.lang.String(MapScript.toSource(object)).getBytes());
		wr.close();
	},
	checkLibrary : (function() {
		var stack = null, last = null;
		var e = function(d) {
			throw {
				message : d,
				stack : stack,
				source : last,
				toString : function() {
					return this.stack.join("->") + this.message;
				}
			}
		}
		var checkObject = function(o) {
			if (!o || !(o instanceof Object)) e("不是对象");
		}
		var checkArray = function(o) {
			if (!Array.isArray(o)) e("不是数组");
		}
		var checkUnsignedInt = function(o) {
			if (!(/^\d+$/).test(o)) e("不是正整数");
		}
		var checkString = function(o) {
			if (!(typeof o === "string")) e("不是字符串");
		}
		var checkNotEmptyString = function(o) {
			checkString(o);
			if (!o) e("是空字符串");
		}
		var iterateArray = function(o, iter) {
			var l = stack.length, i;
			checkArray(o);
			stack.length = l + 1;
			for (i = 0; i < o.length; i++) {
				stack[l] = i;
				iter(o[i]);
			}
			stack.length = l;
		}
		return function(a) {
			var i;
			stack = ["根"]; last = a;
			checkObject(a);
			stack.push("名称(name)");
			checkNotEmptyString(a.name);
			stack[1] = "作者(author)";
			checkNotEmptyString(a.author);
			stack[1] = "简介(description)";
			checkString(a.description);
			stack[1] = "UUID(uuid)";
			checkNotEmptyString(a.uuid);
			stack[1] = "版本(version)";
			iterateArray(a.version, checkUnsignedInt);
			stack[1] = "前提包(require)";
			iterateArray(a.require, checkNotEmptyString);
		}
	})(),
	checkPackVer : (function() {
		var a;
		var opt = function(a) {
			return a == "*" ? Infinity : isNaN(a) ? -1 : parseInt(a);
		}
		var compare = function (b) {
			var n, i, p1, p2;
			b = String(b).split(".");
			n = Math.max(a.length, b.length);
			for (i = 0; i < n; i++) {
				p1 = opt(a[i]); p2 = opt(b[i]);
				if (p1 < p2) {
					return -1; //pe版本过低
				} else if (p1 > p2) {
					return 1; //拓展包版本过低
				}
			}
			return 0;
		}
		var inRange = function(min, max) {
			if (min && compare(min) < 0) return -1;
			if (max && compare(max) > 0) return 1;
			return 0;
		}
		return function(o) {
			var r = 0, i, n, e;
			if (this.ignoreVersion) return 0;
			a = getMinecraftVersion().split(".");
			if (o.minSupportVer || o.maxSupportVer) {
				r = inRange(o.minSupportVer, o.maxSupportVer);
				if (r != 0) return r; //这两个参数是总范围
			}
			if (Array.isArray(o.supportVer)) {
				n = o.supportVer.length;
				r = 1;
				for (i = 0; i < n; i++) {
					e = o.supportVer[i];
					r = Math.min(r, inRange(e.min, e.max)); //趋向返回游戏版本过低
					if (r == 0) return 0; //这段只要存在一个范围符合条件就返回0
				}
			}
			return r;
		}
	})(),
	joinPack : (function() {
		var joinCmd = function(src, o) {
			var i, op, sp, t;
			if (o.description) src.description = o.description;
			if (o.help) src.help = o.help;
			if (o.noparams) src.noparams = o.noparams;
			if (o.patterns) {
				op = o.patterns;
				sp = src.patterns;
				if (Array.isArray(sp) != Array.isArray(op)) throw "命令模式格式不一致，无法合并";
				if (Array.isArray(op)) {
					for (i in op) {
						t = sp.indexOf(op[i]);
						if (t < 0) sp.push(op[i]);
					}
				} else {
					for (i in op) sp[i] = op[i];
				}
			}
		}
		var filterCmd = function(src, o) {
			var i, t, op, sp, t;
			if (o.noparams) delete src.noparams;
			if (o.patterns) {
				op = o.patterns;
				sp = src.patterns;
				if (Array.isArray(sp) != Array.isArray(op)) throw "命令模式格式不一致，无法过滤";
				if (Array.isArray(op)) {
					for (i in op) {
						t = sp.indexOf(op[i]);
						if (t >= 0) sp.splice(t, 1);
					}
				} else {
					for (i in op) delete sp[i];
				}
			}
		}
		var joinEnum = function(src, o) {
			var i, t;
			if (Array.isArray(src) && Array.isArray(o)) {
				for (i in o) {
					t = src.indexOf(o[i]);
					if (t < 0) src.push(o[i]);
				}
			} else if (Array.isArray(src) && !Array.isArray(o)) {
				throw "枚举列表格式不一致，无法合并";
			} else if (!Array.isArray(src) && Array.isArray(o)) {
				for (i in o) if (!src[o[i]]) src[o[i]] = "";
			} else {
				for (i in o) if (!src[i] || o[i] != "") src[i] = o[i];
			}
		}
		var filterEnum = function(src, o) {
			var i, t, f = Array.isArray(o) ? o : Object.keys(o);
			if (Array.isArray(src)) {
				for (i in f) {
					t = src.indexOf(f[i]);
					if (t >= 0) src.splice(t, 1);
				}
			} else {
				for (i in f) delete src[f[i]];
			}
		}
		var parseAliasEnum = function(g, o) {
			if (typeof o != "string") return o;
			if (!(o in g.enums)) throw "无效的枚举引用";
			return g.enums[o];
		}
		var joinTutorial = function(src, o) {
			var i;
			for (i = 0; i < src.length; i++) {
				if (src[i].id == o.id) {
					src[i] = o;
					return;
				}
			}
			src.push(o);
		}
		var filterTutorial = function(src, o) {
			var i;
			for (i = 0; i < src.length; i++) {
				if (src[i].id == o.id) {
					src.splice(i, 1);
					return;
				}
			}
		}
		var joinIDList = function(src, o) {
			var i;
			for (i = 0; i < src.length; i++) {
				if (src[i].name == o.name) {
					src[i] = o;
					return;
				}
			}
			src.push(o);
		}
		var filterIDList = function(src, o) {
			var i;
			for (i = 0; i < src.length; i++) {
				if (src[i].name == o.name) {
					src.splice(i, 1);
					return;
				}
			}
		}
		return function(cur, l) {
			if (this.checkPackVer(l) != 0) return false;
			var i;
			if (!(l.commands instanceof Object)) l.commands = {};
			if (!(l.enums instanceof Object)) l.enums = {};
			if (!(l.selectors instanceof Object)) l.selectors = {};
			if (!(l.help instanceof Object)) l.help = {};
			for (i in l.commands) {
				if (l.mode == "remove") {
					if (l.commands[i]) {
						filterCmd(cur.commands[i], l.commands[i]);
					} else {
						delete cur.commands[i];
					}
				} else if ((i in cur.commands) && l.mode != "overwrite") {
					joinCmd(cur.commands[i], l.commands[i]);
				} else {
					cur.commands[i] = l.commands[i];
				}
			}
			for (i in l.enums) {
				if (l.mode == "remove") {
					if (l.enums[i]) {
						filterEnum(cur.enums[i], parseAliasEnum(cur, l.enums[i]));
					} else {
						delete cur.enums[i];
					}
				} else if ((i in cur.enums) && l.mode != "overwrite") {
					joinEnum(cur.enums[i], parseAliasEnum(cur, l.enums[i]));
				} else {
					cur.enums[i] = parseAliasEnum(cur, l.enums[i]);
				}
			}
			for (i in l.selectors) {
				if (l.mode == "remove") {
					delete cur.selectors[i];
				} else {
					cur.selectors[i] = l.selectors[i];
				}
			}
			for (i in l.json) {
				if (l.mode == "remove") {
					delete cur.json[i];
				} else {
					cur.json[i] = l.json[i];
				}
			}
			for (i in l.help) {
				if (l.mode == "remove") {
					delete cur.help[i];
				} else {
					cur.help[i] = l.help[i];
				}
			}
			for (i in l.tutorials) {
				if (l.mode == "remove") {
					filterTutorial(cur.tutorials, l.tutorials[i]);
				} else {
					joinTutorial(cur.tutorials, l.tutorials[i]);
				}
			}
			for (i in l.idlist) {
				if (l.mode == "remove") {
					filterIDList(cur.idlist, l.idlist[i]);
				} else {
					joinIDList(cur.idlist, l.idlist[i]);
				}
			}
			return true;
		}
	})(),
	statLib : (function() {
		var stat;
		function calcCmd(c) {
			var i;
			if (!c) return;
			stat.command++;
			if (c.noparams) stat.pattern++;
			for (i in c.patterns) { // patterns 是 可枚举类型 包括但不限于 数组、对象
				stat.pattern++;
			}
		}
		function calcSelectors(c) {
			if (!c) return;
			stat.selector += Object.keys(c).length;
		}
		function calcEnum(c) {
			if (!c) return 0;
			return typeof c == "string" ? 0 : Array.isArray(c) ? c.length : Object.keys(c).length;
		}
		function calcEnums(c) {
			var i;
			if (!c) return;
			for (i in c) {
				stat.enums++;
				stat.enumitem += calcEnum(c[i]);
			}
		}
		function calcCommands(k) {
			var i;
			if (!k) return;
			for (i in k) {
				calcCmd(k[i]);
			}
		}
		function toString() {
			return ["命令数:", this.command, "\n枚举数:", this.enums, "\n选择器数:", this.selector, "\n版本包数:", this.availablePack, "/", this.versionPack, "\n命令模式数:", this.pattern, "\n枚举项目数:", this.enumitem].join("");
		}
		return function (l) {
			var i;
			stat = {
				availablePack : 0,
				command : 0,
				versionPack : 0,
				enums : 0,
				selector : 0,
				pattern : 0,
				enumitem : 0,
				toString : toString
			}
			calcCommands(l.commands);
			calcEnums(l.enums);
			calcSelectors(l.selectors);
			for (i in l.versionPack) {
				if ("commands" in l.versionPack[i]) calcCommands(l.versionPack[i].commands);
				if ("enums" in l.versionPack[i]) calcEnums(l.versionPack[i].enums);
				if ("selectors" in l.versionPack[i]) calcSelectors(l.versionPack[i].selectors);
				stat.versionPack++;
			}
			return stat;
		}
	})(),
	sourceInfoCache : {},
	requestDefaultSourceInfo : function() {
		return this.requestSourceInfoCached(this.getSourceUrl());
	},
	requestSourceInfoCached : function(url) {
		var sourceInfo;
		if (url.slice(-1) != "/") url += "/";
		sourceInfo = this.sourceInfoCache[url];
		if (!sourceInfo || !(Date.now() < sourceInfo.accessExpired)) {
			sourceInfo = this.requestSourceInfo(url);
			if (!sourceInfo) return;
			sourceInfo.accessExpired = Date.now() + 60000;
			this.sourceInfoCache[url] = sourceInfo;
		}
		return sourceInfo;
	},
	requestSourceInfo : function(url) {
		var info, infourl;
		if (url.slice(-1) != "/") url += "/";
		infourl = url + "info.json";
		try {
			info = JSON.parse(NetworkUtils.queryPage(infourl));
		} catch(e) {
			Log.e(e);
			return;
		}
		info.pages = [];
		info.nextPage = info.indexPages > 0 ? info.index : null;
		info.pageCount = info.indexPages;
		info.libCount = info.indexLibs;
		info.url = url;
		return info;
	},
	requestSourceIndex : function(info, pageNo) {
		var page;
		if (pageNo < 0 || pageNo >= info.indexPages) return;
		if (pageNo < info.pages.length) return info.pages[pageNo];
		try {
			while (true) {
				page = JSON.parse(NetworkUtils.queryPage(info.nextPage));
				if (page.pageNo != info.pages.length || page.sourceId != info.sourceId) throw "Not a regular library source";
				info.nextPage = page.nextPage;
				info.pages.push(page.content);
				if (pageNo < info.pages.length) return info.pages[pageNo];
			}
		} catch(e) {
			Log.e(e);
			return;
		}
	},
	requestSourceMap : function(info) {
		var map;
		if (info.libMap) return info.libMap;
		try {
			map = JSON.parse(NetworkUtils.queryPage(info.map));
			if (map.sourceId != info.sourceId) throw "Not a regular library source";
			return info.libMap = map.content;
		} catch(e) {
			Log.e(e);
			return;
		}
	},
	getSourceUrl : function() {
		return this.getOriginSourceUrl();
	},
	getOriginSourceUrl : function() {
		return "https://ca.projectxero.top/clib/";
	},
	getVerify : function(source) {
		return source.verifyObject ? source.verifyObject : (source.verifyObject = this.downloadAsArray(source.pubkey));
	},
	arrayStartsWith : function(array, start) {
		var i;
		if (array.length < start.length) return false;
		for (i = 0; i < start.length; i++) {
			if (start[i] != array[i]) return false;
		}
		return true;
	},
	readAsArray : function(stream, keep) {
		var BUFFER_SIZE = 2048;
		var os, buf, hr;
		os = new java.io.ByteArrayOutputStream();
		buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, BUFFER_SIZE);
		while ((hr = stream.read(buf)) > 0) os.write(buf, 0, hr);
		if (!keep) stream.close();
		return os.toByteArray();
	},
	downloadAsArray : function(url) {
		var url = new java.net.URL(url);
		var conn = url.openConnection();
		conn.setConnectTimeout(5000);
		conn.setUseCaches(false);
		conn.setRequestMethod("GET");
		conn.connect();
		return this.readAsArray(conn.getInputStream());
	},
	downloadLib : function(libinfo, source) {
		var arr = this.downloadAsArray(libinfo.downloadurl), digest, os, bytes;
		digest = java.security.MessageDigest.getInstance("SHA-1");
		digest.update(arr);
		if (libinfo.sha1 != android.util.Base64.encodeToString(digest.digest(), android.util.Base64.NO_WRAP)) {
			throw "文件校验失败";
		}
		if (this.arrayStartsWith(arr, [0x53, 0x49, 0x47, 0x4e, 0x4c, 0x49, 0x42, 0x30, 0x31])) { //SIGNLIB01
			var verify = this.getVerify(source);
			var signature = java.security.Signature.getInstance("SHA256withRSA");
			var keyFactory = java.security.KeyFactory.getInstance("RSA");
			var keySpec = new java.security.spec.X509EncodedKeySpec(verify);
			signature.initVerify(keyFactory.generatePublic(keySpec));
			var signlen = 256;
			var dataStart = 9 + signlen;
			signature.update(arr, dataStart, arr.length - dataStart);
			if (!signature.verify(arr, 9, signlen)) throw "库的签名不正确";
			new java.io.File(MapScript.baseDir + "libs").mkdirs();
			os = new java.io.FileOutputStream(MapScript.baseDir + "libs/" + libinfo.uuid + ".lib");
			os.write(new java.lang.String("LIBSIGN01").getBytes("UTF-8"));
			bytes = new java.lang.String(source.sourceId).getBytes("UTF-8");
			var buf = java.nio.ByteBuffer.allocate(4);
			buf.order(java.nio.ByteOrder.BIG_ENDIAN);
			buf.putInt(bytes.length);
			os.write(buf.array());
			os.write(bytes);
			os.write(arr, 9, arr.length - 9);
			os.close();
			digest = java.security.MessageDigest.getInstance("SHA-1");
			digest.update(arr, 9, arr.length - 9);
			bytes = digest.digest();
			digest.update(ScriptInterface.getVerifyKey());
			digest.update(bytes);
			bytes = digest.digest();
			os = new java.io.FileOutputStream(MapScript.baseDir + "libs/" + libinfo.uuid + ".lib.hash");
			os.write(bytes);
			os.close();
		} else {
			new java.io.File(MapScript.baseDir + "libs").mkdirs();
			os = new java.io.FileOutputStream(MapScript.baseDir + "libs/" + libinfo.uuid + ".lib");
			os.write(arr);
			os.close();
		}
		return MapScript.baseDir + "libs/" + libinfo.uuid + ".lib";
	},
	shouldVerifySigned : function(file) {
		if (!file.isFile()) return -1;
		var i, arr = this.readAsArray(new java.io.FileInputStream(file)), digest, bytes, buf;
		if (this.arrayStartsWith(arr, [0x4c, 0x49, 0x42, 0x53, 0x49, 0x47, 0x4e, 0x30, 0x31])) { //LIBSIGN01
			buf = java.nio.ByteBuffer.wrap(arr);
			var sourceSize = buf.getInt(9), hashFile = new java.io.File(file.getPath() + ".hash");
			if (!hashFile.isFile()) return 0;
			digest = java.security.MessageDigest.getInstance("SHA-1");
			digest.update(arr, 13 + sourceSize, arr.length - 13 - sourceSize);
			bytes = digest.digest();
			digest.update(ScriptInterface.getVerifyKey());
			digest.update(bytes);
			bytes = digest.digest();
			arr = this.readAsArray(new java.io.FileInputStream(hashFile));
			if (arr.length != bytes.length) return 0;
			for (i = 0; i < arr.length; i++) {
				if (arr[i] != bytes[i]) return 0;
			}
			return 1;
		} else return -1;
	},
	loadSignedV1 : function(file, defaultValue, error) {
		try{
			var rd, s = [], q, start = [0x4c, 0x49, 0x42, 0x53, 0x49, 0x47, 0x4e, 0x30, 0x31]; //LIBSIGN01
			rd = new java.io.FileInputStream(file);
			while (start.length) {
				if (rd.read() != start.shift()) {
					rd.close();
					throw "不是已签名的拓展包";
				}
			}
			var buf = java.nio.ByteBuffer.allocate(4);
			buf.order(java.nio.ByteOrder.BIG_ENDIAN);
			rd.read(buf.array());
			rd.skip(buf.getInt(0) + 256 + 8);
			rd = new java.io.BufferedReader(new java.io.InputStreamReader(new java.util.zip.GZIPInputStream(rd)));
			while (q = rd.readLine()) s.push(q);
			rd.close();
			return this.evalLib(file, s.join("\n"));
		} catch(e) {
			if (error) error.error = e;
			return defaultValue;
		}
	},
	cleanLibrary : function() {
		var base = new java.io.File(MapScript.baseDir + "libs"), libs;
		base.mkdirs();
		libs = CA.settings.enabledLibrarys.concat(CA.settings.coreLibrarys, CA.settings.disabledLibrarys);
		var i, fl = base.listFiles(), fn;
		for (i = 0; i < fl.length; i++) {
			if (!fl[i].isFile()) continue;
			fn = String(fl[i].getAbsolutePath());
			if (libs.indexOf(fn) >= 0) continue;
			if (fn.slice(-5) == ".hash" && libs.indexOf(fn.slice(0, -5)) >= 0) continue;
			fl[i].delete();
		}
	},
	requestUpdateUrlFromDefSrc : function(uuid) {
		var source, map;
		source = this.requestDefaultSourceInfo();
		if (!source) return;
		map = this.requestSourceMap(source);
		if (!map) return;
		return map[uuid];
	},
	requestUpdateInfo : function(libinfo, callback) {
		var r, u = libinfo.update, t;
		try {
			if (typeof u == "function") {
				r = libinfo.update();
			} else if (typeof u == "string" && (u.startsWith("http://") || u.startsWith("https://"))) {
				r = JSON.parse(NetworkUtils.queryPage(u));
			} else {
				t = this.requestUpdateUrlFromDefSrc(libinfo.uuid);
				if (t) r = JSON.parse(NetworkUtils.queryPage(t));
			}
			if (!(r instanceof Object) || !Array.isArray(r.version)) {
				return callback(-1);
			}
		} catch(e) {
			callback(-2, e);
			return;
		}
		callback(NeteaseAdapter.compareVersion(r.version, libinfo.version) > 0 ? 1 : 0, r, libinfo);
	},
	doUpdate : function(updateInfo, libInfo, statusListener) {
		var path;
		if (updateInfo.method == "intent") { //通过链接启动
			statusListener("downloadFromUri", String(updateInfo.uri));
		} else {
			statusListener("startDownload");
			try {
				if (updateInfo.source) {
					path = this.downloadLib({
						downloadurl : updateInfo.url,
						sha1 : updateInfo.sha1,
						uuid : updateInfo.uuid
					}, this.requestSourceInfoCached(updateInfo.source));
					if (path != libInfo.src) {
						if (Common.inSet(CA.settings.coreLibrarys, libInfo.src)) {
							Common.replaceLinkedSet(CA.settings.coreLibrarys, libInfo.src, path);
							Common.removeSet(CA.settings.enabledLibrarys, path);
						} else {
							Common.replaceLinkedSet(CA.settings.enabledLibrarys, libInfo.src, path);
							Common.removeSet(CA.settings.coreLibrarys, path);
						}
						if (libInfo.mode == 0) {
							Common.addSet(CA.settings.disabledLibrarys, libInfo.src);
						}
					}
				} else {
					NetworkUtils.download(updateInfo.url, libInfo.src);
				}
			} catch(e) {
				statusListener("downloadError", e);
			}
			statusListener("completeDownload", updateInfo.message);
		}
	},
	updateLibraries : function(level) {
		var fUpdate = level == 2, updateCount = 0;
		if (level <= 0) return 0;
		CA.IntelliSense.library.info.forEach(function(e) {
			e.updateState = "checking";
			Threads.awaitDefault(function() {try {
				CA.Library.requestUpdateInfo(e, function(statusCode, arg1, arg2) {
					if (statusCode == 1) {
						e.updateInfo = arg1;
						e.updateState = "ready";
						updateCount++;
						if (fUpdate) {
							CA.Library.clearCache(e.src);
							CA.Library.doUpdate(arg1, arg2, function(statusMessage) {
								if (statusMessage == "downloadFromUri") {
									e.updateState = "waitForUser";
								} else if (statusMessage == "downloadError") {
									e.updateState = "error";
								} else if (statusMessage == "completeDownload") {
									e.updateState = "finished";
								}
							});
						}
					} else if (statusCode == 1) {
						e.updateState = "latest";
					} else if (statusCode < 0) {
						e.updateState = "unavailable";
					}
				});
			} catch(e) {erp(e)}}, 5000);
		});
		return updateCount;
	},
	versionToString : function(v) {
		return Array.isArray(v) ? v.join(".") : String(v);
	}
})