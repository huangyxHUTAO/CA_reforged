({
	inner : {},
	cache : {},
	loadingStatus : null,
	builtinLibs : "__BUILTIN_LIBS__",
	currentLoadingLibrary : null,
	initLibrary : function(callback) {
		var info, flag = true, lib;
		if (this.loadingStatus) return false;
		this.loadingStatus = "core";
		this.loadBuiltinLibraries();
		CA.IntelliSense.library = lib = {
			commands : {},
			enums : {},
			selectors : {},
			json : {},
			jsonSchema : {},
			states : {},
			help : {},
			tutorials : [],
			idlist : [],
			info : info = []
		};
		this.processDeprecated();
		// 同一 uuid 只保留最高版本；低版本移除（内置的改为禁用）
		var removed = this.dedupeLibraries();
		if (removed > 0) {
			Common.toast("有更高版本的拓展包，已自动移除 " + removed + " 个低版本拓展包");
		}
		// 前提包排在依赖它的拓展包前面，避免顺序导致「前提包并未全部加载」的报错
		this.orderLibraries();
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
	loadBuiltinLibraries : function() {
	var libs = this.builtinLibs;
	// 清理已经不存在的内置库（比如从构建里移除的），否则每次启动都会报"文件不存在"。
	// 必须放在下面的提前返回之前：内置库被全部移除时 libs 是空数组，
	// 提前返回会导致这里永远不执行，残留的 builtin:// URI 就一直报错。
	[CA.settings.enabledLibrarys, CA.settings.coreLibrarys].forEach(function(list) {
		var k;
		for (k = list.length - 1; k >= 0; k--) {
			if (String(list[k]).indexOf("builtin://") == 0 && !CA.Library.inner[list[k]]) list.splice(k, 1);
		}
	});
	// 若构建时没有注入内置命令库（例如旧脚本），这里仍是占位符字符串，
	// 字符串没有 forEach，必须直接跳过，否则初始化命令库时会抛 TypeError
	if (!libs || !libs.length || typeof libs.forEach !== "function") return;
	libs.forEach(function(lib) {
		var uri = "builtin://" + lib.path;
		if (CA.Library.inner[uri]) {
			CA.Library.enableLibrary(uri);
			return;
		}
		try {
			var bytes = android.util.Base64.decode(lib.source, 2);
			var code = new java.lang.String(bytes, "UTF-8");
			var obj = eval("(" + code + ")");
			if (!obj || typeof obj !== "object") throw "无效的拓展包对象";
			CA.Library.inner[uri] = obj;
			CA.Library.enableLibrary(uri);
		} catch(e) {
			erp(e);
		}
	});
},
	clearCache : function(uriStr) {
		if (uriStr) {
			delete this.cache[uriStr];
		} else {
			this.cache = {};
		}
	},
	isLibrary : function(uriStr) { // Deprecated
		return uriStr in CA.Library.inner || ExternalStorage.canRead(ExternalStorage.toUri(uriStr));
	},
	isDeprecated : function(uuid, version) {
		if (!Array.isArray(version)) return true;
		if (uuid == "04a9e9b2-8fae-4f30-84fa-d52f9457f4eb") return true; //自适配ID表：用户瞎加载
		if (uuid == "06b2fb31-668e-4693-92ad-c0ac8da3e7a9" && NeteaseAdapter.compareVersion(version, [2, 0, 0]) < 0) return true; //MC图标：bug
		if (uuid == "5a204d07-4b6d-4c51-9470-a2d8c8676ab8") return true; //调试屏幕：根本没用
		return false;
	},
	enableLibrary : function(uriStr) {
		Common.removeSet(CA.settings.disabledLibrarys, uriStr);
		Common.removeSet(CA.settings.coreLibrarys, uriStr);
		return Common.addSet(CA.settings.enabledLibrarys, uriStr);
	},
	disableLibrary : function(uriStr) {
		Common.removeSet(CA.settings.enabledLibrarys, uriStr);
		Common.removeSet(CA.settings.coreLibrarys, uriStr);
		return Common.addSet(CA.settings.disabledLibrarys, uriStr);
	},
	removeLibrary : function(uriStr) {
		const uri = ExternalStorage.toUri(uriStr);
		let fl = false;
		ExternalStorage.tryReleaseImportUri(uri);
		this.tryReleaseLibraryFile(uri);
		fl = Common.removeSet(CA.settings.enabledLibrarys, uriStr) || fl;
		fl = Common.removeSet(CA.settings.coreLibrarys, uriStr) || fl;
		return Common.removeSet(CA.settings.disabledLibrarys, uriStr) || fl;
		// 安装器记录一并清掉，重新导入时才会再执行
		if (CA.settings.installedInstallers) {
			delete CA.settings.installedInstallers[String(uriStr)];
			delete CA.settings.installedInstallers[this.installerNameKey(uriStr)];
			try { CA.trySave(); } catch (e) {}
		}
	},
	enableCoreLibrary : function(uriStr) {
		Common.removeSet(CA.settings.enabledLibrarys, uriStr);
		Common.removeSet(CA.settings.disabledLibrarys, uriStr);
		return Common.addSet(CA.settings.coreLibrarys, uriStr);
	},
	/** 版本归一化成数组（compareVersion 依赖数组下标） */
	toVersionArray : function(v) {
		return Array.isArray(v) ? v : [v];
	},
	/** 比较两个拓展包版本（数组或字符串都行）：a > b 返回 1，相等 0，a < b 返回 -1 */
	compareLibraryVersion : function(a, b) {
		return NeteaseAdapter.compareVersion(this.toVersionArray(a), this.toVersionArray(b));
	},
	/**
	 * 同一 uuid 只保留最高版本：低版本从列表里移除（内置包删不掉文件，改为禁用）。
	 * 在 initLibrary 里、真正加载之前调用；返回被移除的个数。
	 */
	dedupeLibraries : function() {
		var self = this, best = {}, dropped = [], lists, i;
		lists = [CA.settings.coreLibrarys, CA.settings.enabledLibrarys];
		lists.forEach(function(list) {
			list.slice().forEach(function(uriStr) {
				var rd, info, t;
				try {
					rd = self.readLibrary(String(uriStr));
				} catch(e) {
					return; // 读不出来的交给正常加载流程去报错
				}
				if (!rd || rd.error || !rd.data || !rd.data.uuid) return;
				info = {
					uri : String(uriStr),
					uuid : rd.data.uuid,
					version : self.toVersionArray(rd.data.version),
					name : rd.data.name
				};
				t = best[info.uuid];
				if (!t) {
					best[info.uuid] = info;
					return;
				}
				// 同版本时保留后面加载的那份（"加载最后的相同版本"）
				if (self.compareLibraryVersion(info.version, t.version) >= 0) {
					dropped.push(t);
					best[info.uuid] = info;
				} else {
					dropped.push(info);
				}
			});
		});
		dropped.forEach(function(info) {
			// 内置拓展包（inner 里的 / builtin:// 形式的）没法从仓库删掉，放进禁用列表
			if (info.uri.indexOf("builtin://") == 0 || CA.Library.inner[info.uri]) {
				CA.Library.disableLibrary(info.uri);
			} else {
				CA.Library.removeLibrary(info.uri);
			}
		});
		return dropped.length;
	},
	/**
	 * 导入/加载一个外置拓展包（替代直接 enableLibrary），返回状态字符串：
	 *   "added"   新增并启用
	 *   "updated" 版本更高：移除低版本（内置的改为禁用）后启用
	 *   "ignored" 已有版本更高或相同：忽略本次导入，并删掉导入进来的文件
	 *   "enabled" 读不出元数据时按原行为启用（后续加载会报具体错误）
	 * 这里不弹提示：批量导入时由调用方汇总数量，只提示包的数量。
	 */
	addLibrary : function(uriStr) {
		var uri = String(uriStr), rd, data, existing, cmp;
		// 手动导入 = 重新安装：先清掉旧记录，让这一份真的执行一次
		// （启动时加载则相反，靠记录跳过，不再执行）
		if (CA.settings.installedInstallers) {
			delete CA.settings.installedInstallers[uri];
			delete CA.settings.installedInstallers[this.installerNameKey(uri)];
		}
		try {
			rd = this.readLibrary(uri);
		} catch(e) {
			rd = null;
		}
		// 安装器包：加载/卸载本身就会触发一次重新加载，别让它连带跑一轮全量更新检查
		if (rd && rd.data && rd.data.installer) this.installerDirty = true;
		if (!rd || rd.error || !rd.data) {
			this.enableLibrary(uriStr);
			this.saveState();
			return "enabled";
		}
		data = rd.data;
		existing = this.findByUUID(data.uuid);
		if (!existing) {
			this.enableLibrary(uriStr);
			this.saveState();
			return "added";
		}
		if (uri == String(existing.src)) {
			// 同一个文件，不用处理
			return "ignored";
		}
		cmp = this.compareLibraryVersion(data.version, existing.version);
		// cmp > 0：升级；== 0：同版本重装；< 0：降级。都允许覆盖安装
		if (existing.src && (String(existing.src).indexOf("builtin://") == 0 || CA.Library.inner[String(existing.src)])) {
			this.disableLibrary(String(existing.src)); // 内置包不能删，保持禁用
		} else if (existing.src) {
			this.removeLibrary(String(existing.src)); // 低版本直接移除
		}
		this.enableLibrary(uriStr);
		this.saveState();
		return "updated";
	},
	/** 把一批 addLibrary 的返回值汇总成一句提示（只报数量） */
	summarizeAddResults : function(results) {
		var added = 0, updated = 0, ignored = 0;
		results.forEach(function(r) {
			if (r == "updated") {
				updated++;
			} else if (r == "ignored") {
				ignored++;
			} else {
				added++;
			}
		});
		var parts = [];
		if (updated) parts.push("更新 " + updated + " 个");
		if (added) parts.push("新增 " + added + " 个");
		if (ignored) parts.push("忽略 " + ignored + " 个");
		return parts.length ? "拓展包：" + parts.join("，") : "没有可导入的拓展包";
	},
	/**
	 * 按前提包（require）给「已启用」列表排序：前提包排在依赖它的拓展包前面。
	 * 读取走 loadLibrary 的缓存，不会重复 eval；循环依赖时也能正常结束（保持可加载的相对顺序）。
	 * 返回是否调整过顺序。
	 */
	orderLibraries : function() {
		var self = this, list = CA.settings.enabledLibrarys, meta = {}, byUuid = {}, order = [], visiting = {}, changed;
		list.slice().forEach(function(uri) {
			var rd, key = String(uri);
			try {
				rd = self.readLibrary(key);
			} catch(e) {
				return;
			}
			if (!rd || rd.error || !rd.data) return;
			meta[key] = {
				uuid : rd.data.uuid,
				require : Array.isArray(rd.data.require) ? rd.data.require : []
			};
			if (rd.data.uuid) byUuid[rd.data.uuid] = key;
		});
		var visit = function(uri) {
			var m, req, j, ruuid, ruri;
			if (order.indexOf(uri) >= 0) return;
			if (visiting[uri]) return; // 循环依赖：不重复进栈
			visiting[uri] = true;
			m = meta[uri];
			req = m ? m.require : [];
			for (j = 0; j < req.length; j++) {
				ruuid = typeof req[j] === "string" ? req[j] : (req[j] && req[j].uuid);
				ruri = ruuid && byUuid[ruuid];
				// 前提包也在启用列表里：先放它
				if (ruri && ruri != uri) visit(ruri);
			}
			visiting[uri] = false;
			if (order.indexOf(uri) < 0) order.push(uri);
		};
		list.slice().forEach(visit);
		// 读不出元数据的库照样保留（放最后，交给加载流程报错）
		list.slice().forEach(function(uri) {
			if (order.indexOf(uri) < 0) order.push(uri);
		});
		changed = order.some(function(uri, i) {
			return uri != list[i];
		});
		if (changed) {
			list.splice(0, list.length);
			order.forEach(function(uri) {
				list.push(uri);
			});
		}
		return changed;
	},

	loadLibrary : function(uriStr, targetLib) {
		var m, community, cur, resolved;
		try {
			if (this.cache[uriStr]) {
				cur = this.cache[uriStr].data;
				m = this.cache[uriStr].mode;
				community = this.cache[uriStr].community;
			} else {
				cur = this.readLibrary(uriStr);
				if (!cur) throw "无法读取或解析拓展包";
				if (cur.error) throw cur.error;
				if (!(cur.data instanceof Object)) throw "错误的拓展包格式";
				this.cache[uriStr] = cur;
				m = cur.mode;
				community = cur.community;
				cur = cur.data;
			}
			resolved = {
				src : uriStr,
				name : cur.name,
				author : cur.author,
				description : cur.description,
				uuid : cur.uuid,
				version : Array.isArray(cur.version) ? cur.version : [cur.version],
				update : cur.update,
				menu : cur.menu,
				deprecated : cur.deprecated || this.isDeprecated(cur.uuid, cur.version),
				mode : m,
				community : community === true,
				// 安装器包（安装完会把自己删掉的特殊包）：进列表，但不参与更新检查
				installer : cur.installer === true
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
					src : uriStr,
					name : m == 0 ? uriStr : ExternalStorage.uriToName(ExternalStorage.toUri(uriStr)),
					hasError : true,
					mode : m,
					error : err
				};
			}
		}
	},
	readLibrary : function(uriStr) {
		var t, er, uri, done, securityLevel = CA.settings.securityLevel, requiredSecLevel;
		// 安全级别（数字越大越严格）：
		//   0 完全加载，不使用安全机制：什么都不检查
		//   1 不允许开放拓展包：放行未签名的锁定包，但提醒一次
		//   2 中  ：只允许已签名的（官方 + 社区）
		//   3 高  ：只允许官方签名的
		//   4 严格：只加载内置
		if (t = CA.Library.inner[uriStr]) {
			return {
				data : t,
				mode : 0
			};
		}
		er = {
			error : "未知错误"
		};
		if (securityLevel >= 4) {
			return {
				error : "当前安全级别为「严格」，只加载内置命令库\n可在「管理拓展包」右上角 ▼ 的「设置安全级别」里调整"
			};
		}
		uri = ExternalStorage.toUri(uriStr);
		ExternalStorage.tryTakeUriPermission(uri);
		if (!ExternalStorage.isFile(uri)) {
			return {
				error : "拓展包文件不存在"
			};
		}
		requiredSecLevel = this.testSecurityLevel(uri); // 2=签名 1=LIBRARY 0=裸JS
		// 按级别决定"最低要求的包类型"：0 不限，1 要 LIBRARY 以上，2 及以上要签名
		var minRequired = securityLevel <= 0 ? 0 : (securityLevel == 1 ? 1 : 2);
		if (requiredSecLevel < minRequired) {
			return {
				error : "当前安全级别不允许加载" +
					(minRequired >= 2 ? "未签名的" : "未打包的") + "拓展包\n可在「管理拓展包」右上角 ▼ 的「设置安全级别」里调整"
			};
		}
		// 高：只认官方签名，社区包也拒绝
		if (securityLevel >= 3 && this.isCommunityLib(uri)) {
			return {
				error : "当前安全级别为「高」，不允许加载社区拓展包\n它由第三方拓展包源签名，没有官方背书；切到「中」可以加载"
			};
		}
		// 低：允许 LIBRARY 未签名包，但要提醒一次
		if (securityLevel == 1 && requiredSecLevel < 2) {
			this.warnLowSecurity();
		}
		if (requiredSecLevel >= 2) {
			if (t = CA.Library.loadSignedV1(uri, null, er)) {
				return {
					data : t,
					mode : 3,
					community : this.isCommunityLib(uri)
				};
			}
		} else if (requiredSecLevel == 1) {
			if (t = CA.Library.loadPrefixed(uri, null, er)) {
				return {
					data : t,
					mode : 2
				};
			}
		} else if (requiredSecLevel == 0) {
			t = ExternalStorage.readFileContent(uri, "UTF-8", (error) => void (er = { error }))
			if (t) {
				// 安装器包执行过一次后只保留元数据：进列表，但不重新执行。
				// 否则每次启动都会重写脚本、重建快捷方式、重复弹窗。
				done = this.getInstallerRecord(uriStr);
				if (done) {
					return {
						data : done,
						mode : 1
					};
				}
				t = this.safeEval(uri, t, er);
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
		return er;
	},

	/** 安装器副本的文件名（重复导入会复制到不同目录，文件名不变） */
	installerNameKey : function(uriStr) {
		var name;
		try {
			name = ExternalStorage.uriToName(ExternalStorage.toUri(String(uriStr)));
		} catch (e) {
			name = String(uriStr).split("/").pop();
		}
		try { name = decodeURIComponent(String(name)); } catch (e) {}
		return "name:" + name;
	},
	/** 查这个安装器是否已经执行过（先按 uri，再按文件名——同名副本只执行一次） */
	getInstallerRecord : function(uriStr) {
		var m = CA.settings.installedInstallers, rec;
		if (!m) return null;
		rec = m[String(uriStr)] || m[this.installerNameKey(uriStr)] || null;
		if (!rec) return null;
		// 老版本存的记录可能缺字段：checkLibrary 会要求 require/version 是数组，
		// 读出来先补全，免得升级后报「require 不是数组」。
		if (!Array.isArray(rec.require)) rec.require = [];
		if (!Array.isArray(rec.version)) rec.version = [rec.version];
		if (!Array.isArray(rec.menu)) rec.menu = [];
		rec.noCommand = true;
		rec.installer = true;
		return rec;
	},
	/** 记下「这个安装器已经执行过」：只存元数据，之后进列表但不再执行 */
	markInstallerExecuted : function(uriStr, data) {
		var rec;
		if (!CA.settings.installedInstallers) CA.settings.installedInstallers = {};
		// 必须补齐插件信息里 checkLibrary 会校验的字段（require/version 都要是数组），
		// 否则下次启动读到缓存记录时会报「require 不是数组」。
		rec = {
			name : data.name,
			author : data.author,
			description : data.description,
			uuid : data.uuid,
			version : Array.isArray(data.version) ? data.version : [data.version],
			require : Array.isArray(data.require) ? data.require : [],
			menu : [],
			// 安装器不提供命令，标记成 noCommand：加载时不必再走 resolveLibrary
			noCommand : true,
			installer : true,
			shortcutName : data.shortcutName || ""
		};
		CA.settings.installedInstallers[String(uriStr)] = rec;
		// 同名副本（重复导入）也认这条记录，避免每份都执行一次、弹多次提示
		CA.settings.installedInstallers[this.installerNameKey(uriStr)] = rec;
		this.installerDirty = true;
		try { CA.trySave(); } catch (e) {}
	},
	evalLib : function(uri, code) {
		var key = String(uri), done, t;
		// LIBRARY / 裸 JS 两条读取路径最后都走这里，安装器的「只执行一次」就放在这个总口上：
		//   已经执行过 → 直接返回元数据（进列表，但不重新写脚本、不重复弹窗）
		done = this.getInstallerRecord(key);
		if (done) {
			return done;
		}
		t = Loader.evalSpecial("(" + code + ")", ExternalStorage.uriToName(uri), 0, {
			path : String(uri.getPath ? uri.getPath() : uri),
			code,
			LibInfo : { uri, code }
		}, this);
		if (t && t.installer === true) this.markInstallerExecuted(key, t);
		return t;
	},
	safeEval : function(uri, code, defaultValue, error) {
		try {
			return this.evalLib(uri, code);
		} catch(e) {
			if (error) error.error = e;
			return defaultValue;
		}
	},
	testSecurityLevel : function(uri) {
		if (this.shouldVerifySigned(uri) >= 0) {
			return 2;
		} else if (this.isPrefixed(uri)) {
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
			var requuid, vertester;
			if (typeof e1 == "string") {
				requuid = e1;
			} else {
				//扩展写法：{ uuid : "...", min : [...], max : [...] }，可限定前提包的版本区间
				requuid = e1.uuid;
				vertester = function(ver) {
					if (e1.min && NeteaseAdapter.compareVersion(e1.min, ver) > 0) {
						return false;
					}
					if (e1.max && NeteaseAdapter.compareVersion(e1.max, ver) < 0) {
						return false;
					}
					return true;
				}
			}
			return !libinfo.some(function(e2) {
				if (vertester) {
					return requuid == e2.uuid && vertester(e2.version);
				}
				return requuid == e2.uuid;
			});
		}, this)) throw "前提包并未全部加载或不满足版本条件，请检查加载顺序及拓展包列表";
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
		if (this.installerDirty) {
			// 安装器加载/卸载自己导致的重载：不触发更新检查，否则一次安装会连查两轮
			this.installerDirty = false;
		} else {
			this.updateLibraries(CA.settings.libraryAutoUpdate);
		}
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
	isPrefixed : function(uri) {
		try {
			var rd, q, start = [0x4c, 0x49, 0x42, 0x52, 0x41, 0x52, 0x59];
			rd = ExternalStorage.openInputStream(uri);
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
	loadPrefixed : function(uri, defaultValue, error) {
		try{
			var rd, s = [], q, start = [0x4c, 0x49, 0x42, 0x52, 0x41, 0x52, 0x59];
			rd = ExternalStorage.openInputStream(uri);
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
			return this.evalLib(uri, s.join("\n"));
		} catch(e) {
			if (error) error.error = e;
			return defaultValue;
		}
	},
	savePrefixed : function(uri, object) {
		var wr, ar;
		wr = ExternalStorage.openOutputStream(uri);
		ar = java.nio.ByteBuffer.allocate(15); // LIBRARY
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
		var iterateObject = function(o, keyIter, valueIter) {
			var l = stack.length, k;
			checkObject(o);
			stack.length = l + 1;
			for (k in o) {
				stack[l] = k;
				keyIter(k);
				valueIter(v)
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
			//require 是数组，元素可以是 UUID 字符串，也可以是带版本区间的对象
			checkArray(a.require);
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
		var inRange = function(min, max, exclusiveMin, exclusiveMax) {
			if (min && compare(min) < 0) return -1;
			if (max && compare(max) > 0) return 1;
			if (exclusiveMin && compare(exclusiveMin) <= 0) return -1; //开区间：最小版本不包含
			if (exclusiveMax && compare(exclusiveMax) >= 0) return 1;
			return 0;
		}
		return function(o) {
			var r = 0, i, n, e;
			if (this.ignoreVersion) return 0;
			a = getMinecraftVersion().split(".");
			if (o.minSupportVer || o.maxSupportVer) {
				r = inRange(o.minSupportVer, o.maxSupportVer, null, null);
				if (r != 0) return r; //这两个参数是总范围
			}
			if (Array.isArray(o.supportVer)) {
				n = o.supportVer.length;
				r = 1;
				for (i = 0; i < n; i++) {
					e = o.supportVer[i];
					r = Math.min(r, inRange(e.min, e.max, e.exclusiveMin, e.exclusiveMax)); //趋向返回游戏版本过低
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
				if (Array.isArray(op)) { // Deprecated
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
				if (Array.isArray(op)) { // Deprecated
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
			// 拓展包可以携带 JSON Schema，供 jsonPro 类型的参数做补全与校验
			if (!(l.jsonSchema instanceof Object)) l.jsonSchema = {};
			if (!(l.states instanceof Object)) l.states = {};
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
					cur.commands[i] = Object.copy(l.commands[i]);
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
					cur.enums[i] = Object.copy(parseAliasEnum(cur, l.enums[i]));
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
			for (i in l.jsonSchema) {
				if (l.mode == "remove") {
					delete cur.jsonSchema[i];
				} else {
					cur.jsonSchema[i] = l.jsonSchema[i];
				}
			}
			// 方块状态（status 参数用）：namespace（如 block）→ 状态表
			for (i in l.states) {
				if (l.mode == "remove") {
					delete cur.states[i];
				} else {
					cur.states[i] = l.states[i];
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
		var sourceInfo, src;
		if (url.slice(-1) != "/") url += "/";
		sourceInfo = this.sourceInfoCache[url];
		if (!sourceInfo || !(Date.now() < sourceInfo.accessExpired)) {
			sourceInfo = this.requestSourceInfo(url);
			if (!sourceInfo) return;
			sourceInfo.accessExpired = Date.now() + 60000;
			this.sourceInfoCache[url] = sourceInfo;
			// 源端声明了 name 时顺手同步已添加源的显示名：
			// 早期只能取 maintainer，加过源的会显示成人名
			if (sourceInfo.name) {
				src = this.findSource(url);
				if (src && !src.builtin && src.name != String(sourceInfo.name)) {
					src.name = String(sourceInfo.name);
					this.saveSources();
				}
			}
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

	// ───────────── 拓展包源管理 ─────────────
	// 源对象：{ url, name, enabled, builtin }，存在 CA.settings.librarySources 里

	/** 取源列表；第一次使用时补上内置官方源 */
	getSources : function() {
		var name = "命令助手官方拓展包源", builtin;
		var list = CA.settings.librarySources;
		if (!Array.isArray(list)) list = CA.settings.librarySources = [];
		builtin = list.filter(function(s) { return s && s.builtin; })[0];
		if (!builtin) {
			list.unshift({
				url : this.getOriginSourceUrl(),
				name : name,
				enabled : true,
				builtin : true
			});
		} else if (builtin.name != name) {
			// 旧版本叫“官方源”/“命令助手拓展包源”，统一改名（内置源的显示名不开放编辑，直接覆盖）
			builtin.name = name;
		}
		return list;
	},
	/** 规范化源的 URL：补 http(s)://、去掉多余的空白、保证以 / 结尾 */
	normalizeSourceUrl : function(url) {
		url = String(url || "").trim();
		if (!url) return "";
		if (!/^https?:\/\//i.test(url)) url = "https://" + url;
		return url.replace(/\/+$/, "") + "/";
	},
	findSource : function(url) {
		var list = this.getSources(), i;
		for (i = 0; i < list.length; i++) {
			if (list[i] && this.normalizeSourceUrl(list[i].url) == this.normalizeSourceUrl(url)) return list[i];
		}
		return null;
	},
	/** 启用中的源 */
	enabledSources : function() {
		return this.getSources().filter(function(s) {
			return s && s.enabled;
		});
	},
	/**
	 * 校验并添加一个源。url 可以是源站根目录，也可以是 info.json 的地址。
	 * 成功返回源对象；失败抛错（供界面显示）。
	 */
	addSource : function(url) {
		var info, src;
		url = this.normalizeSourceUrl(url);
		if (!url) throw "请输入源的地址";
		if (url.slice(-10) == "info.json/") url = url.slice(0, -10);
		if (this.findSource(url)) throw "该源已经存在";
		info = this.requestSourceInfo(url);
		if (!info) throw "无法访问该源（读取 info.json 失败）\n" + url;
		if (!info.sourceId) throw "不是有效的拓展包源（缺少 sourceId）";
		src = {
			url : url,
			// 名称优先用 info.json 的 name，没有就退回维护者 / 描述 / 地址
			name : info.name ? String(info.name) :
				(info.maintainer && info.maintainer != url ? String(info.maintainer) : (info.details ? String(info.details) : url)),
			enabled : true,
			builtin : false
		};
		this.getSources().push(src);
		this.saveSources();
		return src;
	},
	removeSource : function(url) {
		var list = this.getSources(), i;
		for (i = 0; i < list.length; i++) {
			if (list[i] && this.normalizeSourceUrl(list[i].url) == this.normalizeSourceUrl(url)) {
				if (list[i].builtin) throw "内置源不能删除";
				list.splice(i, 1);
				this.saveSources();
				return true;
			}
		}
		return false;
	},
	setSourceEnabled : function(url, enabled) {
		var src = this.findSource(url);
		if (!src) return false;
		if (!enabled && src.builtin) throw "内置源不能禁用";
		src.enabled = !!enabled;
		this.saveSources();
		return true;
	},
	/**
	 * 把设置立刻写盘。
	 * 之前源的增删改、拓展包的启用/禁用/安装只改内存里的 CA.settings，
	 * 进程被系统杀掉（或用户手动结束）后这些改动就全丢了。
	 */
	saveState : function() {
		try {
			if (typeof CA.trySave == "function") CA.trySave();
		} catch(e) {
			Log.e(e);
		}
	},
	/** 兼容旧名字 */
	saveSources : function() {
		this.saveState();
	},
	/** 改源备注并保存 */
	setSourceNote : function(url, note) {
		var src = this.findSource(url);
		if (!src) return false;
		src.note = String(note || "").trim();
		this.saveSources();
		return true;
	},
	getVerify : function(source) {
		return source.verifyObject ? source.verifyObject : (source.verifyObject = this.downloadAsArray(source.pubkey));
	},
	getLibraryRoot: function() {
		return new java.io.File(MapScript.baseDir, "libs");
	},
	getLibraryExternalRoot: function() {
		return ctx.getExternalFilesDir("libs");
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
		var libraryRoot = this.getLibraryRoot();
		var libraryFile = new java.io.File(libraryRoot, libinfo.uuid + "/" + libinfo.name);
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
			// 判断这是不是"社区包"：拿验签用的公钥和**官方源的公钥**比。
			// - 一致       → [官方]，有官方源背书
			// - 不一致     → [社区]，源自己的 key 验的签，能装但没官方背书
			// - 官方 key 拿不到 → 无法判定，按 [官方] 处理（不误标）
			// 注意这里不能拿 ScriptInterface.getVerifyKey() 来比：那是 App 内置的
			// hotfix 公钥，和官方拓展包源用的 verify.key 是两把不同的钥匙。
			// 两把 key 都必须存在才可能判为社区包。
			var isCommunity = false;
			if (source && !source.builtin) {
				// 非官方源的包：默认就是社区包；若它的 key 恰好等于官方 key
				// （例如官方源的镜像），仍按官方处理。
				var officialKey = this.getOfficialVerify();
				isCommunity = !officialKey || !this.bytesEqual(verify, officialKey);
			}
			libraryFile.getParentFile().mkdirs();
			os = new java.io.FileOutputStream(libraryFile);
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
			os = new java.io.FileOutputStream(new java.io.File(libraryFile.getParent(), libraryFile.getName() + ".hash"));
			os.write(bytes);
			os.close();
			// 社区包标记；官方包则清掉可能残留的旧标记
			var markFile = new java.io.File(libraryFile.getParent(), libraryFile.getName() + ".community");
			if (isCommunity) {
				// Rhino 里没有 byte 这个类型，new byte[0] 会报"byte 未定义"；
				// 写一个空字符串的字节就是 0 字节文件。
				os = new java.io.FileOutputStream(markFile);
				os.write(new java.lang.String("").getBytes("UTF-8"));
				os.close();
			} else if (markFile.exists()) {
				markFile.delete();
			}
		} else {
			libraryFile.getParentFile().mkdirs();
			os = new java.io.FileOutputStream(libraryFile);
			os.write(arr);
			os.close();
		}
		return ExternalStorage.toUri(libraryFile);
	},
	shouldVerifySigned : function(uri) {
		if (!ExternalStorage.isFile(uri)) return -1;
		const file = ExternalStorage.uriToFile(uri);
		if (!file) return -1;
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
	loadSignedV1 : function(uri, defaultValue, error) {
		try{
			var rd, s = [], q, start = [0x4c, 0x49, 0x42, 0x53, 0x49, 0x47, 0x4e, 0x30, 0x31]; //LIBSIGN01
			rd = ExternalStorage.openInputStream(uri);
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
			return this.evalLib(uri, s.join("\n"));
		} catch(e) {
			if (error) error.error = e;
			return defaultValue;
		}
	},
	/**
	 * 官方源的公钥（DER）；取不到时返回 null。
	 * 注意：getSources() 的元素只有 {url,name,enabled,builtin}，
	 * pubkey 字段来自 info.json，必须先 requestSourceInfoCached 再取。
	 */
	getOfficialVerify : function() {
		var sources = this.getSources(), i, src = null, info;
		for (i = 0; i < sources.length; i++) {
			if (sources[i] && sources[i].builtin) {
				src = sources[i];
				break;
			}
		}
		if (!src || !src.url) return null;
		try {
			info = this.requestSourceInfoCached(src.url);
			if (!info || !info.pubkey) return null;
			return this.getVerify(info);
		} catch(e) {
			return null;
		}
	},
	/** 两个字节数组是否完全相同 */
	bytesEqual : function(a, b) {
		var i;
		if (!a || !b || a.length != b.length) return false;
		for (i = 0; i < a.length; i++) {
			if (a[i] != b[i]) return false;
		}
		return true;
	},
	/** 低安全级别下对未签名包的提醒（每次运行只提示一次） */
	warnLowSecurity : function() {
		if (this.lowSecurityWarned) return;
		this.lowSecurityWarned = true;
		try {
			G.ui(function() {try {
				Common.toast("当前安全级别会加载未签名的锁定包（LIBRARY），请确认来源可信");
			} catch(e) {erp(e)}});
		} catch(e) {}
	},
	/** 是否为社区包：由非官方公钥验签通过、且带 .community 标记的已签名包 */
	isCommunityLib : function(uri) {
		try {
			var file = ExternalStorage.uriToFile(uri);
			if (!file) return false;
			return new java.io.File(file.getPath() + ".community").isFile();
		} catch(e) {
			return false;
		}
	},
	tryReleaseLibraryFile : function(uri) {
		const file = ExternalStorage.uriToFile(uri);
		if (file) {
			const libraryRoot = this.getLibraryRoot();
			const libraryExternalRoot = this.getLibraryExternalRoot();
			const inLibraryRoot = ExternalStorage.isParentOrSelf(file, libraryRoot);
			const inLibraryExternalRoot = ExternalStorage.isParentOrSelf(file, libraryExternalRoot);
			if (inLibraryRoot || inLibraryExternalRoot) {
				const parentFile = file.getParentFile();
				const hashFile = new java.io.File(parentFile, file.getName() + ".hash");
				const communityFile = new java.io.File(parentFile, file.getName() + ".community");
				file.delete();
				if (hashFile.exists()) {
					hashFile.delete();
				}
				if (communityFile.exists()) {
					communityFile.delete();
				}
				if (inLibraryRoot) {
					ExternalStorage.releaseEmptyDirectory(parentFile, libraryRoot);
				}
				if (inLibraryExternalRoot) {
					ExternalStorage.releaseEmptyDirectory(parentFile, libraryExternalRoot);
				}
			}
		}
	},
	cleanLibrary : function() { // Deprecated
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
		var self = this, srcs = this.enabledSources(), i, source, map;
		// 按源的顺序找，第一个能给出更新地址的源胜出
		for (i = 0; i < srcs.length; i++) {
			source = this.requestSourceInfoCached(srcs[i].url);
			if (!source) continue;
			map = this.requestSourceMap(source);
			if (map && map[uuid]) return map[uuid];
		}
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
		var uriStr;
		if (updateInfo.method == "intent") { //通过链接启动
			statusListener("downloadFromUri", String(updateInfo.uri));
		} else {
			statusListener("startDownload");
			try {
				if (updateInfo.source) {
					uriStr = String(this.downloadLib({
						downloadurl : updateInfo.url,
						sha1 : updateInfo.sha1,
						uuid : updateInfo.uuid
					}, this.requestSourceInfoCached(updateInfo.source)));
					if (uriStr != libInfo.src) {
						ExternalStorage.tryReleaseImportUri(ExternalStorage.toUri(libInfo.src));
						if (Common.inSet(CA.settings.coreLibrarys, libInfo.src)) {
							Common.replaceLinkedSet(CA.settings.coreLibrarys, libInfo.src, uriStr);
							Common.removeSet(CA.settings.enabledLibrarys, uriStr);
						} else {
							Common.replaceLinkedSet(CA.settings.enabledLibrarys, libInfo.src, uriStr);
							Common.removeSet(CA.settings.coreLibrarys, uriStr);
						}
						if (libInfo.mode == 0) {
							Common.addSet(CA.settings.disabledLibrarys, libInfo.src);
						}
					}
				} else {
					NetworkUtils.downloadToUri(updateInfo.url, ExternalStorage.toUri(libInfo.src));
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
			if (e.installer) return; // 安装器包不参与更新检查
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
					} else if (statusCode == 0) {
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
		if (!Array.isArray(v)) return String(v);
		// 快照 / 安装器包的版本是 [年, 月, 日, 时, 分, 秒]，
		// 时、分、秒补成两位，列表里不至于出现 21.5.8 这种参差的对齐
		if (v.length === 6 && v[0] >= 2000) {
			var pad2 = function(n) { return ("0" + n).slice(-2); };
			return [v[0], v[1], v[2], pad2(v[3]), pad2(v[4]), pad2(v[5])].join(".");
		}
		return v.join(".");
	}
})
