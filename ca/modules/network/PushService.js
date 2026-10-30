MapScript.loadModule("PushService", {
	apiHost : NetworkUtils.urlBase.api,
	version : 1,
	perPage : 20,
	onCreate : function() {
		if (MapScript.host != "Android") return;
		this.nms = ctx.getSystemService(ctx.NOTIFICATION_SERVICE);
		if (!this.nms) return;
		if (android.os.Build.VERSION.SDK_INT >= 26) {
			this.channel = new android.app.NotificationChannel("capush", "推送信息", this.nms.IMPORTANCE_DEFAULT);
			this.channel.setDescription("命令助手自带推送，仅命令助手在后台时工作");
			this.nms.createNotificationChannel(this.channel);
		}
	},
	initialize : function() {
		this.load();
		this.notify();
	},
	load : function() {
		this.enabled = !CA.settings.disablePush && MapScript.host == "Android";
		this.disabledTags = CA.settings.disabledPushTags ? CA.settings.disabledPushTags : CA.settings.disabledPushTags = [];
		this.lastPushId = isNaN(CA.settings.lastPushId) ? -1 : CA.settings.lastPushId;
	},
	save : function() {
		CA.settings.lastPushId = this.lastPushId;
	},
	getIntent : function(post) {
		var intent = null;
		try {
			if (post.url) {
				intent = android.content.Intent.parseUri(post.url, 0x7);
				intent.addFlags(intent.FLAG_ACTIVITY_NEW_TASK);
			}
		} catch(e) {
			Log.e(e);
		}
		return intent;
	},
	showNotification : function(o) {
		var builder, nof, id;
		id = parseInt(o.id);
		if (android.os.Build.VERSION.SDK_INT >= 26) {
			builder = new android.app.Notification.Builder(ctx, this.channel.id);
		} else {
			builder = new android.app.Notification.Builder(ctx);
		}
		builder.setContentTitle(String(o.name));
		if (o.desc) builder.setContentText(String(o.desc));
		builder.setAutoCancel(true);
		builder.setSmallIcon(com.xero.ca.R.mipmap.icon_small);
		builder.setLargeIcon(G.BitmapFactory.decodeResource(ctx.getResources(), com.xero.ca.R.mipmap.icon_small));
		intent = this.getIntent(o);
		if (intent) builder.setContentIntent(AndroidBridge.createPendingIntent("activity", intent, ["updateCurrent"], id));
		if (android.os.Build.VERSION.SDK_INT >= 16) {
			nof = builder.build();
		} else {
			nof = builder.getNotification();
		}
		this.nms.notify("capush", id, nof);
		return true;
	},
	cancelNotification : function(o) {
		this.nms.cancel("capush", parseInt(o.id));
	},
	showDialog : function(o) {
		var intent = this.getIntent(o);
		if (intent) {
			Common.showConfirmDialog({
				title : o.name,
				description : o.desc,
				buttons : [Common.intl.open, Common.intl.close],
				callback : function(index) {
					if (index != 0) return;
					AndroidBridge.startActivity(intent);
				}
			});
		} else {
			Common.showConfirmDialog({
				title : o.name,
				description : o.desc,
				buttons : [Common.intl.ok]
			});
		}
	},
	getPosts : function(since, limit, direction, sort) {
		return JSON.parse(NetworkUtils.queryPage(this.apiHost + "/push?" + NetworkUtils.toQueryString({
			since : since,
			limit : limit,
			dir : direction,
			sort : sort
		})));
	},
	getTags : function() {
		return JSON.parse(NetworkUtils.queryPage(this.apiHost + "/push/tags"));
	},
	readPushs : function() {
		var pushs = this.getPosts(this.lastPushId + 1, 10, "forward", "desc"), firstTime = this.lastPushId < 0;
		if (pushs.length) {
			this.lastPushId = parseInt(pushs[0].id);
		}
		if (firstTime) {
			return [];
		} else {
			return pushs;
		}
	},
	peekLatestPush : function() {
		return this.getPosts(0, 1, "forward", "desc");
	},
	shouldShowPush : function(push) {
		var i;
		for (i = 0; i < push.tags.length; i++) {
			if (push.tags[i] == "hiddenForPush") return false;
			if (this.disabledTags.indexOf(push.tags[i]) >= 0) return false;
		}
		if (push.minver > this.version) return false;
		if (push.maxver < this.version) return false;
		return true;
	},
	shouldShowAsDialog : function(push) {
		var i;
		for (i = 0; i < push.tags.length; i++) {
			if (push.tags[i] == "important" || push.tags[i] == "showAsDialog") return true;
		}
		return false;
	},
	showPushs : function(pushs) {
		var i;
		for (i = 0; i < pushs.length; i++) {
			pushs[i].tags = pushs[i].tags.split("|");
			if (this.shouldShowPush(pushs[i])) {
				if (this.shouldShowAsDialog(pushs[i])) {
					this.showDialog(pushs[i]);
				} else {
					this.showNotification(pushs[i]);
				}
			}
		}
	},
	doCheckPush : function() {
		Threads.run(function() {try {
			var pushs;
			try {
				pushs = PushService.readPushs();
			} catch(e) {
				Log.e(e);
			}
			if (!pushs) return;
			PushService.save();
			G.ui(function() {try {
				PushService.showPushs(pushs);
			} catch(e) {erp(e)}});
		} catch(e) {erp(e)}});
	},
	notify : function() {
		var now = Date.now();
		if (!this.enabled) return;
		if (now - this.lastCheck < 3600000) return; // 1h
		this.lastCheck = now;
		this.doCheckPush();
	},
	showSettings : function self(title) {
		if (!self.base) {
			self.base = [{
				name : "启用推送",
				type : "boolean",
				get : function() {
					return PushService.enabled;
				},
				set : function(v) {
					CA.settings.disablePush = !v;
					PushService.load();
				}
			}];
			self.offline = [{
				text : "部分选项因目前处于离线状态而不可用",
				type : "text"
			}];
			self.tagsHeader = [{
				name : "标签管理",
				type : "tag"
			}];
			self.historyPost = [{
				name : "历史推送",
				type : "tag"
			}, {
				name : "查看历史推送信息",
				type : "custom",
				onclick : function(fset) {
					PushService.showHistoryPost();
				}
			}];
			self.getTagEnabled = function() {
				return PushService.disabledTags.indexOf(this.id) < 0;
			}
			self.setTagEnabled = function(v) {
				if (v) {
					Common.removeSet(PushService.disabledTags, this.id);
				} else {
					Common.addSet(PushService.disabledTags, this.id);
				}
			}
			self.getArray = function(callback) {
				var progress = Common.showProgressDialog();
				progress.setText("正在加载……");
				progress.async(function() {
					var tags = PushService.tags;
					if (!tags) {
						try {
							tags = PushService.tags = PushService.getTags();
						} catch(e) {
							Log.e(e);
						}
					}
					if (tags) {
						tags = tags.map(function(e) {
							return {
								id : e.id,
								name : e.name,
								description : e.desc,
								type : "boolean",
								get : self.getTagEnabled,
								set : self.setTagEnabled
							};
						});
						callback(self.base.concat(self.tagsHeader, tags, self.historyPost));
					} else {
						callback(self.base.concat(self.offline));
					}
				});
			}
		}
		self.getArray(function(arr) {
			Common.showSettings(title, arr);
		});
	},
	showHistoryPost : function self(callback) {G.ui(function() {try {
		if (!self.linear) {
			self.contextMenu = [{
				text : "刷新",
				onclick : function(v, tag) {
					self.reload();
				}
			}];
			self.vmaker = function(holder) {
				var layout = new G.LinearLayout(ctx),
					text1 = holder.text1 = new G.TextView(ctx),
					text2 = holder.text2 = new G.TextView(ctx);
				layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				layout.setOrientation(G.LinearLayout.VERTICAL);
				layout.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
				text1.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
				text1.setEllipsize(G.TextUtils.TruncateAt.END);
				text1.setSingleLine(true);
				layout.addView(text1);
				text2.setPadding(0, 5 * G.dp, 0, 0);
				text2.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
				Common.applyStyle(text2, "textview_prompt", 1);
				layout.addView(text2);
				return layout;
			}
			self.vbinder = function(holder, e, i, a) {
				holder.text1.setText(e.name);
				Common.applyStyle(holder.text1, "item_default", 3);
				holder.text2.setText("发布于" + e.posted + "\n\n" + (e.desc.length > 60 ? e.desc.slice(0, 59) + ".." : e.desc));
				holder.text2.setVisibility(e.desc ? G.View.VISIBLE : G.View.GONE);
			}
			self.reload = function() {
				if (self.loading) return Common.toast("正在加载中……");
				self.loading = true;
				self.posts.length = 0;
				self.adpt.notifyChange();
				var progress = Common.showProgressDialog();
				progress.setText("正在加载……");
				progress.async(function() {
					var first, data;
					try {
						first = PushService.getPosts(0, PushService.perPage, "forward", "desc");
						if (first.length == PushService.perPage) {
							data = {
								next : parseInt(first[first.length - 1].id) - 1
							};
						} else {
							data = {
								next : -1
							};
						}
						data.pages = [first];
					} catch(e) {Log.e(e)}
					if (!data) return Common.toast("推送信息列表加载失败");
					self.postData = data;
					G.ui(function() {try {
						self.addPageData(first);
						self.loading = false;
					} catch(e) {erp(e)}});
				});
			}
			self.appendPage = function(sync) {
				if (!sync) {
					var progress = Common.showProgressDialog();
					progress.setText("正在加载……");
					progress.async(function() {
						self.appendPage(true);
					});
				} else {
					if (self.loading) return Common.toast("正在加载中……");
					self.loading = true;
					var i, page;
					try {
						page = PushService.getPosts(self.postData.next, PushService.perPage, "backward", "desc");
						self.postData.pages.push(page);
						if (page.length == PushService.perPage) {
							self.postData.next = parseInt(page[page.length - 1].id) - 1;
						} else self.postData.next = -1;
					} catch(e) {Log.e(e)}
					if (!page) {
						self.loading = false;
						return Common.toast("推送信息列表加载失败");
					}
					G.ui(function() {try {
						self.addPageData(page);
						self.loading = false;
					} catch(e) {erp(e)}});
				}
			}
			self.addPageData = function(page) {
				var off = self.posts.length, i;
				self.posts.length += page.length;
				for (i = 0; i < page.length; i++) {
					self.posts[i + off] = page[i];
				}
				self.adpt.notifyChange();
				if (self.postData.next >= 0) self.more.setText("显示下" + PushService.perPage + "个推送信息……");
				if (self.postData.next >= 0 && !self.moreVisible) {
					self.moreVisible = true;
					self.list.addFooterView(self.more);
				} else if (self.postData.next < 0 && self.moreVisible) {
					self.moreVisible = false;
					self.list.removeFooterView(self.more);
				}
			}
			self.adpt = SimpleListAdapter.getController(new SimpleListAdapter(self.posts = [], self.vmaker, self.vbinder));

			self.linear = new G.LinearLayout(ctx);
			self.linear.setOrientation(G.LinearLayout.VERTICAL);
			self.linear.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 0);
			Common.applyStyle(self.linear, "message_bg");

			self.header = new G.LinearLayout(ctx);
			self.header.setOrientation(G.LinearLayout.HORIZONTAL);
			self.header.setPadding(0, 0, 0, 10 * G.dp);
			self.header.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
				Common.showOperateDialog(self.contextMenu);
				return true;
			} catch(e) {erp(e)}}}));

			self.title = new G.TextView(ctx);
			self.title.setText("推送信息");
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
			self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({onItemClick : function(parent, view, pos, id) {try {
				if (view == self.more) {
					self.appendPage();
					return;
				}
				var data = parent.getAdapter().getItem(pos), intent;
				intent = PushService.getIntent(data);
				if (intent) AndroidBridge.startActivity(intent);
			} catch(e) {erp(e)}}}));
			self.linear.addView(self.list, new G.LinearLayout.LayoutParams(-1, 0, 1.0));

			self.exit = new G.TextView(ctx);
			self.exit.setText("关闭");
			self.exit.setGravity(G.Gravity.CENTER);
			self.exit.setPadding(10 * G.dp, 20 * G.dp, 10 * G.dp, 20 * G.dp);
			Common.applyStyle(self.exit, "button_critical", 3);
			self.exit.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
				self.popup.exit();
			} catch(e) {erp(e)}}}));
			self.linear.addView(self.exit, new G.LinearLayout.LayoutParams(-1, -2));

			self.popup = new PopupPage(self.linear, "feedback.Issues");
			self.popup.on("exit", function() {
				if (self.callback) self.callback();
			});

			PWM.registerResetFlag(self, "linear");
		}
		self.callback = callback;
		self.popup.enter();
		self.reload();
	} catch(e) {erp(e)}})}
});