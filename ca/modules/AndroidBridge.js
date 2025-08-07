
MapScript.loadModule("AndroidBridge", {
	intentCallback: {},
	permissionRequestData: { start: 0, end: 0 },
	permissionCallback: { length: 0 },
	foregroundTask: {},
	onCreate: function () {
		G.ui(this.initIcon);
	},
	initialize: function () {
		try {
			if (MapScript.host != "Android") return;
			if (CA.RELEASE) gHandler.post(this.verifyApk);
			ScriptInterface.setBridge({
				applyIntent: function (intent) {
					try {
						AndroidBridge.callHide();
						return true;
					} catch (e) { erp(e) }
				},
				onAccessibilitySvcCreate: function () {
					try {
						AndroidBridge.notifySettings();
					} catch (e) { erp(e) }
				},
				onAccessibilitySvcDestroy: function () {
					try {
						AndroidBridge.notifySettings();
					} catch (e) { erp(e) }
				},
				onActivityResult: function (requestCode, resultCode, data) {
					try {
						var cb = AndroidBridge.intentCallback[requestCode];
						if (!cb) return;
						PopupPage.show();
						delete AndroidBridge.intentCallback[requestCode];
						cb(resultCode, data);
					} catch (e) { erp(e) }
				},
				onBeginPermissionRequest: function (activity) {
					try {
						return AndroidBridge.onBeginPermissionRequest(activity);
					} catch (e) { erp(e) }
				},
				onBeginForegroundTask: function (activity, intent) {
					try {
						return AndroidBridge.onBeginForegroundTask(activity, intent);
					} catch (e) { erp(e) }
				},
				onKeyEvent: function (e) {
					try {
						if (e.getAction() == e.ACTION_DOWN) {
							var k = e.getKeyCode();
							if (k == e.KEYCODE_HOME || k == e.KEYCODE_MENU || k == e.KEYCODE_ENDCALL || k == e.KEYCODE_POWER || k == e.KEYCODE_NOTIFICATION) {
								AndroidBridge.callHide();
							}
						}
					} catch (e) { erp(e) }
				},
				onNewIntent: function (intent) {
					try {
						AndroidBridge.onNewIntent(intent, false);
					} catch (e) { erp(e) }
				},
				onRemoteEnabled: function () {
					try {
						Common.toast("正在连接至Minecraft适配器……/\n等待游戏数据传输……");
					} catch (e) { erp(e) }
				},
				onRemoteMessage: function (msg) {
					try {
						if (msg.what != 1) return;
						var data = msg.getData();
						if (data.getString("action") != "init" && !MCAdapter.client) {
							var msg2;
							if (msg.reply) { // 防止其他App误发消息被识别为适配器消息
								msg2 = android.os.Message.obtain();
								msg2.what = 2;
								msg.replyTo.send(msg2);
							}
							return;
						}
						switch (String(data.getString("action"))) {
							case "init":
								MCAdapter.client = msg.replyTo;
								MCAdapter.connInit = true;
								MCAdapter.version = data.getInt("version", 0);
								AndroidBridge.notifySettings();
								Common.toast("已连接至Minecraft适配器，终端：" + data.getString("platform") + "\n" + (MCAdapter.targetVersion > MCAdapter.version ? "此适配器版本较旧，可能不支持部分提示，请在设置中重新加载适配器" : "当前适配器为最新版本"));
								break;
							case "info":
								MCAdapter.updateInfo(data.getBundle("info"));
								break;
							case "event":
								try {
									MCAdapter.callHook(data.getString("name"), JSON.parse(data.getString("param")));
								} catch (e) { erp(e, true) }
								break;
							case "resetMCV":
								NeteaseAdapter.mcVersion = String(data.getString("version"));
								Common.toast("正在切换拓展包版本，请稍候……");
								CA.checkFeatures();
								CA.Library.initLibrary(function (flag) {
									if (flag) {
										Common.toast("拓展包加载完毕");
									} else {
										Common.toast("有至少1个拓展包无法加载，请在设置中查看详情");
									}
								});
						}
					} catch (e) { erp(e) }
				},
				onRemoteDisabled: function () {
					try {
						Common.toast("已断开至Minecraft适配器的连接");
						MCAdapter.bundle = null;
						MCAdapter.client = null;
						MCAdapter.connInit = false;
						AndroidBridge.notifySettings();
					} catch (e) { erp(e) }
				},
				onTileReady: function (config) {
					try {
						var tile = AndroidBridge.getTileService();
						if (!tile.initialized) {
							if (tile.service.initTile) {
								tile.service.initTile(tile.data, config, tile.context);
							}
							tile.initialized = true;
						}
						if (tile.service.updateTile) {
							tile.service.updateTile(tile.data, config, tile.context);
						}
					} catch (e) { erp(e) }
				},
				onTileClick: function (config) {
					try {
						var tile = AndroidBridge.getTileService();
						if (tile.service.onTileClick) {
							tile.service.onTileClick(tile.data, config, tile.context);
						}
					} catch (e) { erp(e) }
				}
			});
			this.onNewIntent(ScriptInterface.getIntent(), true);
			if (CA.settings.autoStartAccSvcRoot) this.startAccessibilitySvcByRootAsync(null, true);
			if (CA.settings.startWSSOnStart) WSServer.start(true);
			if (G.shouldFloat) this.showActivityContent(G.supportFloat);
			if (!CA.settings.permissionChecked) {
				this.checkNecessaryPermissionsSync();
				CA.settings.permissionChecked = true;
			}
			if (G.supportFloat) AndroidBridge.exitLoading(!CA.settings.hideRecent);
		} catch (e) { erp(e) }
	},
	onNewIntent: function (intent, startByIntent) {
		function onReturn() {
			if (!CA.trySave()) return;
			if (startByIntent) {
				//CA.performExit();
			}
		}
		var t;
		if (!intent) return;
		switch (intent.getAction()) {
			case ScriptInterface.ACTION_ADD_LIBRARY:
				t = intent.getData();
				if (!t) {
					Common.toast("无法读取拓展包");
					break;
				}
				Common.showConfirmDialog({
					title: "确定加载拓展包“" + ExternalStorage.uriToName(t) + "”？",
					callback: function (id) {
						if (id != 0) return onReturn();
						const importFile = ExternalStorage.importFile(t, "caclib/*/**");
						try {
							CA.Library.enableLibrary(String(ExternalStorage.toUri(importFile)));
							CA.Library.initLibrary(function () {
								Common.toast("导入成功！");
								CA.showLibraryMan(onReturn);
							});
						} catch (e) {
							Log.e(e);
							Common.toast("无法导入该拓展包\n" + e);
							return CA.showLibraryMan(onReturn);
						}
					},
					// onDismiss: function () {
					// 	ctx.revokeUriPermission(ctx.getPackageName(), t);
					// }

					// 在低版本 Android 上调用双参数
					// 修复方法签名不匹配导致的崩溃
					onDismiss: function () {
						var flag = android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION;
						var sdk = android.os.Build.VERSION.SDK_INT;

						if (sdk >= 24) {
							ctx.revokeUriPermission(ctx.getPackageName(), t, flag);
						} else {
							ctx.revokeUriPermission(t, flag);
						}
					}
				});
				break;
			case ScriptInterface.ACTION_EDIT_COMMAND:
				t = intent.getExtras();
				t = t ? t.getString("text", "") : "";
				G.ui(function () {
					try {
						CA.showGen(true);
						CA.cmd.setText(t);
						CA.showGen.activate(false);
					} catch (e) { erp(e) }
				});
				break;
			case ScriptInterface.ACTION_START_FROM_SHORTCUT:
				if (!intent.getData()) break;
				t = ctx.getPackageManager().getLaunchIntentForPackage(intent.getData().getSchemeSpecificPart());
				if (t) {
					AndroidBridge.startActivity(t);
				}
				break;
			case ScriptInterface.ACTION_SCRIPT_ACTION:
				if (!startByIntent) AndroidBridge.scriptAction();
				break;
			case ScriptInterface.ACTION_URI_ACTION:
				AndroidBridge.openUriAction(intent.getData(), intent.getExtras());
				break;

			default:
				if (startByIntent && CA.settings.chainLaunch) {
					t = ctx.getPackageManager().getLaunchIntentForPackage(CA.settings.chainLaunch);
					if (t) {
						AndroidBridge.startActivity(t);
					}
				}
				if (!startByIntent) {
					CA.showIcon();
				}
		}
	},
	verifyApk: function () {
		if (ctx.getPackageName() != "com.huangyx.ca") throw new java.lang.SecurityException("101");
		AndroidBridge.verifySign();
		AndroidBridge.verifyContext();
		if (AndroidBridge.HOTFIX) return;
		AndroidBridge.verifyDex();
	},
	verifySign: function () {
		try {
			var sn = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), android.content.pm.PackageManager.GET_SIGNATURES).signatures, vc = [], i;
			var md = java.security.MessageDigest.getInstance("SHA-256");
			for (i in sn) {
				md.update(sn[i].toByteArray());
				vc.push(android.util.Base64.encodeToString(md.digest(), android.util.Base64.NO_WRAP));
			}
			if (vc.join("") != "5dENwvx/GM4gKvzgyY2ztYGrTUSFxZjVIsPOTgaVrmo=") throw 102;
		} catch (e) {
			Common.toast("未通过签名（社区版不阻止运行）" + vc.join(""));
			// Common.setClipboardText(vc.join(""))
			// throw new java.lang.SecurityException(String(e));
		}
	},
	verifyContext: function () {
		try {
			var cls = ctx.getApplicationContext().getClass();
			if (cls != com.huangyx.ca.XApplication) throw 104;
			if (this.findDeclaredMethodClass(cls, ["attachBaseContext", android.content.Context], android.app.Application)) throw 105;
			if (this.findDeclaredMethodClass(cls, ["onCreate"], android.app.Application) != com.huangyx.ca.XApplication) throw 106;
			/*cls = ctx.getClass();
			if (cls != com.huangyx.ca.MainActivity) throw 107;
			if (this.findDeclaredMethodClass(cls, ["attachBaseContext", android.content.Context], com.huangyx.ca.MainActivity)) throw 108;
			if (this.findDeclaredMethodClass(cls, ["onCreate", android.os.Bundle], com.huangyx.ca.MainActivity) != com.huangyx.ca.MainActivity) throw 109;*/
		} catch (e) {
			throw new java.lang.SecurityException(String(e));
		}
	},
	verifyDex: function () {
		return; // 跳过 dex 校验，兼容自编译/社区版
		var zf = new java.util.zip.ZipFile(ctx.getPackageCodePath());
		var e = zf.getEntry("classes.dex");
		if (java.lang.Long.toHexString(e.getCrc()) != "$dexCrc$") throw new java.lang.SecurityException("103");
	},
	findDeclaredMethodClass: function self(cls, params, parent) {
		try {
			var method = cls.getDeclaredMethod.apply(cls, params);
			return cls;
		} catch (e) {/*Class not found*/ }
		if (!parent) parent = java.lang.Object;
		if (cls == java.lang.Object || cls == parent) return null;
		return self(cls.getSuperclass(), params, parent);
	},
	callHide: function () {
		G.ui(function () {
			try {
				if (PopupPage.getCount() > 0) {
					PopupPage.hide();
				}
			} catch (e) { erp(e) }
		})
	},
	scriptAction: function () {
		CA.showActions(this.getKeeperMenu());
	},
	openUriAction: function (uri, extras) {
		if (!uri) return;
		var path, obj, query, fragment;
		path = uri.getPath();
		query = uri.getEncodedQuery();
		fragment = uri.getFragment();
		switch (String(uri.getHost()).toLowerCase()) {
			case "base":
				if (path) {
					obj = this.getBaseUriAction(String(path));
					if (obj) {
						obj(fragment ? String(fragment) : null, query ? this.getQueryKV(String(query)) : {}, extras);
					} else {
						Common.toast("未知的调用：" + path);
					}
				}
				break;
		}
	},
	getBaseUriAction: function (path) {
		var i, obj = this.uriActions, par;
		path = path.toLowerCase().replace(/^\//, "").split("/");
		for (i = 0; i < path.length; i++) {
			par = obj;
			obj = obj[path[i]];
			if (!obj) {
				obj = par.get ? par.get(path.slice(i)) : par instanceof Function ? par : par.default;
				break;
			}
		}
		if (typeof obj == "function") return obj;
		return null;
	},
	getQueryKV: function (query) {
		var r = {}, i, strs, t;
		strs = query.slice(t + 1).split("&");
		for (i in strs) {
			t = strs[i].indexOf("=");
			if (t >= 0) {
				r[strs[i].slice(0, t)] = unescape(strs[i].slice(t + 1));
			}
		}
		return r;
	},
	notifySettings: function () {
		G.ui(function () {
			try {
				if (Common.showSettings.refreshText) Common.showSettings.refreshText();
			} catch (e) { erp(e) }
		});
	},
	showSettings: function self(title) {
		if (!self.root) {
			var preference = ScriptInterface.getPreference();
			self.root = [{
				name: "管理无障碍服务",
				description: "用于支持粘贴命令以及一些其他操作",
				type: "custom",
				get: function () {
					return ScriptInterface.getAccessibilitySvc() != null ? "已启用" : "未启用";
				},
				onclick: function (fset) {
					try {
						ScriptInterface.goToAccessibilitySetting();
					} catch (e) {
						Common.toast("无法打开无障碍设置\n" + e);
					}
				}
			}, {
				name: "加载适配器……",
				description: "在输入命令时提供一些与游戏相关的信息",
				type: "custom",
				get: function () {
					return MCAdapter.connInit ? "已连接" : "未连接";
				},
				onclick: function (fset) {
					fset(this.get());
					MCAdapter.listAdapters();
				}
			}, {
				name: "连锁启动……",
				description: "设置启动命令助手时自动启动的应用",
				type: "custom",
				get: function () {
					var r = CA.settings.chainLaunch, ai;
					try {
						if (r) ai = ctx.getPackageManager().getApplicationInfo(r, 128);
					} catch (e) {/*App not found*/ }
					if (!ai) return "无";
					return ctx.getPackageManager().getApplicationLabel(ai);
				},
				onclick: function (fset) {
					var self = this;
					AndroidBridge.listLaunchableApp(function (pkg) {
						if (pkg == ctx.getPackageName()) {
							Common.toast("不能连锁启动自身！");
							return;
						}
						CA.settings.chainLaunch = pkg;
						fset(self.get());
					}, true);
				}
			}, {
				name: "WebSocket服务器",
				description: "实验性功能",
				type: "custom",
				get: function () {
					return WSServer.isAvailable() ? (WSServer.isConnected() ? "已连接" : "已启动") : "未启动";
				},
				onclick: function (fset) {
					if (WSServer.isConnected()) {
						WSServer.showConsole();
					} else if (WSServer.isAvailable()) {
						WSServer.howToUse();
					} else {
						WSServer.start();
					}
				}
			}, {
				name: "开机自动启动",
				description: "需要系统允许开机自启",
				type: "boolean",
				get: preference.getBootStart.bind(preference),
				set: preference.setBootStart.bind(preference)
			}, {
				name: "隐藏启动界面",
				type: "boolean",
				get: preference.getHideSplash.bind(preference),
				set: preference.setHideSplash.bind(preference)
			}, {
				name: "隐藏后台任务",
				type: "boolean",
				get: function () {
					if (AndroidBridge.shouldForceRemoveTask()) {
						return true;
					}
					return Boolean(CA.settings.hideRecent);
				},
				set: function (v) {
					if (AndroidBridge.shouldForceRemoveTask()) {
						Common.toast("您的设备不支持显示命令助手的后台任务");
						return;
					}
					CA.settings.hideRecent = Boolean(v);
					Common.toast("本项设置将在重启命令助手后应用");
				}
			}, {
				name: "自动启动无障碍服务",
				description: "需要Root",
				type: "boolean",
				get: function () {
					return Boolean(CA.settings.autoStartAccSvcRoot);
				},
				set: function (v) {
					CA.settings.autoStartAccSvcRoot = Boolean(v);
					if (v) {
						AndroidBridge.startAccessibilitySvcByRootAsync();
					}
				}
			}, {
				name: "隐藏“启用适配器”的提示",
				type: "boolean",
				get: function () {
					return Boolean(CA.settings.neverAskAdapter);
				},
				set: function (v) {
					CA.settings.neverAskAdapter = Boolean(v);
				}
			}, {
				name: "启动时自动启动WebSocket服务器",
				type: "boolean",
				get: function () {
					return Boolean(CA.settings.startWSSOnStart);
				},
				set: function (v) {
					CA.settings.startWSSOnStart = Boolean(v);
				}
			}, {
				name: "通知动作菜单",
				type: "custom",
				get: function () {
					return AndroidBridge.getKeeperMenu().length + "个动作";
				},
				onclick: function (fset) {
					CA.showActionEdit(AndroidBridge.getKeeperMenu(), fset, AndroidBridge.defaultKeeperMenu);
				}
			}, {
				name: "快捷设置开关",
				type: "custom",
				hidden: function () {
					return android.os.Build.VERSION.SDK_INT < 24;
				},
				get: function () {
					var tile = AndroidBridge.getTileService();
					return tile.service.name;
				},
				onclick: function (fset) {
					var tile = AndroidBridge.getTileService();
					AndroidBridge.showEditTile(tile.data, function (tileData) {
						CA.settings.qstile = tileData;
						tile.invalid = true;
						AndroidBridge.notifyTileUpdate();
						fset();
					});
				}
			}];
		}
		Common.showSettings(title, self.root);
	},
	getAppIcon: function () {
		var appi = ctx.getPackageManager().getApplicationInfo("com.huangyx.ca", 128);
		var res = ctx.getPackageManager().getResourcesForApplication(appi);
		if (android.os.Build.VERSION.SDK_INT >= 21) {
			return res.getDrawable(appi.icon, null);
		} else {
			return res.getDrawable(appi.icon);
		}
	},
	getAppIconBadged: function () {
		return ctx.getPackageManager().getApplicationIcon("com.huangyx.ca");
	},
	initIcon: function () {
		var logo, icon;
		try {
			icon = AndroidBridge.getAppIcon();
		} catch (e) {
			Log.e(e);
		}
		if (icon) {
			CA.Icon.default0 = CA.Icon.default;
			CA.Icon.default = function (size) {
				const w = 32 * G.dp * size;
				var bmp = G.Bitmap.createBitmap(w, w, G.Bitmap.Config.ARGB_8888);
				var cv = new G.Canvas(bmp);
				cv.scale(w / 256, w / 256);
				var pt = new G.Paint();
				pt.setAntiAlias(true);
				IntColor.Paint.setColor(pt, G.Color.BLACK);
				IntColor.Paint.setShadowLayer(pt, 16, 0, 0, G.Color.BLACK);
				var ph = new G.Path();
				ph.addCircle(128, 128, 112, G.Path.Direction.CW);
				cv.drawPath(ph, pt);
				cv.clipPath(ph);
				icon.setBounds(16, 16, 240, 240);
				icon.draw(cv);
				var frm = new G.FrameLayout(ctx);
				var view = new G.ImageView(ctx);
				view.setImageBitmap(bmp);
				view.setLayoutParams(new G.FrameLayout.LayoutParams(w, w));
				frm.addView(view);
				return frm;
			}
			return;
		}
		try {
			logo = AndroidBridge.getAppIconBadged();
		} catch (e) {
			Log.e(e);
		}
		if (logo) {
			CA.Icon.default0 = CA.Icon.default;
			CA.Icon.default = function (size) {
				var zp = G.dp * size;
				var frm = new G.FrameLayout(ctx);
				var view = new G.ImageView(ctx);
				view.setImageDrawable(logo);
				view.setLayoutParams(new G.FrameLayout.LayoutParams(32 * zp, 32 * zp));
				frm.addView(view);
				return frm;
			};
		}
	},
	listLaunchableApp: function (callback, includeCancel) {
		Common.showProgressDialog(function (o) {
			var pm = ctx.getPackageManager();
			o.setTextDelayed("正在加载列表……", 200);
			var lp = pm.getInstalledPackages(0).toArray();
			var i, r = [];
			if (includeCancel) {
				r.push({
					text: "取消选择",
					result: null
				});
			}
			for (i in lp) {
				if (!lp[i].applicationInfo) continue;
				if (!pm.getLaunchIntentForPackage(lp[i].packageName)) continue;
				r.push({
					text: pm.getApplicationLabel(lp[i].applicationInfo),
					description: lp[i].versionName,
					result: String(lp[i].packageName)
				});
			}
			o.close();
			if (o.cancelled) return;
			Common.showListChooser(r, function (id) {
				callback(r[id].result);
			});
		}, true);
	},
	listApp: function (callback) { // Deprecated
		this.listLaunchableApp(callback, true);
	},
	startActivity: function (intent) {
		try {
			if (ctx.getPackageManager().queryIntentActivities(intent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY).size() > 0) {
				intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
				ctx.startActivity(intent);
				return true;
			}
		} catch (e) {
			Log.e(e);
			Common.toast("打开外部应用失败，请检查您是否授予了命令助手后台弹出界面或类似的权限\n" + e);
		}
		return false;
	},
	startActivityForResult: function (intent, callback) {
		var i;
		for (i = 0; i < 65536; i++) {
			if (!(i in this.intentCallback)) break;
		}
		if (i >= 65536) {
			Common.toast("启动Intent失败：同时请求的Intent过多");
			return;
		}
		this.intentCallback[i] = callback;
		try {
			ScriptInterface.startActivityForResult(intent, i);
		} catch (e) {
			Log.e(e);
			Common.toast("调用外部应用失败，请检查您是否授予了命令助手后台弹出界面或类似的权限\n" + e);
		}
	},
	beginForegroundTask: function (name, callback) {
		if (this.foregroundTask[name]) return;
		this.foregroundTask[name] = callback;
		try {
			ScriptInterface.beginForegroundTask(new android.content.Intent("com.huangyx.ca.script.ForegroundScript")
				.putExtra("taskName", new java.lang.String(name)));
		} catch (e) {
			Log.e(e);
			Common.toast("无法切换至前台，请检查您是否授予了命令助手后台弹出界面或类似的权限\n" + e);
		}
	},
	onBeginForegroundTask: function (activity, intent) {
		var taskName = intent.getStringExtra("taskName");
		var task = this.foregroundTask[taskName], delegee;
		delete this.foregroundTask[taskName];
		if (task) {
			delegee = task(activity, intent);
			if (delegee) {
				activity.setDelegee(delegee);
			}
		}
	},
	requestPermissionsByGroup: function (groups, callback) {
		var result = {
			flag: true,
			success: [],
			denied: [],
			sync: true
		}, count = groups.length;
		groups.forEach(function (e) {
			AndroidBridge.requestPermissions(e.permissions, e.explanation, function (flag, success, denied, sync) {
				if (e.callback) e.callback(flag, success, denied, sync);
				count--;
				if (!flag) result.flag = false;
				if (success.length) result.success = result.success.concat(success);
				if (denied.length) result.denied = result.denied.concat(denied);
				if (!sync) result.sync = false;
				if (count <= 0 && callback) callback(result.flag, result.success, result.denied, result.sync);
			}, e.mode);
		});
		if (count == 0 && callback) callback(true, [], [], true);
	},
	requestPermissions: function (permissions, explanation, callback, mode) {
		var i, denied = []; //mode: 0-保留 1-建议拥有(默认) 2-可选拥有 3-仅检测
		for (i = 0; i < permissions.length; i++) {
			if (ScriptInterface.checkSelfPermission(permissions[i]) != 0) { // PERMISSION_GRANTED == 0
				denied.push(permissions[i]);
			}
		}
		if (denied.length && mode != 3) {
			this.permissionRequestData[this.permissionRequestData.end++] = ({
				permissions: denied,
				explanation: explanation,
				callback: callback,
				mode: mode
			});
			if (!this.permissionRequest) {
				try {
					ScriptInterface.beginPermissionRequest();
				} catch (e) {
					Log.e(e);
					Common.toast("打开授权界面失败，可能造成部分App功能无法使用，请检查您是否授予了命令助手后台弹出界面或类似的权限\n" + e);
				}
			}
		} else if (callback) {
			callback(true, permissions.slice(), [], true);
		}
		return denied.length;
	},
	onBeginPermissionRequest: function (activity) {
		var lastData, code = 0;
		this.permissionRequest = activity;
		lastData = this.permissionRequestData[this.permissionRequestData.start];
		if (this.permissionRequestData.start >= this.permissionRequestData.end) return activity.finish();
		this.doPermissionRequest(activity, lastData, code);
		activity.setCallback({
			onRequestPermissionsResult: function (activity, requestCode, permissions, grantResults) {
				try {
					var i, succeed = [], failed = [];
					if (code == requestCode && lastData) {
						for (i in grantResults) {
							if (grantResults[i] == 0) { // PERMISSION_GRANTED == 0
								succeed.push(String(permissions[i]));
							} else {
								failed.push(String(permissions[i]));
							}
						}
						lastData.showRationale = failed.every(function (e) {
							return activity.shouldShowRequestPermissionRationale(e);
						});
						if (!failed.length || lastData.mode == 2 || !lastData.showRationale) {
							delete AndroidBridge.permissionRequestData[AndroidBridge.permissionRequestData.start++];
							if (lastData.callback) lastData.callback(failed.length == 0, succeed, failed, false);
						}
					}
					lastData = AndroidBridge.permissionRequestData[AndroidBridge.permissionRequestData.start];
					if (AndroidBridge.permissionRequestData.start < AndroidBridge.permissionRequestData.end) {
						AndroidBridge.doPermissionRequest(activity, lastData, ++code);
					} else {
						activity.finish();
					}
				} catch (e) { erp(e) }
			},
			onEndPermissionRequest: function (activity) {
				AndroidBridge.permissionRequest = null;
			}
		});
	},
	doPermissionRequest: function (activity, data, code) {
		var msg = "命令助手需要申请" + data.permissions.length + "个权限。" + (data.explanation ? "\n" + data.explanation : "");
		if (data.showRationale) {
			new android.app.AlertDialog.Builder(activity)
				.setTitle("请求权限")
				.setCancelable(false)
				.setMessage(msg)
				.setPositiveButton("确定", new android.content.DialogInterface.OnClickListener({
					onClick: function (dia, w) {
						activity.requestPermissionsCompat(code, data.permissions);
					}
				})).show();
		} else if (data.explanation) {
			var handler = new android.os.Handler();
			var toast = android.widget.Toast.makeText(activity, msg, 0);
			toast.show();
			handler.postDelayed(function () {
				try {
					activity.requestPermissionsCompat(code, data.permissions);
				} catch (e) { erp(e) }
			}, 1500);
		} else {
			activity.requestPermissionsCompat(code, data.permissions);
		}
	},
	createPendingIntent: function (type, intent, flagList, requestCode) {
		let flags = 0;
		if (!Array.isArray(flagList)) flagList = [];
		if (isNaN(requestCode)) requestCode = 0;
		if (android.os.Build.VERSION.SDK_INT >= 23) {
			if (flagList.includes("mutable")) {
				if (android.os.Build.VERSION.SDK_INT >= 31) {
					flags |= android.app.PendingIntent.FLAG_MUTABLE;
				}
			} else {
				flags |= android.app.PendingIntent.FLAG_IMMUTABLE;
			}
		}
		if (flagList.includes("updateCurrent")) {
			flags |= android.app.PendingIntent.FLAG_UPDATE_CURRENT;
		} else if (flagList.includes("cancelCurrent")) {
			flags |= android.app.PendingIntent.FLAG_CANCEL_CURRENT;
		} else if (flagList.includes("noCreate")) {
			flags |= android.app.PendingIntent.FLAG_NO_CREATE;
		}
		if (flagList.includes("oneShot")) {
			flags |= android.app.PendingIntent.FLAG_ONE_SHOT;
		}
		if (type == "service" || type == "foregroundService") {
			if (android.os.Build.VERSION.SDK_INT > 26 && type == "foregroundService") {
				return android.app.PendingIntent.getForegroundService(ctx, requestCode, intent, flags);
			}
			return android.app.PendingIntent.getService(ctx, requestCode, intent, flags);
		}
		if (type == "broadcast") {
			return android.app.PendingIntent.getBroadcast(ctx, requestCode, intent, flags);
		}
		if (Array.isArray(intent)) {
			return android.app.PendingIntent.getActivities(ctx, requestCode, intent, flags);
		}
		return android.app.PendingIntent.getActivity(ctx, requestCode, intent, flags);
	},
	getABIs: function () {
		if (android.os.Build.VERSION.SDK_INT >= 21) {
			return android.os.Build.SUPPORTED_ABIS.map(function (e) {
				return String(e);
			});
		} else {
			return [String(android.os.Build.CPU_ABI), String(android.os.Build.CPU_ABI2)];
		}
	},
	uriToFile: function (uri) { //Source : https://www.cnblogs.com/panhouye/archive/2017/04/23/6751710.html
		var r = null, cursor, column_index, selection = null, selectionArgs = null, isKitKat = android.os.Build.VERSION.SDK_INT >= 19, docs;
		if (!(uri instanceof android.net.Uri)) return null;
		if (uri.getScheme().equalsIgnoreCase("content")) {
			if (isKitKat && android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
				if (String(uri.getAuthority()) == "com.android.externalstorage.documents") {
					docs = String(android.provider.DocumentsContract.getDocumentId(uri)).split(":");
					if (docs[0] == "primary") {
						return android.os.Environment.getExternalStorageDirectory() + "/" + docs[1];
					}
				} else if (String(uri.getAuthority()) == "com.android.providers.downloads.documents") {
					uri = android.content.ContentUris.withAppendedId(
						android.net.Uri.parse("content://downloads/public_downloads"),
						parseInt(android.provider.DocumentsContract.getDocumentId(uri))
					);
				} else if (String(uri.getAuthority()) == "com.android.providers.media.documents") {
					docs = String(android.provider.DocumentsContract.getDocumentId(uri)).split(":");
					if (docs[0] == "image") {
						uri = android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
					} else if (docs[0] == "video") {
						uri = android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
					} else if (docs[0] == "audio") {
						uri = android.provider.MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
					}
					selection = "_id=?";
					selectionArgs = [docs[1]];
				}
			}
			try {
				cursor = ctx.getContentResolver().query(uri, ["_data"], selection, selectionArgs, null);
				if (cursor && cursor.moveToFirst()) {
					r = String(cursor.getString(cursor.getColumnIndexOrThrow("_data")));
				}
			} catch (e) { Log.e(e) }
			if (cursor) cursor.close();
			return r;
		} else if (uri.getScheme().equalsIgnoreCase("file")) {
			return String(uri.getPath());
		}
		return null;
	},
	fileToUri: function (file) {
		file = file instanceof java.io.File ? file : new java.io.File(file);
		if (MapScript.host == "Android") {
			return ScriptInterface.fileToUri(file);
		} else {
			return android.net.Uri.fromFile(file);
		}
	},
	selectFile: function (mimeType, callback) {
		var i = new android.content.Intent(android.content.Intent.ACTION_GET_CONTENT);
		i.setType(mimeType);
		this.startActivityForResult(i, function (resultCode, data) {
			if (resultCode != -1) return; // RESULT_OK
			callback(AndroidBridge.uriToFile(data.getData()));
		});
	},
	selectImage: function (callback) {
		try {
			this.selectFile("image/*", function (path) {
				callback(path);
			});
			return;
		} catch (e) { erp(e, true) }
	},
	sendText: function (text, withSharesheet) {
		let intent = new android.content.Intent(android.content.Intent.ACTION_SEND);
		intent.setType("text/plain");
		intent.putExtra(android.content.Intent.EXTRA_TEXT, new java.lang.String(String(text)));
		if (withSharesheet) {
			intent = android.content.Intent.createChooser(intent, null);
		}
		return this.startActivity(intent);
	},
	sendUri: function (uri, mimeType, withSharesheet) {
		let intent = new android.content.Intent(android.content.Intent.ACTION_SEND);
		intent.setType(mimeType);
		intent.putExtra(android.content.Intent.EXTRA_STREAM, uri);
		intent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION | android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
		if (withSharesheet) {
			intent = android.content.Intent.createChooser(intent, null);
		}
		return this.startActivity(intent);
	},
	sendFile: function (file, mimeType, withSharesheet) {
		return this.sendUri(this.fileToUri(file), mimeType, withSharesheet);
	},
	shareText: function (text) {
		return this.sendText(text, true);
	},
	viewUri: function (uri) {
		return AndroidBridge.startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(uri)));
	},
	createShortcut: function (intent, name, icon) {
		if (android.os.Build.VERSION.SDK_INT >= 26) {
			AndroidBridge.doCreateShortcut(ctx, intent, name, icon);
		} else {
			var i = new android.content.Intent("com.android.launcher.action.INSTALL_SHORTCUT");
			i.putExtra(android.content.Intent.EXTRA_SHORTCUT_NAME, name);
			i.putExtra("duplicate", false);
			i.putExtra(android.content.Intent.EXTRA_SHORTCUT_INTENT, intent);
			if (isNaN(icon)) {
				i.putExtra(android.content.Intent.EXTRA_SHORTCUT_ICON, icon);
			} else {
				i.putExtra(android.content.Intent.EXTRA_SHORTCUT_ICON_RESOURCE, android.content.Intent.ShortcutIconResource.fromContext(ctx, icon));
			}
			ctx.sendBroadcast(i);
		}
	},
	doCreateShortcut: function (context, intent, name, icon) {
		var manager = context.getSystemService(context.SHORTCUT_SERVICE);
		var shortcut = new android.content.pm.ShortcutInfo.Builder(context, name)
			.setShortLabel(name)
			.setLongLabel(name)
			.setIcon(isNaN(icon) ? icon : android.graphics.drawable.Icon.createWithResource(context, icon))
			.setIntent(intent)
			.build();
		var callback = this.createPendingIntent("broadcast", manager.createShortcutResultIntent(shortcut), ["oneShot"]);
		manager.requestPinShortcut(shortcut, callback.getIntentSender());
	},
	scanMedia: function (files, statusListener) {
		var scanConn, i = 0;
		if (!Array.isArray(files)) files = [files];
		var scanNext = function () {
			var e;
			if (i >= files.length) {
				scanConn.disconnect();
				if (statusListener) statusListener("disconnected");
				return;
			}
			e = files[i];
			if (statusListener) statusListener("scanStart", e, i, files.length);
			if (typeof e == "string") {
				scanConn.scanFile(e, null);
			} else if (e instanceof java.io.File) {
				scanConn.scanFile(e.getPath(), null);
			} else {
				scanConn.scanFile(e.path, e.mimeTypes || null);
			}
		};
		scanConn = new android.media.MediaScannerConnection(ctx, {
			onMediaScannerConnected: function () {
				try {
					if (statusListener) statusListener("connected");
					scanNext();
				} catch (e) { erp(e) }
			},
			onScanCompleted: function (path, uri) {
				try {
					if (statusListener) statusListener("scanCompleted", uri, files[i], i, files.length);
					i++;
					scanNext();
				} catch (e) { erp(e) }
			}
		});
		scanConn.connect();
	},
	startAccessibilitySvcByRoot: function () {
		var s = String(android.provider.Settings.Secure.getString(ctx.getContentResolver(), android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)).split(":");
		var t = "com.huangyx.ca/com.huangyx.ca.AccessibilitySvc";
		var f = s.some(function (e) {
			return e == t;
		});
		if (f) return true;
		s.push(t);
		try {
			var r = java.lang.Runtime.getRuntime(), p;
			p = r.exec(["su", "root", "settings", "put", "secure", "enabled_accessibility_services", s.join(":")]);
			p.waitFor();
			if (p.getErrorStream().available() > 0) return false;
			p = r.exec(["su", "root", "settings", "put", "secure", "accessibility_enabled", "1"]);
			p.waitFor();
			if (p.getErrorStream().available() > 0) return false;
			return true;
		} catch (e) { Log.e(e) }
		return false;
	},
	startAccessibilitySvcByRootAsync: function (callback, silently) {
		Threads.run(function () {
			var success = AndroidBridge.startAccessibilitySvcByRoot();
			if (callback) callback(success);
			if (silently) return;
			if (success) {
				Common.toast("无障碍服务已启动");
			} else {
				Common.toast("无障碍服务启动失败");
			}
		});
	},
	getUserID: function () {
		return ScriptInterface.getUserID();
	},
	shouldForceRemoveTask: function () {
		return SettingsCompat.rom == "FLYME" || SettingsCompat.rom == "MEIZU";
		// projectXero：
		//JavaException: android.view.WindowManager$BadTokenException: Unable to add window -- token null is not valid; is your activity running?
		//魅族Flyme com.meizu.widget.OptionPopupWindow 不支持在有后台任务但context是服务的情况下显示
		//且客服说是本App的问题，因此我只能勉为其难地剥夺了魅族用户取消选择隐藏后台任务的能力
	},
	exitLoading: function (keepActivity) {
		var activity = ScriptInterface.getBindActivity();
		if (!activity) return;
		if (this.shouldForceRemoveTask()) keepActivity = false;
		activity.runOnUiThread(function () {
			try {
				if (keepActivity) {
					try {
						activity.moveTaskToBack(false);
						return;
					} catch (e) {
						Log.e(e);
					}
				}
				if (G.style == "Material") {
					activity.finishAndRemoveTask();
				} else {
					activity.finish();
				}
			} catch (e) { erp(e) }
		});
	},
	showActivityContent: function (canFloat) {
		var activity = ScriptInterface.getBindActivity();
		if (!activity) return;
		activity.runOnUiThread(function () {
			try {
				var layout, help, ensurefloat, exit;
				layout = new G.LinearLayout(ctx);
				layout.setBackgroundColor(G.Color.WHITE);
				layout.setOrientation(G.LinearLayout.VERTICAL);
				layout.setGravity(G.Gravity.CENTER);
				layout.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
				layout.setLayoutParams(new G.ViewGroup.LayoutParams(-1, -1));
				help = new G.TextView(ctx);
				help.setGravity(G.Gravity.CENTER);
				help.setTextSize(16);
				help.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
				help.setText(canFloat ? "当前模式∶悬浮窗模式\n您现在可以在屏幕上找到命令助手的悬浮窗，找不到的话请手动打开命令助手的悬浮窗权限" : "当前模式∶页面模式\n检测到命令助手没有悬浮窗权限，无法以悬浮窗模式打开命令助手。如果您已给予权限，请手动重启命令助手。");
				help.setLayoutParams(new G.ViewGroup.LayoutParams(-1, -2));
				layout.addView(help);
				ensurefloat = new G.Button(ctx);
				ensurefloat.setText("检查悬浮窗权限");
				ensurefloat.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
				ensurefloat.setOnClickListener(new G.View.OnClickListener({
					onClick: function (v) {
						try {
							if (SettingsCompat.ensureCanFloat(false)) {
								G.ui(function () {
									try {
										G.Toast.makeText(ctx, "悬浮窗权限已打开", 0).show();
									} catch (e) { erp(e) }
								});
							}
						} catch (e) { erp(e) }
					}
				}));
				layout.addView(ensurefloat);
				exit = new G.Button(ctx);
				exit.setText("退出命令助手");
				exit.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
				exit.setOnClickListener(new G.View.OnClickListener({
					onClick: function (v) {
						try {
							CA.performExit();
						} catch (e) { erp(e) }
					}
				}));
				layout.addView(exit);
				activity.setContentView(layout);
			} catch (e) { erp(e) }
		});
	},
	checkNecessaryPermissionsSync: function () {
		Threads.awaitPromise(function (resolve) {
			AndroidBridge.checkNecessaryPermissions(resolve);
		});
	},
	checkNecessaryPermissions: function (callback) {
		AndroidBridge.requestPermissionsByGroup([{
			permissions: [
				"android.permission.READ_PHONE_STATE"
			],
			explanation: "获取手机识别码（可选）\n\n此权限用于向命令助手作者反馈错误时唯一标识用户",
			mode: 2
		}], function (flag, success, denied, sync) {
			if (callback) callback();
		});
	},
	getKeeperMenu: function () {
		if (!CA.settings.notificationActions) CA.settings.notificationActions = Object.copy(this.defaultKeeperMenu);
		return CA.settings.notificationActions;
	},
	defaultKeeperMenu: [
		{ action: "ca.switchIconVisibility" },
		{ action: "ca.exit" }
	],
	Tiles: {
		"null": {
			name: "无",
			initTile: function (data, tile) {
				tile.label = "命令助手";
				tile.subtitle = "";
			},
			updateTile: function (data, tile) {
				tile.state = tile.STATE_INACTIVE;
			},
			onTileClick: function (data, tile) {
				this.updateTile(data, tile);
			}
		},
		"action": {
			name: "执行动作",
			description: "点击后执行一个动作",
			create: function () {
				return {
					action: {}
				};
			},
			edit: function (data, newCreated, callback) {
				var keys = Object.keys(CA.Actions), curIndex, curKey, curAction, curData = data.action;
				if (!newCreated) {
					curIndex = keys.indexOf(curData.action);
				} else {
					curIndex = -1;
				}
				if (curIndex >= 0) {
					curKey = keys[curIndex];
					curAction = CA.Actions[curKey];
					keys.splice(curIndex, 1);
				}
				keys = keys.map(function (e) {
					var action = CA.Actions[e];
					return {
						text: action.name,
						description: action.description,
						key: e,
						action: action
					};
				});
				if (curAction) {
					keys.unshift({
						text: "(当前) " + curAction.name,
						description: curAction.description,
						key: curKey,
						action: curAction,
						current: true
					});
				}
				Common.showListChooser(keys, function (i) {
					var e = keys[i];
					var action = e.action;
					if (!e.current) {
						curData = action.create ? action.create() : {};
						curData.action = e.key;
					}
					if (action.edit) {
						action.edit(curData, !e.current, function () {
							data.action = curData;
							callback(data);
						});
					} else {
						data.action = curData;
						callback(data);
					}
				});
			},
			updateTile: function (data, tile) {
				var actionData = data.action;
				var action = CA.Actions[actionData.action];
				if (!action) return;
				if (action.available && !action.available(actionData)) return;
				tile.label = (action.getName ? action.getName(actionData) : action.name) || "";
				tile.subtitle = (action.getDescription ? action.getDescription(actionData) : action.description) || "";
				tile.state = tile.STATE_INACTIVE;
			},
			onTileClick: function (data) {
				var actionData = data.action;
				var action = CA.Actions[actionData.action];
				if (!action) return;
				if (action.available && !action.available(actionData)) return;
				action.execute(actionData);
			}
		},
		"ca.iconVisibility": {
			name: "切换悬浮图标显示/隐藏",
			initTile: function (data, tile) {
				tile.label = "悬浮图标";
				tile.subtitle = "";
			},
			updateTile: function (data, tile) {
				tile.state = CA.icon ? tile.STATE_ACTIVE : tile.STATE_INACTIVE;
			},
			onTileClick: function (data, tile) {
				if (CA.icon) {
					CA.hideIcon();
					tile.state = tile.STATE_INACTIVE;
				} else {
					CA.showIcon();
					tile.state = tile.STATE_ACTIVE;
				}
			}
		}
	},
	getTileService: function () {
		if (!CA.settings.qstile) CA.settings.qstile = Object.copy(this.defaultTile);
		var lastTileService = AndroidBridge.lastTileService;
		var tile = CA.settings.qstile;
		var tileService = this.Tiles[tile.tile];
		var tileContext = {};
		if (!tileService) {
			tileService = this.Tiles["null"];
		}
		if (lastTileService && tileService == lastTileService.service && tile == lastTileService.data && !lastTileService.invalid) {
			return lastTileService;
		}
		if (lastTileService && lastTileService.service.unload) {
			lastTileService.service.unload(lastTileService.data, lastTileService.context);
		}
		if (tileService.load) {
			tileContext = tileService.load(tile, tileContext) || tileContext;
		}
		return AndroidBridge.lastTileService = {
			data: tile,
			service: tileService,
			context: tileContext
		};
	},
	notifyTileUpdate: function () {
		ScriptInterface.notifyTileUpdate();
	},
	defaultTile: {
		tile: "null"
	},
	showEditTile: function self(data, callback) {
		G.ui(function () {
			try {
				var keys = Object.keys(AndroidBridge.Tiles), curIndex, curKey, curTile, curData = data;
				curIndex = keys.indexOf(data.tile);
				if (curIndex >= 0) {
					curKey = keys[curIndex];
					curTile = AndroidBridge.Tiles[curKey];
					keys.splice(curIndex, 1);
				}
				keys = keys.map(function (e) {
					var data = AndroidBridge.Tiles[e];
					return {
						text: data.name,
						description: data.description,
						key: e,
						data: data
					};
				});
				keys.unshift({
					text: "(当前) " + curTile.name,
					description: curTile.description,
					key: curKey,
					data: curTile,
					current: true
				});
				Common.showListChooser(keys, function (i) {
					var e = keys[i];
					var tile = e.data;
					var data;
					if (e.current) {
						data = curData;
					} else {
						data = tile.create ? tile.create() : {};
						data.tile = e.key;
					}
					if (tile.edit) {
						tile.edit(data, !e.current, function () {
							callback(data);
						});
					} else {
						callback(data);
					}
				});
			} catch (e) { erp(e) }
		})
	},
	uriActions: {
		open: {
			default: function () {
				CA.showGen(true);
			}
		},
		command: {
			edit: function (fragment, query, extras) {
				G.ui(function () {
					try {
						CA.showGen(true);
						CA.cmd.setText(String(query.text));
						CA.showGen.activate(false);
					} catch (e) { erp(e) }
				});
			}
		},
		feedback: {
			authorize: function (fragment, query, extras) {
				GiteeFeedback.callbackOAuth(String(query.code));
			}
		},
		push: {
			settings: function () {
				PushService.showSettings("推送设置");
			}
		},
		user: {
			login: function () {
				UserManager.processUriAction("login");
			},
			info: function () {
				UserManager.processUriAction("info");
			},
			autologin: function (fragment, query, extras) {
				UserManager.processUriAction("autologin", query);
			},
			authorize: function (fragment, query, extras) {
				UserManager.showAuthorize(query);
			}
		}
	}
});