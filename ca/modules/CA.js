var iconFont = G.Typeface.MONOSPACE; // 默认的默认使用等宽字体，但通常不会加载到
// 不能写太早，这里甚至没有初始化CA
MapScript.loadModule("CA", {
	icon: null,
	qbar: null,
	gen: null,
	con: null,
	cmd: null,
	history: null,
	assist: null,
	fcs: null,
	paste: null,

	his: null,
	fav: null,
	cmdstr: "",
	settings: {},
	fine: false,

	profilePath: MapScript.baseDir + (BuildConfig.variants == "release" ? "xero_commandassist.dat" : "xero_commandassist_snapshot.dat"),
	name: "CA",
	author: "ProjectXero",
	uuid: "d4235eed-520c-4e23-9b67-d024a30ed54c",
	version: BuildConfig.versionCode,
	versionName: BuildConfig.version,
	publishDate: BuildConfig.date,
	tips: [],
	initialize: function () {
		try {

			if (!CA.settings.LogServer) {
				CA.settings.LogServer = {
					enabled: false,
					address: "http://192.168.1.145:2333/logserver"
				}
			}

			this.plugin = Plugins.inject(this);
			this.load();
			// 判断此时是否应该显示 许可协议
			// 如果没同意过，或者同意时间早于协议更新时间
			if (!CA.settings.readAgreement ||
				CA.settings.readAgreement < Date.parse(BuildConfig.licenceUpdate)) {
				this.showAgreementSync();
			}


			this.checkFeatures();
			if (!this.hasFeature("enableCommand")) {
				Common.showTextDialog("兼容性警告\n\n您的Minecraft PE版本过低（" + getMinecraftVersion() + "），没有命令和命令方块等功能，无法正常使用命令助手。请升级您的Minecraft PE至1.2及以上。");
			} else if (!this.hasFeature("enableCommandBlock")) {
				Common.showTextDialog("兼容性警告\n\n您的Minecraft PE版本较低（" + getMinecraftVersion() + "），可以使用命令，但没有命令方块等功能，部分命令助手的功能可能无法使用。推荐升级您的Minecraft PE至1.2及以上。");
			} else if (this.hasFeature("version_1_1")) {
				Common.showTextDialog("兼容性警告\n\n您的Minecraft PE版本较低（" + getMinecraftVersion() + "），可以使用命令，但没有ID表，且部分命令有bug。推荐升级您的Minecraft PE至1.2及以上，或者使用网易代理的我的世界最新版本。\n您也可在设置→拓展包→切换版本→自定义中设置版本为1.2。");
			}
			Common.toast("命令助手 " + this.version.join(".") + " by ProjectXero&南鸢晨星\n\n" + this.getTip(), 1);
			this.fine = true;
			this.screenChangeHook();
			// 加载图案字体
			try {
				if (CA.settings.iconFont == undefined) {
					CA.settings.iconFont = true; // 默认就是启用图案字体
					CA.trySave();
				}
				if (CA.settings.iconFont == true) {
					var assetManager = ctx.getAssets();
					iconFont = G.Typeface.createFromAsset(assetManager, "fonts/Icon-font.ttf");
				} else {
					iconFont = G.Typeface.DEFAULT;
				}
			} catch (e) {
				Common.toast("图案字体加载失败");
				iconFont = G.Typeface.MONOSPACE || G.Typeface.DEFAULT;
			}

		} catch (e) { erp(e) }
	},
	unload: function () {
		try {
			CA.trySave();
			G.ui(CA.resetGUI);
		} catch (e) { erp(e) }
	},
	chatHook: function (s) {
		try {
			var i;
			if ((/^\//).test(s)) this.addHistory(s);
		} catch (e) { erp(e) }
	},
	screenChangeHook: function self(screenName) {
		try {
			if (screenName) {
				self.l = screenName;
			} else {
				screenName = self.l;
			}
			if (!this.fine) return;
			if (MapScript.host != "BlockLauncher" || !this.settings.autoHideIcon || PopupPage.getCount() > 0) return this.showIcon();
			if (screenName == "chat_screen" || screenName == "command_block_screen" || (this.cmdstr.length && screenName == "hud_screen")) {
				this.showIcon();
			} else {
				this.hideIcon();
			}
		} catch (e) { erp(e) }
	},
	load: function () {
		var pf = new java.io.File(this.profilePath);
		var f = SafeFileUtils.readJSON(pf, null), t;
		if (!f) {
			t = new java.io.File(ExternalStorage && ExternalStorage.getExternalStorageRoot ? ExternalStorage.getExternalStorageRoot() : android.os.Environment.getExternalStorageDirectory().getAbsolutePath(), "games/com.mojang/minecraftWorlds/" + (BuildConfig.variants == "release" ? "xero_commandassist.dat" : "xero_commandassist_snapshot.dat"));
			if (t.isFile()) f = SafeFileUtils.readJSON(t, null);
			t.delete();
		}
		if (f && Array.isArray(f.history) && (f.favorite instanceof Object) && (f.settings instanceof Object)) {
			this.his = f.history;
			this.fav = f.favorite;
			this.cmdstr = f.cmd ? String(f.cmd) : "";
			this.settings = f.settings;
			if (f.theme) {
				f.settings.alpha = f.settings.alpha ? 0.75 : 1;
				Common.loadTheme(f.theme);
			} else {
				Common.loadTheme(f.settings.theme);
			}
			if (!f.settings.enabledLibrarys) f.settings.enabledLibrarys = Object.keys(this.Library.inner);
			if (!f.settings.coreLibrarys) f.settings.coreLibrarys = [];
			if (!f.settings.disabledLibrarys) f.settings.disabledLibrarys = [];
			if (!f.settings.deprecatedLibrarys) f.settings.deprecatedLibrarys = [];
			if (f.settings.libPath) {
				this.Library.enableLibrary(f.settings.libPath);
				delete f.settings.libPath;
			}
			Object.keys(this.Library.inner).forEach(function (e) {
				if (this.enabledLibrarys.indexOf(e) < 0 && this.disabledLibrarys.indexOf(e) < 0) this.enabledLibrarys.push(e);
			}, this.settings);
			if (isNaN(f.settings.firstUse)) {
				f.settings.firstUse = Date.parse(this.publishDate) - 30 * 24 * 60 * 60 * 1000; //30d
			}
			if (isNaN(f.settings.nextAskSupport)) {
				f.settings.nextAskSupport = Date.now() + 30 * 24 * 60 * 60 * 1000; //30d
			}
			if (f.settings.icon == undefined) f.settings.icon = "default";
			if (!Array.isArray(this.fav)) {
				this.fav = Object.keys(f.favorite).map(function (e) {
					return {
						key: e,
						value: f.favorite[e]
					};
				});
			}
			if (!f.settings.customExpression) f.settings.customExpression = [];
			if (!(f.settings.securityLevel >= -9 && f.settings.securityLevel <= 9)) f.settings.securityLevel = 1;
			if (f.settings.customTips) this.tips = f.settings.customTips;
			if (isNaN(f.settings.libraryAutoUpdate)) f.settings.libraryAutoUpdate = 1;
			if (!f.settings.quickBarActions) f.settings.quickBarActions = Object.copy(CA.quickBarDefaultActions);
			if (BuildConfig.variants == "release") {
				erp.notReport = CA.settings.notReportError;
			} else if (BuildConfig.variants == "snapshot") {
				erp.notReport = false;
			} else {
				erp.notReport = true;
			}

			this.settingsVersion = Date.parse(f.publishDate);
			if (this.settingsVersion < Date.parse("2017-10-22")) {
				f.settings.senseDelay = true;
			}
			if (this.settingsVersion < Date.parse("2018-03-10")) {
				f.settings.pasteMode = f.settings.disablePaste ? 0 : 1;
			}
			if (this.settingsVersion < Date.parse("2018-12-03")) {
				if (f.settings.historyCount == 0) f.settings.historyCount = 200;
				this.his.splice(f.settings.historyCount);
			}

			this.Library.initLibrary(function (flag) {
				if (!flag) Common.toast("有至少1个拓展包无法加载，请在设置中查看详情");
			});
			if (Date.parse(f.publishDate) < Date.parse(this.publishDate)) {
				Updater.showNewVersionInfo(f.publishDate);
			}
		} else {
			if (pf.exists()) {
				erp("Profile cannot resolved:\n" + SafeFileUtils.readText(pf, "Content cannot read"), true);
			}
			this.his = [
				// say 你好，我是命令助手！左边是历史，右边是收藏，可以拖来拖去，也可以长按编辑哦
				"/say 你好呀喵~ 我是命令助手呀~ 这里是历史喵~ 右滑是收藏哦 可以拖来拖去，还可以长按编辑呢喵~",
				"/say 命令助手 - 南鸢晨星社区版 喵喵喵~"
			];
			this.fav = [{
				key: "获得命令方块",
				value: "/give @p command_block"
			}, {
				key: "关闭命令提示",
				value: "/gamerule commandblockoutput false"
			}, {
				key: "命令助手设置",
				value: "/help"
			}];
			this.cmdstr = "";
			this.settings = {
				firstUse: Date.now(),
				nextAskSupport: Date.now() + 30 * 24 * 60 * 60 * 1000,
				autoHideIcon: false,
				autoFormatCmd: false,
				alpha: 1,
				noAnimation: false,
				senseDelay: true,
				pasteMode: 1,
				historyCount: 200,
				splitScreenMode: false,
				keepWhenIME: false,
				icon: "default",
				noWebImage: false,
				iconAlpha: 0,
				tipsRead: 0,
				iiMode: -1,
				libraryAutoUpdate: 1,
				securityLevel: 1,
				enabledLibrarys: this.Library.recommended,
				coreLibrarys: [],
				disabledLibrarys: this.Library.defaultDisabled,
				deprecatedLibrarys: [],
				customExpression: [],
				quickBarActions: Object.copy(CA.quickBarDefaultActions)
			};
			this.tips = this.defalutTips;
			Common.loadTheme();
			CA.checkFeatures();
			this.Library.initLibrary();
		}
	},
	save: function () {
		if (Common.theme) this.settings.theme = Common.theme.id;
		SafeFileUtils.writeJSON(new java.io.File(this.profilePath), {
			history: this.his,
			favorite: this.fav,
			cmd: this.cmdstr,
			settings: this.settings,
			publishDate: this.publishDate
		});
	},
	addHistory: function (t) {
		var i = this.his.indexOf(String(t));
		if (i >= 0) this.his.splice(i, 1);
		this.his.unshift(String(t));
		if (CA.settings.histroyCount >= 0) {
			this.his.splice(CA.settings.histroyCount);
		}
	},
	getFavoriteDir: function (key, folder, doNotCreate) {
		var i, t;
		if (!folder) folder = this.fav;
		for (i in folder) {
			if (key == folder[i].key && folder[i].children) return folder[i];
		}
		if (doNotCreate) return null;
		folder.push(t = {
			key: key,
			children: []
		});
		return t;
	},
	addFavorite: function (data, folder) { //该函数允许将文件夹内容合并
		var i, t, a;
		if (!folder) folder = this.fav;
		if (data.children && (t = this.getFavoriteDir(data.key, folder, true))) {
			a = data.children;
			for (i = 0; i < a.length; i++) {
				this.addFavorite(a[i], t.children);
			}
		} else {
			folder.push(data);
		}
	},
	removeFavorite: function (data, folder) {
		var i;
		if (!folder) folder = this.fav;
		i = folder.indexOf(data);
		if (i < 0) return;
		folder.splice(i, 1);
	},
	trySave: function () {
		try {
			this.save();
			return true;
		} catch (e) {
			erp(e, true);
			Common.showTextDialog("命令助手无法在您的手机上运行：文件写入失败。\n原因可能为：\n1、您的内部存储没有足够的空间\n2、文件被保护\n3、未开放文件读写权限\n\n请检查您的系统。\n\n错误原因：" + e);
		}
		return false;
	},
	showIcon: function self() {
		G.ui(function () {
			try {
				if (!self.view) {
					var vcfg = G.ViewConfiguration.get(ctx);
					var longPressTimeout = vcfg.getLongPressTimeout();
					var touchSlop = vcfg.getScaledTouchSlop();
					self.view = new G.FrameLayout(ctx);
					self.view.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								if (isNaN(CA.settings.iiMode) || CA.settings.iiMode < 0) {
									CA.settings.iiMode = 3;
								}
								self.open();
							} catch (e) { erp(e) }
						}
					}));
					self.view.setOnTouchListener(new G.View.OnTouchListener({
						onTouch: function touch(v, e) {
							try {
								switch (e.getAction()) {
									case e.ACTION_MOVE:
										if (touch.stead) {
											if (Math.abs(touch.lx - e.getRawX()) + Math.abs(touch.ly - e.getRawY()) < touchSlop) {
												break;
											}
											self.longClicked = false;
											touch.stead = false;
											self.animateTranslation(0);
										}
										if (CA.settings.iconDragMode == 2) break;
										CA.icon.attributes.x = self.cx = e.getRawX() + touch.offx;
										CA.icon.attributes.y = self.cy = e.getRawY() + touch.offy;
										CA.icon.update();
										break;
									case e.ACTION_DOWN:
										touch.offx = self.cx - (touch.lx = e.getRawX());
										touch.offy = self.cy - (touch.ly = e.getRawY());
										touch.stead = true;
										v.postDelayed(self.longClick, longPressTimeout);
										self.longClicked = true;
										self.cancelAnimator();
										self.layoutChanged();
										return true;
									case e.ACTION_UP:
										if (touch.stead) {
											if (e.getEventTime() - e.getDownTime() < longPressTimeout) {
												v.performClick();
											}
										}
									case e.ACTION_CANCEL:
										self.layoutChanged();
										self.refreshPos();
										CA.settings.iconX = Math.floor(self.cx);
										CA.settings.iconY = Math.floor(self.cy);
										self.longClicked = false;
								}
								self.icon.dispatchTouchEvent(e);
								return true;
							} catch (e) { return erp(e), true }
						}
					}));
					self.view.addOnLayoutChangeListener(new G.View.OnLayoutChangeListener({
						onLayoutChange: function (v, l, t, r, b, ol, ot, or, ob) {
							try {
								self.layoutChanged(true);
							} catch (e) { erp(e) }
						}
					}));
					self.longClick = new java.lang.Runnable({
						run: function () {
							try {
								if (self.longClicked) {
									if (PopupPage.getCount() == 0 || !PopupPage.visible) {
										CA.showActions(CA.settings.quickBarActions);
									} else if (PopupPage.supportResize) {
										if (PopupPage.isLocked()) {
											PopupPage.setFullScreen(PopupPage.isFullScreen(), false);
										} else {
											PopupPage.setFullScreen(!PopupPage.isFullScreen(), false);
										}
									}
								}
								self.longClicked = false;
							} catch (e) { erp(e) }
						}
					});
					self.layoutChanged = function (updateIcon) {
						var smChanged = updateIcon && self.updateScreenInfo();
						if (self.cx < 0) self.cx = 0;
						if (self.cy < 0) self.cy = 0;
						if (self.cx > self.scrWidth) self.cx = self.scrWidth;
						if (self.cy > self.scrHeight) self.cy = self.scrHeight;
						if (smChanged) {
							self.icon.setTranslationX(0);
							self.refreshPos();
						}
					}
					self.updateScreenInfo = function () {
						var lw = self.scrWidth, lh = self.scrHeight;
						var metrics = Common.getMetrics();
						self.scrWidth = metrics[0];
						self.scrHeight = metrics[1];
						return lw != self.scrWidth || lh != self.scrHeight;
					}
					self.animateToPos = function (x, y, dur, interpolator, callback) {
						if (!CA.icon) return;
						self.cancelAnimator();
						var xani, yani;
						self.xanimator = xani = G.ValueAnimator.ofInt([self.cx, x]);
						self.yanimator = yani = G.ValueAnimator.ofInt([self.cy, y]);
						xani.setDuration(dur);
						yani.setDuration(dur);
						if (interpolator) {
							xani.setInterpolator(interpolator);
							yani.setInterpolator(interpolator);
						}
						var updater = new java.lang.Runnable({
							run: function () {
								try {
									if (!CA.icon) return;
									CA.icon.attributes.x = self.cx = xani.getAnimatedValue();
									CA.icon.attributes.y = self.cy = yani.getAnimatedValue();
									CA.icon.update();
									if (!xani.isRunning()) {
										if (callback) callback();
										return;
									}
									gHandler.post(updater);
								} catch (e) { erp(e) }
							}
						});
						xani.start();
						yani.start();
						gHandler.post(updater);
					}
					self.cancelAnimator = function () {
						if (self.xanimator) {
							self.xanimator.cancel();
							self.yanimator.cancel();
							self.xanimator = self.yanimator = null;
						}
					}
					self.animateTranslation = function (offset, delay) {
						if (offset == self.icon.getTranslationX()) return;
						var animation = new G.TranslateAnimation(self.icon.getTranslationX() - offset, 0, 0, 0);
						animation.setDuration(100);
						self.icon.setTranslationX(offset);
						self.icon.startAnimation(animation);
					}
					self.open = function () {
						if (PopupPage.getCount() > 0) {
							if (PopupPage.visible) {
								PopupPage.hide();
							} else {
								PopupPage.show();
							}
						} else {
							CA.showMain(CA.settings.noAnimation);
						}
						PushService.notify();
					}
					self.refreshAlpha = function () {
						if (CA.settings.iconAlpha) {
							self.view.setAlpha(CA.settings.iconAlpha / 10);
						} else {
							self.view.setAlpha(PopupPage.visible && PopupPage.getCount() > 0 && PopupPage.isFullScreen() ? 0.3 : 0.7);
						}
					}
					self.refreshPos = function () {
						if (CA.settings.iconDragMode == 1) {
							if (self.cx * 2 > self.scrWidth) {
								self.animateToPos(self.scrWidth, self.cy, 150, new G.AccelerateInterpolator(2.0), function () {
									self.animateTranslation(0.6 * self.view.getMeasuredWidth());
								});
							} else {
								self.animateToPos(0, self.cy, 150, new G.AccelerateInterpolator(2.0), function () {
									self.animateTranslation(-0.6 * self.view.getMeasuredWidth());
								});
							}
						} else {
							self.animateTranslation(0);
						}
					}
					self.refreshIcon = function () {
						var iconSize = parseFloat(CA.settings.iconSize);
						if (!(iconSize > 0)) CA.settings.iconSize = iconSize = 1;
						self.icon = CA.settings.icon in CA.Icon ? CA.Icon[CA.settings.icon](iconSize, false) : CA.customIcon(CA.settings.icon, iconSize);
						self.view.removeAllViews();
						self.view.addView(self.icon);
						self.refreshAlpha();
					}
					self.refresh = function () {
						self.refreshIcon();
						self.refreshAlpha();
						self.refreshPos();
					}
					self.iconUpdate = function () {
						gHandler.post(function () {
							try {
								if (!CA.icon) return;
								self.refreshAlpha();
							} catch (e) { erp(e) }
						});
					}
					self.tutor = CA.settings.tutor_icon ? null : function () {
						var off = [self.cx, self.cy];
						Common.showTutorial({
							text: "欢迎使用命令助手",
							offset: off
						});
						Common.showTutorial({
							text: "点击图标进入命令生成器\n长按图标打开快捷栏",
							offset: off,
							view: self.view,
							callback: function () {
								CA.settings.tutor_icon = true;
								CA.trySave();
							}
						});
						self.tutor = null;
					}
					PWM.registerResetFlag(CA, "icon");
					PWM.registerResetFlag(self, "view");
					PopupPage.on("addPopup", function () {
						var rect = CA.settings.pageRect;
						if (rect) {
							PopupPage.setRect(rect[0], rect[1], rect[2], rect[3]);
						}
						if (CA.settings.pageWindowed) PopupPage.setFullScreen(false, PopupPage.isLocked());
						if (!isNaN(CA.settings.unfocusedAlpha)) PopupPage.setAlpha(1, CA.settings.unfocusedAlpha);
						self.iconUpdate();
					})
						.on("removePopup", self.iconUpdate)
						.on("show", self.iconUpdate)
						.on("hide", self.iconUpdate)
						.on("rectUpdate", function (eventName, x, y, w, h) {
							var rect = CA.settings.pageRect;
							if (rect) {
								rect[0] = Math.floor(x); rect[1] = Math.floor(y);
								rect[2] = Math.ceil(w); rect[3] = Math.ceil(h);
							} else {
								CA.settings.pageRect = [x, y, w, h];
							}
						})
						.on("fullscreenChanged", function (eventName, isFullScreen, isLocked) {
							CA.settings.pageWindowed = !isFullScreen;
							self.iconUpdate();
						});
				}
				if (CA.icon) return;
				self.updateScreenInfo();
				self.refreshIcon();
				if (isNaN(CA.settings.iconX)) {
					self.view.measure(0, 0);
					CA.settings.iconX = 0;
					CA.settings.iconY = Math.ceil(0.25 * G.screenHeight - 0.5 * self.view.getMeasuredHeight());
				}
				CA.icon = new PopupWindow(self.view, "CA.Icon");
				CA.icon.show({
					x: self.cx = CA.settings.iconX,
					y: self.cy = CA.settings.iconY,
					width: -2,
					height: -2,
					focusable: false,
					touchable: true
				});
				self.refreshPos();
				PWM.addFloat(CA.icon);
				//if (self.tutor) self.tutor();
			} catch (e) { erp(e) }
		})
	},
	hideIcon: function () {
		G.ui(function () {
			try {
				if (CA.icon) CA.icon.hide();
				CA.icon = null;
			} catch (e) { erp(e) }
		})
	},

	quickBarDefaultActions: [
		{ action: "ca.exit" },
		{ action: "ca.quickPaste" }
	],

	showMain: function (noAnimation) {
		this.showGen(noAnimation);
	},

	showGen: function self(noani) {
		G.ui(function () {
			try {
				if (!self.main) {
					self.cmdEdit = [{
						text: "插入……",
						onclick: function (v) {
							Common.showOperateDialog(self.insertDialog);
						}
					}, {
						text: "显示样式代码栏",
						onclick: function (v) {
							CA.showFCS(CA.cmd.getText());
						}
					}, {
						text: "创建批量生成模板",
						onclick: function (v, tag) {
							CA.showBatchBuilder(tag.cmd);
						}
					}, {
						gap: 10 * G.dp
					}, {
						text: "切换全屏/悬浮窗",
						hidden: function () {
							return !PopupPage.supportResize;
						},
						onclick: function (v) {
							PopupPage.setFullScreen(!PopupPage.isFullScreen(), PopupPage.isLocked());
						}
					}, {
						text: "插件",
						hidden: function () {
							return CA.PluginMenu.length == 0;
						},
						onclick: function (v) {
							Common.showOperateDialog(CA.PluginMenu);
						}
					}, {
						text: "教程",
						onclick: function (v) {
							Tutorial.showList();
						}
					}, {
						text: "设置",
						onclick: function (v) {
							CA.showSettings();
						}
					}];
					if (G.supportFloat) {
						self.cmdEdit.push({
							text: "退出命令助手",
							onclick: function (v) {
								CA.performExit();
							}
						});
					}
					self.insertDialog = [{
						text: "JSON/组件",
						onclick: function (v) {
							JSONEdit.create(function (data) {
								var showMenu = function () {
									Common.showOperateDialog([{
										text: "插入该JSON",
										onclick: function (v) {
											var k = MapScript.toSource(data);
											Common.replaceSelection(CA.cmd.getText(), k);
										}
									}, {
										text: "继续编辑",
										onclick: function (v) {
											if (!JSONEdit.show({
												source: data,
												rootname: "新JSON",
												update: function () {
													data = this.source;
													showMenu();
												}
											})) showMenu();
										}
									}, {
										text: "取消",
										onclick: function (v) { }
									}]);
								}
								showMenu();
							});
						}
					}, {
						text: "英文ID",
						onclick: function (v) {
							CA.chooseIDList(function (text) {
								Common.replaceSelection(CA.cmd.getText(), text);
							});
						}
					}, {
						text: "短语",
						onclick: function (v) {
							CA.showCustomExpression();
						}
					}];
					self.getBgImage = function () {
						if (CA.settings.bgImage) {
							var drawable = G.Drawable.createFromPath(CA.settings.bgImage);
							if (drawable instanceof G.AnimatedImageDrawable) {
								drawable.setRepeatCount(-1);
								drawable.start();
							}
							return drawable;
						}
					}
					self.showMenu = function () {
						Common.showOperateDialog(self.cmdEdit, {
							cmd: String(CA.cmd.getText())
						});
					}
					self.performClose = function (callback) {
						if (CA.settings.noAnimation) {
							CA.hideGen();
							if (callback) callback();
							return;
						}
						var animation = new G.TranslateAnimation(G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 1);
						animation.setInterpolator(new G.AccelerateInterpolator(2.0));
						animation.setDuration(100);
						animation.setStartOffset(100);
						self.bar.startAnimation(animation);
						animation = new G.TranslateAnimation(G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, -1);
						animation.setInterpolator(new G.AccelerateInterpolator(2.0));
						animation.setDuration(200);
						animation.setAnimationListener(new G.Animation.AnimationListener({
							onAnimationEnd: function (a) {
								try {
									CA.hideGen();
									if (callback) callback();
								} catch (e) { erp(e) }
							},
							//onAnimationStart : function(a) {},
							//onAnimationRepeat : function(a) {},
						}));
						self.bgContainer.startAnimation(animation);
					}
					self.performCopy = function (s) {
						s = String(s);
						Common.setClipboardText(s);
						CA.addHistory(s);
						if (CA.history) CA.showHistory();
						if (CA.settings.pasteMode == 1) {
							if (CA.his.length) CA.showPaste(0);
						} else if (CA.settings.pasteMode == 2) {
							self.performClose(function () {
								gHandler.postDelayed(function () {
									try {
										CA.performPaste(s, true);
									} catch (e) { erp(e) }
								}, 100);
							});
							return;
						}
						self.performClose();
						if (s.length > 20) UserManager.enqueueExp("copyCommand");
					}
					self.activate = function (fl) {
						CA.cmd.requestFocus();
						CA.cmd.setSelection(CA.cmd.getText().length());
						if (fl) ctx.getSystemService(ctx.INPUT_METHOD_SERVICE).showSoftInput(CA.cmd, G.InputMethodManager.SHOW_IMPLICIT);
					}
					self.textUpdate = (function () {
						var state = -1;
						var rep = function (s) {
							FCString.clearSpans(s);
							FCString.colorFC(s, Common.theme.textcolor);
						}
						var gostate0 = function () { //输入内容为空
							state = 0;
							CA.hideAssist(); CA.showHistory();
							self.copy.setText("关闭");
							self.add.setVisibility(G.View.VISIBLE);
							self.clear.setVisibility(G.View.GONE);
						}
						var gostate1 = function () { //输入了命令
							state = 1;
							if (CA.settings.iiMode == 2 || CA.settings.iiMode == 3) {
								CA.hideHistory(); CA.showAssist();
								CA.Assist.hide(); CA.IntelliSense.show();
								// Common.toast("补全被显示")
							} else {
								CA.hideAssist(); CA.showHistory();
							}
							self.copy.setText(CA.settings.pasteMode == 2 ? "粘贴" : "复制");
							self.add.setVisibility(G.View.GONE);
							self.clear.setVisibility(CA.settings.showClearButton ? G.View.VISIBLE : G.View.GONE);
						}
						var gostate2 = function () { //输入了/help
							state = 2;
							CA.hideHistory(); CA.showAssist();
							CA.Assist.hide(); CA.IntelliSense.show();
							CA.IntelliSense.showHelp();
							self.copy.setText("关闭");
							self.add.setVisibility(G.View.GONE);
							self.clear.setVisibility(G.View.VISIBLE);
						}
						var gostate3 = function () { //辅助输入模式
							state = 3;
							CA.hideHistory(); CA.showAssist();
							CA.IntelliSense.hide(); CA.Assist.show(); CA.hideFCS();
							self.copy.setText(CA.settings.pasteMode == 2 ? "粘贴" : "复制");
							self.add.setVisibility(G.View.GONE);
							self.clear.setVisibility(G.View.GONE);
						}
						return function (s, cursor) {
							s.setSpan(self.spanWatcher, 0, s.length(), G.Spanned.SPAN_INCLUSIVE_EXCLUSIVE);
							CA.cmdstr = String(s);
							if ((CA.settings.iiMode == 1 || CA.settings.iiMode == 3) && CA.Assist.active) {
								if (state != 3) gostate3();
							} else if (s == "/help") {
								if (state != 2) gostate2();
							} else if (s.length() /*&& !CA.Library.loadingStatus*/) {
								if (state != 1) gostate1();
							} else {
								if (state != 0) gostate0();
							}
							if (CA.fcs) CA.showFCS(s);
							if (CA.settings.autoFormatCmd) rep(s);
							if (CA.settings.iiMode != 2 && CA.settings.iiMode != 3 || state != 1) return;
							if (CA.settings.senseDelay) {
								CA.IntelliSense.callDelay(String(s), cursor);
							} else {
								CA.IntelliSense.proc(String(s), cursor);
							}
						}
					})();
					self.pointerChanged = function (p) {
						//即将支持
					}
					self.spanWatcher = new G.SpanWatcher({
						//onSpanAdded : function(text, what, start, end) {},
						//onSpanRemoved : function(text, what, start, end) {},
						onSpanChanged: function (text, what, ostart, oend, nstart, nend) {
							try {
								if (what === G.Selection.SELECTION_START) {
									self.pointerChanged(nstart);
								}
							} catch (e) { erp(e) }
						}
					});
					self.tutor = CA.settings.tutor_gen ? null : function () {
						var l = CA.cmd.getText();
						CA.cmd.setText("");
						Common.showTutorial({
							text: "命令生成器可以协助你输入命令",
							view: self.main
						});
						Common.showTutorial({
							text: "按下加号进入命令创建模式",
							view: self.add
						});
						Common.showTutorial({
							text: "命令输入栏\n\n在此输入命令\n长按显示菜单\n向上拖动可以关闭命令生成器",
							view: CA.cmd,
							callback: function () {
								CA.settings.tutor_gen = true;
								CA.trySave();
							},
							onDismiss: function () {
								CA.cmd.setText(l);
							}
						});
						self.tutor = null;
					}

					self.main = new G.LinearLayout(ctx);
					self.main.setOrientation(G.LinearLayout.VERTICAL);

					self.bar = new G.LinearLayout(ctx);
					self.bar.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
					self.bar.setOrientation(G.LinearLayout.HORIZONTAL);
					Common.applyStyle(self.bar, "bar_float");

					if (!CA.settings.openMenuByLongClick) {
						self.menu = new G.TextView(ctx);
						self.menu.setText("CA");
						self.menu.setTypeface(iconFont);
						self.menu.setGravity(G.Gravity.CENTER);
						self.menu.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
						Common.applyStyle(self.menu, "button_reactive_auto", 3);
						self.menu.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
						self.menu.setOnClickListener(new G.View.OnClickListener({
							onClick: function (v) {
								try {
									self.showMenu();
								} catch (e) { erp(e) }
							}
						}));
						self.bar.addView(self.menu);
					}

					self.add = new G.TextView(ctx);
					self.add.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
					self.add.setText("╋");
					self.add.setGravity(G.Gravity.CENTER);
					self.add.setPadding(10 * G.dp, 10 * G.dp, 5 * G.dp, 10 * G.dp);
					self.add.setTypeface(iconFont);
					Common.applyStyle(self.add, "textview_default", 3);
					self.add.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								if (CA.Library.loadingStatus) {
									Common.toast("拓展包正在加载中，请稍候");
									return;
								}
								if (CA.settings.iiMode == 1 || CA.settings.iiMode == 3) {
									CA.Assist.active = true;
									CA.cmd.setFocusable(false);
									CA.cmd.setText(CA.cmdstr);
								} else {
									CA.cmd.setText("/");
									self.activate(true);
								}
							} catch (e) { erp(e) }
						}
					}));
					self.bar.addView(self.add);

					CA.cmd = new G.EditText(ctx);
					CA.cmd.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -1, 1.0));
					CA.cmd.setHint("输入命令喵~");
					Common.applyStyle(CA.cmd, "edittext_default", 3);
					CA.cmd.setInputType(G.InputType.TYPE_CLASS_TEXT | G.InputType.TYPE_TEXT_FLAG_AUTO_CORRECT);
					CA.cmd.setFilters([new G.InputFilter.LengthFilter(32768)])
					CA.cmd.setFocusableInTouchMode(true);
					CA.cmd.setPadding(5 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
					CA.cmd.setImeOptions(G.EditorInfo.IME_FLAG_NO_FULLSCREEN);
					CA.cmd.setTypeface(iconFont);
					CA.cmd.setText(CA.cmdstr);
					CA.cmd.addTextChangedListener(new G.TextWatcher({
						afterTextChanged: function (s) {
							try {
								self.textUpdate(s, CA.cmd.getSelectionStart());
							} catch (e) { erp(e) }
						}
						//beforeTextChanged : function(s, start, count, after) {},
						//onTextChanged : function(s, start, before, count) {},
					}));
					CA.cmd.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								if (CA.Assist.active) {
									CA.Assist.active = false;
									CA.cmd.setFocusableInTouchMode(true);
									CA.cmd.setText(CA.cmdstr);
									self.activate(true);
								}
							} catch (e) { erp(e) }
						}
					}));
					CA.cmd.setOnTouchListener(new G.View.OnTouchListener({
						onTouch: function touch(v, e) {
							try {
								var t;
								if (touch.ignore && e.getAction() != e.ACTION_DOWN) return true;
								switch (e.getAction()) {
									case e.ACTION_MOVE:
										t = e.getRawY() - touch.sy;
										if (touch.cbk && Math.abs(t) + Math.abs(e.getRawX() - touch.sx) > 20 * G.dp) {
											self.main.removeCallbacks(touch.cbk);
											touch.cbk = null;
										}
										if (t > 0) t = 0;
										if (touch.stead && Math.abs(t) < 20 * G.dp) break;
										touch.stead = false;
										self.main.setTranslationY(t);
										break;
									case e.ACTION_DOWN:
										touch.sx = e.getRawX();
										touch.sy = e.getRawY();
										touch.stead = true;
										touch.ignore = false;
										if (CA.settings.openMenuByLongClick && !CA.Assist.active) self.main.postDelayed(touch.cbk = new java.lang.Runnable({
											run: function () {
												try {
													self.showMenu();
													touch.cbk = null;
													CA.cmd.dispatchTouchEvent(G.MotionEvent.obtain(0, 0, G.MotionEvent.ACTION_CANCEL, 0, 0, 0, 0, 0, 0, 0, 0, 0));
												} catch (e) { erp(e) }
											}
										}), 300);
										break;
									case e.ACTION_CANCEL:
										touch.ignore = true;
									case e.ACTION_UP:
										if (touch.cbk) {
											self.main.removeCallbacks(touch.cbk);
											touch.cbk = null;
										}
										self.main.setTranslationY(0);
										if (e.getAction() == e.ACTION_CANCEL || touch.stead) return false;
										t = e.getRawY() - touch.sy;
										if (t > 0) t = 0;
										if (Math.abs(t) > 0.4 * self.main.getMeasuredHeight()) {
											if (CA.settings.noAnimation) {
												CA.hideGen();
											} else {
												t = new G.TranslateAnimation(G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 0, G.Animation.ABSOLUTE, t, G.Animation.ABSOLUTE, -self.main.getMeasuredHeight());
												t.setInterpolator(new G.AccelerateInterpolator(2.0));
												t.setDuration(100);
												t.setAnimationListener(new G.Animation.AnimationListener({
													onAnimationEnd: function (a) {
														CA.hideGen();
													}
												}));
												self.main.startAnimation(t);
											}
										} else if (!CA.settings.noAnimation) {
											t = new G.TranslateAnimation(G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 0, G.Animation.ABSOLUTE, t, G.Animation.RELATIVE_TO_SELF, 0);
											t.setInterpolator(new G.DecelerateInterpolator(2.0));
											t.setDuration(100);
											self.main.startAnimation(t);
										}
										return true;
								}
								return false;
							} catch (e) { return erp(e), true }
						}
					}));
					self.bar.addView(CA.cmd);

					self.clear = new G.TextView(ctx);
					self.clear.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
					self.clear.setText("×");
					self.clear.setGravity(G.Gravity.CENTER);
					self.clear.setPadding(5 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
					self.clear.setTypeface(iconFont);
					Common.applyStyle(self.clear, "button_secondary", 3);
					self.clear.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								CA.cmd.setText("");
								self.activate(false);
							} catch (e) { erp(e) }
						}
					}));
					self.bar.addView(self.clear);

					self.copy = new G.TextView(ctx);
					self.copy.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
					self.copy.setGravity(G.Gravity.CENTER);
					self.copy.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
					self.copy.setTypeface(iconFont);
					Common.applyStyle(self.copy, "button_reactive", 3);
					self.copy.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								var t = CA.cmd.getText(), i, s = v.getText();
								if (s == "复制" || s == "粘贴") {
									self.performCopy(t);
								} else {
									self.performClose();
								}
								CA.cmd.setText("");
							} catch (e) { erp(e) }
						}
					}));
					if (MapScript.host == "Android") {
						self.copy.setOnLongClickListener(new G.View.OnLongClickListener({
							onLongClick: function (v) {
								try {
									if (WSServer.isConnected()) {
										WSServer.sendCommand(String(CA.cmd.getText()), function (json) {
											Common.toast("已执行！状态代码：" + json.statusCode + "\n" + json.statusMessage);
										});
									} else {
										if (!WSServer.isAvailable()) {
											Common.toast("请先在设置中打开WebSocket服务器");
										} else {
											Common.toast("请在客户端输入以下指令之一来连接到服务器。\n" + WSServer.getConnectCommands().join("\n"));
										}
									}
									return true;
								} catch (e) { return erp(e), true }
							}
						}));
					}
					self.copy.setOnTouchListener(new G.View.OnTouchListener({
						onTouch: function (v, e) {
							try {
								switch (e.getAction()) {
									case e.ACTION_DOWN:
										Common.applyStyle(v, "button_reactive_pressed", 3);
										break;
									case e.ACTION_CANCEL:
									case e.ACTION_UP:
										Common.applyStyle(v, "button_reactive", 3);
								}
								return false;
							} catch (e) { return erp(e), false }
						}
					}));
					self.bar.addView(self.copy);

					CA.con = new G.FrameLayout(ctx);
					CA.con.setLayoutParams(new G.LinearLayout.LayoutParams(-1, 0, 1));
					Common.applyStyle(CA.con, "container_default");

					if (android.os.Build.VERSION.SDK_INT >= 16 && (self.bgImg = self.getBgImage())) {
						self.bgAlpha = parseFloat(CA.settings.bgAlpha);
						if (isNaN(self.bgAlpha)) self.bgAlpha = 0.75;
						self.bgContainer = new G.FrameLayout(ctx);
						self.bgContainer.setLayoutParams(new G.LinearLayout.LayoutParams(-1, 0, 1));
						self.bgImage = new G.ImageView(ctx);
						self.bgImage.setScaleType(G.ImageView.ScaleType.CENTER_CROP);
						self.bgImage.setImageDrawable(self.bgImg);
						self.bgImage.setImageAlpha(Math.ceil(CA.settings.alpha * 255));
						self.bgContainer.addView(self.bgImage, new G.FrameLayout.LayoutParams(-1, -1));
						CA.con.setBackgroundColor(Common.setAlpha(Common.theme.bgcolor, Math.ceil(CA.settings.alpha * 255 * self.bgAlpha)));
						self.bgContainer.addView(CA.con, new G.FrameLayout.LayoutParams(-1, -1));
						self.main.addView(self.bgContainer);
					} else {
						self.main.addView(self.bgContainer = CA.con);
					}
					self.main.addView(self.bar);

					CA.gen = new PopupPage(self.main, "ca.Generator");
					CA.gen.enterAnimation(null);
					CA.gen.exitAnimation(null);
					CA.gen.on("exit", function () {
						if (PopupPage.isBusy()) return;
						CA.screenChangeHook();
						CA.trySave();
					});
					CA.gen.on("resume", function () {
						G.ui(function () {
							try {
								self.textUpdate(CA.cmd.getText(), CA.cmd.getSelectionStart());
							} catch (e) { erp(e) }
						});
					});

					PWM.registerResetFlag(CA, "con");
					PWM.registerResetFlag(CA, "cmd");
					PWM.registerResetFlag(self, "main");
				}
				CA.gen.enter();
				self.textUpdate(CA.cmd.getText(), CA.cmd.getSelectionStart());
				self.activate(false);
				if (noani) return;
				var animation = new G.TranslateAnimation(G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, CA.settings.barTop ? -1 : 1, G.Animation.RELATIVE_TO_SELF, 0);
				animation.setInterpolator(new G.DecelerateInterpolator(2.0));
				animation.setDuration(100);
				animation.setStartOffset(100);
				self.bar.startAnimation(animation);
				animation = new G.TranslateAnimation(G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, CA.settings.barTop ? 1 : -1, G.Animation.RELATIVE_TO_SELF, 0);
				animation.setInterpolator(new G.DecelerateInterpolator(2));
				animation.setDuration(200);
				self.bgContainer.startAnimation(animation);
				//if (self.tutor) self.tutor();
			} catch (e) { erp(e) }
		})
	},
	hideGen: function () {
		G.ui(function () {
			try {
				if (CA.gen.showing) CA.gen.exit();
			} catch (e) { erp(e) }
		})
	},

	showHistory: function self() {
		G.ui(function () {
			try {
				if (!self.history) {
					self.historyEdit = [{
						text: "复制",
						onclick: function (v, tag) {
							Common.setClipboardText(tag.cmd);
							Common.toast("已复制到剪贴板喵~");
						}
					}, {
						text: "添加收藏",
						onclick: function (v, tag) {
							CA.showFavEditDialog({
								mode: 0,
								data: {
									value: tag.cmd
								},
								callback: function () {
									this.folder.children.push(this.data);
								},
								onDismiss: function () {
									self.refreshFavorite();
								}
							});
						}
					}, {
						text: "删除",
						onclick: function (v, tag) {
							CA.his.splice(tag.pos, 1);
							Common.toast("已删除");
							self.refreshHistory();
						}
					}, {
						text: "批量编辑",
						onclick: function (v, tag) {
							CA.showHistoryEdit(tag.pos, function () {
								self.refreshHistory();
							});
						}
					}];
					self.favoriteItemEdit = [{
						text: "快速输入",
						hidden: function (tag) {
							return tag.data.source != "batch";
						},
						onclick: function (v, tag) {
							CA.cmd.setText(tag.data.value);
							CA.showGen.activate(false);
						}
					}, {
						text: "复制",
						onclick: function (v, tag) {
							Common.setClipboardText(tag.data.value);
							Common.toast("已复制到您的剪贴板～");
						}
					}, {
						text: "从模板创建",
						hidden: function (tag) {
							return tag.data.source == "batch";
						},
						onclick: function (v, tag) {
							CA.showBatchBuilder(tag.data.value, true);
						}
					}, {
						text: "编辑",
						onclick: function (v, tag) {
							CA.showFavEditDialog({
								mode: 1,
								data: tag.data,
								folder: tag.folder,
								onDismiss: function () {
									self.refreshFavorite();
								}
							});
						}
					}, {
						text: "移动",
						onclick: function (v, tag) {
							CA.showFavEditDialog({
								mode: 2,
								data: tag.data,
								folder: tag.folder,
								callback: function () {
									CA.removeFavorite(tag.data, tag.folder ? tag.folder.children : null);
									CA.addFavorite(this.data, this.folder.children);
								},
								onDismiss: function () {
									self.refreshFavorite();
								}
							});
						}
					}, {
						text: "删除",
						onclick: function (v, tag) {
							CA.removeFavorite(tag.data, tag.folder ? tag.folder.children : null);
							Common.toast("已删除");
							self.refreshFavorite();
						}
					}, {
						text: "批量编辑",
						onclick: function (v, tag) {
							CA.showFavoriteEdit(tag.data, function () {
								self.refreshFavorite();
							});
						}
					}];
					self.favoriteGroupEdit = [{
						text: "全部展开",
						hidden: function (tag) {
							return self.favAdapter.isExpanded(tag.pos);
						},
						onclick: function (v, tag) {
							self.favAdapter.expandTree(tag.pos);
						}
					}, {
						text: "全部折叠",
						hidden: function (tag) {
							return !self.favAdapter.isExpanded(tag.pos);
						},
						onclick: function (v, tag) {
							self.favAdapter.collapseTree(tag.pos);
						}
					}, {
						text: "重命名",
						onclick: function (v, tag) {
							Common.showInputDialog({
								title: "重命名",
								callback: function (s) {
									if (!s) {
										Common.toast("名称不能为空");
										return;
									}
									if (CA.getFavoriteDir(s, tag.folder ? tag.folder.children : null, true)) {
										Common.toast("名称已存在");
										return;
									}
									tag.data.key = s;
									self.refreshFavorite();
								},
								singleLine: true,
								defaultValue: tag.data.key
							});
						}
					}, {
						text: "移动",
						onclick: function (v, tag) {
							CA.showFavEditDialog({
								mode: 2,
								data: tag.data,
								folder: tag.folder,
								hiddenFolder: [tag.data],
								callback: function () {
									CA.removeFavorite(tag.data, tag.folder ? tag.folder.children : null);
									CA.addFavorite(this.data, this.folder.children);
								},
								onDismiss: function () {
									self.refreshFavorite();
								}
							});
						}
					}, {
						text: "删除",
						onclick: function (v, tag) {
							CA.removeFavorite(tag.data, tag.folder ? tag.folder.children : null);
							Common.toast("已删除");
							self.refreshFavorite();
						}
					}, {
						text: "批量编辑",
						onclick: function (v, tag) {
							CA.showFavoriteEdit(tag.data, function () {
								self.refreshFavorite();
							});
						}
					}];
					self.drawCursor = function (height) {
						var width = height;
						var bmp = G.Bitmap.createBitmap(width, height, G.Bitmap.Config.ARGB_8888);
						var cv = new G.Canvas(bmp);
						var pa = new G.Paint();
						pa.setStyle(G.Paint.Style.FILL)
						IntColor.Paint.setColor(pa, Common.theme.promptcolor);
						pa.setAntiAlias(true);
						var ph = new G.Path();
						ph.moveTo(0.3 * width, 0.3 * height);
						ph.lineTo(0.7 * width, 0.5 * height);
						ph.lineTo(0.3 * width, 0.7 * height);
						ph.close();
						cv.drawPath(ph, pa);
						return bmp;
					}
					self.hismaker = function (holder) {
						var layout = new G.LinearLayout(ctx),
							text1 = holder.text = new G.TextView(ctx),
							text2 = new G.TextView(ctx);
						layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						layout.setOrientation(G.LinearLayout.HORIZONTAL);
						text1.setPadding(15 * G.dp, 15 * G.dp, 0, 15 * G.dp);
						text1.setLayoutParams(new G.LinearLayout.LayoutParams(0, -2, 1.0));
						text1.setMaxLines(2);
						text1.setEllipsize(G.TextUtils.TruncateAt.END);
						text1.setTypeface(iconFont);
						Common.applyStyle(text1, "textview_default", 3);
						layout.addView(text1);
						text2.setPadding(15 * G.dp, 0, 15 * G.dp, 0);
						text2.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
						text2.setText("\ud83d\udccb"); //Emoji:Paste
						text2.setGravity(G.Gravity.CENTER);
						text2.setTypeface(iconFont);
						Common.applyStyle(text2, "textview_prompt", 3);
						text2.setOnClickListener(new G.View.OnClickListener({
							onClick: function (v) {
								try {
									CA.showGen.performCopy(holder.value);
									return true;
								} catch (e) { erp(e) }
							}
						}));
						layout.addView(text2);
						return layout;
					}
					self.hisbinder = function (holder, s) {
						holder.text.setText(holder.value = s);
					}
					self.favimaker = function (holder) {
						var layout = new G.LinearLayout(ctx),
							text1 = holder.text1 = new G.TextView(ctx),
							text2 = holder.text2 = new G.TextView(ctx);
						layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						layout.setOrientation(G.LinearLayout.VERTICAL);
						text1.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 5 * G.dp);
						text1.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
						text1.setTypeface(iconFont);
						Common.applyStyle(text1, "textview_default", 3);
						layout.addView(text1);
						text2.setPadding(15 * G.dp, 0, 15 * G.dp, 15 * G.dp);
						text2.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
						text2.setEllipsize(G.TextUtils.TruncateAt.END);
						text2.setSingleLine(true);
						text2.setTypeface(iconFont);
						Common.applyStyle(text2, "textview_prompt", 1);
						layout.addView(text2);
						return layout;
					}
					self.favibinder = function (holder, e, i, a, depth) {
						holder.text1.setText(e.key);
						holder.text2.setText(e.value);
						holder.self.setPadding(depth * 16 * G.dp, 0, 0, 0);
					}
					self.favgmaker = function (holder) {
						var layout = new G.LinearLayout(ctx),
							img = holder.img = new G.ImageView(ctx),
							text = holder.text = new G.TextView(ctx);
						layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						layout.setOrientation(G.LinearLayout.HORIZONTAL);
						img.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2));
						img.setImageBitmap(self.cursorImg);
						layout.addView(img);
						text.setPadding(0, 0, 15 * G.dp, 0);
						text.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -1));
						text.setEllipsize(G.TextUtils.TruncateAt.END);
						text.setGravity(G.Gravity.CENTER_VERTICAL | G.Gravity.LEFT);
						text.setSingleLine(true);
						text.setTypeface(iconFont);
						Common.applyStyle(text, "textview_default", 3);
						layout.addView(text);
						return layout;
					}
					self.favgbinder = function (holder, e, i, a, depth, isExpanded) {
						holder.img.setRotation(isExpanded ? 90 : 0);
						holder.text.setText(e.key);
						holder.self.setPadding(depth * 16 * G.dp, 0, 0, 0);
					}
					self.getFavChildren = function (e) {
						var i, d = [], g = [], a = e.children;
						if (!a) return;
						for (i in a) {
							if (a[i].children) {
								g.push(a[i]);
							} else {
								d.push(a[i]);
							}
						}
						return g.concat(d);
					}
					self.refreshHistory = function (force) {
						if (CA.his.length == 0) {
							self.hisEmpty = true;
							self.history.setAdapter(EmptyAdapter);
						} else {
							if (self.hisEmpty || force) {
								self.hisAdapter.notifyChange();
								self.history.setAdapter(self.hisAdapter.self);
							} else {
								self.hisAdapter.notifyChange();
							}
							self.hisEmpty = false;
						}
						if (CA.paste) CA.showPaste.refresh();
					}
					self.refreshFavorite = function (force) {
						if (CA.fav.length == 0) {
							self.favEmpty = true;
							self.favorite.setAdapter(EmptyAdapter);
						} else {
							Array.prototype.splice.apply(self.favList, [0, self.favList.length].concat(self.getFavChildren({
								children: CA.fav
							})));
							self.favAdapter.updateAll();
							if (self.favEmpty) self.favorite.setAdapter(self.favAdapter.self);
							self.favEmpty = false;
						}
					}
					self.scrollToLeft = function (noani) {
						self.linear.setTranslationX(0);
						if (!CA.settings.noAnimation && !noani) {
							var animation = new G.TranslateAnimation(G.Animation.ABSOLUTE, self.tx, G.Animation.ABSOLUTE, 0, G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 0);
							animation.setInterpolator(new G.DecelerateInterpolator(1.0));
							animation.setDuration(300);
							self.linear.startAnimation(animation);
						}
						self.tx = 0;
					}
					self.scrollToRight = function (noani) {
						self.linear.setTranslationX(-self.screenWidth);
						if (!CA.settings.noAnimation && !noani) {
							var animation = new G.TranslateAnimation(G.Animation.ABSOLUTE, self.screenWidth + self.tx, G.Animation.ABSOLUTE, 0, G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 0);
							animation.setInterpolator(new G.DecelerateInterpolator(1.0));
							animation.setDuration(300);
							self.linear.startAnimation(animation);
						}
						self.tx = -self.screenWidth;
					}
					self.tutor = CA.settings.tutor_his ? null : function () {
						var lhis = CA.his, lfav = CA.fav;
						CA.his = [
							"/say 欢迎使用命令助手!",
							"/clone 45 5 3 47 5 5 50 2 1",
							"/execute @p[x=45,y=6,z=3,dx=2,dy=2,dz=2,m=0] ~ ~ ~ gamemode 1"
						];
						CA.fav = [{
							key: "收藏夹",
							children: [{
								key: "设置title",
								value: "/title @a times ${渐入时间:param} ${显示时间:param} ${渐出时间:param}"
							}]
						}, {
							key: "获得命令方块",
							value: "/give @p command_block"
						}, {
							key: "关闭命令提示",
							value: "/gamerule commandblockoutput false"
						}, {
							key: "命令助手设置",
							value: "/help"
						}];
						self.refreshHistory(true);
						self.refreshFavorite(true);
						Common.showTutorial({
							text: "左侧这里是使用命令的历史记录列表",
							view: CA.settings.splitScreenMode ? self.history : self.linear,
							callback: function () {
								self.scrollToLeft();
							}
						});
						Common.showTutorial({
							text: "点击条目将会编辑该命令\n点击右侧粘贴按钮可粘贴该命令\n长按弹出上下文菜单",
							view: self.history
						});
						Common.showTutorial({
							text: "右侧这里是使用命令的收藏夹",
							view: CA.settings.splitScreenMode ? self.favorite : self.linear,
							callback: function () {
								self.scrollToRight();
							}
						});
						Common.showTutorial({
							text: "收藏夹类似于文件夹，您可以轻松分类命令",
							view: self.favorite,
							callback: function () {
								self.favAdapter.expandAll();
							}
						});
						Common.showTutorial({
							text: "点击条目进入编辑状态\n点击组展开或折叠收藏夹\n长按打开上下文菜单",
							view: self.favorite,
							callback: function () {
								CA.settings.tutor_his = true;
								CA.trySave();
							},
							onDismiss: function () {
								CA.his = lhis;
								CA.fav = lfav;
								self.refreshHistory(true);
								self.refreshFavorite(true);
								self.scrollToLeft();
							}
						});
						self.tutor = null;
					}
					self.hisEmpty = self.favEmpty = true;
					self.cursorImg = self.drawCursor(32 * G.dp);
					self.nulAdapter = new RhinoListAdapter([null], self.nula);
					self.hisAdapter = SimpleListAdapter.getController(new SimpleListAdapter(CA.his, self.hismaker, self.hisbinder));
					self.favAdapter = ExpandableListAdapter.control(new ExpandableListAdapter(self.favList = [], self.getFavChildren, self.favimaker, self.favibinder, self.favgmaker, self.favgbinder));

					self.linear = new G.LinearLayout(ctx);
					self.linear.setOrientation(G.LinearLayout.HORIZONTAL);
					self.tag1 = new G.TextView(ctx);
					self.tag1.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
					self.tag1.setText("历史");
					self.tag1.setGravity(G.Gravity.LEFT);
					self.tag1.setPadding(10 * G.dp, 5 * G.dp, 5 * G.dp, 5 * G.dp);
					self.tag1.setFocusable(true);
					Common.applyStyle(self.tag1, "textview_prompt", 1);
					self.history = new G.ListView(ctx);
					self.history.setOnItemClickListener(new G.AdapterView.OnItemClickListener({
						onItemClick: function (parent, view, pos, id) {
							try {
								if (pos < 1 || !parent.getItemAtPosition(pos)) return;
								pos -= 1;
								CA.cmd.setText(CA.his[pos]);
								CA.showGen.activate(true);
							} catch (e) { erp(e) }
						}
					}));
					self.history.setOnItemLongClickListener(new G.AdapterView.OnItemLongClickListener({
						onItemLongClick: function (parent, view, pos, id) {
							try {
								if (pos < 1 || !parent.getItemAtPosition(pos)) return;
								pos -= 1;
								Common.showOperateDialog(self.historyEdit, {
									pos: parseInt(pos),
									cmd: CA.his[pos]
								});
								return true;
							} catch (e) { return erp(e), true }
						}
					}));
					self.history.addHeaderView(self.tag1);
					self.linear.addView(self.history);
					self.tag2 = new G.TextView(ctx);
					self.tag2.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
					self.tag2.setText("收藏");
					self.tag2.setGravity(G.Gravity.LEFT);
					self.tag2.setPadding(10 * G.dp, 5 * G.dp, 5 * G.dp, 5 * G.dp);
					Common.applyStyle(self.tag2, "textview_prompt", 1);
					self.favorite = new G.ListView(ctx);
					self.favorite.addHeaderView(self.tag2);
					self.favAdapter.bindListView(self.favorite, {
						onHeaderClick: function (pos) {
							CA.showFavEditDialog({
								mode: 0,
								data: {},
								callback: function () {
									this.folder.children.push(this.data);
								},
								onDismiss: function () {
									self.refreshFavorite();
								}
							});
						},
						onHeaderLongClick: function (pos) {
							if (!self.favEmpty) self.favAdapter.expandAll();
						},
						onItemClick: function (e) {
							if (e.source == "batch") {
								CA.showBatchBuilder(e.value, true);
							} else {
								CA.cmd.setText(e.value);
								CA.showGen.activate(false);
							}
						},
						onItemLongClick: function (e, pos, parent, view, adpt) {
							var p = adpt.getParent(pos);
							Common.showOperateDialog(self.favoriteItemEdit, {
								data: e,
								folder: isNaN(p) ? null : adpt.getItem(p),
							});
						},
						onGroupClick: function (e, pos, parent, view, adpt) {
							parent.smoothScrollToPositionFromTop(pos + parent.getHeaderViewsCount(), 0, 100);
						},
						onGroupLongClick: function (e, pos, parent, view, adpt) {
							var p = adpt.getParent(pos);
							Common.showOperateDialog(self.favoriteGroupEdit, {
								data: e,
								folder: isNaN(p) ? null : adpt.getItem(p),
								pos: pos
							});
						}
					});
					self.linear.addView(self.favorite);
					CA.con.addOnLayoutChangeListener(self.layoutListener = new G.View.OnLayoutChangeListener({
						onLayoutChange: function (v, l, t, r, b, ol, ot, or, ob) {
							try {
								if (r - l == or - ol) return;
								self.screenWidth = r - l;
								if (CA.settings.splitScreenMode) {
									self.linear.setLayoutParams(new G.FrameLayout.LayoutParams(self.screenWidth, -1));
									self.history.setLayoutParams(new G.LinearLayout.LayoutParams(self.screenWidth * 0.5, -1));
									self.favorite.setLayoutParams(new G.LinearLayout.LayoutParams(self.screenWidth * 0.5, -1));
								} else {
									self.linear.setLayoutParams(new G.FrameLayout.LayoutParams(self.screenWidth * 2, -1));
									self.history.setLayoutParams(new G.LinearLayout.LayoutParams(self.screenWidth, -1));
									self.favorite.setLayoutParams(new G.LinearLayout.LayoutParams(self.screenWidth, -1));
								}
								if (self.tx < 0) self.linear.setTranslationX(self.tx = -self.screenWidth);
							} catch (e) { erp(e) }
						}
					}));
					if (G.style == "Material") {
						self.history.setVerticalScrollbarPosition(G.View.SCROLLBAR_POSITION_LEFT);
						self.history.setFastScrollEnabled(true);
						self.history.setFastScrollAlwaysVisible(false);
						self.favorite.setFastScrollEnabled(true);
						self.favorite.setFastScrollAlwaysVisible(false);
					}
					if (!CA.settings.splitScreenMode) {
						var touchSlop = G.ViewConfiguration.get(ctx).getScaledTouchSlop();
						var switchSlop = 80 * G.dp;
						self.scroller = new G.View.OnTouchListener({
							onTouch: function touch(v, e) {
								try {
									var t, f;
									switch (e.getAction()) {
										case e.ACTION_MOVE:
											f = true; t = self.x;
											self.x = e.getRawX();
											if (self.vscr && Math.abs(e.getRawX() - self.sx) - Math.abs(e.getRawY() - self.sy) < touchSlop) break;
											//超过范围，开始滑动
											self.vscr = false;
											self.stead = false;
											//计算当前偏移量（当前点X-上个点X）
											self.tx += e.getRawX() - t;
											if (self.tx > 0) {
												self.tx = 0;
											} else if (self.tx < -self.screenWidth) {
												self.tx = -self.screenWidth;
											} else {
												f = false; //未超出范围
											}
											self.linear.setTranslationX(self.tx);
											if (f) break;
											if (self.cancelled) return true;
											e.setAction(e.ACTION_CANCEL);//取回控制权
											self.cancelled = true;
											break;
										case e.ACTION_DOWN:
											//开始点
											self.sx = self.x = e.getRawX();
											self.sy = e.getRawY();
											self.lx = self.tx; //上个偏移量状态
											self.vscr = true;
											self.cancelled = false;
											break;
										case e.ACTION_CANCEL:
										case e.ACTION_UP:
											if (self.vscr) break;
											t = self.tx; //计算偏移量
											self.tx = (Math.abs(t - self.lx) < switchSlop) ? self.lx : t < self.lx ? -self.screenWidth : 0;
											self.linear.setTranslationX(self.tx);
											if (!CA.settings.noAnimation) { //动画
												var animation = new G.TranslateAnimation(G.Animation.ABSOLUTE, t - self.tx, G.Animation.ABSOLUTE, 0, G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 0);
												animation.setInterpolator(new G.DecelerateInterpolator(1.0));
												animation.setDuration(200);
												self.linear.startAnimation(animation);
											}
											if (self.cancelled) return true;
									}
									return false;
								} catch (e) { return erp(e), true }
							}
						});
						self.history.setOnTouchListener(self.scroller);
						self.favorite.setOnTouchListener(self.scroller);
					}
					PWM.registerResetFlag(CA, "history");
					PWM.registerResetFlag(self, "history");
				}
				self.refreshHistory();
				self.refreshFavorite();
				if (CA.history) return;
				CA.history = self.linear;
				self.linear.setTranslationX(self.tx = self.lx = 0);
				CA.con.addView(CA.history);
				self.layoutListener.onLayoutChange(CA.con, 0, 0, CA.con.getMeasuredWidth(), CA.con.getMeasuredHeight(), 0, 0, 0, 0);
				//if (self.tutor) self.tutor();
			} catch (e) { erp(e) }
		})
	},
	hideHistory: function () {
		G.ui(function () {
			try {
				if (!CA.history) return;
				CA.con.removeView(CA.history);
				CA.history = null;
			} catch (e) { erp(e) }
		})
	},

	showFavEditDialog: function self(o) {
		G.ui(function () {
			try {
				if (!self.getChildren) {
					self.getChildren = function (e, i, a, depth, params) {
						if (e.children) {
							var arr = e.children.filter(function (e) {
								return e.children && params.hiddenFolder.indexOf(e) < 0;
							});
							if (params.selected == e) {
								arr.push({
									key: "新增收藏夹",
									newFolder: true
								});
							}
							return arr;
						}
					}
					self.vmaker = function (holder) {
						var view = new G.TextView(ctx);
						view.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						Common.applyStyle(view, "item_default", 2);
						return view;
					}
					self.ibinder = function (holder, e, i, a, depth) {
						holder.self.setPadding((1 + depth) * 15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
						holder.self.setText(e.key);
					}
					self.gbinder = function (holder, e, i, a, depth, isExpanded, params) {
						self.ibinder(holder, e, i, a, depth);
						Common.applyStyle(holder.self, params.selected == e ? "item_highlight" : "item_default", 2);
					}
				}
				var layout, linear, title, key, value, folder, exit, popup, adpt, param;
				param = {};
				param.hiddenFolder = o.hiddenFolder || [];
				adpt = ExpandableListAdapter.control(new ExpandableListAdapter([{
					key: "根收藏夹",
					children: CA.fav,
					root: true
				}], self.getChildren, self.vmaker, self.ibinder, self.vmaker, self.gbinder, param));
				layout = new G.LinearLayout(ctx);
				layout.setLayoutParams(new G.FrameLayout.LayoutParams(-1, -2));
				layout.setOrientation(G.LinearLayout.VERTICAL);
				Common.applyStyle(layout, "message_bg");
				linear = new G.LinearLayout(ctx);
				linear.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				linear.setOrientation(G.LinearLayout.VERTICAL);
				linear.setPadding(15 * G.dp, 5 * G.dp, 15 * G.dp, 5 * G.dp);
				title = new G.TextView(ctx);
				title.setText("添加收藏");
				title.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				title.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
				title.setFocusable(true);
				Common.applyStyle(title, "textview_default", 4);
				key = new G.EditText(ctx);
				key.setHint("名称");
				key.setSingleLine(true);
				key.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
				key.setSelection(key.length());
				Common.applyStyle(key, "edittext_default", 2);
				linear.addView(key);
				value = new G.EditText(ctx);
				value.setHint("内容");
				value.setSingleLine(true);
				value.setSelection(value.length());
				Common.applyStyle(value, "edittext_default", 2);
				linear.addView(value);
				folder = new G.ListView(ctx);
				folder.addHeaderView(title);
				folder.addHeaderView(linear);
				adpt.bindListView(folder, {
					onItemClick: function (e, pos, parent, view, adpt) {
						Common.showInputDialog({
							title: "新建收藏夹",
							callback: function (s) {
								if (!s) {
									Common.toast("收藏夹名称不能为空");
								} else {
									var t = CA.getFavoriteDir(s, adpt.getItem(adpt.getParent(pos)).children);
									if (param.hiddenFolder.indexOf(t) < 0) {
										param.selected = t;
									}
									Common.toast("收藏夹已创建");
									adpt.update(adpt.getParent(pos));
								}
							},
							singleLine: true
						});
					},
					onGroupClick: function (e, pos, parent, view, adpt) {
						if (param.selected != e) {
							param.selected = e;
							adpt.expand(pos);
						}
						parent.smoothScrollToPositionFromTop(pos + parent.getHeaderViewsCount(), 0, 100);
						adpt.updateAll();
					}
				});
				folder.setLayoutParams(new G.LinearLayout.LayoutParams(-1, 0, 1));
				layout.addView(folder);
				exit = new G.TextView(ctx);
				exit.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
				exit.setText("确定");
				exit.setGravity(G.Gravity.CENTER);
				exit.setPadding(10 * G.dp, 20 * G.dp, 10 * G.dp, 20 * G.dp);
				Common.applyStyle(exit, "button_critical", 3);
				exit.setOnClickListener(new G.View.OnClickListener({
					onClick: function (v) {
						try {
							if (o.mode == 0 || o.mode == 1) {
								if (!key.length()) return Common.toast("名称不能为空");
								if (!value.length()) return Common.toast("内容不能为空");
								o.data.key = String(key.getText());
								o.data.value = String(value.getText());
							}
							o.folder = param.selected;
							if (o.callback) o.callback();
							popup.exit();
						} catch (e) { erp(e) }
					}
				}));
				layout.addView(exit);
				param.selected = o.folder ? o.folder : adpt.getItem(0);
				adpt.revealNode(param.selected);
				adpt.updateAll();
				if (o.data) {
					key.setText(o.data.key || "");
					value.setText(o.data.value || "");
				}
				switch (o.mode) {
					case 0:
						title.setText(o.title || "添加收藏");
						break;
					case 1:
						title.setText(o.title || "编辑收藏");
						adpt.setArray([]);
						break;
					case 2:
						title.setText(o.title || "移动收藏");
						folder.removeHeaderView(linear);
				}
				popup = PopupPage.showDialog("ca.FavEditDialog", layout, -1, -2);
				if (o.onDismiss) popup.on("exit", o.onDismiss);
			} catch (e) { erp(e) }
		})
	},

	showAssist: function self() {
		G.ui(function () {
			try {
				if (CA.assist) return;
				if (!self.con) {
					self.htype = -1;
					self.htext = "";
					self.keep = true;
					self.hUpdate = false;
					self.hPaused = false;
					self.postHelp = function (type, text) {
						if (type == self.htype && text == self.htext) return;
						self.htype = type;
						self.htext = text;
						self.hUpdate = true;
						self.hCheck();
					}
					self.hCheck = function () {
						G.ui(function () {
							try {
								if (!self.hUpdate) return;
								if (CA.settings.splitScreenMode || self.tx < 0) self.hLoad();
							} catch (e) { erp(e) }
						})
					}
					self.hLoad = function () {
						if (!self.wvAvailable) return self.hUpdate = false;
						self.help.getSettings().setCacheMode(Updater.isConnected() ? android.webkit.WebSettings.LOAD_DEFAULT : android.webkit.WebSettings.LOAD_CACHE_ELSE_NETWORK);
						switch (self.htype) {
							case 0:
								self.help.loadUrl(self.htext);
								break;
							case 1:
								self.help.loadData(self.htext, "text/html; charset=UTF-8", null);
								break;
							default:
								self.help.loadUrl("about:blank");
								break;
						}
						self.hUpdate = false;
					}
					self.initBrowser = function (wv) {
						var ws = wv.getSettings();
						ws.setJavaScriptEnabled(true);
						ws.setAllowFileAccess(true);
						ws.setAllowFileAccessFromFileURLs(true);
						ws.setAllowUniversalAccessFromFileURLs(true);
						ws.setSaveFormData(true);
						ws.setLoadWithOverviewMode(true);
						ws.setJavaScriptCanOpenWindowsAutomatically(true);
						ws.setLoadsImagesAutomatically(!CA.settings.noWebImage);
						ws.setAllowContentAccess(true);
						ws.setAppCacheEnabled(true);
						ws.setAppCachePath((new java.io.File(ctx.getCacheDir(), "com.huangyx.ca.webview")).getAbsolutePath());
					}
					self.initContent = function (v) {
						if (!CA.settings.splitScreenMode) {
							v.setOnTouchListener(self.scroller);
						}
					}
					self.linear = new G.LinearLayout(ctx);
					self.linear.setOrientation(G.LinearLayout.HORIZONTAL);
					self.con = new G.FrameLayout(ctx);
					self.linear.addView(self.con);
					self.help = Common.createWebView(function (wv) {
						self.wvAvailable = true;
					}, self.help);
					self.linear.addView(self.help);
					CA.con.addOnLayoutChangeListener(self.layoutListener = new G.View.OnLayoutChangeListener({
						onLayoutChange: function (v, l, t, r, b, ol, ot, or, ob) {
							try {
								if (r - l == or - ol) return;
								self.screenWidth = r - l;
								if (CA.settings.splitScreenMode) {
									self.linear.setLayoutParams(new G.FrameLayout.LayoutParams(self.screenWidth, -1));
									self.con.setLayoutParams(new G.LinearLayout.LayoutParams(self.screenWidth * 0.5, -1));
									self.help.setLayoutParams(new G.LinearLayout.LayoutParams(self.screenWidth * 0.5, -1));
								} else {
									self.linear.setLayoutParams(new G.FrameLayout.LayoutParams(self.screenWidth * 2, -1));
									self.con.setLayoutParams(new G.LinearLayout.LayoutParams(self.screenWidth, -1));
									self.help.setLayoutParams(new G.LinearLayout.LayoutParams(self.screenWidth, -1));
								}
								if (self.tx < 0) self.linear.setTranslationX(self.tx = -self.screenWidth);
							} catch (e) { erp(e) }
						}
					}));
					if (!CA.settings.splitScreenMode) {
						var touchSlop = G.ViewConfiguration.get(ctx).getScaledTouchSlop();
						var switchSlop = 80 * G.dp;
						self.scroller = new G.View.OnTouchListener({
							onTouch: function touch(v, e) {
								try {
									var t, f;
									switch (e.getAction()) {
										case e.ACTION_MOVE:
											f = true; t = self.x;
											self.x = e.getRawX();
											//网页情况下检查网页是否滑到最左侧
											if (self.lx == -self.screenWidth && (self.wvAvailable && self.help.getScrollX() != 0)) break;
											if (self.vscr && Math.abs(e.getRawX() - self.sx) - Math.abs(e.getRawY() - self.sy) < touchSlop) break;
											self.vscr = false;
											self.stead = false;
											self.tx += e.getRawX() - t;
											if (self.tx > 0) {
												self.tx = 0;
											} else if (self.tx < -self.screenWidth) {
												self.tx = -self.screenWidth;
											} else {
												f = false;
											}
											self.linear.setTranslationX(self.tx);
											if (f) break;
											if (self.cancelled) return true;
											if (self.hPaused) {
												self.hPaused = false;
												if (self.wvAvailable) self.help.onResume();
											}
											self.hCheck(); //检测是否需要加载网页
											e.setAction(e.ACTION_CANCEL);
											self.cancelled = true;
											break;
										case e.ACTION_DOWN:
											self.sx = self.x = e.getRawX();
											self.sy = e.getRawY();
											self.lx = self.tx;
											self.vscr = true;
											self.cancelled = false;
											break;
										case e.ACTION_CANCEL:
										case e.ACTION_UP:
											if (self.vscr) break;
											t = self.tx;
											self.tx = (Math.abs(t - self.lx) < switchSlop) ? self.lx : t < self.lx ? -self.screenWidth : 0;
											self.linear.setTranslationX(self.tx);
											if (!CA.settings.noAnimation) {
												var animation = new G.TranslateAnimation(G.Animation.ABSOLUTE, t - self.tx, G.Animation.ABSOLUTE, 0, G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 0);
												animation.setInterpolator(new G.DecelerateInterpolator(1.0));
												animation.setDuration(200);
												self.linear.startAnimation(animation);
											}
											if (!self.hPaused && self.tx == 0) {
												if (self.wvAvailable) self.help.onPause();
												self.hPaused = true;
											}
											if (self.cancelled) return true;
									}
									return false;
								} catch (e) { return erp(e), true }
							}
						});
						self.help.setOnTouchListener(self.scroller);
					}
					PWM.registerResetFlag(CA, "assist");
					PWM.registerResetFlag(self, "con");
					PWM.on("reset", function () {
						Common.destroyWebView(self.help);
						self.help = null;
					});
				}
				self.linear.setTranslationX(self.tx = self.lx = 0);
				CA.assist = self.linear;
				CA.con.addView(CA.assist);
				self.layoutListener.onLayoutChange(CA.con, 0, 0, CA.con.getMeasuredWidth(), CA.con.getMeasuredHeight(), 0, 0, 0, 0);
			} catch (e) { erp(e) }
		})
	},
	hideAssist: function () {
		G.ui(function () {
			try {
				if (!CA.assist) return;
				CA.showAssist.postHelp(-1);
				CA.showAssist.hLoad();
				CA.con.removeView(CA.assist);
				CA.Assist.hide(); CA.IntelliSense.hide();
				CA.assist = null;
			} catch (e) { erp(e) }
		})
	},

	showHistoryEdit: function self(pos, callback) {
		G.ui(function () {
			try {
				if (!self.linear) {
					self.adapter = null;
					self.refresh = function (pos) {
						var a;
						self.selection = new Array(CA.his.length);
						if (pos != null) self.selection[pos] = true;
						if (CA.his.length == 0) {
							self.adapter = null;
							self.list.setAdapter(EmptyAdapter);
						} else {
							if (self.adapter) {
								self.adapter.notifyChange();
							} else {
								self.list.setAdapter(a = new SimpleListAdapter(CA.his, self.vmaker, self.vbinder));
								self.adapter = SimpleListAdapter.getController(a);
							}
						}
						self.refreshBar();
					}
					self.refreshBar = function () {
						var i, c = 0, e;
						for (i = 0; i < self.selection.length; i++) {
							if (!self.selection[i]) continue;
							c++;
						}
						for (i = 0; i < self.actions.length; i++) {
							e = self.actions[i];
							if (e.type == 0) { //总是显示
								e.view.setVisibility(G.View.VISIBLE);
							} else if (e.type == 1) { //仅选中1个时显示
								e.view.setVisibility(c == 1 ? G.View.VISIBLE : G.View.GONE);
							} else if (e.type == 2) { //选中1个或多个时显示
								e.view.setVisibility(c > 0 ? G.View.VISIBLE : G.View.GONE);
							}
						}
						self.title.setText("编辑 历史 （" + c + "/" + self.selection.length + "）");
					}
					self.actions = [{
						type: 0,
						text: "全选",
						action: function () {
							var i;
							for (i = 0; i < self.selection.length; i++) {
								self.selection[i] = true;
							}
							if (self.adapter) self.adapter.notifyChange();
							self.refreshBar();
						}
					}, {
						type: 2,
						text: "反选",
						action: function () {
							var i;
							for (i = 0; i < self.selection.length; i++) {
								self.selection[i] = !self.selection[i];
							}
							if (self.adapter) self.adapter.notifyChange();
							self.refreshBar();
						}
					}, {
						type: 2,
						text: "清除选择",
						action: function () {
							var i;
							for (i = 0; i < self.selection.length; i++) {
								self.selection[i] = false;
							}
							if (self.adapter) self.adapter.notifyChange();
							self.refreshBar();
						}
					}, {
						type: 2,
						text: "添加收藏",
						action: function () {
							CA.showFavEditDialog({
								title: "选择收藏夹",
								mode: 2,
								callback: function () {
									var z = this.folder.children, i, c = 0;
									for (i = 0; i < self.selection.length; i++) {
										if (!self.selection[i]) continue;
										c++;
										CA.addFavorite({
											key: "历史记录(" + c + ")",
											value: CA.his[i]
										}, z);
									}
									Common.toast(c + "条命令已收藏");
								},
								onDismiss: function () {
									if (CA.history) CA.showHistory();
								}
							});
						}
					}, {
						type: 2,
						text: "复制",
						action: function () {
							var z = [], i, c = 0;
							for (i = 0; i < self.selection.length; i++) {
								if (!self.selection[i]) continue;
								z.push(CA.his[i]);
								c++;
							}
							Common.setClipboardText(z.join("\n"));
							Common.toast(c + "条命令已复制");
						}
					}, {
						type: 0,
						text: "导入",
						action: function () {
							ExternalStorage.showImportActions({
								mimeType: "application/json",
								uri(uri) {
									try {
										const content = ExternalStorage.readFileContent(uri, "UTF-8", "[]");
										const r = JSON.parse(content);
										if (!Array.isArray(r)) throw "不正确的收藏夹格式";
										r.forEach((e) => {
											e = String(e);
											if (e.length) CA.addHistory(e);
										});
										self.refresh();
										Common.toast("历史已成功导入");
									} catch (e) {
										erp(e, true);
										Common.toast("历史导入失败\n" + e);
									}
								}
							});
						}
					}, {
						type: 2,
						text: "导出",
						action: function () {
							var z = [], i;
							for (i = 0; i < self.selection.length; i++) {
								if (!self.selection[i]) continue;
								z.push(CA.his[i]);
							}
							ExternalStorage.showExportActions({
								mimeType: "application/json",
								hint: "历史.json",
								export(uri) {
									ExternalStorage.writeFileContent(uri, JSON.stringify(z, null, 4));
								}
							});
						}
					}, {
						type: 2,
						text: "删除",
						action: function () {
							var i, c = 0;
							for (i = self.selection.length - 1; i >= 0; i--) {
								if (!self.selection[i]) continue;
								CA.his.splice(i, 1);
								c++;
							}
							Common.toast(c + "条命令已删除");
							self.refresh();
						}
					}];
					self.vmaker = function (holder) {
						var layout = new G.LinearLayout(ctx),
							check = holder.check = new G.CheckBox(ctx),
							text = holder.text = new G.TextView(ctx);
						layout.setGravity(G.Gravity.CENTER);
						layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						layout.setOrientation(G.LinearLayout.HORIZONTAL);
						check.setOnCheckedChangeListener(new G.CompoundButton.OnCheckedChangeListener({
							onCheckedChanged: function (v, s) {
								try {
									self.selection[holder.pos] = s;
									if (!holder.busy) self.refreshBar();
								} catch (e) { erp(e) }
							}
						}));
						check.setFocusable(false);
						layout.addView(check);
						text.setPadding(5 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
						text.setLayoutParams(new G.LinearLayout.LayoutParams(0, -2, 1.0));
						text.setMaxLines(2);
						text.setEllipsize(G.TextUtils.TruncateAt.END);
						Common.applyStyle(text, "textview_default", 3);
						layout.addView(text);
						return layout;
					}
					self.vbinder = function (holder, e, i) {
						holder.busy = true;
						holder.check.setChecked(self.selection[i] == true);
						holder.text.setText(e);
						holder.busy = false;
					}
					self.linear = new G.LinearLayout(ctx);
					self.linear.setOrientation(G.LinearLayout.VERTICAL);
					Common.applyStyle(self.linear, "container_default");
					self.header = new G.LinearLayout(ctx);
					self.header.setOrientation(G.LinearLayout.HORIZONTAL);
					self.header.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
					Common.applyStyle(self.header, "bar_float");
					self.back = new G.TextView(ctx);
					self.back.setText("< 返回");
					self.back.setGravity(G.Gravity.CENTER);
					self.back.setPadding(15 * G.dp, 0, 15 * G.dp, 0);
					self.back.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
					Common.applyStyle(self.back, "button_highlight", 2);
					self.back.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								self.popup.exit();
								return true;
							} catch (e) { erp(e) }
						}
					}));
					self.header.addView(self.back);
					self.title = new G.TextView(ctx);
					self.title.setPadding(0, 10 * G.dp, 15 * G.dp, 10 * G.dp);
					self.title.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2));
					Common.applyStyle(self.title, "textview_default", 4);
					self.header.addView(self.title);

					self.hscr = new G.HorizontalScrollView(ctx);
					self.hscr.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -1));
					self.hscr.setHorizontalScrollBarEnabled(false);
					self.hscr.setFillViewport(true);
					self.bar = new G.LinearLayout(ctx);
					self.bar.setOrientation(G.LinearLayout.HORIZONTAL);
					self.bar.setPadding(0, 0, 5 * G.dp, 0);
					self.bar.setLayoutParams(new G.FrameLayout.LayoutParams(-1, -1));
					self.bar.setGravity(G.Gravity.RIGHT);
					self.actions.forEach(function (o) {
						var b = new G.TextView(ctx);
						b.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
						b.setText(o.text);
						b.setGravity(G.Gravity.CENTER);
						b.setPadding(5 * G.dp, 5 * G.dp, 5 * G.dp, 5 * G.dp);
						Common.applyStyle(b, "button_highlight", 2);
						b.setOnClickListener(new G.View.OnClickListener({
							onClick: function (v) {
								try {
									o.action();
								} catch (e) { erp(e) }
							}
						}));
						self.bar.addView(o.view = b);
					});
					self.hscr.addView(self.bar);
					self.header.addView(self.hscr);
					self.linear.addView(self.header);

					self.list = new G.ListView(ctx);
					self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({
						onItemClick: function (parent, view, pos, id) {
							try {
								if (self.adapter) self.adapter.getHolder(view).check.performClick();
							} catch (e) { erp(e) }
						}
					}));
					self.linear.addView(self.list);
					if (G.style == "Material") {
						self.list.setFastScrollEnabled(true);
						self.list.setFastScrollAlwaysVisible(false);
					}

					self.popup = new PopupPage(self.linear, "ca.HistoryEdit");
					self.popup.on("exit", function () {
						if (self.callback) self.callback();
					});

					PWM.registerResetFlag(self, "linear");
				}
				self.refresh(pos);
				self.callback = callback;
				self.popup.enter();
			} catch (e) { erp(e) }
		})
	},

	showFavoriteEdit: function self(data, callback) {
		G.ui(function () {
			try {
				if (!self.linear) {
					self.adapter = null;
					self.trace = function (data, root) {
						var i, r, a = root.children;
						for (i = 0; i < a.length; i++) {
							if (data == a[i]) return [root];
							if (a[i].children) {
								r = self.trace(data, a[i]);
								if (r) {
									r.unshift(root);
									return r;
								}
							}
						}
					}
					self.init = function (data) {
						var t = {
							key: "根",
							children: CA.fav
						};
						self.path = self.trace(data, t) || [t];
						self.refresh(data);
					}
					self.refresh = function (data) {
						var a, t = self.path[self.path.length - 1];
						self.array = t.children.slice();
						self.selection = new Array(self.array.length);
						if (data != null) self.selection[self.array.indexOf(data)] = true;
						if (self.array.length == 0) {
							self.adapter = null;
							self.list.setAdapter(EmptyAdapter);
						} else {
							if (self.adapter) {
								self.adapter.setSync(self.array);
							} else {
								self.list.setAdapter(a = new SimpleListAdapter(self.array, self.vmaker, self.vbinder));
								self.adapter = SimpleListAdapter.getController(a);
							}
						}
						self.pathbar.setVisibility(self.path.length > 1 ? G.View.VISIBLE : G.View.GONE);
						self.pathbar.setText("返回上层 " + self.path.map(function (e) {
							return e.key;
						}).join(" > "));
						self.refreshBar();
					}
					self.refreshBar = function () {
						var i, c = 0, e;
						for (i = 0; i < self.selection.length; i++) {
							if (!self.selection[i]) continue;
							c++;
						}
						for (i = 0; i < self.actions.length; i++) {
							e = self.actions[i];
							if (e.type == 0) { //总是显示
								e.view.setVisibility(G.View.VISIBLE);
							} else if (e.type == 1) { //仅选中1个时显示
								e.view.setVisibility(c == 1 ? G.View.VISIBLE : G.View.GONE);
							} else if (e.type == 2) { //选中1个或多个时显示
								e.view.setVisibility(c > 0 ? G.View.VISIBLE : G.View.GONE);
							}
						}
						self.title.setText("编辑 收藏 （" + c + "/" + self.selection.length + "）");
					}
					self.editFav = function (pos) {
						CA.showFavEditDialog({
							mode: 1,
							data: self.array[pos],
							folder: self.path[self.path.length - 1],
							callback: function () {
								self.refresh();
							}
						});
					}
					self.actions = [{
						type: 0,
						text: "全选",
						action: function () {
							var i;
							for (i = 0; i < self.selection.length; i++) {
								self.selection[i] = true;
							}
							if (self.adapter) self.adapter.notifyChange();
							self.refreshBar();
						}
					}, {
						type: 2,
						text: "反选",
						action: function () {
							var i;
							for (i = 0; i < self.selection.length; i++) {
								self.selection[i] = !self.selection[i];
							}
							if (self.adapter) self.adapter.notifyChange();
							self.refreshBar();
						}
					}, {
						type: 2,
						text: "清除选择",
						action: function () {
							var i;
							for (i = 0; i < self.selection.length; i++) {
								self.selection[i] = false;
							}
							if (self.adapter) self.adapter.notifyChange();
							self.refreshBar();
						}
					}, {
						type: 2,
						text: "移动",
						action: function () {
							var fd = self.path[self.path.length - 1];
							var i, a = [];
							for (i = 0; i < self.selection.length; i++) {
								if (!self.selection[i]) continue;
								a.push(self.array[i]);
							}
							CA.showFavEditDialog({
								mode: 2,
								folder: fd,
								hiddenFolder: a,
								callback: function () {
									for (i = 0; i < a.length; i++) {
										CA.removeFavorite(a[i], fd.children);
										CA.addFavorite(a[i], this.folder.children);
									}
									self.refresh();
								}
							});
						}
					}, {
						type: 0,
						text: "导入",
						action: function () {
							var fd = self.path[self.path.length - 1];
							ExternalStorage.showImportActions({
								mimeType: "application/json",
								uri(uri) {
									try {
										const content = ExternalStorage.readFileContent(uri, "UTF-8", "[]");
										const r = JSON.parse(content);
										if (!Array.isArray(r)) throw "不正确的收藏夹格式";
										r.forEach((e) => {
											CA.addFavorite(e, fd.children);
										});
										self.refresh();
										Common.toast("收藏已成功导入");
									} catch (e) {
										erp(e, true);
										Common.toast("收藏夹导入失败\n" + e);
									}
								}
							});
						}
					}, {
						type: 2,
						text: "导出",
						action: function () {
							var fd = self.path[self.path.length - 1];
							var i, a = [];
							for (i = 0; i < self.selection.length; i++) {
								if (!self.selection[i]) continue;
								a.push(self.array[i]);
							}
							ExternalStorage.showExportActions({
								mimeType: "application/json",
								hint: "收藏.json",
								export(uri) {
									ExternalStorage.writeFileContent(uri, JSON.stringify(a, null, 4));
								}
							});
						}
					}, {
						type: 2,
						text: "删除",
						action: function () {
							var i, c = 0;
							for (i = self.selection.length; i >= 0; i--) {
								if (!self.selection[i]) continue;
								CA.removeFavorite(self.array[i]);
								c++;
							}
							Common.toast(c + "条命令已删除");
							self.refresh();
						}
					}];
					self.vmaker = function (holder) {
						var layout = new G.LinearLayout(ctx),
							check = holder.check = new G.CheckBox(ctx),
							linear = new G.LinearLayout(ctx),
							text1 = holder.text1 = new G.TextView(ctx),
							text2 = holder.text2 = new G.TextView(ctx),
							edit = holder.edit = new G.ImageView(ctx);
						layout.setGravity(G.Gravity.CENTER);
						layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						layout.setOrientation(G.LinearLayout.HORIZONTAL);
						check.setOnCheckedChangeListener(new G.CompoundButton.OnCheckedChangeListener({
							onCheckedChanged: function (v, s) {
								try {
									self.selection[holder.pos] = s;
									if (!holder.busy) self.refreshBar();
								} catch (e) { erp(e) }
							}
						}));
						check.setFocusable(false);
						layout.addView(check);
						edit.setImageResource(G.R.drawable.ic_menu_edit);
						edit.setScaleType(G.ImageView.ScaleType.FIT_CENTER);
						edit.setLayoutParams(new G.LinearLayout.LayoutParams(24 * G.dp, -1));
						edit.getLayoutParams().setMargins(5 * G.dp, 0, 5 * G.dp, 0);
						edit.setOnClickListener(new G.View.OnClickListener({
							onClick: function (v) {
								try {
									self.editFav(holder.pos);
								} catch (e) { erp(e) }
							}
						}));
						layout.addView(edit);
						linear.setLayoutParams(new G.LinearLayout.LayoutParams(0, -2, 1));
						linear.setOrientation(G.LinearLayout.VERTICAL);
						text1.setPadding(10 * G.dp, 15 * G.dp, 15 * G.dp, 5 * G.dp);
						text1.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
						Common.applyStyle(text1, "textview_default", 3);
						linear.addView(text1);
						text2.setPadding(10 * G.dp, 0, 15 * G.dp, 15 * G.dp);
						text2.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
						text2.setEllipsize(G.TextUtils.TruncateAt.END);
						text2.setSingleLine(true);
						Common.applyStyle(text2, "textview_prompt", 1);
						linear.addView(text2);
						layout.addView(linear);
						return layout;
					}
					self.vbinder = function (holder, e, i) {
						holder.busy = true;
						holder.check.setChecked(self.selection[i] == true);
						holder.text1.setText(String(e.key));
						holder.text2.setText(e.children ? "文件夹，包含" + e.children.length + "个成员" : e.value);
						holder.edit.setVisibility(e.children ? G.View.GONE : G.View.VISIBLE);
						holder.busy = false;
					}
					self.linear = new G.LinearLayout(ctx);
					self.linear.setOrientation(G.LinearLayout.VERTICAL);
					Common.applyStyle(self.linear, "container_default");
					self.header = new G.LinearLayout(ctx);
					self.header.setOrientation(G.LinearLayout.HORIZONTAL);
					self.header.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
					Common.applyStyle(self.header, "bar_float");
					self.back = new G.TextView(ctx);
					self.back.setText("< 返回");
					self.back.setGravity(G.Gravity.CENTER);
					self.back.setPadding(15 * G.dp, 0, 15 * G.dp, 0);
					self.back.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
					Common.applyStyle(self.back, "button_highlight", 2);
					self.back.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								self.popup.exit();
								return true;
							} catch (e) { erp(e) }
						}
					}));
					self.header.addView(self.back);
					self.title = new G.TextView(ctx);
					self.title.setPadding(0, 10 * G.dp, 15 * G.dp, 10 * G.dp);
					self.title.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2));
					Common.applyStyle(self.title, "textview_default", 4);
					self.header.addView(self.title);
					self.hscr = new G.HorizontalScrollView(ctx);
					self.hscr.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -1));
					self.hscr.setHorizontalScrollBarEnabled(false);
					self.hscr.setFillViewport(true);
					self.bar = new G.LinearLayout(ctx);
					self.bar.setOrientation(G.LinearLayout.HORIZONTAL);
					self.bar.setPadding(0, 0, 5 * G.dp, 0);
					self.bar.setLayoutParams(new G.FrameLayout.LayoutParams(-1, -1));
					self.bar.setGravity(G.Gravity.RIGHT);
					self.actions.forEach(function (o) {
						var b = new G.TextView(ctx);
						b.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
						b.setText(o.text);
						b.setGravity(G.Gravity.CENTER);
						b.setPadding(5 * G.dp, 5 * G.dp, 5 * G.dp, 5 * G.dp);
						Common.applyStyle(b, "button_highlight", 2);
						b.setOnClickListener(new G.View.OnClickListener({
							onClick: function (v) {
								try {
									o.action();
								} catch (e) { erp(e) }
							}
						}));
						self.bar.addView(o.view = b);
					});
					self.hscr.addView(self.bar);
					self.header.addView(self.hscr);
					self.linear.addView(self.header);

					self.pathbar = new G.TextView(ctx);
					self.pathbar.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
					self.pathbar.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
					Common.applyStyle(self.pathbar, "bar_float_second");
					Common.applyStyle(self.pathbar, "text_prompt", 2);
					self.pathbar.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								if (self.path.length < 2) return;
								self.path.length -= 1;
								self.refresh();
							} catch (e) { erp(e) }
						}
					}));
					self.linear.addView(self.pathbar);

					self.list = new G.ListView(ctx);
					self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({
						onItemClick: function (parent, view, pos, id) {
							try {
								if (self.array[pos].children) {
									self.path.push(self.array[pos]);
									self.refresh();
								} else {
									if (self.adapter) self.adapter.getHolder(view).check.performClick();
								}
							} catch (e) { erp(e) }
						}
					}));
					self.linear.addView(self.list);
					if (G.style == "Material") {
						self.list.setFastScrollEnabled(true);
						self.list.setFastScrollAlwaysVisible(false);
					}

					self.popup = new PopupPage(self.linear, "ca.FavoriteEdit");
					self.popup.on("exit", function () {
						if (self.callback) self.callback();
					});

					PWM.registerResetFlag(self, "linear");
				}
				self.init(data);
				self.callback = callback;
				self.popup.enter();
			} catch (e) { erp(e) }
		})
	},

	performExit: function () {
		G.ui(function () {
			try {
				unload();
				if (MapScript.host == "AutoJs") {
					ctx.finish();
				} else if (MapScript.host == "Android") {
					ScriptInterface.quit();
				}
			} catch (e) { erp(e) }
		})
	},

	showSettings: function self() {
		G.ui(function () {
			try {
				if (!self.root) {
					self.getsettingbool = function () {
						return Boolean(CA.settings[this.id]);
					}
					self.setsettingbool = function (v) {
						CA.settings[this.id] = Boolean(v);
					}
					self.refresh = function (f) {
						Common.loadTheme(Common.theme.id);
						if (self.refreshed) return;
						self.refreshed = true;
						CA.resetGUI();
						CA.showMain(true);
						if (f) CA.showSettings();
						CA.showIcon();
					}
					self.root = [UserManager.getSettingItem(), {
						type: "space",
						height: 12 * G.dp
					}, {
						name: "外观",
						description: "主题、悬浮窗、背景图片",
						type: "custom",
						onclick: function (fset) {
							Common.showSettings("外观", self.appearance);
						}
					}, {
						name: "智能补全",
						description: "智能模式、拓展包管理、粘贴模式",
						type: "custom",
						onclick: function (fset) {
							Common.showSettings("智能补全", self.intellisense);
						}
					}, {
						name: "用户数据",
						description: "历史、收藏、自定义短语",
						type: "custom",
						onclick: function (fset) {
							Common.showSettings("用户数据", self.userdata);
						}
					}, {
						name: "推送信息",
						description: "推送信息管理与历史信息查看",
						type: "custom",
						hidden: function () {
							return MapScript.host != "Android";
						},
						onclick: function (fset) {
							PushService.showSettings("推送设置");
						}
					}, {
						name: "辅助功能",
						description: "无障碍服务、WebSocket服务器",
						type: "custom",
						hidden: function () {
							return MapScript.host != "Android";
						},
						onclick: function (fset) {
							AndroidBridge.showSettings("辅助功能设置");
						}
					}, {
						name: "关于命令助手",
						type: "custom",
						onclick: function (fset) {
							Common.showSettings("关于", self.about);
						}
					}];
					self.about = [MapScript.host == "Android" ? {
						type: "layout",
						maker: function (holder) {
							var linear, icon, title, desp;
							linear = new G.LinearLayout(ctx);
							linear.setOrientation(G.LinearLayout.VERTICAL);
							linear.setPadding(0, 20 * G.dp, 0, 20 * G.dp);
							linear.setGravity(G.Gravity.CENTER);
							icon = new G.ImageView(ctx);
							icon.setImageResource(com.huangyx.ca.R.drawable.icon);
							icon.setLayoutParams(new G.LinearLayout.LayoutParams(80 * G.dp, 80 * G.dp));
							linear.addView(icon);
							title = new G.TextView(ctx);
							title.setPadding(0, 15 * G.dp, 0, 0);
							title.setGravity(G.Gravity.CENTER);
							title.setText("命令助手 Reforged  " + BuildConfig.version);
							title.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
							Common.applyStyle(title, "textview_default", 4);
							linear.addView(title);
							desp = new G.TextView(ctx);
							desp.setGravity(G.Gravity.CENTER);
							desp.setText("非官方社区版 由 南鸢晨星 维护，原作者 ProjectXero");
							desp.setTypeface(G.Typeface.SERIF || G.Typeface.DEFAULT);
							desp.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
							Common.applyStyle(desp, "textview_prompt", 2);
							linear.addView(desp);
							return linear;
						},
						onclick: function () {
							Updater.showCurrentVersionInfo();
						},
						onExit: function () {
							this.view = null;
						}
					} : {
						name: "版本信息",
						type: "custom",
						get: function () {
							return CA.versionName;
						},
						onclick: function () {
							Updater.showCurrentVersionInfo();
						}
					}, {
						name: "检查更新",
						type: "custom",
						get: function () {
							return Updater.getVersionInfo();
						},
						onclick: function (fset) {
							if (BuildConfig.variants == "release") {
								if (Updater.updateFlag <= 0) {
									Common.toast("目前没有已公开的更新版本哦\n联系南鸢晨星更新社区版吧~");
								} else {
									Updater.checkUpdate(function (statusMsg) {
										fset();
									});
								}
							} else {
								if (Updater.updateFlagBeta <= 0) {
									Common.toast("目前没有已公开的更新Beta版本哦\n联系南鸢晨星更新社区版吧~");
								} else {
									Updater.checkUpdateBeta(function (statusMsg) {
										fset();
									});
								}
							}
						}
					}/*, {
				name : "分享软件",
				type : "custom",
				onclick : function() {
					var t = "https://www.coolapk.com/game/190152";
					try {
						AndroidBridge.startActivity(new android.content.Intent(android.content.Intent.ACTION_SEND)
							.setType("text/plain")
							.putExtra(android.content.Intent.EXTRA_TEXT, new java.lang.String("Hi，我发现一款很棒的Minecraft辅助软件，命令助手。下载链接：" + t))
							.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
					} catch(e) {
						Common.setClipboardText(t);
						Common.toast("下载链接已复制到剪贴板");
					}
				}
			}*//*, {
				name : "意见与反馈",
				type : "custom",
				onclick : function() {
					IssueService.showIssuesWithAgreement();
				}
			}*/, {
						name: "项目官网",
						type: "custom",
						onclick: function () {
							try {
								AndroidBridge.startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://ca.nycx.top/"))
									.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
							} catch (e) {
								Common.toast("项目官网打开失败");
								Log.e(e);
							}
						}
					}, {
						name: "加入交流群",
						type: "custom",
						onclick: function () {
							// Common.toast("当前版本还没有QQ群呢");
							Common.toast("QQ群号已复制到剪切板");
							Common.setClipboardText("1044451866");
							try {
								AndroidBridge.startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://qm.qq.com/q/dTqhmNpcoo"))
									.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
							} catch (e) {
								Log.e(e);
							}
						}
					}, {
						name: "支持开发",
						type: "custom",
						hidden: function () {
							if (MapScript.host == "Android") {
								if (ScriptInterface.isOnlineMode()) {
									return true;
								}
							}
							return false;
						},
						onclick: function () {
							Common.toast("捐赠功能已移除。如需支持原作者，请访问原项目。");
						}
					}, {
						name: "许可协议",
						type: "custom",
						onclick: function () {
							Common.showWebViewDialog({
								url: "https://ca.nycx.top/doc/legal/eula.html"
							});
						}
					}, {
						name: "隐私政策",
						type: "custom",
						onclick: function () {
							Common.showWebViewDialog({
								url: "https://ca.nycx.top/doc/legal/privacy.html"
							});
						}
					}, {
						name: "关于命令助手",
						type: "custom",
						onclick: function () {
							try {
								AndroidBridge.startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://ca.nycx.top/"))
									.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
							} catch (e) {
								Common.toast("关于页面打开失败");
								Log.e(e);
							}
						}
					}, {
						name: "自动检查更新",
						type: "boolean",
						get: function () {
							return !CA.settings.skipCheckUpdate;
						},
						set: function (v) {
							CA.settings.skipCheckUpdate = !v;
						}
					}, {
						name: "自动发送诊断信息",
						description: "信息将用来定位、分析命令助手中的问题，可能包含用户数据",
						type: "boolean",
						get: function () {
							return !erp.notReport;
						},
						set: function (v) {
							if (BuildConfig.variants == "snapshot" && !v) {
								v = true;
								Common.toast("快照版必须启用此选项");
							} else if (BuildConfig.variants == "debug" && v) {
								v = false;
								Common.toast("调试版必须禁用此选项");
							}
							CA.settings.notReportError = !v;
							erp.notReport = CA.settings.notReportError;
						}
					},/* {
				name : "Beta计划",
				description : "检测Beta版更新，体验新版功能",
				type : "custom",
				get : function() {
					return CA.settings.betaUpdate ? "已加入" : "未加入";
				},
				onclick : function(fset) {
					if (CA.settings.betaUpdate) {
						Updater.cleanBetaFiles();
						Common.toast("快照已删除，请手动删除快照桌面快捷方式");
						CA.settings.betaUpdate = false;
						fset();
					} else {
						Updater.installBeta(function(error) {
							if (error) return Common.toast("下载快照失败\n" + error);
							AndroidBridge.createShortcut(new android.content.Intent("com.huangyx.ca.DEBUG_EXEC")
								.setComponent(new android.content.ComponentName("com.huangyx.ca", "com.huangyx.ca.MainActivity"))
								.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK), 
								"命令助手快照",
								com.huangyx.ca.R.mipmap.icon_small);
							Common.toast("桌面快捷方式已创建，如果没看到请检查命令助手是否有创建桌面快捷方式的权限");
							CA.settings.betaUpdate = true;
							fset();
						}, true);
					}
				}
			},*/ {
						name: "开发者工具",
						type: "tag"
					}, {
						id: "enableDebugAction",
						name: "启用自定义动作",
						type: "boolean",
						refresh: function () {
							DebugUtils.updateDebugAction();
						},
						get: self.getsettingbool,
						set: self.setsettingbool
					}, {
						name: "JSON编辑器",
						type: "custom",
						onclick: function () {
							JSONEdit.main();
						}
					}, {
						name: "控制台",
						type: "custom",
						onclick: function (fset) {
							DebugUtils.showDebugDialog();
						}
					},
					{
						name: "日志调试",
						type: "tag"
					},
					{
						name: "启用日志服务器",
						description: "仅供开发使用",
						type: "boolean",
						get: function () {
							return Boolean(CA.settings.LogServer.enabled);
						},
						set: function (v) {
							CA.settings.LogServer.enabled = Boolean(v);
							CA.trySave();
							if (v === true) {
								Common.toast("日志服务器 已启用 如未生效请检查地址...")
								CA.sendLog.info("喵呜~") // 测试发送
							} else {
								Common.toast("日志服务器 已禁用")
							}
							;
						}
					},
					{
						name: "日志服务器地址",
						type: "custom",
						get: function () {
							return CA.settings.LogServer.address;
						},
						onclick: function (fset) {
							Common.showInputDialog({
								title: "日志服务器地址",
								defaultValue: CA.settings.LogServer.address,
								callback: function (s) {
									CA.settings.LogServer.address = s
									CA.trySave();
									Common.toast("日志服务器 已设置为 " + s)
									fset();
								}
							});
						}
					},
					{
						name: "错误记录",
						type: "custom",
						onclick: function () {
							CA.manageErrors();
						}
					},];
					self.appearance = [{
						name: "界面主题",
						type: "custom",
						get: function () {
							return Common.theme.name;
						},
						onclick: function () {
							Common.showChangeTheme(function () {
								self.refresh(true);
							});
						}
					}, {
						id: "noAnimation",
						name: "关闭动画",
						description: "关闭部分动画以减轻卡顿。",
						type: "boolean",
						get: self.getsettingbool,
						set: self.setsettingbool
					}, {
						name: "悬浮图标",
						type: "tag"
					}, {
						name: "图标样式",
						type: "custom",
						get: function () {
							return "点击以修改";
						},
						onclick: function () {
							CA.showIconChooser(function () {
								if (CA.showIcon.refresh) CA.showIcon.refreshIcon();
							});
						}
					}, {
						name: "图标大小",
						type: "seekbar",
						values: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4],
						current: function (p) {
							return parseInt(this.values[p] * 100) + "%";
						},
						max: 10,
						get: function () {
							var i = this.values.indexOf(CA.settings.iconSize);
							return i >= 0 ? i : 3;
						},
						set: function (v) {
							CA.settings.iconSize = this.values[v];
							if (CA.showIcon.refresh) {
								CA.showIcon.refreshIcon();
								CA.showIcon.refreshPos();
							}
						}
					}, {
						name: "不透明度",
						type: "seekbar",
						current: function (p) {
							return p == 0 ? "自动" : p + "0%";
						},
						max: 10,
						get: function () {
							return isNaN(CA.settings.iconAlpha) ? 0 : CA.settings.iconAlpha;
						},
						set: function (v) {
							CA.settings.iconAlpha = v;
							if (CA.showIcon.refresh) CA.showIcon.refreshAlpha();
						}
					}, {
						name: "拖动方式",
						type: "custom",
						list: [
							"自由拖动",
							"自动贴边",
							"固定"
						],
						get: function () {
							if (CA.settings.iconDragMode in this.list) {
								return this.list[CA.settings.iconDragMode];
							} else {
								return this.list[CA.settings.iconDragMode = 0];
							}
						},
						onclick: function (fset) {
							Common.showListChooser(this.list, function (i) {
								CA.settings.iconDragMode = i;
								if (CA.showIcon.refresh) CA.showIcon.refreshPos();
								fset();
							});
						}
					}, {
						id: "autoHideIcon",
						name: "自动隐藏悬浮窗",
						type: "boolean",
						hidden: function () {
							return MapScript.host != "BlockLauncher";
						},
						get: self.getsettingbool,
						set: self.setsettingbool
					}, {
						name: "快捷栏动作菜单",
						type: "custom",
						get: function () {
							return CA.settings.quickBarActions.length + "个动作";
						},
						onclick: function (fset) {
							CA.showActionEdit(CA.settings.quickBarActions, fset, CA.quickBarDefaultActions);
						}
					}, {
						name: "悬浮窗",
						type: "tag"
					}, {
						name: "不活跃时不透明度",
						type: "seekbar",
						current: function (p) {
							return p + "%";
						},
						max: 100,
						get: function () {
							return isNaN(CA.settings.unfocusedAlpha) ? 70 : CA.settings.unfocusedAlpha * 100;
						},
						set: function (v) {
							var value = v / 100;
							CA.settings.unfocusedAlpha = value;
							PopupPage.setAlpha(1, value);
						}
					}, {
						name: "命令生成器",
						type: "tag"
					}, {
						name: "背景图片",
						type: "custom",
						hidden: function () {
							return android.os.Build.VERSION.SDK_INT < 16;
						},
						get: function () {
							return "点击选择";
						},
						onclick: function () {
							CA.showManageBgImage(function () {
								self.refresh(true);
							});
						}
					}, {
						id: "keepWhenIME",
						name: "禁用压缩列表栏",
						description: "当输入法弹出时不再压缩列表栏。",
						type: "boolean",
						get: self.getsettingbool,
						set: self.setsettingbool
					}, {
						id: "splitScreenMode",
						name: "双栏模式",
						description: "推荐大屏手机/Pad使用",
						type: "boolean",
						refresh: self.refresh,
						get: self.getsettingbool,
						set: self.setsettingbool
					}, {
						id: "openMenuByLongClick",
						name: "长按输入栏打开菜单",
						type: "boolean",
						refresh: self.refresh,
						get: self.getsettingbool,
						set: self.setsettingbool
					}, {
						id: "showClearButton",
						name: "显示输入栏右侧的删除图标",
						type: "boolean",
						refresh: self.refresh,
						get: self.getsettingbool,
						set: self.setsettingbool
					}, {
						id: "noWebImage",
						name: "不加载图片",
						description: "加载网页时不加载图片",
						type: "boolean",
						get: self.getsettingbool,
						set: self.setsettingbool
					}];
					self.intellisense = [{
						name: "智能模式",
						type: "custom",
						get: function () {
							var t = CA.settings.iiMode;
							return t == 1 ? "初学者模式" : t == 2 ? "专家模式" : t == 3 ? "自动选择" : "关闭";
						},
						onclick: function () {
							CA.showModeChooser(function () {
								self.refresh(true);
							});
						}
					}, {
						id: "senseDelay",
						name: "启用多线程",
						description: "IntelliSense将不会即时输出结果以避免卡顿。",
						type: "boolean",
						get: self.getsettingbool,
						set: self.setsettingbool
					}, {
						id: "autoFormatCmd",
						name: "启用样式代码显示",
						description: "输入框会自动解释输入命令中的样式代码。",
						type: "boolean",
						get: self.getsettingbool,
						set: self.setsettingbool
					}, {
						name: "粘贴模式",
						type: "custom",
						list: [{
							text: "仅复制"
						}, {
							text: "复制并显示粘贴栏"
						}, {
							text: "复制并立即粘贴"
						}],
						get: function () {
							if (CA.settings.pasteMode in this.list) {
								return this.list[CA.settings.pasteMode].text;
							} else {
								return this.list[CA.settings.pasteMode = 1].text;
							}
						},
						onclick: function (fset) {
							Common.showListChooser(this.list, function (i) {
								CA.settings.pasteMode = i;
								fset();
							});
						}
					}, {
						name: "粘贴栏位置",
						type: "custom",
						list: [{
							text: "左侧"
						}, {
							text: "右侧"
						}],
						get: function () {
							if (CA.settings.pasteBarGravity in this.list) {
								return this.list[CA.settings.pasteBarGravity].text;
							} else {
								return this.list[CA.settings.pasteBarGravity = 0].text;
							}
						},
						onclick: function (fset) {
							Common.showListChooser(this.list, function (i) {
								CA.settings.pasteBarGravity = i;
								fset();
								CA.hidePaste();
							});
						}
					}, {
						name: "粘贴延迟",
						type: "custom",
						hidden: function () {
							return MapScript.host == "AutoJs" || MapScript.host == "Android";
						},
						get: function () {
							var v = isNaN(CA.settings.pasteDelay) ? 2 : CA.settings.pasteDelay / 20;
							return v > 0 ? v + "秒" : "无";
						},
						onclick: function (fset) {
							CA.showPasteDelaySet(fset)
						}
					}, {
						id: "overwriteMCTextbox",
						name: "替换MC文本框文本",
						description: "粘贴文本时会自动将文本框中原来的文本替换为新的文本，而不是直接粘贴",
						hidden: function () {
							return !(MapScript.host == "AutoJs" || MapScript.host == "Android");
						},
						type: "boolean",
						get: self.getsettingbool,
						set: self.setsettingbool
					}, {
						name: "拓展包",
						type: "tag"
					}, {
						name: "本地拓展包",
						type: "custom",
						get: function () {
							if (!CA.settings.enabledLibrarys) {
								return "加载中或未加载成功";
							}
							if (CA.settings.enabledLibrarys.length === 0) {
								return "没有已启用的拓展包（或扩展包未加载成功）";
							}
							return CA.settings.enabledLibrarys.length + "个已启用";
						},
						onclick: function (fset) {
							CA.showLibraryMan(function () {
								fset();
							});
						}
					}, {
						name: "游戏版本",
						description: "命令助手只会解析适合该游戏版本的内容",
						type: "custom",
						get: function () {
							return NeteaseAdapter.getMinecraftVersion();
						},
						onclick: function (fset) {
							NeteaseAdapter.switchVersion(function () {
								var progress = Common.showProgressDialog();
								progress.setText("正在重新加载拓展包……");
								CA.checkFeatures();
								if (!CA.Library.initLibrary(function (fl) {
									Common.toast("版本已切换为" + getMinecraftVersion() + "。");
									progress.close();
									fset();
								})) {
									progress.close();
									Common.toast("无法加载拓展包，请稍后重试");
									fset();
								}
							});
						}
					}, {
						name: "自动更新",
						type: "custom",
						list: [{
							text: "关闭"
						}, {
							text: "检测更新并提示"
						}, {
							text: "检测更新并下载"
						}],
						get: function () {
							if (CA.settings.libraryAutoUpdate in this.list) {
								return this.list[CA.settings.libraryAutoUpdate].text;
							} else {
								return this.list[CA.settings.libraryAutoUpdate = 1].text;
							}
						},
						onclick: function (fset) {
							Common.showListChooser(this.list, function (i) {
								CA.settings.libraryAutoUpdate = i;
								fset();
							});
						}
					}, {
						name: "在线拓展包",
						type: "custom",
						onclick: function (fset) {
							if (CA.settings.securityLevel >= 0) {
								CA.showOnlineLib(fset);
							} else {
								Common.toast("您正在使用的安全等级不允许加载外部的拓展包");
							}
						}
					}];
					self.userdata = [{
						name: "管理历史",
						type: "custom",
						get: function () {
							return "共有" + CA.his.length + "条记录";
						},
						onclick: function (fset) {
							CA.showHistoryEdit(null, function () {
								fset();
								if (CA.history) CA.showHistory();
							});
						}
					}, {
						name: "管理收藏",
						type: "custom",
						get: function () {
							return "共有" + CA.fav.length + "条记录";
						},
						onclick: function (fset) {
							CA.showFavoriteEdit(null, function () {
								fset();
								if (CA.history) CA.showHistory();
							});
						}
					}, {
						name: "历史记录容量",
						type: "seekbar",
						current: function (p) {
							return p == 0 ? "不保存历史" : this.list[p] + "条";
						},
						list: [0, 1, 3, 5, 8, 10, 20, 30, 50, 100, 200, 1000, 10000, 1000000],// 我就不信10000000条历史还不够你们用
						max: 13,
						get: function () {
							var k = this.list.indexOf(CA.settings.histroyCount);
							return k < 0 ? 1000000 : this.list[k];
						},
						set: function (v) {
							CA.settings.histroyCount = parseInt(this.list[v]);
							if (CA.settings.histroyCount) CA.his.splice(CA.settings.histroyCount);
						}
					}, {
						name: "管理自定义短语",
						type: "custom",
						get: function () {
							return "共有" + CA.settings.customExpression.length + "条短语";
						},
						onclick: function (fset) {
							CA.showCustomExpEdit(function () {
								fset();
							});
						}
					}, {
						name: "每日提示",
						type: "custom",
						get: function () {
							return "共" + CA.tips.length + "条";
						},
						onclick: function (fset) {
							Common.showInputDialog({
								title: "每日提示",
								defaultValue: CA.tips.join("\n"),
								callback: function (s) {
									if (!s) {
										CA.tips = CA.defalutTips;
									} else {
										CA.tips = CA.settings.customTips = s.split("\n");
									}
									fset();
								}
							});
						}
					}, {
						name: "导入用户数据",
						type: "custom",
						onclick: function () {
							ExternalStorage.showImportActions({
								mimeType: "*/*",
								hint: "ca_settings.dat",
								file(f) {
									try {
										CA.importSettings(f);
									} catch (e) {
										Common.toast("导入用户数据失败\n" + e);
									}
									ExternalStorage.tryReleaseImportFile(f);
								}
							});
						}
					}, {
						name: "导出用户数据",
						type: "custom",
						onclick: function () {
							CA.exportSettings();
						}
					}, {
						name: "导入正式版数据",
						type: "custom",
						hidden: function () {
							return BuildConfig.variants == "release";
						},
						onclick: function () {
							Common.showConfirmDialog({
								title: "确定导入正式版数据？",
								description: "*此操作无法撤销",
								callback: function (id) {
									if (id != 0) return;
									G.ui(function () {
										try {
											CA.importSettings(new java.io.File(MapScript.baseDir + "xero_commandassist.dat"));
										} catch (e) { erp(e) }
									});
								}
							});
						}
					}, {
						name: "恢复默认数据",
						type: "custom",
						onclick: function () {
							Common.showConfirmDialog({
								title: "确定恢复默认？",
								description: "*此操作无法撤销",
								callback: function (id) {
									if (id != 0) return;
									G.ui(function () {
										try {
											CA.resetGUI();
											SafeFileUtils.delete(new java.io.File(CA.profilePath));
											CA.initialize();
											Common.toast("命令助手已重新启动");
										} catch (e) { erp(e) }
									});
								}
							});
						}
					}];
				}
				self.refreshed = false;
				Common.showSettings("设置", self.root, function () {
					CA.trySave();
				});
			} catch (e) { erp(e) }
		})
	},

	importSettings: function (f) {
		var bytes;
		try {
			bytes = SafeFileUtils.readUnsafe(f);
		} catch (e) {
			Common.toast("配置导入失败\n" + e);
			return;
		}
		CA.resetGUI();
		SafeFileUtils.write(new java.io.File(CA.profilePath), bytes);
		CA.initialize();
		Common.toast("配置已导入");
	},
	exportSettings: function () {
		CA.trySave();
		Common.showOperateDialog([{
			text: "导出",
			onclick: function () {
				ExternalStorage.showExportActions({
					mimeType: "application/octet-stream",
					hint: "ca_settings.dat",
					export(uri) {
						try {
							ExternalStorage.copy(ExternalStorage.toUri(CA.profilePath), uri);
							Common.toast("配置已导出");
						} catch (e) {
							erp(e, true);
							Common.toast("文件保存失败，无法导出\n" + e);
						}
					}
				});
			}
		}, {
			text: "发送",
			path: new java.io.File(ctx.getExternalCacheDir(), "ca_settings.dat"),
			onclick: function () {
				try {
					Common.fileCopy(new java.io.File(CA.profilePath), this.path);
					AndroidBridge.sendFile(this.path);
				} catch (e) {
					Log.e(e);
					Common.toast("发送配置文件失败\n" + e);
				}
			}
		}]);
	},

	manageErrors: function () {
		var f = new java.io.File(ExternalStorage && ExternalStorage.getExternalStorageRoot ? ExternalStorage.getExternalStorageRoot() : android.os.Environment.getExternalStorageDirectory().getAbsolutePath(), "com.huangyx.ca.error.log");
		if (!f.isFile()) return Common.toast("无错误记录");
		Common.showOperateDialog([{
			text: "打开",
			intent: (function () {
				try {
					return new android.content.Intent(android.content.Intent.ACTION_VIEW)
						.setDataAndType(AndroidBridge.fileToUri(f), "text/plain")
						.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION | android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION | android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
				} catch (e) { Log.e(e) }
			})(),
			onclick: function () {
				AndroidBridge.startActivity(this.intent);
			},
			hidden: function () {
				return !this.intent;
			}
		}, {
			text: "查看",
			onclick: function () {
				CA.listErrors();
			}
		}, {
			text: "发送",
			onclick: function () {
				AndroidBridge.sendFile(f);
			}
		}, {
			text: "清空",
			onclick: function () {
				f.delete();
				Common.toast("错误信息已清空");
			}
		}]);
	},
	listErrors: function () {
		var f = Common.readFile((ExternalStorage && ExternalStorage.getExternalStorageRoot ? ExternalStorage.getExternalStorageRoot() : android.os.Environment.getExternalStorageDirectory().getAbsolutePath()) + "/com.huangyx.ca.error.log", "");
		if (!f.length) return;
		var a = f.slice(9).split("\n* ");
		a.reverse();
		Common.showListChooser(a, function (id) {
			Common.setClipboardText(a[id]);
			Common.toast("错误信息已复制");
		});
	},

	resetGUI: function () {
		try {
			PWM.dismissFloat();
			PWM.dismissPopup();
			PWM.reset();
			PWM.resetUICache();
		} catch (e) { erp(e) }
	},

	showFCS: function self(v) {
		G.ui(function () {
			try {
				var i, j;
				if (!self.prompt) {
					var data = [
						["§", "§l§§l", "§o§§o", "§§k", "§§r", "", "", "", ""],// 空位，排版好看
						["§0§§0", "§1§§1", "§2§§2", "§3§§3", "§4§§4", "§5§§5", "§6§§6", "§7§§7", "§8§§8", "§9§§9"],
						["§a§§a", "§b§§b", "§c§§c", "§d§§d", "§e§§e", "§f§§f", "§g§§g", "§h§§h", "§i§§i", "§j§§j"],
						["§m§§m", "§n§§n", "§p§§p", "§q§§q", "§s§§s", "§t§§t", "§u§§u", "§v§§v", "", ""]
					];
					var l, b, lp1, lp2, onclick;
					var frcolor = G.Color.WHITE, bgcolor = G.Color.BLACK;

					self.setVisible = function (visible) {
						if (visible) {
							self.scr.setVisibility(G.View.VISIBLE);
							self.hide.setVisibility(G.View.GONE);
						} else {
							self.scr.setVisibility(G.View.GONE);
							self.hide.setVisibility(G.View.VISIBLE);
						}
					}

					self.frame = new G.FrameLayout(ctx);
					self.frame.setLayoutParams(new G.FrameLayout.LayoutParams(-1, -2, G.Gravity.BOTTOM));

					self.hide = new G.TextView(ctx);
					self.hide.setText("..");
					self.hide.setTextColor(frcolor);
					self.hide.setTextSize(Common.theme.textsize[2]);
					self.hide.setGravity(G.Gravity.CENTER);
					self.hide.setTypeface(G.Typeface.MONOSPACE || G.Typeface.DEFAULT);
					self.hide.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
					self.hide.setBackgroundColor(Common.setAlpha(bgcolor, 0xC0));
					self.hide.setLayoutParams(new G.FrameLayout.LayoutParams(-2, -2, G.Gravity.RIGHT));
					self.hide.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								self.setVisible(true);
							} catch (e) { erp(e) }
						}
					}));
					self.hide.setOnLongClickListener(new G.View.OnLongClickListener({
						onLongClick: function (v) {
							try {
								CA.showCustomExpression();
								return true;
							} catch (e) { erp(e) }
						}
					}));
					self.frame.addView(self.hide);

					self.scr = new G.ScrollView(ctx);
					self.scr.setBackgroundColor(Common.setAlpha(bgcolor, 0xC0));
					self.scr.setLayoutParams(new G.FrameLayout.LayoutParams(-1, -2));

					self.line = new G.LinearLayout(ctx);
					self.line.setLayoutParams(new G.FrameLayout.LayoutParams(-1, -2));
					self.line.setOrientation(G.LinearLayout.VERTICAL);

					self.prompt = new G.TextView(ctx);
					self.prompt.setLayoutParams(lp1 = new G.LinearLayout.LayoutParams(-1, -2));
					self.prompt.setTextColor(frcolor);
					self.prompt.setSingleLine(true);
					self.prompt.setEllipsize(G.TextUtils.TruncateAt.START);
					self.prompt.setTextSize(Common.theme.textsize[2]);
					self.prompt.setPadding(20 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
					self.prompt.setTypeface(G.Typeface.MONOSPACE || G.Typeface.DEFAULT);
					self.prompt.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								self.setVisible(false);
							} catch (e) { erp(e) }
						}
					}));
					self.line.addView(self.prompt);

					lp2 = new G.LinearLayout.LayoutParams(0, -2, 1);
					onclick = new G.View.OnClickListener({
						onClick: function (v) {
							try {
								Common.replaceSelection(CA.cmd.getText(), v.getText().toString());
							} catch (e) { erp(e) }
						}
					});

					self.tableline = [];
					self.tableview = [];
					for (i = 0; i < data.length; i++) {
						self.tableline.push(l = new G.LinearLayout(ctx));
						l.setOrientation(G.LinearLayout.HORIZONTAL);
						self.tableview.push([]);
						for (j = 0; j < data[i].length; j++) {
							self.tableview[i].push(b = new G.TextView(ctx));
							b.setTextColor(frcolor);
							b.setTextSize(Common.theme.textsize[2]);
							b.setGravity(G.Gravity.CENTER);
							b.setTypeface(G.Typeface.MONOSPACE || G.Typeface.DEFAULT);
							b.setPadding(5 * G.dp, 10 * G.dp, 5 * G.dp, 10 * G.dp);
							b.setText(FCString.parseFC(data[i][j]));
							b.setOnClickListener(onclick);
							l.addView(b, lp2);
						}
						self.line.addView(l, lp1);
					}
					self.tableview[0].push(b = new G.TextView(ctx));
					b.setTextColor(frcolor);
					b.setTextSize(Common.theme.textsize[2]);
					b.setGravity(G.Gravity.CENTER);
					b.setTypeface(G.Typeface.MONOSPACE || G.Typeface.DEFAULT);
					b.setPadding(0, 10 * G.dp, 0, 10 * G.dp);
					b.setText("..");
					b.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								CA.showCustomExpression();
							} catch (e) { erp(e) }
						}
					}));
					self.tableline[0].addView(b, lp2);

					self.exit = new G.TextView(ctx);
					self.exit.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
					self.exit.setText("关闭");
					self.exit.setTextSize(Common.theme.textsize[2]);
					self.exit.setGravity(G.Gravity.CENTER);
					self.exit.setTextColor(frcolor);
					self.exit.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 20 * G.dp);
					self.exit.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								CA.hideFCS();
							} catch (e) { erp(e) }
						}
					}));
					self.line.addView(self.exit);

					self.scr.addView(self.line);
					self.frame.addView(self.scr);

					PWM.registerResetFlag(CA, "fcs");
					PWM.registerResetFlag(self, "prompt");
				}
				if (v) self.prompt.setText(FCString.parseFC(v));
				if (CA.fcs) CA.hideFCS();
				CA.fcs = self.frame;
				self.setVisible(true);
				CA.con.addView(CA.fcs);
			} catch (e) { erp(e) }
		})
	},
	hideFCS: function () {
		G.ui(function () {
			try {
				if (!CA.fcs) return;
				CA.con.removeView(CA.fcs);
				CA.fcs = null;
			} catch (e) { erp(e) }
		})
	},

	showCustomExpression: function () {
		var a = CA.PluginExpression.concat(CA.settings.customExpression, {
			text: "(编辑自定义短语)",
			custom: true
		});
		Common.showListChooser(a, function (i) {
			var r;
			if (!a[i]) return;
			if (a[i].get) {
				r = a[i].get();
				if (r) Common.replaceSelection(CA.cmd.getText(), Common.toString(r));
			} else if (a[i].custom) {
				CA.showCustomExpEdit();
			} else {
				Common.replaceSelection(CA.cmd.getText(), Common.toString(a[i].text || a[i]));
			}
		});
	},
	showCustomExpEdit: function self(callback) {
		G.ui(function () {
			try {
				if (!self.linear) {
					self.adapter = null;
					self.refresh = function () {
						var a;
						if (CA.settings.customExpression.length == 0) {
							self.adapter = null;
							self.list.setAdapter(EmptyAdapter);
						} else {
							if (self.adapter) {
								self.adapter.notifyChange();
							} else {
								self.list.setAdapter(a = new SimpleListAdapter(CA.settings.customExpression, self.vmaker, self.vbinder));
								self.adapter = SimpleListAdapter.getController(a);
							}
						}
					}
					self.vmaker = function (holder) {
						var layout = new G.LinearLayout(ctx),
							text = holder.text = new G.TextView(ctx);
						del = new G.TextView(ctx);
						layout.setGravity(G.Gravity.CENTER);
						layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						layout.setOrientation(G.LinearLayout.HORIZONTAL);
						text.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
						text.setLayoutParams(new G.LinearLayout.LayoutParams(0, -2, 1.0));
						text.setMaxLines(2);
						text.setEllipsize(G.TextUtils.TruncateAt.END);
						Common.applyStyle(text, "textview_default", 3);
						layout.addView(text);
						del.setText("×");
						del.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
						del.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2));
						Common.applyStyle(del, "textview_default", 2);
						del.setOnClickListener(new G.View.OnClickListener({
							onClick: function (v) {
								try {
									CA.settings.customExpression.splice(holder.pos, 1);
									self.refresh();
								} catch (e) { erp(e) }
							}
						}));
						layout.addView(del);
						return layout;
					}
					self.vbinder = function (holder, e, i) {
						holder.text.setText(e);
					}
					self.linear = new G.LinearLayout(ctx);
					self.linear.setOrientation(G.LinearLayout.VERTICAL);
					Common.applyStyle(self.linear, "container_default");
					self.header = new G.LinearLayout(ctx);
					self.header.setOrientation(G.LinearLayout.HORIZONTAL);
					self.header.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
					Common.applyStyle(self.header, "bar_float");
					self.back = new G.TextView(ctx);
					self.back.setText("< 返回");
					self.back.setGravity(G.Gravity.CENTER);
					self.back.setPadding(15 * G.dp, 0, 15 * G.dp, 0);
					self.back.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
					Common.applyStyle(self.back, "button_highlight", 2);
					self.back.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								self.popup.exit();
								return true;
							} catch (e) { erp(e) }
						}
					}));
					self.header.addView(self.back);
					self.title = new G.TextView(ctx);
					self.title.setText("自定义短语");
					self.title.setPadding(0, 10 * G.dp, 15 * G.dp, 10 * G.dp);
					self.title.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2, 1));
					Common.applyStyle(self.title, "textview_default", 4);
					self.header.addView(self.title);
					self.add = new G.TextView(ctx);
					self.add.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
					self.add.setText("添加");
					self.add.setGravity(G.Gravity.CENTER);
					self.add.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
					Common.applyStyle(self.add, "button_highlight", 2);
					self.add.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								Common.showInputDialog({
									title: "添加自定义短语",
									callback: function (s) {
										if (!s) {
											Common.toast("短语不能为空");
											return;
										}
										if (CA.settings.customExpression.indexOf(s) >= 0) {
											Common.toast("自定义短语“" + s + "”已存在");
										} else {
											CA.settings.customExpression.push(s);
											self.refresh();
										}
									},
									singleLine: true
								});
							} catch (e) { erp(e) }
						}
					}));
					self.header.addView(self.add);
					self.linear.addView(self.header);

					self.list = new G.ListView(ctx);
					self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({
						onItemClick: function (parent, view, pos, id) {
							try {
								Common.showInputDialog({
									title: "编辑自定义短语",
									callback: function (s) {
										var i = CA.settings.customExpression.indexOf(s);
										if (!s) {
											CA.settings.customExpression.splice(pos, 1);
											self.refresh();
											return;
										}
										if (i >= 0 && i != pos) {
											Common.toast("自定义短语“" + s + "”已存在");
										} else if (i < 0) {
											CA.settings.customExpression[pos] = s;
											self.refresh();
										}
									},
									singleLine: true,
									defaultValue: CA.settings.customExpression[pos]
								});
							} catch (e) { erp(e) }
						}
					}));
					self.linear.addView(self.list);

					self.popup = new PopupPage(self.linear, "ca.CustomExpEdit");
					self.popup.on("exit", function () {
						if (self.callback) self.callback();
					});

					PWM.registerResetFlag(self, "linear");
				}
				self.refresh();
				self.callback = callback;
				self.popup.enter();
			} catch (e) { erp(e) }
		})
	},

	isMinecraftTextbox: function (packageName) {
		return packageName == "net.zhuoweizhang.mcpelauncher.pro" ||
			packageName == "net.zhuoweizhang.mcpelauncher" ||
			NeteaseAdapter.packNames.indexOf(packageName) >= 0;
	},
	performPaste: function (cmd, warnSvcNotRun) {
		Common.setClipboardText(cmd);
		if (MapScript.host == "AutoJs" || MapScript.host == "Android") {
			try {
				if (MapScript.host == "AutoJs") {
					var widgets = editable().find(), success = false;
					if (widgets.empty()) throw "找不到文本框";
					widgets.each(function (e) {
						if (CA.settings.overwriteMCTextbox && CA.isMinecraftTextbox(String(e.packageName()))) {
							success = e.setText(cmd) || success;
						} else {
							success = e.paste() || success;
						}
					});
					if (!success) throw "粘贴失败"
				} else if (MapScript.host == "Android") {
					var svc = ScriptInterface.getAccessibilitySvc();
					if (!svc) {
						if (warnSvcNotRun) {
							throw "请打开无障碍服务";
						} else {
							return;
						}
					}
					if (android.os.Build.VERSION.SDK_INT < 18) throw "系统版本过低！请升级系统至Android 4.3及以上";
					var node = svc.getRootInActiveWindow();
					if (!node) throw "无法获取窗口内容";
					node = node.findFocus(android.view.accessibility.AccessibilityNodeInfo.FOCUS_INPUT);
					if (!node) throw "找不到焦点输入控件";
					if (!node.isEditable()) throw "当前焦点输入控件不可编辑";
					if (CA.settings.overwriteMCTextbox && CA.isMinecraftTextbox(String(node.getPackageName()))) {
						var bundle = new android.os.Bundle();
						bundle.putCharSequence(android.view.accessibility.AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, cmd);
						if (!node.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_SET_TEXT, bundle)) throw "设置文本失败";
					} else {
						if (!node.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_PASTE)) throw "粘贴失败";
					}
				}
			} catch (e) {
				Common.toast(e);
			}
		} else {
			try {
				if (CA.settings.pasteDelay > 0) {
					Common.toast("请在" + (CA.settings.pasteDelay / 20) + "秒内点击需要粘贴的文本框");
					gHandler.postDelayed(function () {
						try {
							ctx.updateTextboxText(cmd);
						} catch (e) {
							Common.toast("当前版本暂不支持粘贴命令\n" + e);
						}
					}, CA.settings.pasteDelay * 50);
				} else if (CA.settings.pasteDelay == 0) {
					ctx.updateTextboxText(cmd);
				} else {
					CA.showPasteDelaySet(function () {
						CA.performPaste(cmd, warnSvcNotRun);
					});
				}
			} catch (e) {
				Common.toast("当前版本暂不支持粘贴命令\n" + e);
			}
		}
	},

	showPaste: function self() {
		G.ui(function () {
			try {
				if (!self.bar) {
					self.vmaker = function (holder) {
						var view = new G.TextView(ctx);
						view.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						view.setPadding(5 * G.dp, 5 * G.dp, 5 * G.dp, 5 * G.dp);
						Common.applyStyle(view, "textview_default", 2);
						return view;
					}
					self.vbinder = function (holder, s, i, a) {
						holder.self.setText(s);
					}
					self.adapter = SimpleListAdapter.getController(new SimpleListAdapter(CA.his, self.vmaker, self.vbinder));
					self.refresh = function () {
						self.adapter.notifyChange();
					}
					self.updateWidth = function (width) {
						if (width > self.widthMax) width = self.widthMax;
						if (width < self.widthMin) {
							self.inDrawer = true;
							width = G.dp;
						} else {
							self.inDrawer = false;
						}
						self.lparam.width = width;
						self.linear.setLayoutParams(self.lparam);
					}
					self.animateShow = function () {
						var t = new G.TranslateAnimation(-self.dir * self.lparam.width, 0, 0, 0);
						t.setInterpolator(new G.DecelerateInterpolator(2.0));
						t.setDuration(100);
						self.linear.startAnimation(t);
					}
					self.animateHide = function () {
						var t = new G.TranslateAnimation(0, -self.dir * self.lparam.width, 0, 0);
						t.setInterpolator(new G.AccelerateInterpolator(2.0));
						t.setDuration(100);
						t.setAnimationListener(new G.Animation.AnimationListener({
							onAnimationEnd: function (a) {
								CA.hidePaste();
							}
						}));
						self.linear.startAnimation(t);
					}
					self.touchListener = new G.View.OnTouchListener({
						onTouch: function touch(v, e) {
							try {
								switch (e.getAction()) {
									case e.ACTION_MOVE:
										if (touch.verticalScroll) break;
										if (touch.stead) {
											if (Math.abs(touch.lx - e.getRawX()) < 16 * G.dp) {
												break;
											}
											if (Math.abs(touch.lx - e.getRawX()) < Math.abs(touch.ly - e.getRawY()) * 2) {
												touch.verticalScroll = true;
												break;
											}
											touch.stead = false;
											if (!self.inDrawer) self.list.setVisibility(G.View.GONE);
											CA.paste.attributes.width = Common.getScreenWidth();
											CA.paste.update();
										} else {
											self.updateWidth(touch.slw + (e.getRawX() - touch.lx) * self.dir);
										}
										break;
									case e.ACTION_DOWN:
										touch.lx = e.getRawX();
										touch.ly = e.getRawY();
										touch.slw = self.lparam.width;
										self.widthMin = 0.1 * Common.getScreenWidth();
										self.widthMax = 9 * self.widthMin;
										touch.stead = true;
										touch.verticalScroll = false;
										break;
									case e.ACTION_UP:
										if (touch.verticalScroll || touch.stead) break;
										self.updateWidth(touch.slw + (e.getRawX() - touch.lx) * self.dir);
									case e.ACTION_CANCEL:
										if (!self.inDrawer) self.list.setVisibility(G.View.VISIBLE);
										CA.paste.attributes.width = self.lparam.width + 16 * G.dp;
										CA.paste.update();
								}
								return v == self.bar;
							} catch (e) { return erp(e), true }
						}
					});
					self.inDrawer = false;
					self.bar = new G.FrameLayout(ctx);
					self.bar.setOnTouchListener(self.touchListener);
					self.linear = new G.LinearLayout(ctx);
					self.linear.setOrientation(G.LinearLayout.VERTICAL);
					self.linear.setLayoutParams(self.lparam = new G.FrameLayout.LayoutParams(0.4 * Common.getScreenWidth(), -1, G.Gravity.LEFT));
					Common.applyStyle(self.linear, "bar_float");
					self.header = new G.LinearLayout(ctx);
					self.header.setOrientation(G.LinearLayout.HORIZONTAL);
					self.header.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
					self.title = new G.TextView(ctx);
					self.title.setLayoutParams(new G.LinearLayout.LayoutParams(0, -2, 1));
					self.title.setPadding(5 * G.dp, 5 * G.dp, 5 * G.dp, 5 * G.dp);
					self.title.setText("粘贴栏");
					self.title.setSingleLine(true);
					Common.applyStyle(self.title, "textview_prompt", 1);
					self.header.addView(self.title);
					self.exit = new G.TextView(ctx);
					self.exit.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2));
					self.exit.setPadding(5 * G.dp, 5 * G.dp, 5 * G.dp, 5 * G.dp);
					self.exit.setText("x");
					self.exit.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								if (CA.settings.noAnimation) {
									CA.hidePaste();
								} else {
									self.animateHide();
								}
							} catch (e) { erp(e) }
						}
					}));
					Common.applyStyle(self.exit, "button_critical", 1);
					self.header.addView(self.exit);
					self.linear.addView(self.header);
					self.list = new G.ListView(ctx);
					self.list.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -1));
					self.list.setAdapter(self.adapter.self);
					self.list.setOnTouchListener(self.touchListener);
					self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({
						onItemClick: function (parent, view, pos, id) {
							try {
								CA.performPaste(self.adapter.array[pos], false);
							} catch (e) { erp(e) }
						}
					}));
					if (MapScript.host == "Android") {
						self.list.setOnItemLongClickListener(new G.AdapterView.OnItemLongClickListener({
							onItemLongClick: function (parent, view, pos, id) {
								try {
									if (WSServer.isConnected()) {
										WSServer.sendCommand(self.adapter.array[pos], function (json) {
											Common.toast("已执行！状态代码：" + json.statusCode + "\n" + json.statusMessage);
										});
									} else {
										if (!WSServer.isAvailable()) {
											Common.toast("请先在设置中打开WebSocket服务器");
										} else {
											Common.toast("请在客户端输入以下指令之一来连接到服务器。\n" + WSServer.getConnectCommands().join("\n"));
										}
									}
									return true;
								} catch (e) { return erp(e), true }
							}
						}));
					}
					self.linear.addView(self.list);
					self.bar.addView(self.linear);
					PWM.registerResetFlag(self, "bar");
					PWM.registerResetFlag(CA, "paste");
				}
				self.widthMin = 0.1 * Common.getScreenWidth();
				self.widthMax = 9 * self.widthMin;
				if (self.inDrawer) {
					self.updateWidth(4 * self.widthMin);
					self.list.setVisibility(G.View.VISIBLE);
					if (CA.paste) {
						CA.paste.update({ width: self.lparam.width + 16 * G.dp });
						if (!CA.settings.noAnimation) self.animateShow();
					}
				}
				self.refresh();
				if (CA.paste) return;
				if (CA.settings.pasteBarGravity == 1) {
					self.lparam.gravity = self.gravity = G.Gravity.RIGHT;
					self.lparam.setMargins(16 * G.dp, 0, 0, 0);
					self.dir = -1;
				} else {
					self.lparam.gravity = self.gravity = G.Gravity.LEFT;
					self.lparam.setMargins(0, 0, 16 * G.dp, 0);
					self.dir = 1;
				}
				CA.paste = new PopupWindow(self.bar, "CA.PasteBar");
				CA.paste.show({
					width: self.lparam.width + 16 * G.dp,
					height: -1,
					gravity: self.gravity,
					x: 0, y: 0,
					focusable: false,
					touchable: true
				});
				if (!CA.settings.noAnimation) self.animateShow();
				PWM.addPopup(CA.paste);
			} catch (e) { erp(e) }
		})
	},
	hidePaste: function () {
		G.ui(function () {
			try {
				if (CA.paste) CA.paste.hide();
				CA.paste = null;
			} catch (e) { erp(e) }
		})
	},

	showPasteDelaySet: function (callback) {
		Common.showSlider({
			max: 100,
			progress: isNaN(CA.settings.pasteDelay) ? 40 : CA.settings.pasteDelay,
			prompt: function (progress) {
				if (progress > 0) {
					return "延迟" + (progress / 20).toFixed(2) + "秒后粘贴（仅适用于启动器）\n\n点击“粘贴”时将不会立即粘贴，你需要在这段延迟时间中点击需要粘贴的文本框。\n您可以在设置中修改该设置。";
				} else {
					return "立即粘贴\n\n点击“粘贴”时将会立即粘贴，但你只能粘贴到聊天框中。\n您可以在设置中修改该设置。";
				}
			},
			callback: function (progress) {
				CA.settings.pasteDelay = parseInt(progress);
			},
			onDismiss: callback
		});
	},

	showLibraryMan: function self(callback) {
		G.ui(function () {
			try {
				if (!self.linear) {
					self.contextMenu = [{
						text: "从文件中导入",
						description: "导入外置拓展包",
						onclick: function (v, tag) {
							ExternalStorage.showImportActions({
								mimeType: "*/*",
								hint: "caclib/*/**",
								allowMultiple: true,
								file(files) {
									self.postTask((cb) => {
										files.forEach((f) => {
											const uriStr = String(ExternalStorage.toUri(f));
											CA.Library.enableLibrary(uriStr);
										});
										cb(true, function () {
											Common.toast("导入成功！");
										});
									});
								}
							});
						},
						hidden: function () {
							return CA.settings.securityLevel < 0;
						}
					}, {
						text: "从外部存储加载",
						description: "从外部存储中加载外置拓展包",
						onclick: function (v, tag) {
							ExternalStorage.showOpenActions({
								mimeType: "*/*",
								allowMultiple: true,
								callback(uriList) {
									uriList.forEach((uri) => ExternalStorage.tryTakeUriPermission(uri));
									self.postTask((cb) => {
										uriList.forEach((uri) => {
											const uriStr = String(uri);
											CA.Library.enableLibrary(uriStr);
										});
										cb(true, function () {
											Common.toast("加载成功！");
										});
									});
								}
							});
						},
						hidden: function () {
							return CA.settings.securityLevel != 0;
						}
					}, {
						text: "新建拓展包",
						description: "新建一个不包含内容的包",
						onclick: function (v, tag) {
							ExternalStorage.showSaveActions({
								mimeType: "application/json",
								hint: "新建拓展包.json",
								callback(uri) {
									ExternalStorage.tryTakeUriPermission(uri);
									self.postTask((cb) => {
										try {
											ExternalStorage.writeFileContent(uri, JSON.stringify({
												"name": "新建拓展包",
												"author": "作者名",
												"description": "此处填写介绍，可留空，新建于" + new Date().toLocaleString(),
												"uuid": String(java.util.UUID.randomUUID().toString()),
												"version": [0, 0, 1],
												"require": []
											}));
											CA.Library.enableLibrary(String(uri));
											cb(true, function () {
												Common.toast("拓展包已新建");
											});
										} catch (e) {
											Common.toast("文件保存失败，无法新建\n" + e);
											cb(false);
										}
									});
								}
							});
						},
						hidden: function () {
							return CA.settings.securityLevel != 0;
						}
					}, {
						text: "刷新",
						description: "刷新所有的拓展包",
						onclick: function (v, tag) {
							CA.Library.clearCache();
							self.postTask(function (cb) {
								cb(true, function () {
									Common.toast("刷新成功");
								});
							});
						}
					}, {
						text: "检测更新",
						description: "连接网络检测所有拓展包是否有更新",
						hidden: function () {
							return CA.settings.libraryAutoUpdate != 0;
						},
						onclick: function (v, tag) {
							self.postTask(function (cb) {
								Threads.run(function () {
									try {
										var count = CA.Library.updateLibraries(1);
										if (count > 0) {
											Common.toast("检测到" + count + "个拓展包有更新");
										} else {
											Common.toast("所有拓展包都是最新的");
										}
										cb(false);
									} catch (e) { erp(e) }
								});
							});
						}
					}, {
						text: "检测更新并下载",
						description: "连接网络检测所有拓展包是否有更新，如果有就下载更新",
						hidden: function () {
							return CA.settings.libraryAutoUpdate != 1;
						},
						onclick: function (v, tag) {
							self.postTask(function (cb) {
								Threads.run(function () {
									try {
										var count = CA.Library.updateLibraries(2);
										if (count > 0) {
											Common.toast("检测到" + count + "个拓展包有更新");
										} else {
											Common.toast("所有拓展包都是最新的");
										}
										cb(false);
									} catch (e) { erp(e) }
								});
							});
						}
					}, {
						text: "设置安全级别",
						secLevels: [0, 1, 2, -1],
						secLevelDetails: {
							"-1": {
								text: "受限",
								description: "禁止所有来自外部的拓展包加载",
								confirm: "当前的安全级别将禁止你加载任何外部的拓展包，是否继续？"
							},
							"0": {
								text: "低",
								description: "允许所有拓展包加载",
								confirm: "当前的安全级别将允许你加载任何外部的拓展包，这可能导致某些恶意拓展包被加载。\n如果你不是拓展包开发者请不要使用此等级"
							},
							"1": {
								text: "中",
								description: "（推荐）仅允许锁定的拓展包和官方的拓展包加载"
							},
							"2": {
								text: "高",
								description: "仅允许官方的拓展包加载"
							}
						},
						onclick: function (v, tag) {
							var self2 = this, t = this.secLevels.indexOf(CA.settings.securityLevel);
							Common.showSlider({
								max: this.secLevels.length - 1,
								progress: t < 0 ? 1 : t,
								prompt: function (progress) {
									var e = self2.secLevelDetails[self2.secLevels[progress]];
									return e.text + "\n\n" + e.description;
								},
								callback: function (progress) {
									var d = self2.secLevelDetails[self2.secLevels[progress]], self3 = this;
									if (self2.secLevels[progress] == CA.settings.securityLevel) return;
									if (d.confirm) {
										Common.showConfirmDialog({
											title: "警告",
											description: d.confirm,
											callback: function (id) {
												if (id != 0) return;
												self3._refresh(progress);
											}
										});
									} else {
										this._refresh(progress);
									}
								},
								_refresh: function (progress) {
									CA.settings.securityLevel = self2.secLevels[progress];
									CA.Library.clearCache();
									self.postTask(function (cb) {
										cb(true, function () {
											var d = self2.secLevelDetails[CA.settings.securityLevel];
											Common.toast("安全级别已被设置为 " + (d ? d.text : "未知"));
										});
									});
								}
							});
						},
						hidden: function () {
							var d = this.secLevelDetails[CA.settings.securityLevel];
							this.description = "当前安全级别为 " + (d ? d.text : "未知");
							return false;
						}
					}, {
						text: "切换版本",
						description: "切换命令所属版本",
						onclick: function (v, tag) {
							NeteaseAdapter.switchVersion(function () {
								CA.checkFeatures();
								self.postTask(function (cb) {
									cb(true, function () {
										Common.toast("版本已切换为" + getMinecraftVersion() + "。");
									});
								});
							});
						}
					}, {
						text: "忽略版本",
						description: "暂时忽略版本限制",
						hidden: function () {
							return CA.settings.securityLevel != 0 || CA.Library.ignoreVersion;
						},
						onclick: function (v, tag) {
							self.postTask(function (cb) {
								CA.Library.ignoreVersion = true;
								CA.checkFeatures();
								cb(true, function () {
									Common.toast("版本限制已关闭");
								});
							});
						}
					}, {
						text: "取消忽略版本",
						description: "取消忽略版本限制",
						hidden: function () {
							return CA.settings.securityLevel != 0 || !CA.Library.ignoreVersion;
						},
						onclick: function (v, tag) {
							self.postTask(function (cb) {
								CA.Library.ignoreVersion = false;
								CA.checkFeatures();
								cb(true, function () {
									Common.toast("版本限制已开启");
								});
							});
						}
					}, {
						text: "恢复默认",
						description: "将拓展包列表恢复为默认",
						onclick: function (v, tag) {
							self.postTask(function (cb) {
								CA.settings.enabledLibrarys.concat(
									CA.settings.disabledLibrarys,
									CA.settings.coreLibrarys
								).forEach((e) => CA.Library.removeLibrary(e));
								CA.Library.recommended.forEach((e) => CA.Library.enableLibrary(e));
								CA.Library.defaultDisabled.forEach((e) => CA.Library.disableLibrary(e));
								CA.Library.clearCache();
								cb(true, function () {
									Common.toast("已恢复为默认拓展包列表");
								});
							});
						}
					}];
					self.itemMenu = [{
						text: "移除",
						description: "将该拓展包从列表中移除",
						hidden: function (tag) {
							return tag.data.mode == 0;
						},
						onclick: function (v, tag) {
							self.postTask(function (cb) {
								CA.Library.removeLibrary(tag.data.src);
								cb(true, function () {
									Common.toast("该拓展包已从列表中移除");
								});
							});
						}
					}, {
						text: "查看信息",
						description: "查看该拓展包的相关信息",
						onclick: function (v, tag) {
							var uri = ExternalStorage.toUri(tag.data.src);
							var s = ["名称 : " + tag.data.name];
							if (ExternalStorage.isFile(uri)) {
								s.push("位置 : " + ExternalStorage.uriToReadablePath(uri));
								s.push("大小 : " + ExternalStorage.getLengthString(uri));
								s.push("时间 : " + ExternalStorage.getLastModifiedString(uri));
							}
							if (tag.data.updateState) {
								let updateStateStr;
								switch (tag.data.updateState) {
									case "checking":
										updateStateStr = "正在检测";
										break;
									case "latest":
										updateStateStr = "已是最新版";
										break;
									case "unavailable":
										updateStateStr = "更新源不可用";
										break;
									case "ready":
										updateStateStr = "已准备更新";
										break;
									case "waitForUser":
										updateStateStr = "等待用户手动更新";
										break;
									case "error":
										updateStateStr = "下载更新出错";
										break;
									case "finished":
										updateStateStr = "已下载更新";
										break;
									default:
										updateStateStr = "未知";
								}
								s.push("更新状态 : " + updateStateStr);
							}
							if (!tag.data.disabled && !tag.data.hasError && tag.data.stat) {
								s.push("", tag.data.stat.toString());
							}
							Common.showTextDialog(s.join("\n"));
						}
					}];
					self.enabledMenu = [{
						text: "检测更新",
						description: "如果可行，连接服务器检测是否有更新",
						hidden: function (tag) {
							return tag.data.mode == 0;
						},
						onclick: function (v, tag) {
							self.postTask(function (cb) {
								Threads.run(function () {
									try {
										CA.Library.requestUpdateInfo(tag.data, function (statusCode, arg1, arg2) {
											if (statusCode == 1) {
												Common.toast("检测到更新：\n" + arg2.version.join(".") + " -> " + arg1.version.join("."));
												CA.Library.clearCache(tag.data.src);
												CA.Library.doUpdate(arg1, arg2, function (statusMessage, arg_1) {
													if (statusMessage == "downloadFromUri") {
														cb(true);
														Common.showConfirmDialog({
															title: "拓展包“" + tag.data.name + "”请求访问下方的链接，确定访问？",
															description: arg_1,
															callback: function (id) {
																if (id != 0) return;
																try {
																	AndroidBridge.startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(arg_1))
																		.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
																	return;
																} catch (e) { Log.e(e) }
																Common.toast("打开链接失败");
															}
														});
													} else if (statusMessage == "downloadError") {
														Common.toast("更新失败\n" + arg_1);
														cb(false);
													} else if (statusMessage == "completeDownload") {
														cb(true, function () {
															Common.toast("更新完成：拓展包“" + tag.data.name + "”已是最新版本：" + arg1.version.join("."));
														});
													}
												});
											} else {
												if (statusCode == -2) {
													Common.toast("检测更新失败\n" + arg1);
												} else if (statusCode == 0) {
													Common.toast("拓展包“" + tag.data.name + "”已是最新版本：" + arg1.version.join("."));
												} else {
													Common.toast("拓展包“" + tag.data.name + "”没有更新数据");
												}
												cb(false);
											}
										});
									} catch (e) { erp(e) }
								})
							});
						}
					}, {
						text: "编辑",
						description: "用JSON编辑器编辑该拓展包",
						hidden: function (tag) {
							return CA.settings.securityLevel != 0 || tag.data.mode != 1;
						},
						onclick: function (v, tag) {
							var uri = ExternalStorage.toUri(tag.data.src);
							var content;
							try {
								content = ExternalStorage.readFileContent(uri, "UTF-8");
								a = JSON.parse(content);
							} catch (e) {
								Common.toast("此拓展包无法使用JSON编辑器进行编辑\n" + e);
								return;
							}
							if (!(a instanceof Object)) a = {};
							JSONEdit.show({
								source: a,
								rootname: "拓展包",
								update: function () {
									self.postTask(function (cb) {
										try {
											ExternalStorage.writeFileContent(uri, JSON.stringify(a));
											CA.Library.clearCache(tag.data.src);
											cb(true, function () {
												Common.toast("加载成功！");
											});
										} catch (e) {
											Common.toast("文件保存失败\n" + e);
											cb(false);
											return;
										}
									});
								}
							});
						}
					}, {
						text: "导出",
						description: "将该拓展包保存到一个新文件里",
						onclick: function (v, tag) {
							if (tag.data.hasError) {
								Common.toast("拓展包“" + tag.data.name + "”有错误，请先解决错误再导出");
								return true;
							}
							if (tag.data.mode == 0) {
								ExternalStorage.showExportActions({
									mimeType: "application/json",
									hint: tag.data.name + ".json",
									export(uri) {
										ExternalStorage.writeFileContent(uri, JSON.stringify(CA.Library.inner[tag.data.src]));
									}
								});
							} else {
								ExternalStorage.showExportActions({
									mimeType: "application/json",
									hint: tag.data.name + ".json",
									export: tag.data.src
								});
							}
						}
					}, {
						text: "创建副本",
						description: "创建该拓展包的副本（副本不会被认为与原拓展包相同）",
						hidden: function (tag) {
							return CA.settings.securityLevel != 0 || tag.data.hasError || tag.data.mode >= 2;
						},
						onclick: function (v, tag) {
							ExternalStorage.showSaveActions({
								mimeType: "application/json",
								hint: tag.data.name + ".json",
								callback(uri) {
									self.postTask(function (cb) {
										let l;
										const uriStr = String(uri);
										if (tag.data.mode == 0) {
											l = Object.copy(CA.Library.inner[tag.data.src]);
										} else {
											try {
												const origUri = ExternalStorage.toUri(tag.data.src);
												const content = ExternalStorage.readFileContent(origUri, "UTF-8");
												l = JSON.parse(content);
												if (!(l instanceof Object)) throw "格式错误";
											} catch (e) {
												Common.toast("此拓展包无法创建副本\n" + e);
												cb(false);
												return;
											}
										}
										l.name = String(l.name) + " 的副本";
										l.uuid = String(java.util.UUID.randomUUID().toString());
										try {
											ExternalStorage.writeFileContent(uri, JSON.stringify(l));
											CA.Library.clearCache(uriStr);
											CA.Library.enableLibrary(uriStr);
											cb(true, function () {
												Common.toast("拓展包“" + tag.data.name + "”的副本已创建");
											});
										} catch (e) {
											Common.toast("文件保存失败，无法创建副本\n" + e);
											cb(false);
										}
									});
								}
							});
						}
					}, {
						text: "锁定",
						description: "锁定拓展包，使其不能被编辑",
						hidden: function (tag) {
							return CA.settings.securityLevel != 0 || tag.data.hasError || tag.data.mode != 1;
						},
						onclick: function (v, tag) {
							Common.showConfirmDialog({
								title: "确定锁定拓展包“" + tag.data.name + "”？",
								description: "*此操作无法撤销",
								callback: function (id) {
									if (id != 0) return;
									self.postTask(function (cb) {
										try {
											const uri = ExternalStorage.toUri(tag.data.src);
											const content = ExternalStorage.readFileContent(uri, "UTF-8");
											const obj = JSON.parse(content);
											CA.Library.savePrefixed(uri, obj);
											CA.Library.clearCache(tag.data.src);
											cb(true, function () {
												Common.toast("拓展包“" + tag.data.name + "”已被锁定");
											});
										} catch (e) {
											Common.toast("文件保存失败\n" + e);
											cb(false);
										}
									});
								}
							});
						}
					}, {
						text: "排序",
						description: "调整拓展包加载的顺序",
						onclick: function (v, tag) {
							Common.showSortDialog({
								array: CA.IntelliSense.library.info.slice(),
								selectIndex: tag.pos,
								getTitle: function (e) {
									return e.name;
								},
								getDescription: function (e) {
									return e.description;
								},
								canExchange: function (array, fromIndex, toIndex) {
									if (array[fromIndex].core == array[toIndex].core) {
										return true;
									} else {
										Common.toast("您不能交换优先加载拓展包和普通拓展包的顺序");
										return false;
									}
								},
								callback: function (a) {
									self.postTask(function (cb) {
										var i;
										CA.settings.coreLibrarys.length = CA.settings.enabledLibrarys.length = 0;
										for (i = 0; i < a.length; i++) {
											if (a[i].core) {
												CA.settings.coreLibrarys.push(a[i].src);
											} else {
												CA.settings.enabledLibrarys.push(a[i].src);
											}
										}
										cb(true, function () { });
									});
								}
							});
						}
					}, {
						text: "停用",
						description: "停用该拓展包",
						onclick: function (v, tag) {
							self.postTask(function (cb) {
								CA.Library.clearCache(tag.data.src);
								CA.Library.disableLibrary(tag.data.src);
								cb(true, function () {
									Common.toast("拓展包已停用");
								});
							});
						}
					}].concat(self.itemMenu);
					self.disabledMenu = [{
						text: "启用",
						description: "启用该拓展包",
						onclick: function (v, tag) {
							self.postTask(function (cb) {
								CA.Library.enableLibrary(tag.data.src);
								cb(true, function () {
									Common.toast("拓展包已启用");
								});
							});
						}
					}].concat(self.itemMenu);
					self.errMenu = [{
						text: "查看堆栈",
						onclick: function (v, tag) {
							if (tag.data.error instanceof Object && tag.data.error.stack) {
								Common.showTextDialog(String(tag.data.error.stack));
							} else {
								Common.toast("错误堆栈不存在");
								return true;
							}
						}
					}].concat(self.enabledMenu);
					self.vmaker = function (holder) {
						var layout = new G.LinearLayout(ctx),
							text1 = holder.text1 = new G.TextView(ctx),
							text2 = holder.text2 = new G.TextView(ctx);
						layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						layout.setOrientation(G.LinearLayout.VERTICAL);
						layout.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
						text1.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
						text1.setEllipsize(G.TextUtils.TruncateAt.MIDDLE);
						text1.setSingleLine(true);
						layout.addView(text1);
						text2.setPadding(0, 5 * G.dp, 0, 0);
						text2.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
						Common.applyStyle(text2, "textview_prompt", 1);
						layout.addView(text2);
						return layout;
					}
					self.vbinder = function (holder, e, i, a) {
						var title = [], detail = [];
						if (e.mode == 0) {
							title.push("[内置] ");
						} else if (e.mode == 2) {
							title.push("[锁定] ");
						} else if (e.mode == 3) {
							title.push("[官方] ");
						}
						title.push(e.name);
						if (!e.disabled && !e.hasError) {
							if (e.core) {
								title.push(" (已优先启用)");
							} else {
								title.push(" (已启用)");
							}
						}
						holder.text1.setText(title.join(""));
						Common.applyStyle(holder.text1, e.disabled ? "item_disabled" : e.hasError || e.deprecated ? "item_critical" : "item_default", 3);
						if (e.disabled) {
							detail.push("已禁用");
						} else if (e.hasError) {
							detail.push("加载出错 :", e.error);
						} else {
							if (e.updateState == "ready" || e.updateState == "waitForUser" || e.updateState == "error") {
								detail.push("检测到更新 : " + CA.Library.versionToString(e.updateInfo.version));
							} else if (e.updateState == "finished") {
								detail.push("已经更新至最新版本 " + CA.Library.versionToString(e.updateInfo.version) + "，重启命令助手生效");
							}
							if (e.deprecated) {
								detail.push("目前该拓展包不适合在您的设备上使用");
							}
							if (detail.length) detail.push("");
							detail.push("版本 : " + e.version.join("."), "作者 : " + e.author);
							if (e.description && e.description.length) {
								detail.push("\n" + e.description);
							}
						}
						holder.text2.setText(detail.join("\n"));
					}
					self.refresh = function () {
						if (CA.Library.loadingStatus) {
							Common.toast("命令库加载中，请加载完成后手动刷新");
							return;
						}
						var arr = CA.IntelliSense.library.info.concat(CA.settings.disabledLibrarys.map(function (e, i, a) {
							var isInternal = e in CA.Library.inner;
							var name;
							if (isInternal) {
								name = CA.Library.inner[e].name;
							} else {
								name = ExternalStorage.uriToName(ExternalStorage.toUri(e));
							}
							return {
								src: e,
								index: i,
								mode: isInternal ? 0 : -1,
								name: name,
								disabled: true
							};
						}));
						self.adpt.setArray(arr);
					}
					self.postTask = function (f) {
						if (self.processing) {
							Common.toast("处理中，请稍候……");
							return true;
						}
						var progress = Common.showProgressDialog();
						progress.setText("正在处理……");
						self.processing = true;
						f(function (success, callback) {
							if (!success) {
								progress.close();
								G.ui(function () {
									try {
										self.adpt.notifyChange(true);
									} catch (e) { erp(e) }
								});
								return self.processing = false;
							}
							progress.setText("正在刷新命令库……");
							if (!CA.Library.initLibrary(function () {
								progress.close();
								G.ui(function () {
									try {
										self.refresh();
										self.processing = false;
										callback();
									} catch (e) { erp(e) }
								});
							})) {
								progress.close();
								Common.toast("无法加载拓展包，请稍后重试");
								return self.processing = false;
							}
							return true;
						});
					}
					self.processing = false;
					self.adpt = SimpleListAdapter.getController(new SimpleListAdapter([], self.vmaker, self.vbinder, null, true));

					self.linear = new G.LinearLayout(ctx);
					self.linear.setOrientation(G.LinearLayout.VERTICAL);
					self.linear.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 0);
					Common.applyStyle(self.linear, "message_bg");

					self.header = new G.LinearLayout(ctx);
					self.header.setOrientation(G.LinearLayout.HORIZONTAL);
					self.header.setPadding(0, 0, 0, 10 * G.dp);
					self.header.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								Common.showOperateDialog(self.contextMenu, {
									callback: function () {
										G.ui(function () {
											try {
												self.refresh();
											} catch (e) { erp(e) }
										})
									}
								});
								return true;
							} catch (e) { erp(e) }
						}
					}));

					self.title = new G.TextView(ctx);
					self.title.setText("管理拓展包");
					self.title.setGravity(G.Gravity.LEFT | G.Gravity.CENTER);
					self.title.setPadding(10 * G.dp, 0, 10 * G.dp, 0);
					Common.applyStyle(self.title, "textview_default", 4);
					self.header.addView(self.title, new G.LinearLayout.LayoutParams(0, -2, 1.0));

					self.menu = new G.TextView(ctx);
					self.menu.setText("▼");
					self.menu.setPadding(10 * G.dp, 0, 10 * G.dp, 0);
					self.menu.setGravity(G.Gravity.CENTER);
					Common.applyStyle(self.menu, "button_highlight", 3);
					self.header.addView(self.menu, new G.LinearLayout.LayoutParams(-2, -1));
					self.linear.addView(self.header, new G.LinearLayout.LayoutParams(-1, -2));

					self.list = new G.ListView(ctx);
					self.list.setAdapter(self.adpt.self);
					self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({
						onItemClick: function (parent, view, pos, id) {
							try {
								var data = parent.getAdapter().getItem(pos);
								var mnu = data.disabled ? self.disabledMenu : data.hasError ? self.errMenu : self.enabledMenu;
								if (data.menu) {
									mnu = data.menu.concat(mnu);
								}
								Common.showOperateDialog(mnu, {
									pos: parseInt(pos),
									data: data,
									callback: function () {
										G.ui(function () {
											try {
												self.refresh();
											} catch (e) { erp(e) }
										})
									}
								});
							} catch (e) { erp(e) }
						}
					}));
					self.linear.addView(self.list, new G.LinearLayout.LayoutParams(-1, 0, 1.0));

					self.exit = new G.TextView(ctx);
					self.exit.setText("关闭");
					self.exit.setGravity(G.Gravity.CENTER);
					self.exit.setPadding(10 * G.dp, 20 * G.dp, 10 * G.dp, 20 * G.dp);
					Common.applyStyle(self.exit, "button_critical", 3);
					self.exit.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								self.popup.exit();
							} catch (e) { erp(e) }
						}
					}));
					self.linear.addView(self.exit, new G.LinearLayout.LayoutParams(-1, -2));

					self.popup = new PopupPage(self.linear, "ca.LibraryManage");
					self.popup.on("exit", function () {
						if (self.callback) self.callback();
					});

					PWM.registerResetFlag(self, "linear");
				}
				self.refresh();
				self.callback = callback;
				self.popup.enter();
			} catch (e) { erp(e) }
		})
	},

	showOnlineLib: function self(callback) {
		G.ui(function () {
			try {
				if (!self.linear) {
					self.contextMenu = [{
						text: "刷新",
						onclick: function (v, tag) {
							self.reload();
						}
					}, {
						text: "查看源信息",
						hidden: function () {
							return !self.libsrc;
						},
						onclick: function (v, tag) {
							var s = [];
							s.push("地址 : " + self.libsrc.url);
							s.push("上次更新时间 : " + Updater.toChineseDate(self.libsrc.lastUpdate));
							s.push("库大小 : " + self.libsrc.libCount);
							s.push("由 " + self.libsrc.maintainer + " 维护");
							if (self.libsrc.details) s.push(self.libsrc.details);
							Common.showTextDialog(s.join("\n"));
						}
					}];
					self.itemMenu = [{
						text: "下载",
						onclick: function (v, tag) {
							if (tag.data.requirement) {
								Common.showConfirmDialog({
									title: "确定下载拓展包“" + tag.data.name + "”？",
									description: "使用要求: " + tag.data.requirement,
									callback: function (id) {
										if (id != 0) return;
										self.downloadLib(tag.data);
									}
								});
							} else {
								self.downloadLib(tag.data);
							}
						}
					}];
					self.vmaker = function (holder) {
						var layout = new G.LinearLayout(ctx),
							text1 = holder.text1 = new G.TextView(ctx),
							text2 = holder.text2 = new G.TextView(ctx);
						layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						layout.setOrientation(G.LinearLayout.VERTICAL);
						layout.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
						text1.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
						text1.setEllipsize(G.TextUtils.TruncateAt.MIDDLE);
						text1.setSingleLine(true);
						layout.addView(text1);
						text2.setPadding(0, 5 * G.dp, 0, 0);
						text2.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
						Common.applyStyle(text2, "textview_prompt", 1);
						layout.addView(text2);
						return layout;
					}
					self.vbinder = function (holder, e, i, a) {
						var detail = [];
						holder.text1.setText((e.installed ? "[已安装] " : "") + e.name);
						Common.applyStyle(holder.text1, e.disabled ? "item_disabled" : "item_default", 3);
						if (e.disabled) detail.push("目前您使用的版本不支持此命令库\n");
						detail.push("版本 : " + e.version.join("."), "作者 : " + e.author);
						if (e.description) detail.push("\n" + e.description);
						holder.text2.setText(detail.join("\n"));
					}
					self.reload = function () {
						if (self.loading) return Common.toast("正在加载中……");
						if (MapScript.host != "Android") return Common.toast("您目前的版本不允许访问在线命令库，请使用命令助手App版");
						self.loading = true;
						self.libs.length = 0;
						self.pages = 0;
						self.adpt.notifyChange();
						var progress = Common.showProgressDialog();
						progress.setText("正在加载……");
						progress.async(function () {
							var src = CA.Library.requestDefaultSourceInfo();
							self.loading = false;
							if (!src) return Common.toast("拓展包源加载失败");
							self.libsrc = src;
							self.appendPage(true);
						});
					}
					self.appendPage = function (sync) {
						if (!sync) {
							var progress = Common.showProgressDialog();
							progress.setText("正在加载……");
							progress.async(function () {
								self.appendPage(true);
							});
						} else {
							if (self.loading) return Common.toast("正在加载中……");
							var i, off = self.libs.length, page = CA.Library.requestSourceIndex(self.libsrc, self.pages);
							if (!page) return Common.toast("拓展包列表加载失败");
							self.pages++;
							G.ui(function () {
								try {
									self.libs.length += page.length;
									for (i = 0; i < page.length; i++) {
										page[i].disabled = page[i].desperated ||
											(page[i].minSupport && Date.parse(page[i].minSupport) > Date.parse(CA.publishDate)) ||
											(page[i].maxSupport && Date.parse(page[i].maxSupport) < Date.parse(CA.publishDate));
										page[i].installed = CA.Library.findByUUID(page[i].uuid);
										self.libs[i + off] = page[i];
									}
									self.adpt.notifyChange();
									if (self.libsrc.nextPage) self.more.setText("查看剩余" + (self.libsrc.libCount - self.libs.length) + "个拓展包……");
									if (self.libsrc.nextPage && !self.moreVisible) {
										self.moreVisible = true;
										self.list.addFooterView(self.more);
									} else if (!self.libsrc.nextPage && self.moreVisible) {
										self.moreVisible = false;
										self.list.removeFooterView(self.more);
									}
								} catch (e) { erp(e) }
							});
						}
					}
					self.downloadLib = function (data) {
						Common.showProgressDialog(function (dia) {
							var uriStr;
							dia.setText("正在下载拓展包: " + data.name);
							try {
								uriStr = String(CA.Library.downloadLib(data, self.libsrc));
								CA.Library.clearCache(uriStr);
								CA.Library.enableLibrary(uriStr);
							} catch (e) {
								Common.toast("下载拓展包“" + data.name + "”失败\n" + e);
								return;
							}
							var progress = Common.showProgressDialog();
							progress.setText("正在刷新命令库...");
							CA.Library.initLibrary(function () {
								progress.close();
								Common.toast("拓展包“" + data.name + "”已下载并启用");
								data.installed = true;
								G.ui(function () {
									try {
										self.adpt.notifyChange();
									} catch (e) { erp(e) }
								});
							});
						});
					}
					self.adpt = SimpleListAdapter.getController(new SimpleListAdapter(self.libs = [], self.vmaker, self.vbinder));

					self.linear = new G.LinearLayout(ctx);
					self.linear.setOrientation(G.LinearLayout.VERTICAL);
					self.linear.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 0);
					Common.applyStyle(self.linear, "message_bg");

					self.header = new G.LinearLayout(ctx);
					self.header.setOrientation(G.LinearLayout.HORIZONTAL);
					self.header.setPadding(0, 0, 0, 10 * G.dp);
					self.header.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								Common.showOperateDialog(self.contextMenu);
								return true;
							} catch (e) { erp(e) }
						}
					}));

					self.title = new G.TextView(ctx);
					self.title.setText("在线拓展包");
					self.title.setGravity(G.Gravity.LEFT | G.Gravity.CENTER);
					self.title.setPadding(10 * G.dp, 0, 10 * G.dp, 0);
					Common.applyStyle(self.title, "textview_default", 4);
					self.header.addView(self.title, new G.LinearLayout.LayoutParams(0, -2, 1.0));

					self.menu = new G.TextView(ctx);
					self.menu.setText("▼");
					self.menu.setPadding(10 * G.dp, 0, 10 * G.dp, 0);
					self.menu.setGravity(G.Gravity.CENTER);
					Common.applyStyle(self.menu, "button_highlight", 3);
					self.header.addView(self.menu, new G.LinearLayout.LayoutParams(-2, -1));
					self.linear.addView(self.header, new G.LinearLayout.LayoutParams(-1, -2));

					self.more = new G.TextView(ctx);
					self.more.setGravity(G.Gravity.CENTER);
					self.more.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
					self.more.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
					Common.applyStyle(self.more, "textview_prompt", 2);

					self.list = new G.ListView(ctx);
					self.list.setAdapter(self.adpt.self);
					self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({
						onItemClick: function (parent, view, pos, id) {
							try {
								if (view == self.more) {
									self.appendPage();
									return;
								}
								var data = parent.getAdapter().getItem(pos);
								if (!data.installed) {
									Common.showOperateDialog(self.itemMenu, {
										pos: parseInt(pos),
										data: data
									});
								}
							} catch (e) { erp(e) }
						}
					}));
					self.linear.addView(self.list, new G.LinearLayout.LayoutParams(-1, 0, 1.0));

					self.exit = new G.TextView(ctx);
					self.exit.setText("关闭");
					self.exit.setGravity(G.Gravity.CENTER);
					self.exit.setPadding(10 * G.dp, 20 * G.dp, 10 * G.dp, 20 * G.dp);
					Common.applyStyle(self.exit, "button_critical", 3);
					self.exit.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								self.popup.exit();
							} catch (e) { erp(e) }
						}
					}));
					self.linear.addView(self.exit, new G.LinearLayout.LayoutParams(-1, -2));

					self.popup = new PopupPage(self.linear, "ca.OnlineLibSource");
					self.popup.on("exit", function () {
						if (self.callback) self.callback();
					});

					PWM.registerResetFlag(self, "linear");
				}
				self.callback = callback;
				self.popup.enter();
				self.reload();
			} catch (e) { erp(e) }
		})
	},

	showModeChooser: function (callback) {
		Common.showOperateDialog([{
			text: "自动选择",
			description: "智能选择初学者模式或专家模式",
			onclick: function () {
				CA.settings.iiMode = 3;
				callback();
			}
		}, {
			text: "初学者模式",
			description: "只启用提示助手",
			onclick: function () {
				CA.settings.iiMode = 1;
				callback();
			}
		}, {
			text: "专家模式",
			description: "启用提示助手与智能补全",
			onclick: function () {
				CA.settings.iiMode = 2;
				callback();
			}
		}, {
			text: "关闭",
			description: "禁用IntelliSense的所有功能",
			onclick: function () {
				CA.settings.iiMode = 0;
				callback();
			}
		}]);
	},
	showManageBgImage: function (callback) {
		Common.showOperateDialog([{
			text: "不使用",
			onclick: function () {
				if (CA.settings.bgImage) {
					const file = new java.io.File(CA.settings.bgImage);
					ExternalStorage.tryReleaseImportFile(file);
				}
				CA.settings.bgImage = null;
				callback();
				Common.toast("背景图片已设置为 无");
			}
		}, {
			text: "从文件中选择",
			onclick: function (v, tag) {
				ExternalStorage.showImportActions({
					mimeType: "image/*",
					hint: "ca_background_image",
					file(f) {
						CA.settings.bgImage = String(f.getAbsolutePath());
						callback();
						Common.toast("背景图片已设置");
					}
				});
			}
		}, {
			gap: 10 * G.dp
		}, {
			text: "调整背景透明度",
			onclick: function () {
				if (CA.settings.bgImage) {
					Common.showSlider({
						max: 100,
						progress: isNaN(CA.settings.bgAlpha) ? 75 : CA.settings.bgAlpha * 100,
						prompt: function (progress) {
							return "透明度：" + progress + "%\n\n本设置调整的实际上是在背景图上覆盖的背景色的不透明度，因此如果主题是半透明的话即使本设置调到100%也可以看见背景图片";
						},
						callback: function (progress) {
							CA.settings.bgAlpha = progress / 100;
							callback();
						}
					});
				} else {
					Common.toast("您还没有设置背景图片");
				}
			}
		}]);
	},
	showIconChooser: function self(callback, onDismiss) {
		G.ui(function () {
			try {
				if (!self.addCustom) {
					self.addCustom = function () {
						var view = new G.TextView(ctx);
						view.setText("自定义图标");
						view.setPadding(5 * G.dp, 5 * G.dp, 5 * G.dp, 5 * G.dp);
						Common.applyStyle(view, "button_reactive", 2);
						return view;
					}
					self.selectIcon = function (callback) {
						ExternalStorage.showImportActions({
							mimeType: "image/*",
							hint: "ca_icon_image",
							file(f) {
								const path = String(f.getAbsolutePath());
								CA.settings.icon = path;
								if (self.recent.indexOf(path) < 0) self.recent.push(path);
								if (callback) callback();
							}
						});
					}
					self.recent = [];
				}
				var ci, frame, list, popup;
				if (CA.settings.icon.startsWith("/") && self.recent.indexOf(CA.settings.icon) < 0) self.recent.push(CA.settings.icon);
				ci = Object.keys(CA.Icon).concat(self.recent, "");
				frame = new G.FrameLayout(ctx);
				Common.applyStyle(frame, "message_bg");
				list = new G.GridView(ctx);
				list.setLayoutParams(new G.FrameLayout.LayoutParams(-1, -1));
				list.setHorizontalSpacing(20 * G.dp);
				list.setVerticalSpacing(20 * G.dp);
				list.setPadding(20 * G.dp, 20 * G.dp, 20 * G.dp, 20 * G.dp);
				list.setGravity(G.Gravity.CENTER);
				list.setNumColumns(-1);
				list.setStretchMode(2);
				list.setAdapter(new RhinoListAdapter(ci, function (e) {
					var view = e == "" ? self.addCustom() : e in CA.Icon ? CA.Icon[e](1, true) : CA.customIcon(e, 1, true);
					view.setLayoutParams(new G.AbsListView.LayoutParams(-2, -2));
					return view;
				}));
				list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({
					onItemClick: function (parent, view, pos, id) {
						try {
							var z = String(parent.getItemAtPosition(pos));
							if (z) {
								CA.settings.icon = z;
								if (callback) callback();
							} else {
								self.selectIcon(callback);
							}
							popup.exit();
						} catch (e) { erp(e) }
					}
				}));
				frame.addView(list);
				popup = PopupPage.showDialog("ca.IconChooser", frame, -1, -1);
				if (onDismiss) popup.on("exit", onDismiss);
			} catch (e) { erp(e) }
		})
	},
	customIcon: function (path, size, preview) {
		const w = 32 * G.dp * size;
		var frm = new G.FrameLayout(ctx);
		var view = new G.ImageView(ctx);
		var drawable;
		if (android.os.Build.VERSION.SDK_INT >= 28) {
			try {
				drawable = G.ImageDecoder.decodeDrawable(G.ImageDecoder.createSource(new java.io.File(path)), new G.ImageDecoder.OnHeaderDecodedListener({
					onHeaderDecoded: function (decoder, info, source) {
						decoder.setTargetSize(w, w);
					}
				}));
				if (drawable instanceof G.AnimatedImageDrawable) {
					drawable.setRepeatCount(-1);
					drawable.start();
				}
			} catch (e) {
				Log.e(e);
			}
		} else {
			drawable = G.Drawable.createFromPath(path);
		}
		if (drawable) {
			view.setImageDrawable(drawable);
		} else if (preview) {
			view.setImageResource(G.R.drawable.ic_delete);
		} else {
			return CA.Icon.default(size, false);
		}
		view.setScaleType(G.ImageView.ScaleType.FIT_XY);
		view.setLayoutParams(new G.FrameLayout.LayoutParams(w, w));
		frm.addView(view);
		return frm;
	},
	Icon: {
		"default": function (size) {
			const w = 32 * G.dp * size;
			var bmp = G.Bitmap.createBitmap(w, w, G.Bitmap.Config.ARGB_8888);
			var cv = new G.Canvas(bmp);
			cv.scale(w / 256, w / 256);
			var pt = new G.Paint();
			pt.setAntiAlias(true);
			IntColor.Paint.setColor(pt, Common.theme.go_bgcolor);
			IntColor.Paint.setShadowLayer(pt, 16, 0, 0, Common.theme.go_touchbgcolor);
			cv.drawCircle(128, 128, 112, pt);
			pt.setTextSize(128);
			pt.setTypeface(G.Typeface.create(G.Typeface.MONOSPACE || G.Typeface.DEFAULT, G.Typeface.BOLD));
			pt.clearShadowLayer();
			var fb = new G.Rect(), fm = pt.getFontMetrics();
			pt.getTextBounds("CA", 0, 2, fb);
			IntColor.Paint.setColor(pt, Common.theme.go_textcolor);
			cv.drawText("CA", 128 - fb.centerX(), 128 - (fm.descent + fm.ascent) / 2, pt);
			var frm = new G.FrameLayout(ctx);
			var view = new G.ImageView(ctx);
			view.setImageBitmap(bmp);
			view.setLayoutParams(new G.FrameLayout.LayoutParams(w, w));
			frm.addView(view);
			return frm;
		},
		"default_old": function (size) {
			var zp = G.dp * size;
			var view = new G.TextView(ctx);
			view.setText("CA");
			view.setPadding(5 * zp, 5 * zp, 5 * zp, 5 * zp);
			view.setTextSize(18 * size);
			view.setBackgroundColor(Common.theme.go_bgcolor);
			view.setTextColor(Common.theme.go_textcolor);
			view.setOnTouchListener(new G.View.OnTouchListener({
				onTouch: function (v, e) {
					try {
						switch (e.getAction()) {
							case e.ACTION_DOWN:
								v.setBackgroundColor(Common.theme.go_touchbgcolor);
								v.setTextColor(Common.theme.go_touchtextcolor);
								break;
							case e.ACTION_UP:
							case e.ACTION_CANCEL:
								v.setBackgroundColor(Common.theme.go_bgcolor);
								v.setTextColor(Common.theme.go_textcolor);
						}
						return false;
					} catch (e) { return erp(e), false }
				}
			}));
			return view;
		}
	},
	checkFeatures: function () {
		var i;
		for (i in this.Features) {
			this.Features[i].flag = this.Library.checkPackVer(this.Features[i]);
		}
	},
	hasFeature: function (feature) {
		return this.Features[feature].flag == 0;
	},
	Features: {
		enableCommand: {
			minSupportVer: "0.16"
		},
		enableCommandBlock: {
			minSupportVer: "1.0.5"
		},
		enableLocalCoord: {
			minSupportVer: "1.2"
		},
		version_1_1: {
			minSupportVer: "1.1",
			maxSupportVer: "1.1.*",
		}
	},
	drawQRCode: function (bmp, code, decorator) {
		var bytes = android.util.Base64.decode(code.bytes, 2), x, y, p;
		var cv = new G.Canvas(bmp);
		var pt = new G.Paint();
		pt.setAntiAlias(false);
		IntColor.Paint.setColor(pt, G.Color.BLACK);
		pt.setStyle(G.Paint.Style.FILL);
		IntColor.Canvas.drawColor(cv, new java.lang.Integer(G.Color.WHITE));
		cv.scale(bmp.width / code.width, bmp.height / code.height);
		for (y = 0; y < code.height; y++) {
			for (x = 0; x < code.width; x++) {
				p = y * code.width + x;
				if (bytes[p >> 3] & new java.lang.Integer(1 << (p & 7)).byteValue()) {
					cv.drawRect(x, y, x + 1, y + 1, pt);
				}
			}
		}
		if (decorator.drawable) {
			var wr = code.whiteRect, dr = decorator.drawable;
			dr.setBounds(wr.x, wr.y, wr.width + wr.x, wr.height + wr.y);
			dr.draw(cv);
		}
	},
	chooseIDList: function (callback) {
		var allIds = [];
		var r = CA.IntelliSense.library.idlist.map(function (e) {
			var i, t = {
				text: e.name,
				list: e.lists || (e.list ? [e.list] : [])
			};
			for (i in t.list) allIds.push(t.list[i]);
			return t;
		});
		r.unshift({
			text: "全部",
			list: allIds
		});
		Common.showListChooser(r, function (pos) {
			CA.showIDList(r[pos].list, callback);
		});
	},
	showIDList: function self(list, callback) {
		if (CA.Library.loadingStatus) {
			Common.toast("命令库加载中，请稍候");
			return;
		}
		G.ui(function () {
			try {
				if (!self.linear) {
					self.vmaker = function (holder) {
						var view = new G.TextView(ctx);
						view.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						view.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
						Common.applyStyle(view, "textview_default", 3);
						return view;
					}
					self.vbinder = function (holder, e, i, a) {
						holder.self.setText(self.texts[e]);
					}
					self.init = function (list) {
						self.ids = [];
						self.texts = [];
						var i, j, cur = list, e, ks, off, total = 0;
						for (i = 0; i < cur.length; i++) {
							if (!(cur[i] instanceof Object)) {
								cur[i] = CA.IntelliSense.library.enums[cur[i]] || {}; // 兜底
							}
						}
						cur = cur.filter(Boolean); // 把 null/undefined 过滤掉
						for (i = 0; i < cur.length; i++) {
							e = cur[i];
							if (e == null) continue;
							off = total;
							if (Array.isArray(e)) {
								self.ids.length = (self.texts.length += e.length);
								for (j = 0; j < e.length; j++) {
									if (self.ids.indexOf(e[j]) >= 0) {
										off--;
										continue;
									}
									self.ids[off + j] = self.texts[off + j] = e[j];
									total++;
								}
							} else {
								ks = Object.keys(e);
								self.ids.length = (self.texts.length += ks.length);
								for (j = 0; j < ks.length; j++) {
									if (self.ids.indexOf(ks[j]) >= 0) {
										off--;
										continue;
									}
									self.ids[off + j] = ks[j];
									self.texts[off + j] = ks[j] + (e[ks[j]] ? " - " + e[ks[j]] : "");
									total++;
								}
							}
							self.ids.length = self.texts.length = total;
						}
						ISegment.kvSort(self.ids, self.texts, function (a, b) {
							return a > b ? 1 : a == b ? 0 : -1;
						});
						self.update("");
					}
					self.update = function (s) {
						var i, arr = [];
						for (i = 0; i < self.texts.length; i++) {
							if (self.texts[i].indexOf(s) >= 0) {
								arr.push(i);
							}
						}
						self.adpt.setArray(arr);
					}
					self.adpt = SimpleListAdapter.getController(new SimpleListAdapter([], self.vmaker, self.vbinder, null, true));
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
					self.edit.setTypeface(G.Typeface.MONOSPACE || G.Typeface.DEFAULT);
					Common.applyStyle(self.edit, "edittext_default", 3);
					self.edit.addTextChangedListener(new G.TextWatcher({
						afterTextChanged: function (s) {
							try {
								self.update(String(s));
							} catch (e) { erp(e) }
						}
					}));
					self.header.addView(self.edit);
					self.exit = new G.TextView(ctx);
					self.exit.setText("×");
					self.exit.setGravity(G.Gravity.CENTER);
					self.exit.setPadding(10 * G.dp, 0, 10 * G.dp, 0)
					self.exit.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
					Common.applyStyle(self.exit, "button_critical", 3);
					self.exit.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								self.popup.exit();
							} catch (e) { erp(e) }
						}
					}));
					self.header.addView(self.exit);
					self.linear.addView(self.header);
					self.list = new G.ListView(ctx);
					self.list.setAdapter(self.adpt.self);
					self.list.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -1));
					self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({
						onItemClick: function (parent, view, pos, id) {
							try {
								var text = self.ids[self.adpt.array[pos]];
								if (self.callback) {
									self.popup.exit();
									self.callback(text);
								} else {
									self.edit.setText(text);
									self.edit.setSelection(self.edit.length());
								}
							} catch (e) { erp(e) }
						}
					}));
					if (G.style == "Material") {
						self.list.setFastScrollEnabled(true);
						self.list.setFastScrollAlwaysVisible(false);
					}
					self.linear.addView(self.list);

					self.popup = new PopupPage(self.linear, "ca.IDList");

					PWM.registerResetFlag(self, "linear");
				}
				Common.showProgressDialog(function (o) {
					o.setText("正在加载列表……");
					self.init(list);
					if (o.cancelled) return;
					G.ui(function () {
						try {
							self.callback = callback;
							self.popup.enter();
						} catch (e) { erp(e) }
					});
				}, true);
			} catch (e) { erp(e) }
		})
	},

	SpecialTips: [
		function (d) {
			if (d.getFullYear() > 2017 && d.getMonth() == 2 && d.getDate() == 20) return "命令助手" + (d.getFullYear() - 2017) + "周年！感谢你们的支持！";
		},
		function (d) {
			if (d.getMonth() == 4 && d.getDate() == 1) return "劳动节快乐！";
		},
		function (d) {
			if (d.getMonth() == 5 && d.getDate() == 1) return "儿童节快乐！";
		},
		function (d) {
			if (d.getMonth() == 9 && d.getDate() == 1) return "国庆节快乐！";
		}
	],
	getTip: function () {
		var i, date = new Date(), t;
		for (i in this.SpecialTips) {
			t = this.SpecialTips[i](date);
			if (t) return t;
		}
		this.settings.tipsRead = isNaN(this.settings.tipsRead) ? 0 : (this.settings.tipsRead + 1) % this.tips.length;
		return this.tips[this.settings.tipsRead];
	},

	showBatchBuilder: function self(text, reset) {
		G.ui(function () {
			try {
				if (!self.linear) {
					var vcfg = G.ViewConfiguration.get(ctx);
					var longPressTimeout = vcfg.getLongPressTimeout();
					var touchSlop = vcfg.getScaledTouchSlop();
					self.variables = [];
					self.clipboard = null;
					self.bmpcache = [];
					self.labelOption = {
						endChars: ":",
						skipChars: ":"
					};
					self.typeOption = {
						endChars: "(}",
						skipChars: "(}"
					};
					self.spanEdit = [{
						text: "编辑",
						onclick: function (v, tag) {
							self.clickVariable(tag.variable);
						}
					}, {
						text: "复制",
						onclick: function (v, tag) {
							self.copyVariable(tag.variable);
						}
					}, {
						text: "剪切",
						onclick: function (v, tag) {
							self.copyVariable(tag.variable);
							self.deleteVariable(tag.variable, true);
						}
					}, {
						text: "重命名",
						onclick: function (v, tag) {
							Common.showInputDialog({
								title: "重命名",
								callback: function (s) {
									if (!s) {
										Common.toast("名称不能为空");
										return;
									}
									if (self.findVariableByLabel(s, true)) {
										Common.toast("名称已存在");
										return;
									}
									tag.variable.label = s;
									self.replaceVariable(tag.variable, tag.variable, true);
								},
								singleLine: true,
								defaultValue: tag.variable.label
							});
						}
					}, {
						text: "替换",
						onclick: function (v, tag) {
							self.makeVariable(function (variable) {
								self.replaceVariable(tag.variable, variable, true);
							});
						}
					}, {
						text: "重置",
						onclick: function (v, tag) {
							self.replaceVariable(tag.variable, self.createVariable(tag.variable.label, tag.variable.type), true);
						}
					}, {
						text: "删除",
						onclick: function (v, tag) {
							self.deleteVariable(tag.variable, true);
						}
					}];
					self.init = function (s) {
						self.variables.length = 0;
						self.edit.setText("");
						self.clearBmpCache();
						self.edit.setText(self.unflatten(s));
						self.edit.setSelection(self.edit.length());
						self.setContent(self.getDefaultContent());
					}
					self.setContent = function (v) {
						if (self.container.getChildAt(0) != v) {
							self.container.removeAllViews();
							self.container.addView(v, new G.FrameLayout.LayoutParams(-1, -1));
						}
					}
					self.clearBmpCache = function () {
						var i, e;
						for (i = this.bmpcache.length - 1; i >= 0; i--) {
							e = this.bmpcache[i];
							if (e) e.recycle();
						}
						this.bmpcache.length = 0;
					}
					self.unflatten = function (str) {
						var stream, pos_start, end_char, r = new G.SpannableStringBuilder();
						var cur, match, has_param, error = [];
						stream = {
							cur: 0,
							str: str
						};
						while ((pos_start = str.indexOf("${", stream.cur)) >= 0) {
							r.append(str.slice(stream.cur, pos_start).replace(/\$ /g, "$"));
							try {
								cur = {};
								stream.cur = pos_start + 2;
								cur.label = ISegment.readLenientString(stream, self.labelOption);
								if (ISegment.isStringEOS(stream)) throw "找不到变量类型";
								cur.type = ISegment.readLenientString(stream, self.typeOption);
								if (ISegment.isStringEOS(stream)) throw "找不到变量结束符";
								if (cur.label.length == 0) throw "变量名称不能为空";
								if (self.findVariableByLabel(cur.label, false)) cur.label = self.generateName(cur.label + " (", ")", true);
								if (!(cur.type in CA.BatchPattern)) throw "不存在的变量类型：" + cur.type;
								stream.cur--;
								end_char = ISegment.peekStreamStr(stream);
								if (end_char == "(") {
									match = CA.BatchPattern[cur.type].parse(ISegment.peekStreamAll(stream));
									if (!match) throw "变量参数格式错误";
									stream.cur += match.length;
									cur.data = match.data;
								} else if (end_char == "}") {
									cur = self.createVariable(cur.label, cur.type);
								}
								if (ISegment.readStreamStr(stream) != "}") throw "找不到变量结束符";
								r.append(self.buildSpan(cur));
								self.variables.push(cur);
							} catch (e) {
								error.push(e + "(位置：" + pos_start + ")");
								r.append("${");
								stream.cur = pos_start + 2;
								continue;
							}
						}
						r.append(ISegment.readStreamAll(stream).replace(/\$ /g, "$"));
						if (error.length) {
							Common.showTextDialog(error.join("\n"));
						}
						return r;
					}
					self.makeVariable = function (callback) {
						var i, r = [{
							text: "副本",
							description: "创建已有标签的副本",
							copy: true
						}], a = CA.BatchPattern;
						if (self.clipboard) {
							r.push({
								text: "剪切板",
								description: self.clipboard.label + " : " + a[self.clipboard.type].name,
								paste: true
							});
						}
						for (i in a) {
							r.push({
								text: a[i].name,
								description: a[i].description,
								obj: a[i],
								id: i
							});
						}
						Common.showListChooser(r, function (pos) {
							var e = r[pos];
							if (e.copy) {
								self.chooseVariable(function (o) {
									var type = CA.BatchPattern[o.type];
									callback({
										label: self.generateName(type.name, ""),
										type: o.type,
										data: type.clone ? type.clone(o.data) : type.parse(type.stringify(o.data)).data
									});
								});
								return;
							}
							if (e.paste) {
								e = self.pasteVariable();
								if (self.findVariableByLabel(e.label, true)) {
									e.label = self.generateName(e.label + "(", ")");
								}
								callback(e);
								return;
							}
							callback(self.createVariable(self.generateName(e.text, ""), e.id));
						}, true);
					}
					self.chooseVariable = function (callback) {
						var a = self.getVariables().map(function (e) {
							var type = CA.BatchPattern[e.type];
							return {
								text: e.label + " : " + type.name,
								data: e
							};
						});
						Common.showListChooser(a, function (pos) {
							callback(a[pos].data);
						}, true);
					}
					self.clickVariable = function (variable) {
						if (variable.data.onClick) variable.data.onClick();
						if (variable.data.layout) {
							self.setContent(variable.data.layout);
						} else {
							self.setContent(self.getDefaultContent());
						}
					}
					self.showVariableMenu = function (variable) {
						Common.showOperateDialog(self.spanEdit, {
							variable: variable
						});
					}
					self.createImageSpan = function (bgcolor, frcolor, fontsize, text) {
						var margin = 2 * G.dp, padding = 4 * G.dp;
						var offset = margin + padding;
						var pt = new G.Paint();
						fontsize *= G.sp;
						pt.setAntiAlias(true);
						pt.setTextSize(fontsize);
						pt.setTypeface(G.Typeface.MONOSPACE || G.Typeface.DEFAULT);
						var fb = new G.Rect(), fm = pt.getFontMetrics();
						fontsize -= 2 * offset / (fm.descent - fm.ascent);
						pt.setTextSize(fontsize);
						pt.getFontMetrics(fm);
						pt.getTextBounds(text, 0, text.length, fb);
						fb.top = fm.ascent; fb.bottom = fm.descent;
						var bmp = G.Bitmap.createBitmap(fb.width() + 2 * offset, fb.height() + 2 * offset, G.Bitmap.Config.ARGB_8888);
						var cv = new G.Canvas(bmp);
						var ox = -fb.left, oy = -fb.top;
						IntColor.Paint.setColor(pt, bgcolor);
						fb.inset(-padding, -padding);
						fb.offsetTo(margin, margin);
						cv.drawRect(fb, pt);
						IntColor.Paint.setColor(pt, frcolor);
						cv.drawText(text, offset + ox, offset + oy, pt);
						self.bmpcache.push(bmp);
						return new G.ImageSpan(ctx, bmp, 0); //0 = ALIGN_BOTTOM
					}
					self.createVariable = function (label, type) {
						var o = {
							label: label,
							type: type,
							data: CA.BatchPattern[type].create()
						};
						return o;
					}
					self.insertVariable = function (o, notify) {
						self.variables.push(o);
						Common.replaceSelection(self.edit.getText(), self.buildSpan(o));
						if (notify) self.clickSpan(o.span);
					}
					self.replaceVariable = function (old, replacement, notify) {
						var p = self.variables.indexOf(old), buffer = self.edit.getText(), oldSpan = old.span;
						if (p >= 0) {
							self.variables[p] = replacement;
						} else {
							self.variables.push(replacement);
						}
						p = buffer.getSpanStart(oldSpan);
						if (p >= 0) {
							buffer.replace(p, buffer.getSpanEnd(oldSpan), self.buildSpan(replacement));
							buffer.removeSpan(oldSpan); //与被替换区域重合的span会被保留，在被替换区域内的span会被移除
						} else {
							Common.replaceSelection(buffer, self.buildSpan(replacement));
						}
						if (notify) self.clickSpan(replacement.span);
					}
					self.deleteVariable = function (o, notify) {
						var p = self.variables.indexOf(o), buffer = self.edit.getText();
						if (p >= 0) {
							self.variables.splice(p, 1);
						}
						p = buffer.getSpanStart(o.span);
						if (p >= 0) {
							buffer.delete(p, buffer.getSpanEnd(o.span));
							buffer.removeSpan(o.span); //与被删除区域重合的span会被保留，在被删除区域内的span会被移除，因为delete就是replace一个空字符串
						}
						if (notify) self.endSpanEdit();
					}
					self.copyVariable = function (variable) {
						var type = CA.BatchPattern[variable.type];
						self.clipboard = {
							label: variable.label,
							type: variable.type,
							dataStr: type.stringify(variable.data)
						}
					}
					self.pasteVariable = function () {
						var e = self.clipboard;
						if (!e) return;
						var type = CA.BatchPattern[e.type];
						return {
							label: e.label,
							type: e.type,
							data: type.parse(e.dataStr).data
						}
					}
					self.buildSpan = function (o) {
						var ss = new G.SpannableString("${" + o.label + ":" + o.type + "}");
						var span = self.createImageSpan(Common.theme.highlightcolor, Common.theme.bgcolor, Common.theme.textsize[3], o.label);
						ss.setSpan(span, 0, ss.length(), G.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
						o.span = span;
						return ss;
					}
					self.findVariableBySpan = function (span) {
						var i, e;
						for (i in self.variables) {
							e = self.variables[i];
							if (e.span == span) return e;
						}
						return null;
					}
					self.findVariableByLabel = function (label, inline) {
						var i, e, text = self.edit.getText();
						for (i in self.variables) {
							e = self.variables[i];
							if (e.label == label && (!inline || text.getSpanStart(e.span) >= 0)) {
								return e;
							}
						}
						return null;
					}
					self.generateName = function (prefix, suffix, notInline) {
						var i = 1;
						while (self.findVariableByLabel(prefix + i + suffix, !notInline)) i++;
						return prefix + i + suffix;
					}
					self.endSpanEdit = function () {
						self.setContent(self.getDefaultContent());
					}
					self.getVariables = function () {
						var template = self.edit.getText();
						var spans = template.getSpans(0, template.length(), G.ImageSpan);
						var i, variables = [], e;
						for (i in spans) {
							e = self.findVariableBySpan(spans[i]);
							if (!e) continue;
							e.start = template.getSpanStart(spans[i]);
							e.end = template.getSpanEnd(spans[i]);
							variables.push(e);
						}
						variables.sort(function (a, b) {
							return a.start - b.start;
						});
						return variables;
					}
					self.flatten = function () {
						var template = String(self.edit.getText());
						var vars = self.getVariables();
						var i, r = [], pos = 0;
						for (i in vars) {
							r.push(template.slice(pos, vars[i].start).replace(/\$/g, "$ "));
							r.push("${", ISegment.writeLenientString(vars[i].label, self.labelOption));
							r.push(":", ISegment.writeLenientString(vars[i].type, self.typeOption));
							r.push(CA.BatchPattern[vars[i].type].stringify(vars[i].data));
							r.push("}");
							pos = vars[i].end;
						}
						r.push(template.slice(pos, template.length).replace(/\$/g, "$ "));
						return r.join("");
					}
					self.concatStrBundle = function (target, string) {
						var i, j, dstLen, strLen;
						if (!target.length) target.push("");
						if (!Array.isArray(string)) string = [string];
						dstLen = target.length;
						strLen = string.length;
						if (strLen > 1) {
							target.length *= strLen;
							for (i = dstLen - 1; i >= 0; i--) {
								for (j = 0; j < strLen; j++) {
									target[i * strLen + j] = target[i];
								}
							}
						}
						for (i = 0; i < dstLen; i++) {
							for (j = 0; j < strLen; j++) {
								target[i * strLen + j] += string[j];
							}
						}
						return target;
					}
					self.bundleStrings = function (array) {
						var i, msp = [], msi, msn, r = [], cur, t;
						for (i = 0; i < array.length; i++) {
							if (array[i] instanceof Function) {
								array[i] = array[i](); //懒计算
							}
							if (Array.isArray(array[i])) {
								msp.push(i); //记录所有的片段位置
							}
						}
						if (msp.length == 0) { //处理片段数量为零的情况
							if (array.length == 0) array = [""];
							array[0] = [array[0]]; //将array[0]转换为片段，便于处理
							msp.push(0);
						}
						msi = new Array(msp.length); //每个片段的当前子片段索引
						msn = new Array(msp.length); //每个片段的总子片段数
						for (i = 0; i < msp.length; i++) {
							msi[i] = 0;
							msn[i] = array[msp[i]].length;
						}
						while (msi[0] < msn[0]) {
							cur = array.slice(); //当前静态片段列表
							for (i = 0; i < msp.length; i++) {
								cur[msp[i]] = cur[msp[i]][msi[i]];
							} //将每个片段替换为当前子片段
							for (i = 0; i < cur.length; i++) {
								if (typeof cur[i] == "object") { //处理特殊子片段
									switch (cur[i].type) {
										case "map": //映射子片段
											//当前子片段的内容取决于当前静态子片段内容
											cur[i] = cur[i].map(cur);
											break;
										case "syncmap": //同步映射子片段
											//当前子片段的内容取决于当前target指定的子片段内容、索引及子片段总数
											t = cur[i].target;
											t2 = msp.indexOf(t);
											cur[i] = cur[i].map(cur[t], msi[t2], msn[t2]);
											break;
										case "expr": //表达式子片段
											//当前子片段的内容为表达式计算的结果
											cur[i] = cur[i].expr(i, cur, array, r.length, msp, msi, msn);
											break;
									}
								}
							}
							r.push(cur.join("")); //生成当前静态片段文本并保存
							msi[msi.length - 1]++; //递增索引
							for (i = msi.length - 1; i > 0; i--) {
								if (msi[i] >= msn[i]) {
									msi[i] = 0;
									msi[i - 1]++;
								} else {
									break;
								}
							} //处理索引进位
						}
						return r;
					}
					self.export = function () {
						var template = String(self.edit.getText());
						var vars = self.getVariables(), lineData = [], globalData = {};
						var varsController = self.varsController.create(vars, lineData, globalData);
						var i, r = [], pos = 0;
						for (i = 0; i < vars.length; i++) {
							r.push(template.slice(pos, vars[i].start));
							r.push(CA.BatchPattern[vars[i].type].export(vars[i].data, varsController));
							pos = vars[i].end;
						}
						r.push(template.slice(pos, template.length));
						return self.bundleStrings(r);
					}
					self.varsController = {
						create: function (vars, lineData, globalData) {
							var o = Object.create(this);
							o.vars = vars;
							o.lineData = lineData;
							o.globalData = globalData;
							return o;
						},
						getBundleIndexByLabel: function (label) {
							var i;
							for (i = 0; i < this.vars.length; i++) {
								if (this.vars[i].label == label) {
									return i * 2 + 1;
								}
							}
							return -1;
						},
						getLabelByData: function (data) {
							var i;
							for (i = 0; i < this.vars.length; i++) {
								if (this.vars[i].data === data) {
									return this.vars[i].label;
								}
							}
							return null;
						},
						getLineData: function (spec, index) {
							var t = this.lineData[index];
							if (t) {
								if (!t[spec]) t[spec] = {};
								return t[spec];
							} else {
								t = this.lineData[index] = {};
								return t[spec] = {};
							}
						},
						getGlobalData: function (spec) {
							if (!this.globalData[spec]) this.globalData[spec] = {};
							return this.globalData[spec];
						}
					}
					self.clickSpan = function (span) {
						var e = self.findVariableBySpan(span);
						if (!e) return;
						self.clickVariable(e);
					}
					self.longClick = new java.lang.Runnable(function () {
						try {
							var variable;
							if (self.lcReady && !self.lcFinish) {
								if (self.lcTarget) {
									variable = self.findVariableBySpan(self.lcTarget);
									if (variable) {
										self.showVariableMenu(variable);
									}
								}
								self.lcFinish = true;
							}
						} catch (e) { erp(e) }
					});
					self.getLink = function (x, y) {
						var widget = self.edit, buffer = self.edit.getText();
						var layout, line, off, links;
						x -= widget.getTotalPaddingLeft();
						y -= widget.getTotalPaddingTop();
						x += widget.getScrollX();
						y += widget.getScrollY();
						layout = widget.getLayout();
						line = layout.getLineForVertical(y);
						off = layout.getOffsetForHorizontal(line, x);
						links = buffer.getSpans(off, off, G.ImageSpan);
						if (x < layout.getLineMax(line) && links.length != 0) {
							return links[0];
						} else {
							return null;
						}
					}
					self.selectLink = function (link) {
						var buffer = self.edit.getText();
						G.Selection.setSelection(buffer,
							buffer.getSpanStart(link),
							buffer.getSpanEnd(link));
					}
					self.menuVMaker = function (holder) {
						var view = new G.TextView(ctx);
						view.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
						view.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						Common.applyStyle(view, "textview_default", 3);
						return holder.text = view;
					}
					self.menuVBinder = function (holder, e) {
						holder.text.setText(e.text);
					}
					self.buildMenuView = function (arr) {
						var list = new G.ListView(ctx);
						list.setAdapter(new SimpleListAdapter(arr, self.menuVMaker, self.menuVBinder));
						list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({
							onItemClick: function (parent, view, pos, id) {
								try {
									parent.getItemAtPosition(pos).onclick();
								} catch (e) { erp(e) }
							}
						}));
						return list;
					}
					self.getDefaultContent = function () {
						if (self.content_default) return self.content_default;
						var view = self.buildMenuView([{
							text: "添加/粘贴变量……",
							onclick: function () {
								self.makeVariable(function (variable) {
									self.insertVariable(variable, true);
								});
							}
						}, {
							text: "选择变量……",
							onclick: function () {
								self.chooseVariable(function (o) {
									self.selectLink(o.span);
									self.showVariableMenu(o);
								});
							}
						}, {
							text: "预览",
							onclick: function () {
								if (!self.edit.length()) {
									Common.toast("模板为空");
									return;
								}
								Common.showTextDialog(self.export().join("\n"));
							}
						}, {
							text: "保存至历史",
							onclick: function () {
								if (!self.edit.length()) {
									Common.toast("模板为空");
									return;
								}
								self.export().forEach(function (e) {
									if (e.length) CA.addHistory(e);
								});
								if (CA.history) CA.showHistory();
								self.popup.exit();
								Common.toast("已保存至历史");
							}
						}, {
							text: "保存至函数文件",
							onclick: function () {
								if (!self.edit.length()) {
									Common.toast("模板为空");
									return;
								}
								self.addExp();
								ExternalStorage.showExportActions({
									mimeType: "text/plain",
									hint: "generated.mcfunction",
									export(uri) {
										try {
											ExternalStorage.writeFileContent(uri, "# This file is spawned by CA\n# Template: " + self.flatten() + "\n\n" + self.export().join("\n"));
											Common.toast("函数文件已保存");
										} catch (e) {
											Common.toast("保存函数文件失败\n" + e);
										}
									}
								});
							}
						}, {
							text: "收藏模板",
							onclick: function () {
								if (!self.edit.length()) {
									Common.toast("模板为空");
									return;
								}
								var cmd = self.flatten();
								CA.showFavEditDialog({
									mode: 0,
									data: {
										value: cmd,
										source: "batch"
									},
									callback: function () {
										this.folder.children.push(this.data);
										Common.toast("模板已收藏");
										self.addExp();
									},
									onDismiss: function () {
										if (CA.history) CA.showHistory();
									}
								});
							}
						}, {
							text: "清空并关闭",
							onclick: function () {
								self.edit.setText("");
								self.popup.exit();
							}
						}]);
						self.content_default = view;
						PWM.registerResetFlag(self, "content_default");
						return view;
					}
					self.addExp = function () {
						if (self.getVariables().length > 0) {
							UserManager.enqueueExp("createTemplate");
						}
					}

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
					self.edit.setTypeface(G.Typeface.MONOSPACE || G.Typeface.DEFAULT);
					Common.applyStyle(self.edit, "edittext_default", 3);
					self.edit.setOnTouchListener(new G.View.OnTouchListener({
						onTouch: function touch(v, e) {
							try {
								var link, x = e.getX(), y = e.getY();
								switch (e.getAction()) {
									case e.ACTION_MOVE:
										if (self.lcStead) {
											if (Math.abs(x - self.lcLX) + Math.abs(y - self.lcLY) < touchSlop) {
												break;
											}
											self.lcStead = false;
											self.lcReady = false;
										}
										break;
									case e.ACTION_DOWN:
										self.lcLX = x; self.lcLY = y;
										self.lcStead = true;
										self.lcFinish = false;
										self.lcTarget = link = self.getLink(x, y);
										if (link) {
											self.selectLink(link);
											self.lcReady = true;
											v.postDelayed(self.longClick, longPressTimeout);
											return true;
										}
										break;
									case e.ACTION_UP:
										if (self.lcStead && !self.lcFinish) {
											if (self.lcTarget) {
												self.clickSpan(self.lcTarget);
											} else {
												self.endSpanEdit();
											}
										}
									case e.ACTION_CANCEL:
										self.lcReady = false;
										v.removeCallbacks(self.longClick);
								}
								return false;
							} catch (e) { return erp(e), true }
						}
					}));
					self.header.addView(self.edit);
					self.exit = new G.TextView(ctx);
					self.exit.setText("×");
					self.exit.setGravity(G.Gravity.CENTER);
					self.exit.setPadding(10 * G.dp, 0, 10 * G.dp, 0)
					self.exit.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
					Common.applyStyle(self.exit, "button_critical", 3);
					self.exit.setOnClickListener(new G.View.OnClickListener({
						onClick: function (v) {
							try {
								self.popup.exit();
							} catch (e) { erp(e) }
						}
					}));
					self.header.addView(self.exit);
					self.linear.addView(self.header);
					self.cscr = new G.ScrollView(ctx);
					self.cscr.setFillViewport(true);
					self.cscr.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -1));
					self.container = new G.FrameLayout(ctx);
					self.container.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -1));
					self.cscr.addView(self.container);
					self.linear.addView(self.cscr);

					self.popup = new PopupPage(self.linear, "ca.BatchBuilder");

					PWM.registerResetFlag(self, "linear");
				}
				self.popup.enter();
				if (reset || !self.edit.length()) self.init(text || "");
			} catch (e) { erp(e) }
		})
	},
	BatchPattern: {
		list: {
			name: "列表",
			description: "包含了一系列参数的列表",
			options: {
				endChars: ")",
				skipChars: "|)",
				splitChar: "|",
				splitChars: "|"
			},
			create: function () {
				return this.buildLayout({
					list: []
				});
			},
			parse: function (s) {
				var o = {
					str: s.slice(1),
					cur: 0
				};
				var r = ISegment.readLenientStringArray(o, this.options);
				return {
					length: o.cur + 1,
					data: this.buildLayout({
						list: r
					})
				};
			},
			stringify: function (o) {
				this.update(o);
				return "(" + ISegment.writeLenientStringArray(o.list, this.options) + ")";
			},
			export: function (o) {
				this.update(o);
				return o.list;
			},
			buildLayout: function (o) {
				o.layout = o.edittext = L.EditText({
					text: o.list.join("\n"),
					hint: "每一行为列表的一个条目",
					padding: [10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp],
					gravity: L.Gravity("left|top"),
					imeOptions: L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
					style: "edittext_default",
					fontSize: 3
				});
				return o;
			},
			update: function (o) {
				o.list = String(o.edittext.getText()).split("\n");
			}
		},
		synclist: {
			name: "同步列表",
			description: "与某个变量同步的列表",
			options: {
				endChars: ")",
				skipChars: "|)",
				splitChar: "|",
				splitChars: "|"
			},
			create: function () {
				return this.buildLayout({
					syncLabel: "",
					list: []
				});
			},
			parse: function (s) {
				var o = {
					str: s.slice(1),
					cur: 0
				};
				var r = ISegment.readLenientStringArray(o, this.options);
				return {
					length: o.cur + 1,
					data: this.buildLayout({
						syncLabel: r[0],
						list: r.slice(1)
					})
				};
			},
			stringify: function (o) {
				this.update(o);
				return "(" + ISegment.writeLenientStringArray([o.syncLabel].concat(o.list), this.options) + ")";
			},
			export: function (o, controller) {
				this.update(o);
				return {
					type: "syncmap",
					arr: o.list,
					target: controller.getBundleIndexByLabel(o.syncLabel),
					map: this.mapFunc
				}
				return o.list;
			},
			mapFunc: function (e, i, n) {
				return i < this.arr.length ? this.arr[i] : "{下标超出}"
			},
			buildLayout: function (o) {
				o.layout = L.LinearLayout({
					orientation: L.LinearLayout("vertical"),
					children: [
						o.editlabel = L.attach(CA.createVariableSelector(function (label) {
							o.syncLabel = label;
						}, null, o.syncLabel, "标签名"), {
							padding: [10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp],
							gravity: L.Gravity("left|top"),
							imeOptions: L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
							layoutWidth: -1,
							layoutHeight: -2,
							style: "edittext_default",
							fontSize: 3
						}),
						o.edittext = L.EditText({
							text: o.list.join("\n"),
							hint: "每一行为列表的一个条目",
							padding: [10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp],
							gravity: L.Gravity("left|top"),
							layoutWidth: -1,
							layoutHeight: -1,
							style: "edittext_default",
							fontSize: 3
						})
					]
				});
				return o;
			},
			update: function (o) {
				o.list = String(o.edittext.getText()).split("\n");
				o.syncLabel = String(o.editlabel.getText());
			}
		},
		param: {
			name: "固定参数",
			description: "仅含1个参数的列表",
			options: {
				skipChars: ")",
				endChars: ")"
			},
			create: function () {
				return this.buildLayout({
					text: ""
				});
			},
			parse: function (s) {
				var o = {
					str: s.slice(1),
					cur: 0
				};
				var r = ISegment.readLenientString(o, this.options);
				return {
					length: o.cur + 1,
					data: this.buildLayout({
						text: r
					})
				};
			},
			stringify: function (o) {
				this.update(o);
				return "(" + ISegment.writeLenientString(o.text, this.options) + ")";
			},
			export: function (o, controller) {
				var param = controller.getGlobalData("param:global"), value;
				this.update(o);
				value = o.text;
				try {
					value = JSON.parse(value);
				} catch (e) {/* non-JSON value */ }
				param[controller.getLabelByData(o)] = value;
				return [o.text];
			},
			buildLayout: function (o) {
				o.layout = o.edittext = L.EditText({
					text: o.text,
					hint: "在这里填入需要的参数",
					singleLine: true,
					padding: [10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp],
					gravity: L.Gravity("left|top"),
					style: "edittext_default",
					fontSize: 3
				});
				return o;
			},
			update: function (o) {
				o.text = String(o.edittext.getText()).replace(/\n/g, " ");
			}
		},
		range: {
			name: "等差数列",
			description: "一个等差数列的列表",
			options: {
				endChars: ")",
				skipChars: "|)",
				splitChar: "|",
				splitChars: "|"
			},
			create: function () {
				return this.buildLayout({
					from: 1,
					to: 10,
					step: 1,
					syncLabel: ""
				});
			},
			parse: function (s) {
				var o = {
					str: s.slice(1),
					cur: 0
				};
				var r = ISegment.readLenientStringArray(o, this.options);
				return {
					length: o.cur + 1,
					data: this.buildLayout({
						from: parseFloat(r[0]),
						to: parseFloat(r[1]),
						step: r[2] ? parseFloat(r[2]) : 1,
						syncLabel: r[3] || ""
					})
				};
			},
			stringify: function (o) {
				this.update(o);
				return "(" + ISegment.writeLenientStringArray([String(o.from), String(o.to), String(o.step), o.syncLabel], this.options) + ")";
			},
			export: function (o, controller) {
				this.update(o);
				var i, from = o.from, to = o.to, step = o.step, syncLabel = o.syncLabel, t, r = [];
				if (step == 0 || isNaN(step)) step = 1;
				if (to < from && step > 0) {
					step = -step;
				}
				t = (to - from) / step;
				if (!isFinite(step) || t < 0) {
					return ["{参数不合法}"];
				}
				for (i = 0; i <= t; i++) {
					r.push(String(from + step * i));
				}
				syncLabel = controller.getBundleIndexByLabel(syncLabel);
				if (syncLabel >= 0) {
					return {
						type: "syncmap",
						arr: r,
						target: syncLabel,
						map: this.mapFunc
					}
				} else {
					return r;
				}
			},
			mapFunc: function (e, i, n) {
				return i < this.arr.length ? this.arr[i] : "{下标超出}"
			},
			buildLayout: function (o) {
				var inputType = G.InputType.TYPE_CLASS_NUMBER | G.InputType.TYPE_NUMBER_FLAG_SIGNED | G.InputType.TYPE_NUMBER_FLAG_DECIMAL;
				o.layout = CA.createParamTable([
					CA.createParamRow("开始计数", o._from = CA.createParamTextbox({
						text: o.from,
						inputType: inputType
					})),
					CA.createParamRow("结束计数", o._to = CA.createParamTextbox({
						text: o.to,
						inputType: inputType
					})),
					CA.createParamRow("步长", o._step = CA.createParamTextbox({
						text: o.step,
						inputType: inputType
					})),
					CA.createParamRow("启用同步", o._sync = L.CheckBox({
						checked: o.syncLabel.length > 0,
						onCheckedChange: function (view, checked) {
							if (checked) {
								o._labelrow.visibility = G.View.VISIBLE;
							} else {
								o._labelrow.visibility = G.View.GONE;
								o._label.text = o.syncLabel = "";
							}
						}
					})),
					o._labelrow = CA.createParamRow("同步标签", o._label = CA.createVariableSelector(function (label) {
						o.syncLabel = label;
					}, CA.createParamTextbox({
						text: o.syncLabel,
						hint: "点击选择标签"
					})))
				]);
				o._labelrow.visibility = o.syncLabel.length > 0 ? G.View.VISIBLE : G.View.GONE;
				return o;
			},
			update: function (o) {
				o.from = parseFloat(o._from.getText());
				o.to = parseFloat(o._to.getText());
				o.step = parseFloat(o._step.getText());
			}
		},
		geometric: {
			name: "等比数列",
			description: "一个等比数列的列表",
			options: {
				endChars: ")",
				skipChars: "|)",
				splitChar: "|",
				splitChars: "|"
			},
			create: function () {
				return this.buildLayout({
					start: 1024,
					count: 10,
					scale: 0.5,
					syncLabel: ""
				});
			},
			parse: function (s) {
				var o = {
					str: s.slice(1),
					cur: 0
				};
				var r = ISegment.readLenientStringArray(o, this.options);
				return {
					length: o.cur + 1,
					data: this.buildLayout({
						start: parseFloat(r[0]),
						count: parseInt(r[1]),
						scale: r[2] ? parseFloat(r[2]) : 1,
						syncLabel: r[3] || ""
					})
				};
			},
			stringify: function (o) {
				this.update(o);
				return "(" + ISegment.writeLenientStringArray([String(o.start), String(o.count), String(o.scale), o.syncLabel], this.options) + ")";
			},
			export: function (o, controller) {
				this.update(o);
				var i, start = o.start, count = o.count, scale = o.scale, syncLabel = o.syncLabel, t, r = [];
				if (scale == 0 || isNaN(scale)) scale = 1;
				if (count < 0) {
					count = -count;
					scale = 1 / scale;
				}
				for (i = 0, t = start; i < count; i++) {
					r.push(String(t));
					t *= scale;
				}
				syncLabel = controller.getBundleIndexByLabel(syncLabel);
				if (syncLabel >= 0) {
					return {
						type: "syncmap",
						arr: r,
						target: syncLabel,
						map: this.mapFunc
					}
				} else {
					return r;
				}
			},
			mapFunc: function (e, i, n) {
				return i < this.arr.length ? this.arr[i] : "{下标超出}"
			},
			buildLayout: function (o) {
				var inputType = G.InputType.TYPE_CLASS_NUMBER | G.InputType.TYPE_NUMBER_FLAG_SIGNED | G.InputType.TYPE_NUMBER_FLAG_DECIMAL;
				o.layout = CA.createParamTable([
					CA.createParamRow("首项", o._start = CA.createParamTextbox({
						text: o.start,
						inputType: inputType
					})),
					CA.createParamRow("项数", o._count = CA.createParamTextbox({
						text: o.count,
						inputType: G.InputType.TYPE_CLASS_NUMBER | G.InputType.TYPE_NUMBER_FLAG_SIGNED
					})),
					CA.createParamRow("公比", o._scale = CA.createParamTextbox({
						text: o.scale,
						inputType: inputType
					})),
					CA.createParamRow("启用同步", o._sync = L.CheckBox({
						checked: o.syncLabel.length > 0,
						onCheckedChange: function (view, checked) {
							if (checked) {
								o._labelrow.visibility = G.View.VISIBLE;
							} else {
								o._labelrow.visibility = G.View.GONE;
								o._label.text = o.syncLabel = "";
							}
						}
					})),
					o._labelrow = CA.createParamRow("同步标签", o._label = CA.createVariableSelector(function (label) {
						o.syncLabel = label;
					}, CA.createParamTextbox({
						text: o.syncLabel,
						hint: "点击选择标签"
					})))
				]);
				o._labelrow.visibility = o.syncLabel.length > 0 ? G.View.VISIBLE : G.View.GONE;
				return o;
			},
			update: function (o) {
				o.start = parseFloat(o._start.getText());
				o.count = parseFloat(o._count.getText());
				o.scale = parseFloat(o._scale.getText());
			}
		},
		link: {
			name: "链接",
			description: "显示与指定标签相同的内容",
			options: {
				skipChars: ")",
				endChars: ")"
			},
			create: function () {
				return this.buildLayout({
					label: ""
				});
			},
			parse: function (s) {
				var o = {
					str: s.slice(1),
					cur: 0
				};
				var r = ISegment.readLenientString(o, this.options);
				return {
					length: o.cur + 1,
					data: this.buildLayout({
						label: r
					})
				};
			},
			stringify: function (o) {
				return "(" + ISegment.writeLenientString(o.label, this.options) + ")";
			},
			export: function (o, controller) {
				var index = controller.getBundleIndexByLabel(o.label);
				return {
					type: "map",
					map: function (arr) {
						return index < 0 ? "{找不到标签}" : arr[index];
					}
				};
			},
			buildLayout: function (o) {
				o.layout = o.edittext = L.attach(CA.createVariableSelector(function (label) {
					o.label = label;
				}, null, o.label, "标签名"), {
					padding: [10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp],
					gravity: L.Gravity("left|top"),
					imeOptions: L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
					style: "edittext_default",
					fontSize: 3
				});
				return o;
			}
		},
		expr: {
			name: "表达式",
			description: "计算表达式的值",
			options: {
				endChars: ")",
				skipChars: "|)",
				splitChar: "|",
				splitChars: "|"
			},
			create: function () {
				return this.buildLayout({
					count: "10",
					expr: "i * 10"
				});
			},
			parse: function (s) {
				var o = {
					str: s.slice(1),
					cur: 0
				};
				var r = ISegment.readLenientStringArray(o, this.options);
				return {
					length: o.cur + 1,
					data: this.buildLayout({
						expr: r[0],
						count: r[1]
					})
				};
			},
			stringify: function (o) {
				this.update(o);
				return "(" + ISegment.writeLenientStringArray([o.expr, o.count], this.options) + ")";
			},
			export: function (o, controller) {
				var r, i, f, n;
				this.update(o);
				try {
					n = parseInt(eval("function(global) {return (" + o.count + ")}")(controller.getGlobalData("expr:global")));
					f = this.compileExpr(o.expr);
				} catch (e) {
					return "{" + e + "}";
				}
				if (!(n > 0 && n <= 10000)) return "{Error: Count cannot be " + n + "}";
				r = new Array(n);
				r[0] = {
					type: "expr",
					expr: this.execExpr.bind(this, f, o, controller, {
						count: n
					})
				};
				for (i = 1; i < n; i++) {
					r[i] = r[0];
				}
				return r;
			},
			compileExpr: function (expr) {
				return eval("function(" + this.vars.k.join(",") + "){return (" + expr + ")}");
			}, //此处使用new Function(args..., body)效果一样，但速度更慢，且同样不安全
			execExpr: function (f, o, controller, prop, src_index, dst_array, src_array, result_index, seq_pos, seq_index, seq_len) {
				prop.data = o;
				prop.controller = controller;
				prop.srcIndex = src_index;
				prop.dstArray = dst_array;
				prop.srcArray = src_array;
				prop.resultIndex = result_index;
				prop.seqPos = seq_pos;
				prop.seqIndex = seq_index;
				prop.seqLen = seq_len;
				prop.curSeqIndex = seq_pos.indexOf(src_index);
				try {
					return f.apply(prop, this.vars.v.map(function (e) {
						return e.call(null, prop);
					}));
				} catch (e) {
					return "{" + e + "}";
				}
			},
			buildLayout: function (o) {
				o.layout = CA.createParamTable([
					CA.createParamRow("项数", o._count = CA.createParamTextbox({
						text: o.count
					})),
					CA.createParamRow("表达式", o._expr = L.EditText({
						text: o.expr,
						hint: "在这里填入表达式",
						style: "edittext_default",
						fontSize: 2
					})),
					L.TextView({
						text: this.vars.desc,
						padding: [10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp],
						style: "textview_prompt",
						fontSize: 2
					})
				]);
				return o;
			},
			update: function (o) {
				o.expr = String(o._expr.getText());
				o.count = String(o._count.getText());
			},
			vars: (function (o) {
				var k = Object.keys(o), v, d, i, e;
				v = new Array(k.length);
				d = new Array(k.length);
				for (i = 0; i < k.length; i++) {
					e = o[k[i]];
					v[i] = e.get;
					d[i] = k[i] + " - " + e.desc;
				}
				return {
					k: k, v: v, d: d,
					desc: d.join("\n")
				};
			})({
				i: {
					desc: "当前子片段索引",
					get: function (o) {
						return o.curSeqIndex >= 0 ? o.seqIndex[o.curSeqIndex] : 0;
					}
				},
				n: {
					desc: "子片段总数",
					get: function (o) {
						return o.count;
					}
				},
				global: {
					desc: "全局变量",
					get: function (o) {
						return o.controller.getGlobalData("expr:global");
					}
				},
				line: {
					desc: "当前行变量",
					get: function (o) {
						return o.controller.getLineData("expr:line", o.resultIndex);
					}
				},
				param: {
					desc: "参数变量",
					get: function (o) {
						return o.controller.getGlobalData("param:global");
					}
				}
			})
		}
	},
	createParamTable: function (table) {
		var layout, row;
		layout = new G.TableLayout(ctx);
		layout.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
		for (i = 0; i < table.length; i++) {
			layout.addView(table[i], new G.TableLayout.LayoutParams(-1, -2));
		}
		return layout;
	},
	createParamRow: function (text, view) {
		var row, label;
		row = new G.TableRow(ctx);
		row.setGravity(G.Gravity.CENTER);
		label = new G.TextView(ctx);
		label.setText(text);
		label.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
		label.setLayoutParams(new G.TableRow.LayoutParams(-1, -2));
		Common.applyStyle(label, "textview_default", 2);
		row.addView(label);
		row.addView(view, new G.TableRow.LayoutParams(0, -2, 1));
		return row;
	},
	createParamTextbox: function (o) {
		var ret = new G.EditText(ctx);
		ret.setText(o.text ? String(o.text) : "");
		ret.setHint(o.hint ? String(o.hint) : "");
		ret.setSingleLine(!o.multiline);
		ret.setImeOptions(G.EditorInfo.IME_FLAG_NO_FULLSCREEN);
		if (o.inputType) ret.setInputType(o.inputType);
		if (o.keyListener) ret.setKeyListener(o.keyListener);
		if (o.transformationMethod) ret.setTransformationMethod(o.transformationMethod);
		ret.setSelection(ret.length());
		Common.applyStyle(ret, "edittext_default", 2);
		return ret;
	},
	createVariableSelector: function (onChange, wrapped, text, hint) {
		var edit = wrapped || new G.EditText(ctx);
		if (!wrapped) {
			edit.setText(text || "");
			edit.setHint(hint || "点击选择标签");
		}
		edit.setImeOptions(G.EditorInfo.IME_FLAG_NO_FULLSCREEN);
		edit.setInputType(G.InputType.TYPE_NULL);
		edit.setOnClickListener(new G.View.OnClickListener({
			onClick: function (v) {
				try {
					var o = CA.showBatchBuilder;
					if (!o.chooseVariable) return;
					o.chooseVariable(function (data) {
						edit.setText(data.label);
						onChange(data.label);
					});
				} catch (e) { erp(e) }
			}
		}));
		return edit;
	},
	PluginMenu: [],
	PluginExpression: [],
	showActions: function self(actions, onDismiss) {
		G.ui(function () {
			try {
				var frame, list, popup, l;
				if (!self.vmaker) {
					self.vmaker = function (holder) {
						var view = new G.LinearLayout(ctx);
						view.setOrientation(G.LinearLayout.VERTICAL);
						view.setPadding(15 * G.dp, 10 * G.dp, 15 * G.dp, 10 * G.dp);
						view.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						var title = holder.title = new G.TextView(ctx);
						title.setGravity(G.Gravity.CENTER | G.Gravity.LEFT);
						title.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
						Common.applyStyle(title, "textview_default", 2);
						view.addView(title);
						var desp = holder.desp = new G.TextView(ctx);
						desp.setPadding(0, 3 * G.dp, 0, 0);
						desp.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
						Common.applyStyle(desp, "textview_prompt", 1);
						view.addView(desp);
						return view;
					}
					self.vbinder = function (holder, e) {
						if (e instanceof Object) {
							holder.title.setText(Common.toString(e.text));
							if (e.description) {
								holder.desp.setText(Common.toString(e.description));
								holder.desp.setVisibility(G.View.VISIBLE);
							} else {
								holder.desp.setVisibility(G.View.GONE);
							}
						} else {
							holder.title.setText(Common.toString(e));
							holder.desp.setVisibility(G.View.GONE);
						}
					}
				}
				l = actions.map(function (e) {
					var action = CA.Actions[e.action];
					if (!action) return {};
					return {
						text: action.getName ? action.getName(e) : action.name,
						description: action.getDescription ? action.getDescription(e) : action.description,
						action: action.available && !action.available(e) ? null : action,
						param: e
					};
				}).filter(function (e) {
					return e.action != null;
				});
				if (l.length == 0) return Common.toast("没有可选的动作");
				frame = new G.FrameLayout(ctx);
				Common.applyStyle(frame, "message_bg");
				list = new G.ListView(ctx);
				list.setLayoutParams(new G.FrameLayout.LayoutParams(-1, -2));
				list.setAdapter(new SimpleListAdapter(l, self.vmaker, self.vbinder));
				list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({
					onItemClick: function (parent, view, pos, id) {
						try {
							var e = l[pos];
							if (!e.action.execute(e.param)) popup.hide();
							return true;
						} catch (e) { erp(e) }
					}
				}));
				frame.addView(list);
				popup = PopupWindow.showDialog("ca.selectAction", frame, -1, -2);
				PWM.addPopup(popup);
				if (onDismiss) popup.on("hide", onDismiss);
			} catch (e) { erp(e) }
		})
	},
	showActionEdit: function self(actions, callback, defaultActions) {
		G.ui(function () {
			try {
				var adpt, linear, header, title, menu, list, exit, popup;
				if (!self.linear) {
					self.contextMenu = [{
						text: "添加动作",
						onclick: function (v, tag) {
							self.createAction(function (data) {
								tag.actions.push(data);
								tag.callback();
							});
						}
					}, {
						text: "恢复默认",
						hidden: function (tag) {
							return !Array.isArray(tag.defaultActions);
						},
						onclick: function (v, tag) {
							var i, a = tag.defaultActions;
							tag.actions.length = a.length;
							for (i = 0; i < a.length; i++) {
								tag.actions[i] = Object.copy(a[i]);
							}
							tag.callback();
						}
					}];
					self.itemMenu = [{
						text: "编辑",
						description: "编辑该动作",
						hidden: function (tag) {
							var action = CA.Actions[tag.data.action];
							return !action || !action.edit;
						},
						onclick: function (v, tag) {
							var action = CA.Actions[tag.data.action];
							action.edit(tag.data, false, function () {
								tag.callback();
							});
						}
					}, {
						text: "替换",
						description: "用新的动作替换该动作",
						onclick: function (v, tag) {
							self.createAction(function (data) {
								tag.actions[tag.pos] = data;
								tag.callback();
							});
						}
					}, {
						text: "排序",
						description: "调整动作显示的顺序",
						onclick: function (v, tag) {
							Common.showSortDialog({
								array: tag.actions,
								selectIndex: tag.pos,
								getTitle: function (e) {
									var action = CA.Actions[e.action];
									return action.getName ? action.getName(e) : action.name;
								},
								getDescription: function (e) {
									var action = CA.Actions[e.action];
									return action.getDescription ? action.getDescription(e) : action.description;
								},
								callback: function (a) {
									tag.callback();
								}
							});
						}
					}, {
						text: "移除",
						description: "从列表中移除该动作",
						onclick: function (v, tag) {
							tag.actions.splice(tag.pos, 1);
							tag.callback();
						}
					}];
					self.removeInvaildAction = function (actions) {
						var i;
						for (i = actions.length - 1; i >= 0; i--) {
							if (!(actions[i].action in CA.Actions)) {
								actions.splice(i, 1);
							}
						}
					}
					self.vmaker = function (holder) {
						var layout = new G.LinearLayout(ctx),
							text1 = holder.text1 = new G.TextView(ctx),
							text2 = holder.text2 = new G.TextView(ctx);
						layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						layout.setOrientation(G.LinearLayout.VERTICAL);
						layout.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
						text1.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
						Common.applyStyle(text1, "item_default", 3);
						layout.addView(text1);
						text2.setPadding(0, 5 * G.dp, 0, 0);
						text2.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
						Common.applyStyle(text2, "textview_prompt", 1);
						layout.addView(text2);
						return layout;
					}
					self.vbinder = function (holder, e, i, a) {
						var action = CA.Actions[e.action];
						var desp = action.getDescription ? action.getDescription(e) : action.description;
						holder.text1.setText(String(action.getName ? action.getName(e) : action.name));
						if (desp) {
							holder.text2.setText(String(desp));
							holder.text2.setVisibility(G.View.VISIBLE);
						} else {
							holder.text2.setVisibility(G.View.GONE);
						}
					}
					self.createAction = function (callback) {
						var keys = Object.keys(CA.Actions).map(function (e) {
							var data = CA.Actions[e];
							return {
								text: data.name,
								description: data.description,
								key: e
							};
						});
						Common.showListChooser(keys, function (i) {
							var e = keys[i];
							var action = CA.Actions[e.key];
							var data = action.create ? action.create() : {};
							data.action = e.key;
							if (action.edit) {
								action.edit(data, true, function () {
									callback(data);
								});
							} else {
								callback(data);
							}
						});
					}
				}
				self.removeInvaildAction(actions);
				adpt = SimpleListAdapter.getController(new SimpleListAdapter(actions, self.vmaker, self.vbinder));
				linear = new G.LinearLayout(ctx);
				linear.setOrientation(G.LinearLayout.VERTICAL);
				linear.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 0);
				Common.applyStyle(linear, "message_bg");
				header = new G.LinearLayout(ctx);
				header.setOrientation(G.LinearLayout.HORIZONTAL);
				header.setPadding(0, 0, 0, 10 * G.dp);
				header.setOnClickListener(new G.View.OnClickListener({
					onClick: function (v) {
						try {
							Common.showOperateDialog(self.contextMenu, {
								actions: actions,
								defaultActions: defaultActions,
								callback: function () {
									adpt.notifyChange();
								}
							});
							return true;
						} catch (e) { erp(e) }
					}
				}));
				title = new G.TextView(ctx);
				title.setText("编辑动作菜单");
				title.setGravity(G.Gravity.LEFT | G.Gravity.CENTER);
				title.setPadding(10 * G.dp, 0, 10 * G.dp, 0);
				Common.applyStyle(title, "textview_default", 4);
				header.addView(title, new G.LinearLayout.LayoutParams(0, -2, 1.0));
				menu = new G.TextView(ctx);
				menu.setText("▼");
				menu.setPadding(10 * G.dp, 0, 10 * G.dp, 0);
				menu.setGravity(G.Gravity.CENTER);
				Common.applyStyle(menu, "button_highlight", 3);
				header.addView(menu, new G.LinearLayout.LayoutParams(-2, -1));
				linear.addView(header, new G.LinearLayout.LayoutParams(-1, -2));
				list = new G.ListView(ctx);
				list.setAdapter(adpt.self);
				list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({
					onItemClick: function (parent, view, pos, id) {
						try {
							var data = parent.getAdapter().getItem(pos);
							Common.showOperateDialog(self.itemMenu, {
								pos: parseInt(pos),
								data: data,
								actions: actions,
								callback: function () {
									adpt.notifyChange();
								}
							});
						} catch (e) { erp(e) }
					}
				}));
				linear.addView(list, new G.LinearLayout.LayoutParams(-1, 0, 1.0));
				exit = new G.TextView(ctx);
				exit.setText("关闭");
				exit.setGravity(G.Gravity.CENTER);
				exit.setPadding(10 * G.dp, 20 * G.dp, 10 * G.dp, 20 * G.dp);
				Common.applyStyle(exit, "button_critical", 3);
				exit.setOnClickListener(new G.View.OnClickListener({
					onClick: function (v) {
						try {
							popup.exit();
						} catch (e) { erp(e) }
					}
				}));
				linear.addView(exit, new G.LinearLayout.LayoutParams(-1, -2));
				popup = new PopupPage(linear, "ca.ActionEdit");
				if (callback) popup.on("exit", callback);
				popup.enter();
			} catch (e) { erp(e) }
		})
	},
	Actions: {
		"ca.exit": {
			name: "关闭命令助手",
			execute: function () {
				CA.performExit();
			}
		},
		"ca.quickPaste": {
			name: "快速粘贴",
			execute: function () {
				var a = [], t;
				CA.his.forEach(function (e) {
					if (e == t) return;
					a.push({
						text: e,
						cmd: e
					});
				});
				Common.showListChooser(a, function (id) {
					gHandler.post(function () {
						CA.performPaste(String(a[id].cmd), true);
					});
				}, true);
			}
		},
		"ca.switchIconVisibility": {
			name: "显示/隐藏图标",
			execute: function () {
				if (CA.icon) {
					CA.hideIcon();
				} else {
					CA.showIcon();
				}
			}
		}
	},
	showAgreement: function (callback) {
		G.ui(function () {
			try {
				var popup, agree;
				popup = PopupPage.showSideBar("ca.AgreementDialog", L.ScrollView({
					style: "message_bg",
					child: L.LinearLayout({
						orientation: L.LinearLayout("vertical"),
						gravity: L.Gravity("center"),
						onClick: function () {
							try {
								agree.performClick();
							} catch (e) { erp(e) }
						},
						children: [
							L.TextView({
								text: "命令助手",
								padding: [10 * G.dp, 15 * G.dp, 10 * G.dp, 15 * G.dp],
								gravity: L.Gravity("center"),
								layout: { width: -1, height: -2 },
								style: "textview_default",
								fontSize: 4
							}),
							L.LinearLayout({
								orientation: L.LinearLayout("horizontal"),
								gravity: L.Gravity("center"),
								padding: [10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp],
								layout: { width: -1, height: -2 },
								children: [
									agree = L.CheckBox({
										layout: { width: -2, height: -2 },
										checked: Boolean(CA.settings.readAgreement > Date.parse(BuildConfig.licenceUpdate))
									}),
									L.TextView({
										text: "我已阅读并同意",
										layout: { width: -2, height: -2 },
										style: "textview_default",
										fontSize: 2
									}),
									L.TextView({
										text: "使用许可协议",
										layout: { width: -2, height: -2 },
										style: "textview_highlight",
										fontSize: 2,
										onClick: function () {
											try {
												Common.showWebViewDialog({
													url: "https://ca.nycx.top/doc/legal/eula.html"
												});
											} catch (e) { erp(e) }
										}
									}),
									L.TextView({
										text: "与",
										layout: { width: -2, height: -2 },
										style: "textview_default",
										fontSize: 2
									}),
									L.TextView({
										text: "隐私政策",
										layout: { width: -2, height: -2 },
										style: "textview_highlight",
										fontSize: 2,
										onClick: function () {
											try {
												Common.showWebViewDialog({
													url: "https://ca.nycx.top/doc/legal/privacy.html"
												});
											} catch (e) { erp(e) }
										}
									})
								]
							}),
							L.LinearLayout({
								orientation: L.LinearLayout("horizontal"),
								layout: { width: -1, height: -2 },
								children: [
									L.TextView({
										text: "开始使用",
										padding: [10 * G.dp, 15 * G.dp, 10 * G.dp, 15 * G.dp],
										gravity: L.Gravity("center"),
										layout: { width: 0, height: -2, weight: 0.5 },
										style: "button_highlight",
										fontSize: 3,
										onClick: function () {
											try {
												if (agree.checked) {
													CA.settings.readAgreement = Date.now();
													CA.trySave();
													popup.exit();
												} else {
													Common.toast("请先同意使用许可协议与隐私政策");
												}
											} catch (e) { erp(e) }
										}
									}),
									L.TextView({
										text: "关闭应用",
										padding: [10 * G.dp, 15 * G.dp, 10 * G.dp, 15 * G.dp],
										gravity: L.Gravity("center"),
										layout: { width: 0, height: -2, weight: 0.5 },
										style: "button_critical",
										fontSize: 3,
										onClick: function () {
											try {
												popup.exit(true);
												android.os.Process.killProcess(android.os.Process.myPid());
											} catch (e) { erp(e) }
										}
									})
								]
							})
						]
					})
				}), "bottom", -2, 0, true);
				if (callback) popup.on("exit", callback);
			} catch (e) { erp(e) }
		})
	},
	showAgreementSync: function () {
		Threads.awaitPromise(function (resolve) {
			CA.showAgreement(resolve);
		});
	},

	// 网络日志，调试用
	sendLog: {
		// 内部工具函数：真正发送
		_post: function (level, text) {

			if (!CA.settings.LogServer) {
				CA.settings.LogServer = {
					enabled: false,
					address: "http://192.168.1.145:2333/logserver"
				}
			}

			if (!CA.settings.LogServer.enabled) return;
			new java.lang.Thread(
				new java.lang.Runnable({
					run: function () {
						try {
							var url = new java.net.URL(CA.settings.LogServer.address);
							var conn = url.openConnection();
							conn.setConnectTimeout(3000);
							conn.setReadTimeout(3000);
							conn.setDoOutput(true);
							conn.setRequestMethod("POST");
							conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");

							var body = JSON.stringify({ msg: String(text), level: level, ts: Date.now() });
							var out = conn.getOutputStream();
							out.write(new java.lang.String(body).getBytes("UTF-8"));
							out.flush();
							out.close();

							var ins = conn.getInputStream();
							while (ins.read() !== -1) { }
							ins.close();
						} catch (e) {
							Common.toast("日志发送失败: " + e);
						}
					}
				})
			).start();
		},

		// 等级快捷方式
		debug: function (t) { this._post("debug", t); },
		info: function (t) { this._post("info", t); },
		warn: function (t) { this._post("warn", t); },
		error: function (t) { this._post("error", t); },

		// 默认 info
		log: function (t) { this.info(t); }
	},

	Library: Loader.fromFile("CA.Library.js"),
	IntelliSense: Loader.fromFile("CA.IntelliSense.js"),
	Assist: Loader.fromFile("CA.Assist.js"),
	// JSON: Loader.fromFile("JSON_test.js")
});
