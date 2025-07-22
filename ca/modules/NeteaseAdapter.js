MapScript.loadModule("NeteaseAdapter", {
	onCreate: function () {
		MapScript.loadModule("getMinecraftVersion", this.getMinecraftVersion);
	},
	getMinecraftVersion: function (force) {
		if (!force && NeteaseAdapter.mcVersion) return NeteaseAdapter.mcVersion;
		try {
			return NeteaseAdapter.mcVersion = NeteaseAdapter.getCoreVersion();
		} catch (e) {
			Log.e(e);
			return NeteaseAdapter.mcVersion = "*";
		}
	},
	getCoreVersion: function () {
		if (MapScript.host == "BlockLauncher") return ModPE.getMinecraftVersion();
		if (CA.settings.mcPublisher && CA.settings.mcPackName) {
			this.multiVersions = false;
			this.mcPackage = CA.settings.mcPackName;
			this.mcPublisher = CA.settings.mcPublisher;
			this.autoSelect = false;
			try {
				return this.getVersionByPar(CA.settings.mcPackName, CA.settings.mcPublisher);
			} catch (e) { erp(e, true) }
			CA.settings.mcPackName = CA.settings.mcPublisher = null;
		}
		var i, result = [], t;
		for (i = 0; i < this.packNames.length; i++) {
			if (MCAdapter.existPackage(this.packNames[i])) {
				t = {
					package: this.packNames[i],
					publisher: this.packages[this.packNames[i]].publisher
				};
				t.version = String(this.getVersionByPar(t.package, t.publisher)).split(".");
				result.push(t);
			}
		}
		if (result.length > 1) {
			result.sort(function (a, b) {
				return NeteaseAdapter.compareVersion(b.version, a.version);
			});
		}
		this.multiVersions = result.length > 1;
		this.autoSelect = true;
		if (result.length > 0) {
			this.mcPackage = result[0].package;
			this.mcPublisher = result[0].publisher;
			return result[0].version.join(".");
		} else {
			this.mcPackage = null;
			this.mcPublisher = null;
			return "*";
		}
	},
	getVersionByPar: function (packName, publisher) {
		switch (publisher) {
			case "Mojang":
				return this.getMojangVersion(packName);
			case "Netease":
				return this.getNeteaseVersion(packName);
			case "Custom":
				return packName;
		}
		return "*";
	},
	getMojangVersion: function (packageName) {
		return String(ctx.getPackageManager().getPackageInfo(packageName, 0).versionName);
	},
	/**
	 * 根据网易基岩版 APK 的 versionCode 返回对应的 JS 版本号
	 * @param {string} packageName 包名
	 * @returns {string} JS 版本号
	 */
	getNeteaseVersion(packageName) {
		const pm = ctx.getPackageManager();
		const code = pm.getPackageInfo(packageName, 0).versionCode;

		/* 按 versionCode 降序排列，便于 find 直接返回第一条匹配的 */
		const VERSION_MAP = [
			{ code: 840272700, version: '1.21.0' },        // 1.21.0
			// 中间的版本就当不存在吧，反正网易有限制必须使用最新版，
			// 只有更旧的版本才能免登录使用
			{ code: 840084547, version: '1.13.3.0.0' },    // 1.16.5.84547
			{ code: 840075495, version: '1.12.0.28.1' },   // 1.15.0.75495
			{ code: 840068012, version: '1.11.4.2' },      // 1.14.0.68012
			{ code: 840064213, version: '1.9.1.15' },      // 1.13.0.64213
			{ code: 840060355, version: '1.9.0.15' },      // 1.12.4.60355
			{ code: 840055312, version: '1.8.1.1' },       // 1.11.0.55312
			{ code: 840052467, version: '1.7.0.13' },      // 1.10.0.52467
			{ code: 840049833, version: '1.6.2.0' },       // 1.9.0.49833
			{ code: 840045722, version: '1.5.2.0' },       // 1.7.0.45722
			{ code: 840043535, version: '1.4.1.5' },       // 1.6.1.43535
			{ code: 840035545, version: '1.2.5.50' },      // 1.0.0.35545
		];

		const hit = VERSION_MAP.find(item => code >= item.code);
		return hit ? hit.version : '1.1.3.52';   // 未确认
	},
	askPackage: function (callback, canCustomize) {
		var self = this;
		Common.showProgressDialog(function (o) {
			o.setText("正在加载列表……");
			var pm = ctx.getPackageManager();
			var lp = pm.getInstalledPackages(0).toArray();
			var i, j, as, r = [], f, t;
			for (i in lp) {
				if (!lp[i].applicationInfo) continue;
				f = true;
				try { //非常神奇的Exception:Package manager has died
					as = pm.getPackageInfo(lp[i].packageName, 1).activities;
					for (j in as) {
						if (as[j].name == "com.mojang.minecraftpe.MainActivity") {
							f = false;
							break;
						}
					}
					if (f) continue;
				} catch (e) { Log.e(e) }
				t = {
					text: pm.getApplicationLabel(lp[i].applicationInfo),
					result: lp[i].packageName
				};
				if (t.result in self.packages) {
					t.description = self.packages[t.result].desc + " - " + lp[i].versionName;
					t.publisher = self.packages[t.result].publisher;
				} else {
					t.description = "未知的版本:" + lp[i].packageName + " - " + lp[i].versionName;
				}
				if (canCustomize && NeteaseAdapter.mcPackage == t.result) {
					t.text += NeteaseAdapter.autoSelect ? " (自动选择)" : " (当前选择)";
				}
				r.push(t);
			}
			if (canCustomize) {
				r.unshift({
					text: "自动选择",
					description: NeteaseAdapter.autoSelect ? "启用中" : "未启用",
					auto: true
				});
				r.push({
					text: "自定义",
					description: NeteaseAdapter.mcPublisher == "Custom" ? "正在使用版本: " + NeteaseAdapter.mcVersion : "未启用",
					custom: true
				});
			}
			if (o.cancelled) return;
			if (r.length > 0) {
				Common.showListChooser(r, function (id) {
					var res = r[id];
					if (res.auto) {
						callback(null, null);
					} else if (res.custom) {
						NeteaseAdapter.askCustomVersion(function (v) {
							callback(v, "Custom");
						});
					} else if (res.publisher) {
						callback(String(res.result), res.publisher);
					} else {
						NeteaseAdapter.askPublisher(function (pub) {
							callback(String(res.result), pub);
						});
						Common.toast("请选择对应的发行商");
					}
				});
			} else {
				Common.toast("找不到可用的Minecraft版本");
			}
		}, true);
	},
	askPublisher: function (callback) {
		var r = [{
			text: "Minecraft",
			description: "国际版",
			result: "Mojang"
		}, {
			text: "我的世界",
			description: "网易版",
			result: "Netease"
		}, {
			text: "其他版本",
			result: "unknown"
		}];
		Common.showListChooser(r, function (id) {
			callback(r[id].result);
		});
	},
	switchVersion: function (callback) {
		if (MapScript.host == "BlockLauncher") {
			Common.toast("您正在使用启动器加载本JS，因此不能切换版本");
			return;
		}
		this.askPackage(function (name, publisher) {
			CA.settings.mcPackName = name;
			CA.settings.mcPublisher = publisher;
			NeteaseAdapter.mcVersion = null;
			callback();
		}, true);
	},
	askCustomVersion: function (callback) {
		Common.showInputDialog({
			title: "自定义版本",
			callback: function (s) {
				callback(s);
			},
			singleLine: true,
			defaultValue: getMinecraftVersion()
		});
	},
	compareVersion: function (a, b) {
		var n, i, p1, p2;
		n = Math.max(a.length, b.length);
		for (i = 0; i < n; i++) {
			p1 = isNaN(a[i]) ? -1 : parseInt(a[i]); p2 = isNaN(b[i]) ? -1 : parseInt(b[i]);
			if (p1 < p2) {
				return -1;
			} else if (p1 > p2) {
				return 1;
			}
		}
		return 0;
	},
	packNames: [
		"com.mojang.minecraftpe",
		"com.netease.x19",
		"com.netease.mc.aligames",
		"com.netease.mc.bili",
		"com.netease.mc.baidu",
		"com.tencent.tmgp.wdsj666",
		"com.netease.mc.m4399",
		"com.netease.mc.wdsj.yyxx.yyh",
		"com.netease.mc.qihoo",
		"com.netease.wdsj.yyxx.mzw",
		"com.netease.wdsj.yyxx.downjoy",
		"com.netease.wdsj.yyxx.sougou",
		"com.netease.mc.mi",
		"com.netease.mc.huawei",
		"com.netease.mc.vivo",
		"com.netease.mc.nearme.gamecenter",
		"com.netease.mc.lenovo",
		"com.netease.mc.coolpad",
		"com.netease.mc.am",
		"com.netease.mctest",
		"com.zhekasmirnov.innercore"
	],
	packages: {
		"com.mojang.minecraftpe": {
			desc: "国际版",
			publisher: "Mojang"
		},
		"com.netease.x19": {
			desc: "网易-官方版",
			publisher: "Netease"
		},
		"com.netease.mc.aligames": {
			desc: "网易-阿里游戏版",
			publisher: "Netease"
		},
		"com.netease.mc.bili": {
			desc: "网易-Bilibili游戏版",
			publisher: "Netease"
		},
		"com.netease.mc.baidu": {
			desc: "网易-百度手机助手版",
			publisher: "Netease"
		},
		"com.tencent.tmgp.wdsj666": {
			desc: "网易-腾讯应用宝版",
			publisher: "Netease"
		},
		"com.netease.mc.m4399": {
			desc: "网易-4399游戏盒版",
			publisher: "Netease"
		},
		"com.netease.mc.wdsj.yyxx.yyh": {
			desc: "网易-应用汇版",
			publisher: "Netease"
		},
		"com.netease.mc.qihoo": {
			desc: "网易-360手机助手版",
			publisher: "Netease"
		},
		"com.netease.wdsj.yyxx.mzw": {
			desc: "网易-拇指玩版",
			publisher: "Netease"
		},
		"com.netease.wdsj.yyxx.downjoy": {
			desc: "网易-当乐版",
			publisher: "Netease"
		},
		"com.netease.wdsj.yyxx.sougou": {
			desc: "网易-搜狗应用商店版",
			publisher: "Netease"
		},
		"com.netease.mc.mi": {
			desc: "网易-小米应用商店版",
			publisher: "Netease"
		},
		"com.netease.mc.huawei": {
			desc: "网易-华为应用商店版",
			publisher: "Netease"
		},
		"com.netease.mc.vivo": {
			desc: "网易-vivo应用商店版",
			publisher: "Netease"
		},
		"com.netease.mc.nearme.gamecenter": {
			desc: "网易-OPPO应用商店版",
			publisher: "Netease"
		},
		"com.netease.mc.lenovo": {
			desc: "网易-乐商店版",
			publisher: "Netease"
		},
		"com.netease.mc.coolpad": {
			desc: "网易-酷派应用商店版",
			publisher: "Netease"
		},
		"com.netease.mc.am": {
			desc: "网易-金立应用商店版",
			publisher: "Netease"
		},
		"com.netease.mctest": {
			desc: "网易-测试版",
			publisher: "Netease"
		},
		//待补，在此感谢@风铃物语 与 @绿叶 的帮助
		"com.zhekasmirnov.innercore": {
			desc: "Inner Core",
			publisher: "innercore"
		}
	}
});