MapScript.loadModule("SettingsCompat", {
	// 原作者 czy1121
	// 使用开源协议：Apache License, Version 2.0
	// https://github.com/czy1121/settingscompat
	// 原代码类型：Java/Android
	// 现代码类型：JavaScript/Rhino/Android
	// 由 ProjectXero (@XeroAlpha) 翻译，有改动

	SYSVER : android.os.Build.VERSION.SDK_INT,
	ensureCanFloat : function(silent) {
		if (this.canDrawOverlays()) {
			return true;
		}
		if (this.setDrawOverlays(true)) {
			return true;
		}
		if (!silent) {
			G.ui(function() {try {
				G.Toast.makeText(ctx, "系统不允许命令助手显示悬浮窗，请在设置中启用", 1).show();
			} catch(e) {erp(e)}});
			this.manageDrawOverlays();
		}
		return false;
	},
	showAppSettings : function() {
		var localIntent = new android.content.Intent();
		localIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
		if (this.SYSVER >= 9) {
			localIntent.setAction("android.settings.APPLICATION_DETAILS_SETTINGS");
			localIntent.setData(android.net.Uri.fromParts("package", ctx.getPackageName(), null));
		} else {
			localIntent.setAction(android.content.Intent.ACTION_VIEW);
			localIntent.setClassName("com.android.settings", "com.android.settings.InstalledAppDetails");
			localIntent.putExtra("com.android.settings.ApplicationPkgName", ctx.getPackageName());
		}
		this.startSafely(localIntent);
	},
	canDrawOverlays : function() {
		if (this.SYSVER >= 23) { //Android M (6.0)
			return android.provider.Settings.canDrawOverlays(ctx);
		} else if (this.SYSVER >= 18) { //Android Jelly Bean (4.3.x)
			return this.checkOp(ctx, 24); //OP_SYSTEM_ALERT_WINDOW
		} else {
			return true;
		}
	},
	setDrawOverlays : function(allowed) {
		return this.setMode(ctx, 24, allowed);
	},
	checkOp : function(ctx, op) {
		try {
			return ctx.getSystemService("appops").checkOp(op, android.os.Binder.getCallingUid(), ctx.getPackageName()) == 0; //MODE_ALLOWED
		} catch(e) {Log.e(e)}
		return false;
	},
	setMode : function(ctx, op, allowed) {
		if (this.SYSVER < 18 || this.SYSVER >= 21) { // Android L (5.0)
			return false;
		}
		try {
			ctx.getSystemService("appops").setMode(op, android.os.Binder.getCallingUid(), ctx.getPackageName(), allowed);
			return true;
		} catch(e) {Log.e(e)}
		return false;
	},
	manageDrawOverlays : function() {
		if (this.SYSVER >= 18) {
			if (this.manageDrawOverlaysForRom()) {
				return;
			}
		}
		if (this.SYSVER >= 23) {
			var intent = new android.content.Intent(android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
			intent.setData(android.net.Uri.parse("package:" + ctx.getPackageName()));
			intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
			if (this.startSafely(intent)) {
				return;
			}
		}
		this.showAppSettings();
	},
	manageDrawOverlaysForRom : function() {
		if (this.rom in this.ShowManager) {
			return this.ShowManager[this.rom].call(this);
		}
		return false;
	},
	startSafely : function(intent) {
		try {
			if (ctx.getPackageManager().queryIntentActivities(intent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY).size() > 0) {
				intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
				ctx.startActivity(intent);
				return true;
			}
		} catch(e) {Log.e(e)}
		return false;
	},
	ShowManager : {
		"MIUI" : function() {
			var intent = new android.content.Intent("miui.intent.action.APP_PERM_EDITOR");
			intent.putExtra("extra_pkgname", ctx.getPackageName());
			intent.setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.AppPermissionsEditorActivity");
			if (this.startSafely(intent)) {
				return true;
			}
			intent.setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity");
			if (this.startSafely(intent)) {
				return true;
			}
			if (this.SYSVER < 21) {
				intent = new android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
				intent.setData(android.net.Uri.fromParts("package", ctx.getPackageName(), null));
				return this.startSafely(intent);
			}
			return false;
		},
		"EMUI" : function() {
			const HUAWEI_PACKAGE = "com.huawei.systemmanager";
			var intent = new android.content.Intent();
			if (this.SYSVER >= 21) {
				intent.setClassName(HUAWEI_PACKAGE, "com.huawei.systemmanager.addviewmonitor.AddViewMonitorActivity");
				if (this.startSafely(intent)) {
					return true;
				}
			}
			intent.setClassName(HUAWEI_PACKAGE, "com.huawei.notificationmanager.ui.NotificationManagmentActivity");
			intent.putExtra("showTabsNumber", 1);
			if (this.startSafely(intent)) {
				return true;
			}
			intent.setClassName(HUAWEI_PACKAGE, "com.huawei.permissionmanager.ui.MainActivity");
			if (this.startSafely(intent)) {
				return true;
			}
			return false;
		},
		"OPPO" : function() {
			var intent = new android.content.Intent();
			intent.putExtra("packageName", ctx.getPackageName());
			intent.setAction("com.oppo.safe");
			intent.setClassName("com.oppo.safe", "com.oppo.safe.permission.floatwindow.FloatWindowListActivity");
			if (this.startSafely(intent)) {
				return true;
			}
			intent.setAction("com.color.safecenter");
			intent.setClassName("com.color.safecenter", "com.color.safecenter.permission.floatwindow.FloatWindowListActivity");
			if (this.startSafely(intent)) {
				return true;
			}
			intent.setAction("com.coloros.safecenter");
			intent.setClassName("com.coloros.safecenter", "com.coloros.safecenter.sysfloatwindow.FloatWindowListActivity");
			return this.startSafely(intent);
		},
		"VIVO" : function() {
			// 不支持直接到达悬浮窗设置页，只能到 i管家 首页
			var intent = new android.content.Intent("com.iqoo.secure");
			intent.setClassName("com.iqoo.secure", "com.iqoo.secure.MainActivity");
			return this.startSafely(intent);
		},
		"SMARTISAN" : function() {
			if (this.SYSVER >= 23) {
				return false;
			}
			var intent;
			if (this.SYSVER >= 21) {
				intent = new android.content.Intent("com.smartisanos.security.action.SWITCHED_PERMISSIONS_NEW");
				intent.setClassName("com.smartisanos.security", "com.smartisanos.security.SwitchedPermissions");
				intent.putExtra("index", 17); // 不同版本会不一样
				return this.startSafely(intent);
			} else {
				intent = new android.content.Intent("com.smartisanos.security.action.SWITCHED_PERMISSIONS");
				intent.setClassName("com.smartisanos.security", "com.smartisanos.security.SwitchedPermissions");
				var b = new android.os.Bundle();
				b.putStringArray("permission", [android.Manifest.permission.SYSTEM_ALERT_WINDOW]);
				//intent.putExtra("permission", new String[]{Manifest.permission.SYSTEM_ALERT_WINDOW});
				intent.putExtras(b);
				return this.startSafely(intent);
			}
		},
		"FLYME" : function() {
			var intent = new android.content.Intent("com.meizu.safe.security.SHOW_APPSEC");
			intent.setClassName("com.meizu.safe", "com.meizu.safe.security.AppSecActivity");
			intent.putExtra("packageName", ctx.getPackageName());
			return this.startSafely(intent);
		},
		"QIKU" : function() {
			return this.ShowManager["360"].call(this);
		},
		"360" : function() {
			var intent = new android.content.Intent();
			intent.setClassName("com.android.settings", "com.android.settings.Settings$OverlaySettingsActivity");
			if (this.startSafely(intent)) {
				return true;
			}
			intent.setClassName("com.qihoo360.mobilesafe", "com.qihoo360.mobilesafe.ui.index.AppEnterActivity");
			return this.startSafely(intent);
		}
	},
	RomCheck : {
		"MIUI" : function() {
			return this.getProp("ro.miui.ui.version.name");
		},
		"EMUI" : function() {
			return this.getProp("ro.build.version.emui");
		},
		"OPPO" : function() {
			return this.getProp("ro.build.version.opporom");
		},
		"VIVO" : function() {
			return this.getProp("ro.vivo.os.version");
		},
		"SMARTISAN" : function() {
			return this.getProp("ro.smartisan.version");
		},
		"FLYME" : function() {
			var r = android.os.Build.DISPLAY;
			return r.contains("FLYME") ? r : null;
		}
	},
	onCreate : function() {
		var self = this;
		this.rom = android.os.Build.MANUFACTURER.toUpperCase();
		this.version = "unknown";
		var result = Threads.awaitDefault(function() {try {
			var i, t;
			for (i in self.RomCheck) {
				if (t = self.RomCheck[i].call(self)) {
					return {
						rom : i,
						version : t
					};
				}
			}
		} catch(e) {Log.e(e)}}, 150, null);
		if (result) {
			this.rom = result.rom;
			this.version = result.version;
		}
	},
	getProp : function(key) {
		var ln = null, is = null;
		try {
			var p = java.lang.Runtime.getRuntime().exec("getprop " + key);
			is = new java.io.BufferedReader(new java.io.InputStreamReader(p.getInputStream()), 1024);
			ln = is.readLine();
		} catch(e) {Log.e(e)}
		if (is != null) {
			try {
				is.close();
			} catch(e) {Log.e(e)}
		}
		return ln ? String(ln) : null;
	}
});