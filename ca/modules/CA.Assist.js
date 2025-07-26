({
	active : false,
	iconFont: null,
	show : function self() {G.ui(function() {try {
		// if (!self.iconFont) {
		// 	try {
		// 		var assetManager = ctx.getAssets();
		// 		self.iconFont = G.Typeface.createFromAsset(assetManager, "fonts/Icon-font.ttf");
		// 	} catch (e) {
		// 		self.iconFont = G.Typeface.MONOSPACE || G.Typeface.DEFAULT;
		// 	}
		// }
		if (!self.head) {
			self.init = function() {
				CA.Assist.command = null;
				CA.Assist.pattern = null;
				self.refresh();
				self.choosePattern(true);
			}
			self.refresh = function() {
				var pp, arr, adpt, help;
				if (CA.Assist.command) {
					pp = new G.SpannableStringBuilder(CA.Assist.formatPattern(CA.Assist.command, CA.Assist.pattern));
					pp.append("\n");
					appendSSB(pp, CA.Assist.getPatternDescription(CA.Assist.command, CA.Assist.pattern), new G.ForegroundColorSpan(Common.theme.promptcolor));
					arr = (CA.Assist.pattern ? CA.IntelliSense.library.commands[CA.Assist.command].patterns[CA.Assist.pattern].params : []) || [];
					arr = arr.map(function(e, i) {
						return {
							param : e
						};
					});
				} else {
					pp = "选择命令……";
					arr = [];
				}
				self.head.setText(pp);
				self.list.setAdapter(adpt = new RhinoListAdapter((CA.Assist.params = arr).filter(function(e) {
					if (e.param.type == "plain") {
						e.text = e.param.name;
						return false;
					} else {
						return true;
					}
				}), CA.Assist.paramAdapter, self));
				self.adpt = RhinoListAdapter.getController(adpt);
				try {
					help = CA.Assist.command ? CA.IntelliSense.library.commands[CA.Assist.command].help : CA.IntelliSense.library.help.command;
					new java.net.URL(help);
					CA.showAssist.postHelp(0, help);
				} catch(e) {
					CA.showAssist.postHelp(1, help || "暂时没有帮助，以后会加上的啦");
				}
				CA.Assist.refreshCommand();
			}
			self.choosePattern = function(optional) {
				CA.Assist.chooseCommand(function(cmd) {
					CA.Assist.choosePatterns(cmd, function(pattern) {
						CA.Assist.command = cmd;
						CA.Assist.pattern = pattern;
						self.refresh();
					}, optional);
				}, optional);
			}
			self.head = new G.TextView(ctx);
			// self.head.setTypeface(self.iconFont); // 字体
			self.head.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
			self.head.setPadding(20 * G.dp, 10 * G.dp, 20 * G.dp, 10 * G.dp);
			self.head.setTypeface(G.Typeface.MONOSPACE || G.Typeface.DEFAULT);
			self.head.setLineSpacing(10, 1);
			Common.applyStyle(self.head, "textview_default", 2);
			// self.head.setTypeface(self.iconFont);
			self.list = new G.ListView(ctx);
			self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({onItemClick : function(parent, view, pos, id) {try {
				var e;
				if (pos == 0) {
					self.choosePattern();
					return;
				}
				CA.Assist.editParam(e = parent.getItemAtPosition(pos), function(t) {
					G.ui(function() {try {
						e._text.setText(e.text = String(t));
						CA.Assist.refreshCommand();
					} catch(e) {erp(e)}});
				}, function() {
					self.adpt.replace(CA.Assist.params[pos - 1] = {
						param : e.param
					}, pos - 1);
					CA.Assist.refreshCommand();
				});
			} catch(e) {erp(e)}}}));
			self.list.addHeaderView(self.head);
			self.list.setLayoutParams(new G.FrameLayout.LayoutParams(-1, -1));
			CA.showAssist.initContent(self.list);
			PWM.registerResetFlag(CA.Assist, "ui");
			PWM.registerResetFlag(self, "head");
		}
		self.init();
		if (CA.Assist.ui) return;
		CA.showAssist.con.addView(CA.Assist.ui = self.list);
	} catch(e) {erp(e)}})},
	hide : function() {G.ui(function() {try {
		if (!CA.Assist.ui) return;
		CA.showAssist.con.removeView(CA.Assist.ui);
		CA.Assist.ui = null;
	} catch(e) {erp(e)}})},
	paramAdapter : function(e, i, a) {
		var hl, vl, name, desp, p;
		p = e.param;
		hl = new G.LinearLayout(ctx);
		hl.setOrientation(G.LinearLayout.HORIZONTAL);
		hl.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
		hl.setPadding(20 * G.dp, 10 * G.dp, 20 * G.dp, 10 * G.dp);
		vl = new G.LinearLayout(ctx);
		vl.setOrientation(G.LinearLayout.VERTICAL);
		vl.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2, 1.0));
		vl.getLayoutParams().gravity = G.Gravity.CENTER;
		name = new G.TextView(ctx);
		// name.setTypeface(self.iconFont); 	//字体
		name.setText(String(p.name) + (p.optional || p.canIgnore || p.chainOptional ? " (可选)" : ""));
		name.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
		Common.applyStyle(name, "textview_default", 3);
		vl.addView(name);
		desp = new G.TextView(ctx);
		// desp.setTypeface(self.iconFont); //字体
		desp.setText(p.description ? String(p.description) : CA.Assist.getParamType(p));
		desp.setSingleLine(true);
		desp.setEllipsize(G.TextUtils.TruncateAt.END);
		desp.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
		Common.applyStyle(desp, "textview_prompt", 1);
		vl.addView(desp);
		hl.addView(vl);
		e._text = new G.TextView(ctx);
		// e._text.setTypeface(self.iconFont); //字体
		e._text.setText("点击以编辑");
		e._text.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
		e._text.setMaxEms(10);
		e._text.setSingleLine(true);
		e._text.setEllipsize(G.TextUtils.TruncateAt.END);
		e._text.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2, 0));
		e._text.getLayoutParams().gravity = G.Gravity.CENTER;
		Common.applyStyle(e._text, "textview_prompt", 2);
		hl.addView(e._text);
		return hl;
	},
	refreshCommand : function() {
		if (CA.Assist.command) {
			var r = ["/" + CA.Assist.command], i, p = CA.Assist.params;
			for (i = 0; i < p.length; i++) {
				if (!p[i].text) break;
				r.push(p[i].text);
			}
			CA.cmd.setText(r.join(" "));
		} else {
			CA.cmd.setText("/");
		}
	},
	editParam : function(e, callback, onReset) {
		switch (e.param.type) {
			case "plain":
			Common.showOperateDialog([{
				text : e.param.name,
				onclick : function() {
					callback(e.param.name);
				}
			}, {
				text : "重置参数",
				onclick : function() {
					onReset();
				},
				hidden : function() {
					return !onReset;
				}
			}]);
			break;
			case "enum":
			this.editParamEnum(e, callback, onReset);
			break;
			case "nbt":
			case "json":
			this.editParamJSON(e, callback, onReset);
			break;
			case "position":
			this.editParamPosition(e, callback, onReset);
			break;
			case "selector":
			this.editParamSelector(e, callback, onReset);
			break;
			case "int":
			case "uint":
			case "float":
			case "relative":
			case "custom":
			case "command":
			case "rawjson":
			case "text":
			default:
			this.editParamDialog(e, callback, onReset);
		}
	},
	editParamDialog : function self(e, callback, onReset) {G.ui(function() {try {
		var layout, title, p, ret, exit, popup, t, listener = {}, suggestion = {}, i;
		if (!self.initTextBox) {
			self.initTextBox = function(e, defVal) {
				var ret = new G.EditText(ctx);
				ret.setText(defVal ? String(defVal) : e.text ? e.text : "");
				ret.setSingleLine(true);
				ret.setPadding(0, 10 * G.dp, 0, 10 * G.dp);
				ret.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
				ret.setSelection(ret.length());
				Common.applyStyle(ret, "edittext_default", 2);
				return ret;
			}
			self.initListener = function(ret, l, gText) {
				l.getText = function(pure) {
					if (pure) return ret.getText();
					return gText();
				}
				l.setText = function(e) {
					ret.setText(String(e));
				}
				ret.addTextChangedListener(new G.TextWatcher({
					afterTextChanged : function(s) {try {
						l.onTextChanged(s);
					} catch(e) {erp(e)}}
				}));
			}
		}
		layout = new G.LinearLayout(ctx);
		layout.setOrientation(G.LinearLayout.VERTICAL);
		layout.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 0);
		Common.applyStyle(layout, "message_bg");
		title = new G.TextView(ctx);
		title.setText("编辑“" + e.param.name + "”");
		title.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
		title.setPadding(0, 0, 0, 10 * G.dp);
		Common.applyStyle(title, "textview_default", 4);
		layout.addView(title);
		switch (p = e.param.type) {
			case "int":
			layout.addView(ret = self.initTextBox(e));
			ret.setInputType(G.InputType.TYPE_CLASS_NUMBER | G.InputType.TYPE_NUMBER_FLAG_SIGNED);
			self.initListener(ret, listener, function() {
				var t = ret.getText();
				return !t.length() ? undefined : isFinite(t) ? parseInt(t) : (Common.toast("内容不是数字！"), null);
			});
			Common.postIME(ret);
			break;
			case "uint":
			layout.addView(ret = self.initTextBox(e));
			ret.setInputType(G.InputType.TYPE_CLASS_NUMBER);
			self.initListener(ret, listener, function() {
				var t = ret.getText();
				return !t.length() ? undefined : isFinite(t) ? Math.abs(parseInt(t)) : (Common.toast("内容不是数字！"), null);
			});
			Common.postIME(ret);
			break;
			case "float":
			layout.addView(ret = self.initTextBox(e));
			ret.setInputType(G.InputType.TYPE_CLASS_NUMBER | G.InputType.TYPE_NUMBER_FLAG_SIGNED | G.InputType.TYPE_NUMBER_FLAG_DECIMAL);
			self.initListener(ret, listener, function() {
				var t = ret.getText();
				return !t.length() ? undefined : isFinite(t) ? parseFloat(t) : (Common.toast("内容不是数字！"), null);
			});
			Common.postIME(ret);
			break;
			case "relative":
			layout.addView(ret = self.initTextBox(e, isNaN(e.offset) ? "" : e.offset));
			ret.setInputType(G.InputType.TYPE_CLASS_NUMBER | G.InputType.TYPE_NUMBER_FLAG_SIGNED | G.InputType.TYPE_NUMBER_FLAG_DECIMAL);
			var rela = new G.CheckBox(ctx);
			rela.setChecked(Boolean(e.isRela));
			rela.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2, 0));
			rela.getLayoutParams().setMargins(0, 0, 0, 10 * G.dp)
			rela.setText("启用相对参数");
			layout.addView(rela);
			listener.getText = function(pure) {
				e.isRela = rela.isChecked();
				e.offset = ret.getText();
				if (pure) return (e.isRela ? "~" : "") + parseFloat(e.offset);
				return !e.offset.length() ? undefined : isFinite(e.offset) ? (e.isRela ? "~" : "") + parseFloat(e.offset) : (Common.toast("内容不是数字！"), null);
			}
			listener.setText = function(e) {
				var s = String(e), f = s.startsWith("~");
				rela.setChecked(f);
				ret.setText(f ? s.slice(1) : s);
			}
			ret.addTextChangedListener(new G.TextWatcher({
				afterTextChanged : function(s) {try {
					listener.onTextChanged();
				} catch(e) {erp(e)}}
			}));
			Common.postIME(ret);
			break;
			case "custom":
			layout.addView(ret = self.initTextBox(e));
			ret.setInputType(G.InputType.TYPE_CLASS_TEXT);
			self.initListener(ret, listener, function() {
				return ret.length() == 0 ? undefined : (new RegExp(e.param.finish, "")).test(ret.getText()) ? ret.getText() : (Common.toast("内容不合规范！"), null);
			});
			Common.postIME(ret);
			break;
			case "command":
			CA.his.forEach(function(e) {
				suggestion[e] = e;
			});
			case "text":
			default:
			layout.addView(ret = self.initTextBox(e));
			ret.setInputType(G.InputType.TYPE_CLASS_TEXT);
			self.initListener(ret, listener, function() {
				return ret.length() > 0 ? ret.getText() : undefined;
			});
			Common.postIME(ret);
		}
		if (e.param.suggestion) {
			t = e.param.suggestion instanceof Object ? e.param.suggestion : CA.IntelliSense.library.enums[e.param.suggestion];
			if (Array.isArray(t)) {
				for (i in t) {
					suggestion[t[i]] = t[i];
				}
			} else {
				for (i in t) {
					if (t[i]) {
						suggestion[i + " - " + t[i]] = i;
					} else {
						suggestion[i] = i;
					}
				}
			}
		}
		if (listener.setText) {
			var sugg = new G.ListView(ctx), adpt = new FilterListAdapter(new SimpleListAdapter(Object.keys(suggestion), CA.Assist.smallVMaker, CA.Assist.smallVBinder));
			sugg.setBackgroundColor(G.Color.TRANSPARENT);
			sugg.setLayoutParams(new G.LinearLayout.LayoutParams(-1, 0, 1));
			sugg.setAdapter(adpt.build());
			sugg.setOnItemClickListener(new G.AdapterView.OnItemClickListener({onItemClick : function(parent, view, pos, id) {try {
				listener.setText(suggestion[parent.getItemAtPosition(pos)]);
			} catch(e) {erp(e)}}}));
			layout.addView(sugg);
			if (G.style == "Material") {
				sugg.setFastScrollEnabled(true);
				sugg.setFastScrollAlwaysVisible(false);
			}
			listener.onTextChanged = function(s) {
				var s = String(s);
				if (s) {
					adpt.setFilter(function(e, i) {
						return e.indexOf(s) >= 0;
					});
				} else {
					adpt.clearFilter();
				}
			}
			if (listener.getText) listener.onTextChanged(listener.getText(true));
		}
		exit = new G.TextView(ctx);
		// exit.setTypeface(self.iconFont); //字体
		exit.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
		exit.setText("确定");
		exit.setGravity(G.Gravity.CENTER);
		exit.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 15 * G.dp);
		Common.applyStyle(exit, "button_critical", 3);
		exit.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
			var t = listener.getText();
			if (typeof t == "undefined" && onReset) {
				onReset();
			} else {
				if (t == null) return;
				callback(String(t));
			}
			popup.exit();
		} catch(e) {erp(e)}}}));
		layout.addView(exit);
		popup = PopupPage.showDialog("ca.assist.ParamEditor.Common", layout, -1, -2);
	} catch(e) {erp(e)}})},
	editParamEnum : function(e, callback, onReset) {
		var t = e.param.list instanceof Object ? e.param.list : CA.IntelliSense.library.enums[e.param.list];
		var arr = [], i;
		if (onReset) arr.push({
			text : "重置参数",
			reset : true
		});
		if (Array.isArray(t)) {
			for (i in t) {
				arr.push(t[i]);
			}
		} else {
			for (i in t) {
				if (t[i]) {
					arr.push({
						text : i,
						description : t[i]
					});
				} else {
					arr.push(i);
				}
			}
		}
		Common.showListChooser(arr, function(pos) {
			var t = arr[pos];
			if (t.reset) {
				onReset()
			} else if (t instanceof Object) {
				callback(t.text);
			} else {
				callback(t);
			}
		});
	},
	editParamJSON : function self(e, callback, onReset) {
		if (!self.refresh) {
			self.refresh = function(e, data, callback) {
				e.jsonData = data;
				callback(MapScript.toSource(data));
			}
			self.modify = function(e, callback) {
				JSONEdit.show({
					source : e.jsonData,
					rootname : e.param.name,
					update : function() {
						self.refresh(e, this.source, callback);
					}
				});
			}
			self.buildnew = function(e, callback) {
				JSONEdit.create(function(data) {
					self.refresh(e, data, callback);
				}, e.param.name);
			}
			self.editmenu = [{
				text : "编辑",
				onclick : function(v, tag) {
					self.modify(tag.e, tag.callback);
				}
			},{
				text : "新建",
				onclick : function(v, tag) {
					self.buildnew(tag.e, tag.callback);
				}
			},{
				text : "重置参数",
				onclick : function(v, tag) {
					tag.onReset();
				},
				hidden : function(tag) {
					return !tag.onReset;
				}
			},{
				text : "取消",
				onclick : function(v) {}
			}]
		}
		if (e.param.component) return this.editComponent(e, callback, onReset);
		if ("jsonData" in e) {
			Common.showOperateDialog(self.editmenu, {
				e : e,
				callback : callback,
				onReset : onReset
			});
		} else {
			self.buildnew(e, callback);
		}
	},
	editParamPosition : function self(e, callback, onReset) {G.ui(function() {try {
		var scr, layout, title, i, row, label, ret = [], rela = [], screla, posp = ["X", "Y", "Z"], reset, exit, popup;
		scr = new G.ScrollView(ctx);
		Common.applyStyle(scr, "message_bg");
		layout = new G.TableLayout(ctx);
		layout.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 0);
		title = new G.TextView(ctx);
		// title.setTypeface(self.iconFont); //字体
		title.setText("编辑“" + e.param.name + "”");
		title.setLayoutParams(new G.TableLayout.LayoutParams(-1, -2));
		title.setPadding(0, 0, 0, 10 * G.dp);
		Common.applyStyle(title, "textview_default", 4);
		layout.addView(title);
		if (!e.pos) {
			e.pos = [];
			e.rela = [];
		}
		for (i = 0; i < 3; i++) {
			row = new G.TableRow(ctx);
			row.setLayoutParams(new G.TableLayout.LayoutParams(-1, -2));
			row.setGravity(G.Gravity.CENTER);
			label = new G.TextView(ctx);
			// label.setTypeface(self.iconFont); //字体
			label.setText(posp[i]);
			label.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
			label.setLayoutParams(new G.TableRow.LayoutParams(-1, -2));
			Common.applyStyle(label, "textview_default", 2);
			row.addView(label);
			ret[i] = new G.EditText(ctx);
			ret[i].setText(isNaN(e.pos[i]) ? "" : String(e.pos[i]));
			ret[i].setSingleLine(true);
			ret[i].setInputType(G.InputType.TYPE_CLASS_NUMBER | G.InputType.TYPE_NUMBER_FLAG_SIGNED | G.InputType.TYPE_NUMBER_FLAG_DECIMAL);
			ret[i].setLayoutParams(new G.TableRow.LayoutParams(0, -2, 1));
			ret[i].setSelection(ret[i].length());
			Common.applyStyle(ret[i], "edittext_default", 2);
			row.addView(ret[i]);
			rela[i] = new G.CheckBox(ctx);
			rela[i].setChecked(Boolean(e.rela[i]));
			rela[i].setLayoutParams(new G.TableRow.LayoutParams(-2, -2));
			rela[i].getLayoutParams().setMargins(0, 0, 10 * G.dp, 0)
			rela[i].setText("~"); //BUG：CheckBox需重新着色
			row.addView(rela[i]);
			layout.addView(row);
		}
		screla = new G.CheckBox(ctx);
		screla.setChecked(false);
		screla.setLayoutParams(new G.TableLayout.LayoutParams(-1, -2));
		screla.getLayoutParams().setMargins(0, 0, 0, 10 * G.dp)
		screla.setText("使用局部坐标（^左 ^上 ^前）");
		screla.setOnCheckedChangeListener(new G.CompoundButton.OnCheckedChangeListener({onCheckedChanged : function(v, s) {try {
			var i;
			for (i = 0; i < 3; i++) rela[i].setVisibility(s ? G.View.GONE : G.View.VISIBLE);
		} catch(e) {erp(e)}}}));
		screla.setChecked(Boolean(e.screla));
		screla.setVisibility(CA.hasFeature("enableLocalCoord") ? G.View.VISIBLE : G.View.GONE);
		layout.addView(screla);
		if (onReset) {
			reset = new G.TextView(ctx);
			// reset.setTypeface(self.iconFont); //字体
			reset.setLayoutParams(new G.TableLayout.LayoutParams(-1, -2));
			reset.setText("重置参数");
			reset.setGravity(G.Gravity.CENTER);
			reset.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 15 * G.dp);
			Common.applyStyle(reset, "button_critical", 3);
			reset.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
				onReset();
				popup.exit();
			} catch(e) {erp(e)}}}));
			layout.addView(reset);
		}
		exit = new G.TextView(ctx);
		// exit.setTypeface(self.iconFont); //字体
		exit.setLayoutParams(new G.TableLayout.LayoutParams(-1, -2));
		exit.setText("确定");
		exit.setGravity(G.Gravity.CENTER);
		exit.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 15 * G.dp);
		Common.applyStyle(exit, "button_critical", 3);
		exit.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
			var r = [];
			e.screla = CA.hasFeature("enableLocalCoord") && screla.isChecked();
			for (i = 0; i < 3; i++) {
				e.pos[i] = parseFloat(ret[i].getText());
				e.rela[i] = rela[i].isChecked();
				if (!e.screla && !e.rela[i] && !isFinite(e.pos[i])) return Common.toast(posp[i] + "坐标不是数字！");
				r.push((e.screla ? "^" : e.rela[i] ?  "~" : "") + (isFinite(e.pos[i]) ? e.pos[i] : ""));
			}
			callback(r.join(" "));
			popup.exit();
		} catch(e) {erp(e)}}}));
		layout.addView(exit);
		scr.addView(layout);
		popup = PopupPage.showDialog("ca.assist.ParamEditor.Position", scr, -1, -2);
	} catch(e) {erp(e)}})},
	editParamSelector : function self(e, callback, onReset) {G.ui(function() {try {
		var layout, title, i, label, list, add, reset, exit, popup;
		if (!self.selectors) {
			self.selectors = {
				"@a" : "选择所有玩家",
				"@p" : "选择距离最近的玩家",
				"@r" : "选择随机玩家",
				"@e" : "选择所有实体",
				"@s" : "选择命令执行者"
			}
			self.editLabel = function(e, callback) {
				var a = [], t = e.param.target;
				if (t == "entity" || t == "player") a.push("@a", "@p", "@r");
				if (t == "entity" || t == "nonplayer") a.push("@e");
				if (t != "nonselector") a.push("@s");
				a = a.map(function(e) {
					return {
						text : e,
						description : self.selectors[e]
					};
				});
				a.push({
					text : "玩家名",
					description : "选择具有指定名称的玩家",
					custom : true
				});
				Common.showListChooser(a, function(pos) {
					if (a[pos].custom) {
						Common.showInputDialog({
							title : "选择玩家名",
							callback : function(s) {
								if (s.startsWith("@")) {
									Common.toast("玩家名不合法");
									callback("");
								} else {
									callback(s);
								}
							},
							singleLine : true
						});
					} else {
						callback(a[pos].text);
					}
				});
			}
			self.checkPar = function(label, list) {
				list.setVisibility(label.getText() in self.selectors ? G.View.VISIBLE : G.View.GONE);
			}
			self.refresh = function(e, list) {
				list.setAdapter(new RhinoListAdapter(e.selpar, self.adapter, {
					delete : function(i) {
						e.selpar.splice(i, 1);
						self.refresh(e, list);
					}
				}));
			}
			self.addParam = function(e, list) {
				var a = [], ss = CA.IntelliSense.library.selectors;
				Object.keys(ss).forEach(function(e) {
					a.push({
						text : ss[e].name,
						description : e,
						name : e,
						par : ss[e],
						inverted : false
					});
					if (ss[e].hasInverted) {
						a.push({
							text : "(不满足)" + ss[e].name,
							description : "非" + e,
							name : e,
							par : ss[e],
							inverted : true
						});
					}
				});
				Common.showListChooser(a, function(pos) {
					var p = {
						name : a[pos].name,
						param : a[pos].par,
						isInverted : a[pos].inverted
					};
					CA.Assist.editParam(p, function(text) {
						p.text = text;
						e.selpar.push(p);
						self.refresh(e, list);
					});
				});
			}
			self.editParam = function(e, i, list) {
				CA.Assist.editParam(e.selpar[i], function(text) {
					e.selpar[i].text = text;
					self.refresh(e, list);
				});
			}
			self.adapter = function(e, i, a, tag) {
				var view = new G.LinearLayout(ctx),
					text = new G.TextView(ctx),
					del = new G.TextView(ctx);

				// // 设置字体
				// view.setTypeface(self.iconFont);
				// text.setTypeface(self.iconFont);
				// del.setTypeface(self.iconFont);

				view.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				view.setOrientation(G.LinearLayout.HORIZONTAL);
				view.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				text.setLayoutParams(new G.LinearLayout.LayoutParams(0, -2, 1));
				text.setText((e.isInverted ? "(不满足)" : "") + e.param.name + "：" + e.text);
				text.setSingleLine(true);
				text.setEllipsize(G.TextUtils.TruncateAt.END);
				text.setPadding(10 * G.dp, 10 * G.dp, 0, 10 * G.dp);
				Common.applyStyle(text, "textview_default", 2);
				text.setTypeface(self.iconFont);
				view.addView(text);
				del.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2));
				del.setText("×");
				del.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
				Common.applyStyle(del, "textview_default", 2);
				del.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
					tag.delete(i);
				} catch(e) {erp(e)}}}));
				view.addView(del);
				return view;
			}
		}
		layout = new G.LinearLayout(ctx);
		layout.setOrientation(G.LinearLayout.VERTICAL);
		layout.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 0);
		Common.applyStyle(layout, "message_bg");
		title = new G.TextView(ctx);
		// title.setTypeface(self.iconFont); // 设置字体
		title.setText("编辑“" + e.param.name + "”");
		title.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
		title.setPadding(0, 0, 0, 10 * G.dp);
		Common.applyStyle(title, "textview_default", 4);
		layout.addView(title);
		if (!e.selpar) e.selpar = [];
		label = new G.EditText(ctx);
		label.setHint("点击以选择");
		label.setSingleLine(true);
		label.setPadding(0, 0, 0, 10 * G.dp);
		label.setInputType(G.InputType.TYPE_NULL);
		label.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
		Common.applyStyle(label, "edittext_default", 2);
		label.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
			self.editLabel(e, function(text) {G.ui(function() {try {
				v.setText(text);
				self.checkPar(v, list);
			} catch(e) {erp(e)}})});
		} catch(e) {erp(e)}}}));
		if (e.label) {
			label.setText(e.label);
		} else {
			label.post(function() {try {
				label.performClick();
			} catch(e) {erp(e)}});
		}
		layout.addView(label);
		add = new G.TextView(ctx);
		// add.setTypeface(self.iconFont); // 设置字体
		add.setText("+ 添加选择器参数");
		add.setSingleLine(true);
		add.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
		add.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
		Common.applyStyle(add, "textview_default", 2);
		list = new G.ListView(ctx);
		list.setLayoutParams(new G.LinearLayout.LayoutParams(-1, 0, 1));
		list.addFooterView(add);
		list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({onItemClick : function(parent, view, pos, id) {try {
			if (view == add) {
				self.addParam(e, parent);
			} else {
				self.editParam(e, pos, parent);
			}
		} catch(e) {erp(e)}}}));
		layout.addView(list);
		if (onReset) {
			reset = new G.TextView(ctx);
			// reset.setTypeface(self.iconFont); // 设置字体
			reset.setLayoutParams(new G.TableLayout.LayoutParams(-1, -2));
			reset.setText("重置参数");
			reset.setGravity(G.Gravity.CENTER);
			reset.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 15 * G.dp);
			Common.applyStyle(reset, "button_critical", 3);
			reset.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
				onReset();
				popup.exit();
			} catch(e) {erp(e)}}}));
			layout.addView(reset);
		}
		exit = new G.TextView(ctx);
		// exit.setTypeface(self.iconFont); // 设置字体
		exit.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
		exit.setText("确定");
		exit.setGravity(G.Gravity.CENTER);
		exit.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 15 * G.dp);
		Common.applyStyle(exit, "button_critical", 3);
		exit.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
			if (!(e.label = String(label.getText()))) return Common.toast("选择器不可为空！")
			callback(e.label + (e.label in self.selectors && e.selpar.length ? "[" + e.selpar.map(function(e) {
				return e.name + "=" + (e.isInverted ? "!" : "") + e.text;
			}).join(",") + "]" : ""));
			popup.exit();
		} catch(e) {erp(e)}}}));
		layout.addView(exit);
		self.checkPar(label, list);
		self.refresh(e, list);
		popup = PopupPage.showDialog("ca.assist.ParamEditor.Selector", layout, -1, -2);
	} catch(e) {erp(e)}})},
	smallVMaker : function(holder) {
		var view = holder.view = new G.TextView(ctx);
		// view.setTypeface(self.iconFont);
		view.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
		view.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
		Common.applyStyle(view, "textview_default", 2);
		// view.setTypeface(self.iconFont);
		return view;
	},
	smallVBinder : function(holder, s) {
		holder.view.setText(s);
	},
	getParamType : function(cp) {
		switch (cp.type) {
			case "int":
			return "整数";

			case "uint":
			return "自然数";

			case "float":
			case "relative":
			return "数值";

			case "nbt":
			return "数据标签";

			case "rawjson":
			return "文本JSON";

			case "json":
			return "JSON";

			case "selector":
			return "实体";

			case "enum":
			return "列表";

			case "plain":
			return "常量";

			case "custom":
			if (cp.vtype) return cp.vtype;
			return "自定义类型";

			case "position":
			return "坐标";

			case "command":
			return "命令";

			case "text":
			default:
			return "文本";
		}
	},
	formatPattern : function(cmd, pattern) {
		var c = CA.IntelliSense.library.commands[cmd], r = ["/" + cmd];
		if (pattern) {
			c.patterns[pattern].params.forEach(function(e) {
				r.push(CA.IntelliSense.getParamTag(e, null, 0, null));
			});
		}
		return r.join(" ");
	},
	getPatternDescription : function(cmd, pattern) {
		var c = CA.IntelliSense.library.commands[cmd];
		return (pattern ? c.patterns[pattern].description : c.noparams.description) || c.description;
	},
	chooseCommand : function(callback, optional) {
		var lib = CA.IntelliSense.library, cmds;
		(cmds = Object.keys(lib.commands).filter(function(e) {
			return !lib.commands[e].alias;
		})).sort();
		if (!cmds.length) {
			Common.toast("没有可选的命令");
			return;
		}
		Common.showListChooser(cmds.map(function(e) {
			return {
				text : e,
				description : lib.commands[e].description
			};
		}), function(id) {
			callback(cmds[id]);
		}, optional);
	},
	choosePatterns : function(cmd, callback, optional) {
		var c = CA.IntelliSense.library.commands[cmd], ps;
		if (!c.patterns && !c.noparams) return void Common.toast("该命令不存在命令模式");
		ps = c.patterns ? Object.keys(c.patterns) : [];
		if (c.noparams) ps.unshift(null);
		if (!ps.length) {
			Common.toast("没有可选的命令模式");
			return;
		}
		Common.showListChooser(ps.map(function(e) {
			return {
				text : CA.Assist.formatPattern(cmd, e),
				description : CA.Assist.getPatternDescription(cmd, e)
			};
		}), function(id) {
			callback(ps[id]);
		}, optional);
	},
	editComponent : function self(e, callback, onReset) {G.ui(function() {try {
		var layout, title, i, adpt, list, add, reset, exit, popup;
		if (!self.selectors) {
			self.refresh = function(e, adpt) {
				adpt.notifyChange();
			}
			self.addParam = function(e, adpt) {
				var i, a = [], c, cs = e.current_component;
				if (cs.type == "object") {
					for (i in cs.children) {
						c = self.extendComponent(cs.children[i]);
						a.push({
							text : c.name,
							description : c.description || i,
							data : c,
							id : i
						});
					}
				} else if (cs.type == "array") {
					c = self.extendComponent(cs.children);
					a.push({
						text : c.name || "元素",
						description : c.description,
						data : c
					});
				}
				Common.showListChooser(a, function(pos) {
					var p = {
						_id : a[pos].id,
						param : a[pos].data
					};
					if (p.param.type == "object" || p.param.type == "array") {
						p.param = {
							type : "json",
							name : a[pos].text,
							component : p.param
						}
					}
					CA.Assist.editParam(p, function(text) {
						p.text = text;
						p.jsonData = self.getJSON(p);
						e.components.push(p);
						self.refresh(e, adpt);
					});
				}, true);
			}
			self.editParam = function(e, i, adpt) {
				CA.Assist.editParam(e.components[i], function(text) {
					var p = e.components[i];
					p.text = text;
					p.jsonData = self.getJSON(p);
					self.refresh(e, adpt);
				});
			}
			self.extendComponent = function(c) {
				var i, o;
				if (!c) return null;
				if (c instanceof Object) {
					o = c.extends ? self.extendComponent(c.extends) : {};
					for (i in c) o[i] = c[i];
					return o;
				} else {
					return self.extendComponent(CA.IntelliSense.library.json[c]);
				}
			}
			self.getJSON = function(e) {
				switch (e.param.type) {
					case "nbt":
					case "json":
					return e.jsonData;
					break;
					case "int":
					case "uint":
					case "float":
					return Number(e.text);
					break;
					case "plain":
					case "enum":
					case "custom":
					case "command":
					case "rawjson":
					case "text":
					default:
					return e.text;
				}
			}
			self.vmaker = function(holder, params) {
				var view = new G.LinearLayout(ctx),
					text = holder.text = new G.TextView(ctx),
					del = new G.TextView(ctx);

				// //设置字体
				// view.setTypeface(self.iconFont);
				// text.setTypeface(self.iconFont);
				// del.setTypeface(self.iconFont);

				view.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				view.setOrientation(G.LinearLayout.HORIZONTAL);
				view.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				text.setLayoutParams(new G.LinearLayout.LayoutParams(0, -2, 1));
				text.setSingleLine(true);
				text.setEllipsize(G.TextUtils.TruncateAt.END);
				text.setPadding(10 * G.dp, 10 * G.dp, 0, 10 * G.dp);
				Common.applyStyle(text, "textview_default", 2);
				text.setTypeface(self.iconFont);
				view.addView(text);
				del.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2));
				del.setText("×");
				del.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
				Common.applyStyle(del, "textview_default", 2);
				del.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
					params.delete(holder.pos);
				} catch(e) {erp(e)}}}));
				view.addView(del);
				return view;
			}
			self.vbinder = function(holder, e, i, a) {
				holder.text.setText((e._id ? e.param.name + "：" : "") + e.text);
			}
		}
		layout = new G.LinearLayout(ctx);
		layout.setOrientation(G.LinearLayout.VERTICAL);
		layout.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 0);
		Common.applyStyle(layout, "message_bg");
		title = new G.TextView(ctx);
		// title.setTypeface(self.iconFont); // 设置字体
		title.setText("编辑“" + e.param.name + "”");
		title.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
		title.setPadding(0, 0, 0, 10 * G.dp);
		Common.applyStyle(title, "textview_default", 4);
		layout.addView(title);
		add = new G.TextView(ctx);
		// add.setTypeface(self.iconFont); // 设置字体
		add.setText("+ 添加组件");
		add.setSingleLine(true);
		add.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
		add.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
		Common.applyStyle(add, "button_default", 2);
		list = new G.ListView(ctx);
		list.setLayoutParams(new G.LinearLayout.LayoutParams(-1, 0, 1));
		list.addFooterView(add);
		list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({onItemClick : function(parent, view, pos, id) {try {
			if (view == add) {
				self.addParam(e, adpt);
			} else {
				self.editParam(e, pos, adpt);
			}
		} catch(e) {erp(e)}}}));
		layout.addView(list);
		if (onReset) {
			reset = new G.TextView(ctx);
			// reset.setTypeface(self.iconFont); // 设置字体
			reset.setLayoutParams(new G.TableLayout.LayoutParams(-1, -2));
			reset.setText("重置参数");
			reset.setGravity(G.Gravity.CENTER);
			reset.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 15 * G.dp);
			Common.applyStyle(reset, "button_critical", 3);
			reset.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
				onReset();
				popup.exit();
			} catch(e) {erp(e)}}}));
			layout.addView(reset);
		}
		exit = new G.TextView(ctx);
		// exit.setTypeface(self.iconFont); // 设置字体
		exit.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
		exit.setText("确定");
		exit.setGravity(G.Gravity.CENTER);
		exit.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 15 * G.dp);
		Common.applyStyle(exit, "button_critical", 3);
		exit.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
			var i, o;
			if (e.current_component.type == "object") {
				o = {};
				for (i in e.components) {
					o[e.components[i]._id] = e.components[i].jsonData;
				}
			} else if (e.current_component.type == "array") {
				o = [];
				for (i in e.components) {
					o.push(e.components[i].jsonData);
				}
			}
			callback(JSON.stringify(e.jsonData = o));
			popup.exit();
		} catch(e) {erp(e)}}}));
		layout.addView(exit);
		if (!e.components) e.components = [];
		list.setAdapter(adpt = new SimpleListAdapter(e.components, self.vmaker, self.vbinder, {
			delete : function(i) {
				e.components.splice(i, 1);
				self.refresh(e, adpt);
			}
		}));
		e.current_component = self.extendComponent(e.param.component);
		adpt = SimpleListAdapter.getController(adpt);
		self.refresh(e, adpt);
		popup = PopupPage.showDialog("ca.assist.ParamEditor.Component", layout, -1, -2);
	} catch(e) {erp(e)}})}
})