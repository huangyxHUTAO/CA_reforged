MapScript.loadModule("JSONEdit", {
	clipboard : null,
	onCreate : function() {
		Intl.mapNamespace(this, "intl", "jsonEdit");
	},
	create : function(callback, rootname) {
		this.showNewItem(function(data) {
			if (data instanceof Object) {
				JSONEdit.show({
					source : data,
					rootname : rootname,
					update : function() {
						callback(data);
					}
				});
			} else {
				return callback(data);
			}
		});
	},
	main : function self() {
		if (!self.menu) {
			self.intl = Intl.getNamespace("jsonEdit.main");
			self.saveMenu = [{
				text : self.intl.edit,
				description : self.intl.edit_desc,
				onclick : function(v, tag) {
					if (!JSONEdit.show(tag.par)) {
						Common.toast(self.intl.nowhereEditable);
						return true;
					}
				}
			}, {
				text : self.intl.copy,
				description : self.intl.copy_desc,
				onclick : function(v, tag) {
					Common.setClipboardText(JSON.stringify(tag.data, null, "\t"));
					Common.toast(self.intl.copy_success);
				}
			}, {
				text : self.intl.save,
				description : self.intl.save_desc,
				hidden : function(tag) {
					return !tag.path;
				},
				onclick : function(v, tag) {
					try {
						MapScript.saveJSON(tag.path, tag.data);
						Common.toast(self.intl.save_success);
					} catch(e) {
						Common.toast(self.intl.resolve("save_failed", e));
					}
					return true;
				}
			}, {
				text : self.intl.saveAs,
				description : self.intl.saveAs_desc,
				onclick : function(v, tag) {
					Common.showFileDialog({
						type : 1,
						callback : function(f) {
							try {
								MapScript.saveJSON(tag.path = f.result.getAbsolutePath(), tag.data);
								Common.toast(self.intl.saveAs_success);
							} catch(e) {
								Common.toast(self.intl.resolve("save_failed", e));
							}
						}
					});
					return true;
				}
			}, {
				text : Common.intl.close,
				onclick : function(v, tag) {}
			}];
			self.menu = [{
				text : self.intl.new,
				description : self.intl.new_desc,
				onclick : function() {
					JSONEdit.create(function cb(o) {
						Common.showOperateDialog(self.saveMenu, {
							data : o,
							path : null,
							par : {
								source : o,
								update : function() {
									cb(this.source);
								}
							}
						});
					});
				}
			}, {
				text : self.intl.open,
				description : self.intl.open_desc,
				onclick : function() {
					Common.showFileDialog({
						type : 0,
						callback : function(f) {
							var o;
							try {
								o = {
									data : MapScript.readJSON(f.result.getAbsolutePath(), null),
									path : f.result.getAbsolutePath()
								}
								if (!JSONEdit.show(o.par = {
									source : o.data,
									update : function() {
										o.data = this.source;
										Common.showOperateDialog(self.saveMenu, o);
									}
								})) Common.showOperateDialog(self.saveMenu, o);
							} catch(e) {
								Common.toast(JSONEdit.intl.resolve("invaildJSON", e));
							}
						}
					});
				}
			}, {
				text : Common.intl.close,
				onclick : function(v, tag) {}
			}];
		}
		Common.showOperateDialog(self.menu);
	},
	show : function(o) {
		var i, name, data;
		var options = {};
		if (o.showAll) {
			options.itemAccessor = this.itemAccessor.debug;
		} else {
			options.itemAccessor = this.itemAccessor.json;
		}
		name = o.rootname ? o.rootname : this.intl.root;
		data = o.source;
		if (data === null) {
			return false;
		} else if (options.itemAccessor.isTree(data)) {
			options.path = [{
				name : name,
				data : data,
				pos : 0
			}];
			if (o.path) {
				for (i in o.path) {
					options.path.push({
						name : String(o.path[i]),
						data : options.itemAccessor.isTree(data = data[o.path[i]]) ? data : {},
						pos : 0
					});
				}
			}
			this.showEdit(options, o.update);
		} else {
			this.showData(this.intl.resolve("editData", name), data, function(newValue) {
				o.source = newValue;
				if (o.update) o.update();
			});
		}
		return true;
	},
	itemAccessor : {
		json : {
			listItems : function(o) {
				return Object.keys(o);
			},
			getCount : function(o) {
				return this.listItems(o).length;
			},
			isTree : function(o) {
				return o instanceof Object;
			},
			toArrayItemName : function(index) {
				return "#" + (parseInt(index) + 1);
			}
		},
		debug : {
			listItems : function(o) {
				try {
					return Object.getOwnPropertyNames(o);
				} catch(e) {
					return Object.keys(o);
				}
			},
			getCount : function(o) {
				return this.listItems(o).length;
			},
			isTree : function(o) {
				if (o == null) return false;
				if (o instanceof java.lang.CharSequence) return false;
				return typeof o == "object" || typeof o == "function";
			},
			toArrayItemName : function(index) {
				return index;
			}
		}
	},
	showEdit : function self(options, callback) {G.ui(function() {try {
		if (!self.main) {
			self.menuIntl = Intl.getNamespace("jsonEdit.itemMenu");
			self.getHeaderDivider = function(height) {
				var width = Math.floor(height / 2);
				var bmp = G.Bitmap.createBitmap(width, height, G.Bitmap.Config.ARGB_8888);
				var cv = new G.Canvas(bmp);
				var pa = new G.Paint();
				var ph = new G.Path();
				pa.setStrokeCap(G.Paint.Cap.BUTT);
				pa.setStyle(G.Paint.Style.STROKE)
				IntColor.Paint.setColor(pa, Common.theme.promptcolor);
				pa.setStrokeWidth(2);
				pa.setAntiAlias(true);
				ph.moveTo(0, 0);
				ph.lineTo(width, width);
				ph.lineTo(0, height);
				cv.drawPath(ph, pa);
				return new G.BitmapDrawable(ctx.getResources(), bmp);
			}
			self.menu = [{
				text : self.menuIntl.copy,
				onclick : function(v, tag) {
					JSONEdit.clipboard = {
						name : tag.name,
						item : tag.data
					};
					self.refresh();
				}
			}, {
				text : self.menuIntl.cut,
				onclick : function(v, tag) {
					JSONEdit.clipboard = {
						name : tag.name,
						item : tag.data
					};
					if (Array.isArray(tag.src)) {
						tag.src.splice(parseInt(tag.name), 1);
					} else {
						delete tag.src[tag.name];
					}
					self.refresh();
				}
			}, {
				text : self.menuIntl.replace,
				onclick : function(v, tag) {
					JSONEdit.showNewItem(function(newItem) {
						try {
							tag.src[tag.name] = newItem;
						} catch(e) {
							Common.toast(e);
						}
						self.refresh();
					});
				}
			}, {
				text : self.menuIntl.remove,
				onclick : function(v, tag) {
					if (Array.isArray(tag.src)) {
						tag.src.splice(parseInt(tag.name), 1);
					} else {
						delete tag.src[tag.name];
					}
					self.refresh();
				}
			}, {
				text : self.menuIntl.rawEdit,
				onclick : function(v, tag) {
					JSONEdit.showRawEdit(tag.data, function(v) {
						try {
							tag.src[tag.name] = v;
						} catch(e) {
							Common.toast(e);
						}
						self.refresh();
					});
				}
			}];
			self.objMenu = [{
				text : self.menuIntl.rename,
				onclick : function(v, tag) {
					Common.showInputDialog({
						title : self.menuIntl.rename,
						callback : function(s) {
							try {
								tag.src[s] = tag.src[tag.name];
								delete tag.src[tag.name];
							} catch(e) {
								Common.toast(e);
							}
							self.refresh();
						},
						defaultValue : tag.name
					});
				}
			}].concat(self.menu);
			self.arrMenu = [{
				text : self.menuIntl.insertBefore,
				onclick : function(v, tag) {
					JSONEdit.showNewItem(function(newItem) {
						tag.src.splice(parseInt(tag.name), 0, newItem);
						self.refresh();
					});
				}
			}].concat(self.menu);
			self.showItemAction = function(name) {
				var cd = self.currentTree.data, data;
				try {
					data = cd[name];
				} catch(e) {
					Common.toast(e);
				}
				Common.showOperateDialog(Array.isArray(cd) ? self.arrMenu : self.itemAccessor.isTree(cd) ? self.objMenu : obj.menu, {
					name : name,
					src : cd,
					data : data
				});
			}
			self.pathClick = function(v) {
				var i = self.pathbar.indexOfChild(v);
				self.path.splice(i + 1);
				self.refresh();
			}
			self.onBack = function() {
				if (self.path.length > 1) {
					self.path.pop();
					self.refresh();
				} else {
					self.popup.exit();
				}
			}
			self.init = function(options, callback) {
				self.callback = callback;
				self.path = options.path;
				self.itemAccessor = options.itemAccessor;
				self.refresh();
			}
			self.refresh = function() {
				var lbl, i, e, cd, items;
				self.currentTree = self.path[self.path.length - 1];
				cd = self.currentTree.data;
				self.pathbar.removeAllViews();
				for (i in self.path) {
					e = self.path[i];
					lbl = new G.TextView(ctx);
					lbl.setText(String(e.name));
					lbl.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
					lbl.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
					lbl.setOnClickListener(self.pathClick);
					Common.applyStyle(lbl, "item_default", 2);
					self.pathbar.addView(lbl);
				}
				items = self.itemAccessor.listItems(cd);
				//items.sort();
				self.adpt.setArray(items);
				gHandler.post(function() {try {
					self.list.setSelection(self.currentTree.pos);
				} catch(e) {erp(e)}});
			}
			self.showCreate = function() {
				JSONEdit.showNewItem(function(newItem) {
					var data = self.currentTree.data;
					if (Array.isArray(data)) {
						data.push(newItem);
						self.refresh();
					} else if (self.itemAccessor.isTree(data)) {
						Common.showInputDialog({
							title : JSONEdit.intl.inputKeyName,
							callback : function(s) {
								if (!s) {
									Common.toast(JSONEdit.intl.keyNameEmpty);
								} else if (s in data) {
									Common.toast(JSONEdit.intl.keyNameExists);
								} else {
									try {
										data[s] = newItem;
									} catch(e) {
										Common.toast(e);
									}
									self.refresh();
								}
							}
						});
					} else {
						Common.toast(JSONEdit.intl.unableToInsert);
					}
				});
			}
			self.enterTree = function(name, data) {
				if (self.currentTree) {
					self.currentTree.pos = self.list.getFirstVisiblePosition();
				}
				self.path.push({
					name : String(name),
					data : data,
					pos : 0
				});
				self.refresh();
				gHandler.post(function() {try {
					self.hscr.fullScroll(G.View.FOCUS_RIGHT);
				} catch(e) {erp(e)}});
			}
			self.vmaker = function(holder) {
				var hl, vl, name, data, more;
				hl = new G.LinearLayout(ctx);
				hl.setOrientation(G.LinearLayout.HORIZONTAL);
				hl.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				hl.setPadding(20 * G.dp, 10 * G.dp, 20 * G.dp, 10 * G.dp);
				vl = new G.LinearLayout(ctx);
				vl.setOrientation(G.LinearLayout.VERTICAL);
				vl.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2, 1.0));
				vl.getLayoutParams().gravity = G.Gravity.CENTER;
				name = holder.name = new G.TextView(ctx);
				name.setEllipsize(G.TextUtils.TruncateAt.END);
				name.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
				Common.applyStyle(name, "textview_default", 3);
				vl.addView(name);
				data = holder.data = new G.TextView(ctx);
				data.setMaxLines(2);
				data.setEllipsize(G.TextUtils.TruncateAt.END);
				data.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
				Common.applyStyle(data, "textview_prompt", 1);
				vl.addView(data);
				hl.addView(vl);
				more = new G.TextView(ctx);
				more.setText(">");
				more.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
				more.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2, 0));
				more.getLayoutParams().gravity = G.Gravity.CENTER;
				Common.applyStyle(more, "button_secondary", 4);
				more.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
					self.showItemAction(holder.e);
				} catch(e) {erp(e)}}}));
				hl.addView(more);
				return hl;
			}
			self.vbinder = function(holder, e, i, a) {
				var par = self.currentTree.data;
				holder.name.setText(Array.isArray(par) ? self.itemAccessor.toArrayItemName(e) : String(e));
				holder.data.setText(self.getDesp(par, e));
				holder.e = e;
			}
			self.getDesp = function(obj, propertyName) {
				var e;
				try {
					e = obj[propertyName];
					if (Array.isArray(e)) {
						return e.length ? JSONEdit.intl.resolve("arrayDesc", e[0], e.length) : JSONEdit.intl.emptyArrayDesc;
					} else if (e instanceof Object && typeof e !== "function" && !(e instanceof java.lang.CharSequence)) {
						return JSONEdit.intl.resolve("objectDesc", self.itemAccessor.getCount(e));
					} else if (e === null) {
						return JSONEdit.intl.nullDesc;
					} else return String(e);
				} catch(er) {
					Log.e(er);
					return String(er);
				}
			}
			self.adpt = SimpleListAdapter.getController(new SimpleListAdapter([], self.vmaker, self.vbinder, null, true));
			self.main = L.LinearLayout({
				orientation : L.LinearLayout("vertical"),
				children : [
					L.LinearLayout({
						orientation : L.LinearLayout("horizontal"),
						layoutWidth : -1, layoutHeight : -2,
						style : "bar_float",
						children : [
							L.TextView({
								text : "< " + Common.intl.back,
								padding : [10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp],
								layoutWidth : -2, layoutHeight : -2,
								style : "button_critical",
								fontSize : 2,
								onClick : function() {try {
									self.popup.exit();
								} catch(e) {erp(e)}},
								inflate : function(view) {
									view.measure(0, 0);
									self.headerHeight = view.getMeasuredHeight();
								}
							}),
							self.hscr = L.HorizontalScrollView({
								horizontalScrollBarEnabled : true,
								layoutWidth : -1, layoutHeight : -1,
								child : self.pathbar = L.LinearLayout({
									dividerDrawable : self.getHeaderDivider(self.headerHeight),
									showDividers : L.LinearLayout("show_divider_middle"),
									padding : [10 * G.dp, 0, 10 * G.dp, 0],
									layoutWidth : -1, layoutHeight : -1
								})
							})
						]
					}),
					self.list = L.ListView({
						adapter : self.adpt.self,
						style : "message_bg",
						layoutWidth : -1, layoutHeight : -1,
						_headerView : self.create = L.TextView({
							text : JSONEdit.intl.addItem,
							gravity : L.Gravity("center"),
							padding : [20 * G.dp, 20 * G.dp, 20 * G.dp, 20 * G.dp],
							layoutWidth : -1, layoutHeight : -2,
							style : "textview_default",
							fontSize : 3
						}),
						inflate : function(view) {
							view.addHeaderView(this._headerView);
							if (G.style == "Material") {
								view.setVerticalScrollbarPosition(G.View.SCROLLBAR_POSITION_LEFT);
								view.setFastScrollEnabled(true);
								view.setFastScrollAlwaysVisible(false);
							}
						},
						onItemClick : function(parent, view, pos, id) {try {
							if (view == self.create) {
								self.showCreate();
								return true;
							}
							var name = parent.getAdapter().getItem(pos), data;
							try {
								data = self.currentTree.data[name];
							} catch(e) {
								Common.toast(e);
								return;
							}
							if (self.itemAccessor.isTree(data)) {
								self.enterTree(name, data);
							} else if (data != null) {
								JSONEdit.showData(JSONEdit.intl.resolve("editData", name), data, function(newValue) {
									self.path[self.path.length - 1].data[name] = newValue;
									self.refresh();
								});
							}
						} catch(e) {erp(e)}},
						onItemLongClick : function(parent, view, pos, id) {try {
							if (view == self.create) {
								return true;
							}
							self.showItemAction(parent.getAdapter().getItem(pos));
							return true;
						} catch(e) {return erp(e), true}}
					})
				]
			});
			self.popup = new PopupPage(self.main, "jsonedit.Main");
			self.popup.on("back", function(name, cancelDefault) {
				self.onBack();
				cancelDefault();
			});
			self.popup.on("exit", function() {
				if (self.callback) self.callback();
			});
			PWM.registerResetFlag(self, "main");
		}
		self.init(options, callback);
		self.popup.enter();
	} catch(e) {erp(e)}})},
	showData : function(msg, data, callback) {G.ui(function() {try {
		var scr, layout, title, text, ret, exit, popup;
		scr = new G.ScrollView(ctx);
		Common.applyStyle(scr, "message_bg");
		layout = new G.LinearLayout(ctx);
		layout.setOrientation(G.LinearLayout.VERTICAL);
		layout.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 0);
		title = new G.TextView(ctx);
		title.setText(msg);
		title.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2));
		title.setPadding(0, 0, 0, 10 * G.dp);
		Common.applyStyle(title, "textview_default", 4);
		layout.addView(title);
		if (typeof data == "boolean") {
			ret = new G.CheckBox(ctx);
			ret.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2, 0));
			ret.getLayoutParams().setMargins(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp)
			ret.setChecked(data);
			ret.setText(JSONEdit.intl.booleanCheckbox);
		} else {
			ret = new G.EditText(ctx);
			ret.setText(Common.toString(data));
			ret.setSingleLine(false);
			ret.setMinWidth(0.5 * Common.getScreenWidth());
			ret.setLayoutParams(new G.LinearLayout.LayoutParams(-2, 0, 1.0));
			if (typeof data == "number") ret.setInputType(G.InputType.TYPE_CLASS_NUMBER | G.InputType.TYPE_NUMBER_FLAG_SIGNED | G.InputType.TYPE_NUMBER_FLAG_DECIMAL);
			ret.setSelection(ret.length());
			Common.applyStyle(ret, "edittext_default", 2);
			Common.postIME(ret);
		}
		layout.addView(ret);
		exit = new G.TextView(ctx);
		exit.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
		exit.setText(Common.intl.ok);
		exit.setGravity(G.Gravity.CENTER);
		exit.setPadding(10 * G.dp, 20 * G.dp, 10 * G.dp, 20 * G.dp);
		Common.applyStyle(exit, "button_critical", 3);
		exit.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
			var t;
			if (callback) {
				if (typeof data == "boolean") {
					callback(Boolean(ret.isChecked()));
				} else if (typeof data == "number") {
					t = Number(ret.getText());
					if (isFinite(t)) {
						callback(t);
					} else {
						Common.toast(JSONEdit.intl.irregularNumber);
					}
				} else {
					callback(String(ret.getText()));
				}
			}
			popup.exit();
			return true;
		} catch(e) {erp(e)}}}));
		layout.addView(exit);
		scr.addView(layout);
		popup = PopupPage.showDialog("jsonedit.DataEditor", scr, -2, -2);
	} catch(e) {erp(e)}})},
	showRawEdit : function(data, callback) {G.ui(function() {try {
		var frame, layout, title, text, ret, exit, popup, datastr;
		try {
			datastr = JSONEdit.showAll ? MapScript.toSource(data) : JSON.stringify(data, null, 4);
		} catch(e) {
			Log.e(e);
		}
		if (!datastr) {
			Common.toast(JSONEdit.intl.cannotStringify);
			return;
		}
		layout = new G.LinearLayout(ctx);
		layout.setLayoutParams(new G.FrameLayout.LayoutParams(-1, -1, G.Gravity.CENTER));
		layout.setOrientation(G.LinearLayout.VERTICAL);
		layout.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 0);
		Common.applyStyle(layout, "message_bg");
		layout.setOnTouchListener(new G.View.OnTouchListener({onTouch : function touch(v, e) {
			return true;
		}}));
		ret = new G.EditText(ctx);
		ret.setText(datastr);
		ret.setSingleLine(false);
		ret.setGravity(G.Gravity.LEFT | G.Gravity.TOP);
		ret.setLayoutParams(new G.LinearLayout.LayoutParams(-1, 0, 1.0));
		Common.applyStyle(ret, "edittext_default", 2);
		layout.addView(ret);
		exit = new G.TextView(ctx);
		exit.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
		exit.setText(Common.intl.ok);
		exit.setGravity(G.Gravity.CENTER);
		exit.setPadding(10 * G.dp, 20 * G.dp, 10 * G.dp, 20 * G.dp);
		Common.applyStyle(exit, "button_critical", 3);
		exit.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
			var t;
			if (callback) {
				try {
					callback(JSON.parse(ret.getText()));
					popup.exit();
				} catch(e) {
					Common.toast(JSONEdit.intl.resolve("cannotParse", e));
				}
			}
		} catch(e) {erp(e)}}}));
		layout.addView(exit);
		Common.initEnterAnimation(layout);
		popup = new PopupPage(layout, "jsonedit.BatchEdit");
		popup.enter();
	} catch(e) {erp(e)}})},
	showNewItem : function self(callback) {
		if (!self.menu) {
			self.intl = Intl.getNamespace("jsonEdit.type");
			self.menu = [{
				text : self.intl.emptyObject,
				description : self.intl.object_desc,
				onclick : function(v, tag) {
					tag.callback({});
				}
			}, {
				text : self.intl.emptyArray,
				description : self.intl.array_desc,
				onclick : function(v, tag) {
					tag.callback([]);
				}
			}, {
				text : self.intl.string,
				description : self.intl.string_desc,
				onclick : function(v, tag) {
					JSONEdit.showData(JSONEdit.intl.resolve("newValue", self.intl.string), "", function(newValue) {
						tag.callback(newValue);
					});
				}
			}, {
				text : self.intl.number,
				description : self.intl.number_desc,
				onclick : function(v, tag) {
					JSONEdit.showData(JSONEdit.intl.resolve("newValue", self.intl.number), 0, function(newValue) {
						tag.callback(newValue);
					});
				}
			}, {
				text : self.intl.boolean,
				description : self.intl.boolean_desc,
				onclick : function(v, tag) {
					JSONEdit.showData(JSONEdit.intl.resolve("newValue", self.intl.boolean), true, function(newValue) {
						tag.callback(newValue);
					});
				}
			}, {
				text : self.intl.null,
				description : self.intl.null_desc,
				onclick : function(v, tag) {
					tag.callback(null);
				}
			}, {
				gap : G.dp * 10
			}, {
				text : self.intl.clipboard,
				description : self.intl.clipboard_desc,
				onclick : function(v, tag) {
					if (!JSONEdit.clipboard) {
						Common.toast(JSONEdit.intl.emptyClipboard);
						return true;
					}
					tag.callback(Object.copy(JSONEdit.clipboard.item));
				}
			}, {
				text : self.intl.raw,
				description : self.intl.raw_desc,
				onclick : function(v, tag) {
					Common.showInputDialog({
						title : self.intl.manualInput_desc,
						callback : function(s) {
							try {
								tag.callback(JSON.parse(s));
							} catch(e) {
								Common.toast(JSONEdit.intl.resolve("cannotParse", e));
							}
						}
					});
				}
			}];
		}
		Common.showOperateDialog(self.menu, {callback : callback});
	},
	traceGlobal : function() {
		this.show({
			source : eval.call(null, "this"),
			rootname : "Global object",
			showAll : true
		});
	},
	trace : function(obj) {
		this.show({
			source : obj,
			rootname : "Trace",
			showAll : true
		});
	}
});