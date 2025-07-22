MapScript.loadModule("Tutorial", {
	library : [],
	showList : function self(callback) {G.ui(function() {try {
		if (!self.linear) {
			self.adapter = function(e, i, a) {
				var layout = new G.LinearLayout(ctx),
					text1 = new G.TextView(ctx),
					text2 = new G.TextView(ctx);
				layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				layout.setOrientation(G.LinearLayout.VERTICAL);
				layout.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
				text1.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
				text1.setText(e.title);
				text1.setEllipsize(G.TextUtils.TruncateAt.MIDDLE);
				text1.setSingleLine(true);
				Common.applyStyle(text1, e.state == 2 ? "item_disabled" : "item_default", 3);
				layout.addView(text1);
				if (e.description) {
					text2.setPadding(0, 5 * G.dp, 0, 0);
					text2.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
					text2.setText(e.description);
					Common.applyStyle(text2, "textview_prompt", 1);
					layout.addView(text2);
				}
				return layout;
			}
			self.refresh = function() {
				var i, e, t;
				var data = Tutorial.getSettings();
				var a = {}, states = [[], [], []];
				Tutorial.library.forEach(function(e, i) {
					a[e.id] = {
						index : i,
						type : e.type,
						name : e.name,
						description : e.description,
						segmentLen : e.segments.length,
						progress : data[e.id] ? data[e.id].progress : -1,
						source : e
					}
				});
				Object.keys(a).forEach(function(i) {
					if (a[i].progress >= a[i].segmentLen) {
						a[i].title = a[i].name;
						states[a[i].state = 2].push(a[i]);
					} else if (a[i].progress >= 0) {
						a[i].title = a[i].name + " （" + ((a[i].progress + 1) / a[i].segmentLen * 100).toFixed(0) + "%）";
						states[a[i].state = 0].push(a[i]);
					} else {
						a[i].title = a[i].name + " *";
						states[a[i].state = 1].push(a[i]);
					}
				});
				self.title.setText("教程 (进行中:" + states[0].length + "|未读:" + states[1].length + "|已读:" + states[2].length + ")");
				self.list.setAdapter(new RhinoListAdapter(states[0].concat(states[1], states[2]), self.adapter));
			}
			self.linear = new G.LinearLayout(ctx);
			self.linear.setOrientation(G.LinearLayout.VERTICAL);
			self.linear.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 0);
			Common.applyStyle(self.linear, "message_bg");
			self.title = new G.TextView(ctx);
			self.title.setText("教程");
			self.title.setGravity(G.Gravity.LEFT | G.Gravity.CENTER);
			self.title.setPadding(10 * G.dp, 0, 10 * G.dp, 10 * G.dp);
			Common.applyStyle(self.title, "textview_default", 4);
			self.linear.addView(self.title, new G.LinearLayout.LayoutParams(-1, -2));
			self.list = new G.ListView(ctx);
			self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({onItemClick : function(parent, view, pos, id) {try {
				var data = parent.getAdapter().getItem(pos);
				Tutorial.showIntro(data.source, function() {
					self.refresh();
				});
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

			self.popup = new PopupPage(self.linear, "tutorial.List");
			self.popup.on("exit", function() {
				CA.trySave();
				if (self.callback) self.callback();
			});

			PWM.registerResetFlag(self, "linear");
		}
		self.callback = callback;
		self.refresh();
		self.popup.enter();
	} catch(e) {erp(e)}})},

	showIntro : function(o, callback) {G.ui(function() {try {
		var linear, title, scr, desc, enter, popup;
		linear = new G.LinearLayout(ctx);
		linear.setOrientation(G.LinearLayout.VERTICAL);
		linear.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 0);
		Common.applyStyle(linear, "message_bg");
		title = new G.TextView(ctx);
		title.setText(o.name);
		title.setPadding(0, 0, 0, 10 * G.dp);
		Common.applyStyle(title, "textview_default", 4);
		linear.addView(title, new G.LinearLayout.LayoutParams(-1, -2));
		scr = new G.ScrollView(ctx);
		desc = new G.TextView(ctx);
		desc.setText(ISegment.rawJson(o.intro || o.description || "暂无简介"));
		Common.applyStyle(desc, "textview_default", 3);
		scr.addView(desc, new G.FrameLayout.LayoutParams(-1, -2));
		linear.addView(scr, new G.LinearLayout.LayoutParams(-1, 0, 1));
		enter = new G.TextView(ctx);
		enter.setText("进入");
		enter.setGravity(G.Gravity.RIGHT);
		enter.setPadding(0, 10 * G.dp, 20 * G.dp, 20 * G.dp);
		Common.applyStyle(enter, "button_critical", 3);
		enter.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
			popup.exit();
			if (o.type == "tutorial") {
				Tutorial.showTutorial(o, callback);
			} // more: exam article
		} catch(e) {erp(e)}}}));
		linear.addView(enter, new G.LinearLayout.LayoutParams(-1, -2));
		popup = PopupPage.showDialog("tutorial.Intro", linear, -1, -1);
	} catch(e) {erp(e)}})},

	showTutorial : function self(o, callback) {G.ui(function() {try {
		if (!self.linear) {
			self.adapter = function(e, i, a) {
				return e.view;
			}
			self.init = function(o) {
				var i, a, adapter, r = [{
					type : "title",
					view : self.linear
				}];
				self.current = o;
				self.sets = Tutorial.getSettings(String(o.id));
				self.title.setText(o.name);
				if (isNaN(self.sets.progress)) self.sets.progress = 0;
				if (!self.sets.varmap) self.sets.varmap = {};
				a = o.segments;
				for (i = 0; i < self.sets.progress && i < a.length; i++) {
					r.push(self.convertView(a[i], self.sets));
				}
				adapter = new RhinoListAdapter(r, self.adapter);
				self.list.setAdapter(adapter);
				self.adpt = RhinoListAdapter.getController(adapter);
				self.next();
			}
			self.next = function() {
				var i, a = self.current.segments, t, f;
				for (i = self.sets.progress; i < a.length; i++) {
					t = a[i];
					self.adpt.add(self.convertView(t, self.sets));
					switch (t.stepMode) {
						case "manual":
						f = true;
						self.adpt.add({
							type : "step.manual",
							view : self.generateText("点击进入下一步", false)
						});
						case "auto":
						default:
						break;
					}
					if (f) break;
				}
				self.sets.progress = i;
				if (i == a.length) {
					self.adpt.add({
						type : "ending",
						view : self.generateText(self.current.name + "已结束，点击以退出", false)
					});
				}
				//self.list.setSelectionFromTop(self.adpt.length() - 1, 0);
				self.list.smoothScrollToPosition(self.adpt.length() - 1);
			}
			self.convertView = function(e, sets) {
				var t;
				if (e.text) {
					t = ISegment.rawJson(e.text, sets.varmap);
					return {
						type : "text",
						text : t,
						view : self.generateText(t, true)
					};
				} else if (e.command) {
					return {
						type : "command",
						command : e.command,
						view : self.generateCopyable(ISegment.rawJson({formattedCommand : e.command}, null))
					};
				} else if (e.link) {
					t = e.prompt || e.link;
					return {
						type : "link",
						prompt : t,
						url : e.link,
						view : self.generateText(ISegment.rawJson(t, sets.varmap), false)
					};
				}
				return {
					type : "unknown",
					view : self.generateText("未知的片段")
				};
			}
			self.generateText = function(str, focusable) {
				var text = new G.TextView(ctx);
				text.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
				text.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				text.setText(str);
				text.setFocusable(focusable);
				Common.applyStyle(text, "textview_default", 3);
				return text;
			}
			self.generateCopyable = function(str) {
				var layout = new G.LinearLayout(ctx),
					text1 = new G.TextView(ctx),
					text2 = new G.TextView(ctx);
				layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				layout.setOrientation(G.LinearLayout.HORIZONTAL);
				text1.setPadding(15 * G.dp, 15 * G.dp, 0, 15 * G.dp);
				text1.setLayoutParams(new G.LinearLayout.LayoutParams(0, -2, 1.0));
				text1.setText(str);
				Common.applyStyle(text1, "textview_default", 3);
				layout.addView(text1);
				text2.setPadding(15 * G.dp, 0, 15 * G.dp, 0);
				text2.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
				text2.setText("\ud83d\udccb"); //Emoji:Paste
				text2.setGravity(G.Gravity.CENTER);
				Common.applyStyle(text2, "button_default", 3);
				layout.addView(text2);
				return layout;
			}
			self.linear = new G.LinearLayout(ctx);
			self.linear.setOrientation(G.LinearLayout.HORIZONTAL);
			Common.applyStyle(self.linear, "bar_float");
			self.linear.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
			self.title = new G.TextView(ctx);
			self.title.setPadding(20 * G.dp, 20 * G.dp, 0, 20 * G.dp);
			Common.applyStyle(self.title, "textview_default", 4);
			self.linear.addView(self.title, new G.LinearLayout.LayoutParams(0, -1, 1.0));
			self.exit = new G.TextView(ctx);
			self.exit.setText("关闭");
			self.exit.setGravity(G.Gravity.CENTER);
			self.exit.setPadding(20 * G.dp, 20 * G.dp, 20 * G.dp, 20 * G.dp);
			Common.applyStyle(self.exit, "button_critical", 3);
			self.linear.addView(self.exit, new G.LinearLayout.LayoutParams(-2, -1));
			self.linear.setFocusable(false);
			self.list = new G.ListView(ctx);
			Common.applyStyle(self.list, "message_bg");
			self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({onItemClick : function(parent, view, pos, id) {try {
				var e = parent.getAdapter().getItem(pos);
				if (!e) return;
				switch (e.type) {
					case "command":
					Common.setClipboardText(e.command);
					Common.toast("内容已复制");
					break;
					case "link":
					try {
						AndroidBridge.startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(e.url))
							.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
					} catch(e) {
						Common.toast("打开链接失败\n" + e);
					}
					break;
					case "step.manual":
					self.sets.progress++;
					self.adpt.removeByIndex(pos);
					self.next();
					break;
					case "ending":
					case "title":
					self.popup.exit();
					break;
				}
			} catch(e) {erp(e)}}}));

			self.popup = new PopupPage(self.list, "tutorial.Tutorial");
			self.popup.on("exit", function() {
				CA.trySave();
				if (self.callback) self.callback();
			});

			PWM.registerResetFlag(self, "linear");
		}
		self.callback = callback;
		self.init(o);
		self.popup.enter();
	} catch(e) {erp(e)}})},

	getSettings : function(id) {
		if (!CA.settings.tutorialData) {
			CA.settings.tutorialData = {};
		}
		if (id) {
			if (!CA.settings.tutorialData[id]) {
				CA.settings.tutorialData[id] = {};
			}
			return CA.settings.tutorialData[id];
		} else {
			return CA.settings.tutorialData;
		}
	}
});