MapScript.loadModule("Updater", {
	toChineseDate : function(d) {
		return new java.text.SimpleDateFormat("yyyy'年'MM'月'dd'日' HH:mm").format(new java.util.Date(d));
	},
	toAnchor : function(title, url) {
		return '<a href="' + url + '">' + title + '</a>';
	},
	queryFromSources : function(sources) {
		var i, lastError;
		for (i = 0; i < sources.length; i++) {
			try {
				return NetworkUtils.queryPage(sources[i]);
			} catch(e) {
				lastError = e;
			}
		}
		throw lastError;
	},
	getUpdateInfo : function(source, callback) {
		var r;
		try {
			if (this.cacheUpdateData[source.id]) {
				r = this.cacheUpdateData[source.id];
			} else {
				this.cacheUpdateData[source.id] = r = JSON.parse(this.queryFromSources(source.content));
			}
			callback(null, r);
		} catch(e) {
			Log.e(e);
			callback(e);
		}
	},
	cleanCache : function() {
		this.latest = null;
		this.updateFlag = NaN;
		AndroidBridge.notifySettings();
	},
	getVersionInfo : function() {
		if (this.checking) return "正在检查版本……";
		if (!this.latest) return "版本：" + BuildConfig.date;
		if (this.updateFlag > 0) {
			return "更新：" + BuildConfig.date + " -> " + this.latest;
		} else if (this.updateFlag == 0) {
			return "您使用的是最新版本";
		} else {
			return "Beta版本：" + BuildConfig.date;
		}
	},
	checkUpdate : function(statusListener, silently) {
		if (this.checking) {
			Common.toast("正在检查更新中，请稍候");
			return false;
		}
		this.checking = true;
		if (statusListener) statusListener("checking");
		Threads.run(function() {try {
			Updater.getUpdateInfo(Updater.sources, function(err, info) {
				Updater.checking = false;
				if (err) {
					if (statusListener) statusListener("errorGetInfo", err);
					return Common.toast("检测更新失败，请检查网络连接\n(" + err + ")");
				}
				var flag = Date.parse(info.version) - Date.parse(BuildConfig.date);
				Updater.latest = info.version;
				Updater.updateFlag = flag;
				if (flag > 0) {
					if (statusListener) statusListener("showingDialog");
					Updater.showUpdateDialog(info, function() {
						if (statusListener) statusListener("dialogClosed");
					});
				} else if (!silently) {
					if (flag == 0) {
						Common.toast("当前已经是最新版本：" + BuildConfig.date);
					} else {
						Common.toast("目前您正在使用Beta版本，目前暂未公开Beta版的更新");
					}
					if (statusListener) statusListener("completed", flag);
				}
			});
		} catch(e) {erp(e)}});
	},
	testSupport : function(requirements) {
		if (!Array.isArray(requirements)) return null;
		var i, e, err = [], sdk_int = android.os.Build.VERSION.SDK_INT, abis = AndroidBridge.getABIs();
		for (i in requirements) {
			e = Object(requirements[i]);
			switch (e.type) {
				case "expr":
				try {
					eval.call(null, e.value);
				} catch(e) {
					err.push(e);
				}
				break;
				case "minsdk":
				if (sdk_int < e.value) err.push("您的Android版本较低(" + sdk_int + "<" + e.value + ")");
				break;
				case "maxsdk":
				if (sdk_int > e.value) err.push("您的Android版本过高(" + sdk_int + ">" + e.value + ")");
				break;
				case "abis":
				if (!Array.isArray(e.values)) e.values = [e.value];
				e.values.forEach(function(e) {
					if (abis.indexOf(e) < 0) err.push("您的CPU不支持" + e + "指令集");
				});
				break;
			}
		}
		if (err.length) return err;
	},
	showUpdateDialog : function(info, callback) {
		var unsupport = Updater.testSupport(info.requirements), selected;
		var buttons = [{
			text : "快速更新",
			id : "hotfix",
			onclick : function(callback) {
				Common.showProgressDialog(function(dia) {
					dia.setText("下载中……");
					try {
						NetworkUtils.download(info.hotfix.url, MapScript.baseDir + "core.js");
						NetworkUtils.download(info.hotfix.sign, MapScript.baseDir + "core.sign");
						Common.toast("更新成功，将在下次启动时生效");
					} catch(e) {
						Common.toast("下载更新失败\n" + e);
					}
					callback();
				});
			},
			visible : function() {
				return MapScript.host == "Android" && info.hotfix && info.hotfix.shell == ScriptInterface.getShellVersion()
			}
		}, {
			text : "手动更新",
			id : "manaul",
			onclick : function(callback) {
				Updater.chooseUpdateSource(info, callback);
			}
		}, {
			text : "稍后提醒",
			id : "remindLater"
		}, {
			text : "不再提醒",
			id : "neverRemind",
			onclick : function(callback) {
				CA.settings.skipCheckUpdate = true;
				Common.toast("命令助手将不再自动检查更新");
				callback();
			},
			visible : function() {
				return unsupport && unsupport.length > 0;
			}
		}].filter(function(e) {
			if (e.visible && !e.visible()) return false;
			return true;
		});
		Common.showConfirmDialog({
			title : "命令助手更新啦！", 
			description : ISegment.rawJson([function() {
				if (unsupport) {
					return {
						text : "您的设备可能无法安装这个新版本，原因是：\n" + unsupport.join("\n") + "\n\n",
						color : "criticalcolor",
						bold : true
					};
				} else {
					return "";
				}
			}, {
				extra : [
					{
						text : "最新版本：" + info.version,
						bold : true
					},
					"\n发布时间：", String(Updater.toChineseDate(info.time)),
					"\n更新内容：\n", info.info
				],
				color : "textcolor"
			}]),
			buttons : buttons.map(function(e) {
				return e.text;
			}),
			callback : function(i) {
				selected = true;
				if (buttons[i].onclick) {
					buttons[i].onclick(function() {
						if (callback) callback(buttons[i].id);
					});
				} else if (callback) {
					callback(buttons[i].id);
				}
			},
			onDismiss : function() {
				if (!selected && callback) callback("remindLater");
			}
		});
	},
	chooseUpdateSource : function(info, callback) {
		var i, d = [];
		for (i in info.downloads) {
			d.push({
				text : i,
				description : info.downloads[i]
			});
		}
		Common.showListChooser(d, function(i) {
			try {
				AndroidBridge.startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(d[i].description))
					.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
			} catch(e) {
				Common.toast("打开链接失败\n" + e);
			}
		}, true, callback);
	},
	getBetaVersionInfo : function() {
		var snapshotVer = this.getSnapshotVersion();
		if (this.checkingBeta) return "正在检查版本……";
		if (!this.latestBeta) return "版本：" + snapshotVer;
		if (this.updateFlagBeta > 0) {
			return "更新：" + snapshotVer + " -> " + this.latest;
		} else if (this.updateFlagBeta == 0) {
			return "您使用的是最新版本";
		} else {
			return "Beta版本：" + snapshotVer;
		}
	},
	getSnapshotVersion : function() {
		if (this.snapshotVer) return this.snapshotVer;
		try {
			this.snapshotVer = JSON.parse(Common.readFile(MapScript.baseDir + "snapshot.json", null, true)).version;
		} catch(e) {
			Log.e(e);
		}
		return this.snapshotVer;
	},
	checkUpdateBeta : function(statusListener, silently) {
		if (this.checkingBeta) {
			Common.toast("正在检查更新中，请稍候");
			return false;
		}
		this.checkingBeta = true;
		if (statusListener) statusListener("checking");
		Threads.run(function() {try {
			var snapshotVer = Updater.getSnapshotVersion();
			Updater.getUpdateInfo(Updater.betaSources, function(err, info) {
				Updater.checkingBeta = false;
				if (err) {
					if (statusListener) statusListener("errorGetInfo", err);
					return Common.toast("检测更新失败，请检查网络连接\n(" + err + ")");
				}
				var flag = Date.parse(info.version) - Date.parse(snapshotVer);
				Updater.latestBeta = info.version;
				Updater.updateFlagBeta = flag;
				if (flag > 0) {
					if (statusListener) statusListener("showingDialog");
					Updater.showBetaUpdateDialog(info, function() {
						if (statusListener) statusListener("dialogClosed");
					});
				} else if (!silently) {
					if (flag == 0) {
						Common.toast("当前已经是最新Beta版本：" + snapshotVer);
					} else {
						Common.toast("目前没有更新的Beta版本，您可以在设置中关闭Beta计划以查看是否有更新的正式版");
					}
					if (statusListener) statusListener("completed", flag);
				}
			});
		} catch(e) {erp(e)}});
	},
	showBetaUpdateDialog : function(info, callback) {
		var selected = false;
		var buttons = [{
			text : "快速更新",
			id : "hotfix",
			onclick : function(callback) {
				Common.showProgressDialog(function(dia) {
					dia.setText("下载中……");
					var error = null;
					try {
						Updater.downloadBeta(info);
						Common.toast("更新成功，将在下次启动快照时生效");
					} catch(e) {
						Log.e(e);
						error = e;
						Common.toast("下载更新失败\n" + e);
					}
					if (error) Updater.cleanBetaFiles();
					if (callback) callback(error);
				});
			},
			visible : function() {
				return MapScript.host == "Android";
			}
		}, {
			text : "加入内测群获得",
			id : "manaul",
			onclick : function(callback) {
				Common.setClipboardText("671317302");
				Common.toast("群号已复制到剪贴板");
				callback();
			},
			visible : function() {
				return MapScript.host != "Android";
			}
		}, {
			text : "稍后提醒",
			id : "remindLater"
		}].filter(function(e) {
			if (e.visible && !e.visible()) return false;
			return true;
		});
		Common.showConfirmDialog({
			title : "命令助手Beta版更新啦！", 
			description : ISegment.rawJson({
				extra : [
					{
						text : "最新版本：" + info.version,
						bold : true
					},
					"\n发布时间：", String(Updater.toChineseDate(info.time)),
					"\n更新内容：\n", info.info
				],
				color : "textcolor"
			}),
			buttons : buttons.map(function(e) {
				return e.text;
			}),
			callback : function(i) {
				selected = true;
				if (buttons[i].onclick) {
					buttons[i].onclick(function() {
						if (callback) callback(buttons[i].id);
					});
				} else if (callback) {
					callback(buttons[i].id);
				}
			},
			onDismiss : function() {
				if (!selected && callback) callback("remindLater");
			}
		});
	},
	cleanBetaCache : function() {
		this.latestBeta = null;
		this.updateFlagBeta = NaN;
		AndroidBridge.notifySettings();
	},
	downloadBeta : function(info) {
		if (!NetworkUtils.downloadGz(info.snapshot.url, MapScript.baseDir + "snapshot.js", info.snapshot.sha1)) {
			Updater.cleanBetaFiles();
			throw "文件校验失败";
		}
		ctx.getSharedPreferences("user_settings", ctx.MODE_PRIVATE).edit().putString("debugSource", MapScript.baseDir + "snapshot.js").apply();
		Common.saveFile(MapScript.baseDir + "snapshot.json", JSON.stringify(info), true);
	},
	installBeta : function(callback) {
		Common.showProgressDialog(function(dia) {
			dia.setText("下载中……");
			var error = null;
			try {
				Updater.downloadBeta(JSON.parse(Updater.queryFromSources(Updater.betaSources.content)));
			} catch(e) {
				Log.e(e);
				error = e;
			}
			if (error) Updater.cleanBetaFiles();
			if (callback) callback(error);
		});
	},
	cleanBetaFiles : function() {
		Common.deleteFile(MapScript.baseDir + "snapshot.json");
		Common.deleteFile(MapScript.baseDir + "snapshot.js");
	},
	showNewVersionInfo : function(oldVer) {
		Common.showTextDialog(ISegment.rawJson([
			{
				text : "命令助手已更新！\n" + oldVer + " -> " + BuildConfig.date,
				bold : true
			},
			"\t(" + BuildConfig.version + ")",
			"\n发布时间：" + Updater.toChineseDate(BuildConfig.publishTime),
			"\n\n更新内容：\n",
			BuildConfig.description
		]));
	},
	showCurrentVersionInfo : function() {
		Common.showTextDialog(ISegment.rawJson([
			{
				extra : [
					{
						text : "命令助手 " + BuildConfig.version,
						bold : true
					}, "\n", function() {
						switch (BuildConfig.variants) {
							case "release":
							return "正式版本";
							case "snapshot":
							return "快照版本";
							case "debug":
							return "调试版本";
							default:
							return BuildConfig.variants;
						}
					}, " ",
					BuildConfig.date,
					"\n发布于 " + Updater.toChineseDate(BuildConfig.publishTime)
				],
				align : "center"
			},
			"\n\n更新内容：\n",
			BuildConfig.description
		]));
	},
	askHurryDevelop : function(callback) {
		Common.showConfirmDialog({
			title : "催更命令助手", 
			description : "是不是觉得命令助手更新速度太慢？不如催促命令助手更新吧",
			buttons : [
				"立即催更",
				"暂不催更"
			],
			callback : function(id) {
				callback(id == 0);
			}
		});
	},
	isConnected : function() {
		var cm = ctx.getSystemService(ctx.CONNECTIVITY_SERVICE);
		var an = cm.getActiveNetworkInfo();
		if (an && an.isConnected()) {
			return true;
		} else {
			return false;
		}
	},
	initialize : function() {
		if (this.isConnected()) {
			if (BuildConfig.variants == "release") {
				if (!CA.settings.skipCheckUpdate && !(CA.settings.nextCheckUpdate > Date.now())) {
					this.checkUpdate(function(statusMsg) {
						if (statusMsg == "completed") {
							CA.settings.nextCheckUpdate = Date.now() + 7 * 24 * 3600 * 1000;
						}
					}, true);
				}
			} else {
				if (!CA.settings.skipCheckUpdate) {
					this.checkUpdateBeta(null, true);
				}
			}
		}
		
	},
	cacheUpdateData : {},
	sources : {
		id : "9f15605c-b7fa-49c7-8ee8-55b525570d96",
		content : [
			"https://ca.projectxero.top/hotfix.json",
			"https://projectxero.top/ca/hotfix.json",
			"http://47.102.100.56/ca/hotfix.json",
			"https://projectxero.gitee.io/ca/hotfix.json",
			"https://xeroalpha.github.io/CA/pages/hotfix.json"
		]
	},
	betaSources : {
		id : "7a0df683-bae8-477d-9d84-b2a0c72eadcc",
		content : [
			"https://ca.projectxero.top/snapshot.json",
			"https://projectxero.top/ca/snapshot.json",
			"http://47.102.100.56/ca/snapshot.json"
		]
	}
});