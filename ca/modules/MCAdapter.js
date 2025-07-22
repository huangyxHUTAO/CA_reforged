MapScript.loadModule("MCAdapter", {
	targetVersion : 2,
	bundle : null,
	updateListener : {},
	ticker : 0,
	wsdata : {},
	onCreate : function() {
		if (MapScript.host == "Android") {
			this.getInfo = this.getInfo_Android;
			this.available = this.available_Android;
		} else if (MapScript.host == "BlockLauncher") {
			this.getInfo = this.getInfo_ModPE;
			this.available = this.available_ModPE;
		}
	},
	initialize : function() {
		this.asked = CA.settings.neverAskAdapter;
	},
	inLevel : false,
	newLevel : function() {
		this.inLevel = true;
	},
	leaveGame : function() {
		this.inLevel = false;
	},
	modTick : function self() {
		if (--this.ticker > 0) return;
		this.notifyInfoUpdate();
		this.ticker = 5;
	},
	getInfo_Android : function(id) {
		if (this.available_Adapter()) return this.getInfo_Adapter(id);
		return this.getInfo_WSServer(id);
	},
	available_Android : function() {
		return this.available_Adapter() || this.available_WSServer();
	},
	getInfo_ModPE : function(id) {
		var p, b;
		try {
			switch (id) {
				case "playernames":
				return Server.getAllPlayerNames();
				case "playerposition":
				return [Player.getX(), Player.getY(), Player.getZ()];
				case "playerrotation":
				p = Player.getEntity();
				return [Entity.getPitch(p), Entity.getYaw(p)];
				case "pointedblockpos":
				return [Player.getPointedBlockX(), Player.getPointedBlockY(), Player.getPointedBlockZ()];
				case "pointedblockinfo":
				return [Player.getPointedBlockId(), Player.getPointedBlockData(), Player.getPointedBlockSide()];
				case "levelbiome":
				return String(Level.biomeIdToName(b) + "(" + b + ")");
				case "levelbrightness":
				return Level.getBrightness(Player.getX(), Player.getY(), Player.getZ());
				case "leveltime":
				return Level.getTime();
			}
		} catch(e) {erp(e, true)}
		return null;
	},
	available_ModPE : function() {
		return this.inLevel;
	},
	getInfo_Adapter : function(id) {
		if (!this.bundle || !this.bundle.containsKey(id)) return null;
		return this.bundle.get(id);
	},
	available_Adapter : function() {
		if (this.bundle != null) return true;
		return false;
	},
	getInfo_WSServer: function(id) {
		switch (id) {
			case "playernames":
			return [];
			case "playerposition":
			return this.wsdata.playerpos || [0, 0, 0];
			case "playerrotation":
			return [0, 0];
			case "pointedblockpos":
			return [0, 0, 0];
			case "pointedblockinfo":
			return [0, 0, 0];
			case "levelbiome":
			return "Unreachable";
			case "levelbrightness":
			return 0;
			case "leveltime":
			return 0;
		}
	},
	available_WSServer: function() {
		return WSServer.isConnected();
	},
	getInfo : function(id) {
		return null;
	},
	available : function() {
		return false;
	},
	updateInfo : function(data) {
		var i;
		this.bundle = data;
		this.notifyInfoUpdate();
	},
	notifyInfoUpdate : function() {
		try {
			for (i in this.updateListener) this.updateListener[i]();
		} catch(e) {erp(e, true)}
	},
	callHook : function(name, args) {
		if (name in MapScript.global) {
			MapScript.global[name].apply(null, args);
		}
	},
	applySense : function(t) {
		if (MapScript.host != "Android" || this.asked) return;
		if (!t.input) t.input = [];
		if (!t.menu) t.menu = {};
		t.input.push("（加载适配器以显示更多游戏相关信息……）");
		t.menu["（加载适配器以显示更多游戏相关信息……）"] = function() {
			MCAdapter.listAdapters();
		};
	},
	initWSServer : function() {
		WSServer.subscribeEvent("PlayerTravelled", function(json) {
			MCAdapter.onWSPlayerTravelled(json);
			MCAdapter.notifyInfoUpdate();
		});
	},
	distance : function(dx, dy, dz) {
		return Math.sqrt(dx * dx + dy * dy + dz * dz);
	},
	onWSPlayerTravelled : function(json) {
		var obj = json.measurements, x, y, z, d, o = this.wsdata.playerpos;
		x = obj.PosAvgX; y = obj.PosAvgY; z = obj.PosAvgZ;
		if (o) {
			d = obj.MetersTravelled / this.distance(x - o[0], y - o[1], z - o[2]);
			x += (x - o[0]) * d;
			y += (y - o[1]) * d;
			z += (z - o[2]) * d;
		} else {
			this.wsdata.playerpos = o = [];
		}
		o[0] = x; o[1] = y; o[2] = z;
	},
	askShortcut : function(name, pkg) {
		var z = {
			title : "是否创建快捷方式？",
			description : "需要给予对应权限",
			canSkip : true,
			skip : function(f) {
				CA.settings.neverAskShortcut = Boolean(f);
			},
			callback : function(id) {
				if (CA.settings.neverAskShortcut) {
					CA.settings.needShortcut = parseInt(id);
				}
				if (id == 0) {
					MCAdapter.createShortcut(name, pkg);
				}
			}
		};
		if (CA.settings.neverAskShortcut) z.callback(CA.settings.needShortcut);
	},
	createShortcut : function(name, pkg) {
		var sc = new android.content.Intent(ScriptInterface.ACTION_START_FROM_SHORTCUT);
		sc.setClassName("com.huangyx.ca", "com.huangyx.ca.MainActivity");
		sc.setData(android.net.Uri.fromParts("package", pkg, null));
		AndroidBridge.createShortcut(sc, name, com.huangyx.ca.R.mipmap.icon_small);
	},
	adapters : [{
		text : "ModPE适配器（通用）",
		description : "适用于BlockLauncher/BlockLauncher PRO",
		callback : function() {
			var f = new java.io.File(ctx.getExternalFilesDir(null), "ModPE适配器.js");
			var i = new android.content.Intent("net.zhuoweizhang.mcpelauncher.action.IMPORT_SCRIPT");
			if (this.existPackage("net.zhuoweizhang.mcpelauncher.pro")) {
				i.setClassName("net.zhuoweizhang.mcpelauncher.pro", "net.zhuoweizhang.mcpelauncher.api.ImportScriptActivity");
			} else if (this.existPackage("net.zhuoweizhang.mcpelauncher")) {
				i.setClassName("net.zhuoweizhang.mcpelauncher", "net.zhuoweizhang.mcpelauncher.api.ImportScriptActivity");
			} else {
				Common.toast("未找到BlockLauncher/BlockLauncher PRO");
				return;
			}
			try {
				this.unpackAssets("adapter/ModPE.js", f);
			} catch(e) {
				Log.e(e);
				return Common.toast("释放适配器失败\n" + e);
			}
			i.setDataAndType(AndroidBridge.fileToUri(f), "application/x-javascript");
			i.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION | android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION | android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
			if (!SettingsCompat.startSafely(i)) return Common.toast("导入适配器失败");
			this.askShortcut("BlockLauncher", i.getComponent().getPackageName());
		}
	}, {
		text : "ModPE适配器（盒子专版）",
		description : "适用于多玩我的世界盒子",
		callback : function() {
			var f = new java.io.File(ctx.getExternalFilesDir(null), "多玩我的世界盒子适配器.js");
			var i = new android.content.Intent(android.content.Intent.ACTION_VIEW);
			if (this.existPackage("com.duowan.groundhog.mctools")) {
				i.setClassName("com.duowan.groundhog.mctools", "com.duowan.groundhog.mctools.activity.plug.PluginOutsideImportActivity");
			} else {
				Common.toast("未找到多玩我的世界盒子");
				return;
			}
			try {
				this.unpackAssets("adapter/ModPE_Sandbox.js", f);
			} catch(e) {
				Log.e(e);
				return Common.toast("释放适配器失败\n" + e);
			}
			i.setDataAndType(AndroidBridge.fileToUri(f), "application/x-javascript");
			i.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION | android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION | android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
			if (!SettingsCompat.startSafely(i)) return Common.toast("导入适配器失败");
			this.askShortcut("多玩我的世界盒子", i.getComponent().getPackageName());
			Common.showTextDialog("因为多玩我的世界盒子采用了沙盒机制，该适配器可能无法与本体连接。");
		}
	}, {
		text : "InnerCore适配器",
		description : "旧版 | 适用于Inner Core",
		callback : function() {
			var ver = this.getPackageVersion("com.zhekasmirnov.innercore");
			if (ver > 10) { //这个数字我瞎编的，反正介于1～25之间就好
				var f = new java.io.File(ctx.getExternalFilesDir(null), "InnerCore适配器.icmod");
				var i = new android.content.Intent(android.content.Intent.ACTION_VIEW);
				i.setClassName("com.zhekasmirnov.innercore", "zhekasmirnov.launcher.core.ExtractModActivity");
				this.unpackAssets("adapter/InnerCore.icmod", f);
				i.setDataAndType(AndroidBridge.fileToUri(f), "application/icmod");
				i.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION | android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION | android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
				if (!SettingsCompat.startSafely(i)) return Common.toast("导入适配器失败");
			} else if (!isNaN(ver)) {
				var fs = [
					"main.js",
					"mod.info",
					"launcher.js",
					"build.config",
					"mod_icon.png"
				], i;
				try {
					new java.io.File("/sdcard/games/com.mojang/mods/ICAdpt").mkdirs();
					for (i in fs) {
						this.unpackAssets("adapter/ICAdpt/" + fs[i], "/sdcard/games/com.mojang/mods/ICAdpt/" + fs[i]);
					}
				} catch(e) {
					Log.e(e);
					return Common.toast("释放适配器失败\n" + e);
				}
				Common.toast("Mod文件已释放");
			} else {
				Common.toast("未找到InnerCore");
				return;
			}
			this.askShortcut("Inner Core", "com.zhekasmirnov.innercore");
		}
	}],
	listAdapters : function() {
		var self = this;
		Common.showListChooser(this.adapters, function(id) {
			self.adapters[id].callback.call(self);
		});
		Common.toast("请选择系统适用的适配器");
	},
	unpackAssets : function(fn, path) {
		const BUFFER_SIZE = 8192;
		var is, os, buf, hr;
		is = ctx.getAssets().open(fn);
		(new java.io.File(path)).getParentFile().mkdirs();
		os = new java.io.FileOutputStream(path);
		buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, BUFFER_SIZE);
		while ((hr = is.read(buf)) > 0) os.write(buf, 0, hr);
		is.close();
		os.close();
	},
	viewFile : function(path, mime) {
		var intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
		intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
		intent.addCategory(android.content.Intent.CATEGORY_DEFAULT);
		intent.setDataAndType(android.net.Uri.parse("file://" + path), mime);
		AndroidBridge.startActivity(intent);
	},
	existPackage : function(pkg) {
		try {
			if (ctx.getPackageManager().getPackageInfo(pkg, 0)) return true;
		} catch(e) {
			if (!(e.javaException instanceof android.content.pm.PackageManager.NameNotFoundException)) {
				Log.e(e);
			}
		}
		return false;
	},
	askShortcut : function(name, pkg) {
		var z = {
			title : "是否创建快捷方式？",
			description : "需要给予对应权限",
			canSkip : false,
			skip : function(f) {
				CA.settings.neverAskShortcut = Boolean(f);
				CA.trySave();
			},
			callback : function(id) {
				if (CA.settings.neverAskShortcut) {
					CA.settings.needShortcut = parseInt(id);
				}
				if (id == 0) {
					MCAdapter.createShortcut(name, pkg);
				}
			}
		};
		if (CA.settings.neverAskShortcut) {
			z.callback(CA.settings.needShortcut);
		} else {
			Common.showConfirmDialog(z);
		}
	},
	getPackageVersion : function(pkg) {
		try {
			return ctx.getPackageManager().getPackageInfo(pkg, 0).versionCode;
		} catch(e) {Log.e(e)}
		return NaN;
	}
});