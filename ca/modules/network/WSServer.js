MapScript.loadModule("WSServer", {
	//Thanks to [jocopa3/PEWS-API](https://github.com/jocopa3/PEWS-API)
	// and [LNSSPsd/MyAgent](https://github.com/LNSSPsd/MyAgent)
	startPort : 19134,
	endPort : 19165,
	conn : null,
	events : new java.util.concurrent.ConcurrentHashMap(8, 0.75, 4),
	responsers : new java.util.concurrent.ConcurrentHashMap(32, 0.75, 16),
	unload : function() {
		if (this.isAvailable()) this.stop();
	},
	isAvailable : function() {
		return this.server != null && this.running;
	},
	isConnected : function() {
		return this.conn != null && this.conn.isOpen();
	},
	build : function(port) {
		this.server = ScriptInterface.createWebSocketHelper(port, {
			onOpen : function(conn, handshake) {try {
				WSServer.onOpen(conn, handshake);
			} catch(e) {erp(e)}},
			onClose : function(conn, code, reason, remote) {try {
				WSServer.onClose(conn, code, reason, remote);
			} catch(e) {erp(e)}},
			onMessage : function(conn, message) {try {
				WSServer.onMessage(conn, message);
			} catch(e) {erp(e)}},
			onError : function(conn, err) {try {
				if (err instanceof java.net.BindException && WSServer.port < WSServer.endPort) {
					Log.e(err);
					Common.toast("在端口" + WSServer.port + "上建立服务器失败，正在尝试其他端口");
					WSServer.port++;
					WSServer.start();
				} else {
					Common.toast("WebSocket服务器出错，连接已终止\n" + err);
					erp(err, true);
					if (this.server) {
						WSServer.stop();
					}
				}
			} catch(e) {erp(e)}},
			onStart : function() {try {
				WSServer.onStart();
			} catch(e) {erp(e)}}
		});
		this.server.setConnectionLostTimeout(-1);
		this.server.setTcpNoDelay(true);
	},
	start : function(silent) {
		if (!this.port) this.port = this.startPort;
		this.conn = null;
		this.silent = silent;
		this.build(this.port);
		this.server.start();
	},
	stop : function() {
		try {
			this.server.stop();
		} catch(e) {
			Common.toast("无法停止WebSocket服务器\n" + e);
			Log.e(e);
		}
		this.server = null;
		this.running = false;
		AndroidBridge.notifySettings();
	},
	onStart : function() {
		if (!this.silent) this.howToUse();
		this.running = true;
		AndroidBridge.notifySettings();
	},
	onOpen : function(conn, handshake) {
		if (this.conn != null) {
			conn.close(1003, "A client has been binded to CA.");
			Common.toast("WebSocket服务器已拒绝设备" + conn.getRemoteSocketAddress() + "连接，因为本设备已经和其他设备连接");
			return;
		}
		this.conn = conn;
		this.events.clear();
		this.responsers.clear();
		Common.toast("设备" + conn.getRemoteSocketAddress() + "已连接");
		AndroidBridge.notifySettings();
		Plugins.emit("WSServer", "connectionOpen");
		MCAdapter.initWSServer();
	},
	onClose : function(conn, code, reason, remote) {
		this.conn = null;
		Common.toast("设备已断开");
		AndroidBridge.notifySettings();
		if (this.showConsole.onClose) this.showConsole.onClose();
		Plugins.emit("WSServer", "connectionClose");
	},
	onMessage : function(conn, message) {
		var json, header;
		try {
			json = JSON.parse(message);
			header = json.header;
			switch (header.messagePurpose) {
				case "event":
				this.onEvent(json);
				break;
				case "commandResponse":
				this.onResponse(json);
				break;
				case "error":
				this.onError(json);
				break;
			}
		} catch(e) {
			erp(e, true, message);
		}
	},
	/**
	 * @callback EventReceiver
	 * 事件回调
	 * @param {Object} body 事件body
	 * @param {Object} message 事件消息
	 */
	onEvent : function(json) {
		var listeners = this.events.get(json.body.eventName), iter, e;
		if (listeners != null) {
			iter = listeners.iterator();
			while (iter.hasNext()) {
				e = iter.next();
				try {
					e(json.body, json);
				} catch(e) {erp(e, true)}
			}
		}
	},
	/**
	 * @callback CommandResponseReceiver
	 * 命令响应回调
	 * @param {Object} body 命令响应body
	 * @param {Object} message 命令响应消息
	 */
	onResponse : function(json) {
		var callback = this.responsers.remove(json.header.requestId);
		if (callback != null) {
			try {
				callback(json.body, json);
			} catch(e) {erp(e, true)}
		}
	},
	onError : function(json) {
		Common.toast("出现错误！错误代码：" + json.body.statusCode + "\n" + json.body.statusMessage);
	},
	howToUse : function() {
		var cmd = this.getConnectCommands();
		Common.showConfirmDialog({
			description : "WebSocket服务器已开启。请在客户端输入以下命令之一来连接到服务器。\n" + cmd.join("\n") + "\n\n用法：\n长按命令助手主界面右下角的按钮可执行主界面输入框中的命令\n\n如果显示无法连接请重启命令助手与Minecraft客户端。",
			buttons : ["复制命令", "关闭"],
			callback : function(i) {
				if (i == 0) {
					Common.showListChooser(cmd, function(i) {
						Common.setClipboardText(cmd[i]);
					}, true);
				}
			}
		});
	},
	getConnectCommands : function() {
		return NetworkUtils.getIps().map(function(e) {
			return "/connect " + e + ":" + WSServer.port;
		});
	},
	uuid : function() {
		return String(java.util.UUID.randomUUID().toString());
	},
	buildHeader : function(purpose) {
		return {
			version : 1,
			requestId : this.uuid(),
			messagePurpose : purpose,
			messageType : "commandRequest"
		};
	},
	/**
	 * 订阅一个事件。
	 * @param {string} name 事件名
	 * @param {EventReceiver} callback 事件回调
	 * @returns {boolean} 服务器是否在线
	 */
	subscribeEvent : function(name, callback) {
		var listeners;
		if (!this.conn || !this.conn.isOpen()) return false;
		listeners = this.events.get(name);
		if (listeners == null) {
			listeners = new java.util.concurrent.CopyOnWriteArrayList();
			this.events.put(name, listeners);
		}
		listeners.add(callback);
		this.conn.send(JSON.stringify({
			header : this.buildHeader("subscribe"),
			body : {
				eventName : name
			}
		}));
		return true;
	},
	/**
	 * 取消订阅一个事件。
	 * @param {string} name 事件名
	 * @param {EventReceiver} callback 事件回调
	 * @returns {boolean} 服务器是否在线
	 */
	unsubscribeEvent : function(name, callback) {
		if (!this.conn || !this.conn.isOpen()) return false;
		var listeners = this.events.get(name);
		if (listeners != null) {
			listeners.remove(callback);
			if (listeners.isEmpty()) {
				this.events.remove(name, listeners);
				this.conn.send(JSON.stringify({
					header : this.buildHeader("unsubscribe"),
					body : {
						eventName : name
					}
				}));
			}
		}
		return true;
	},
	/**
	 * 发送一条命令。
	 * @param {string} cmd 命令，不包括斜杠
	 * @param {CommandResponseReceiver} callback 命令响应回调
	 * @returns {boolean} 服务器是否在线
	 */
	sendCommand : function(cmd, callback) {
		if (!this.conn || !this.conn.isOpen()) return null;
		var json = {
			header : this.buildHeader("commandRequest"),
			body : {
				version : 1,
				commandLine : cmd,
				origin : "player"
			}
		};
		this.responsers.put(json.header.requestId, callback);
		this.conn.send(JSON.stringify(json));
		return json.header.requestId;
	},
	showConsole : function self() {G.ui(function() {try {
		if (!self.main) {
			self.LINE_LIMIT = 200;
			self.history = [];
			self.lines = [];
			self.eventReceiver = {};
			self.vmaker = function(holder) {
				var text = holder.text = new G.TextView(ctx);
				text.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				Common.applyStyle(text, "textview_default", 2);
				return text;
			}
			self.vbinder = function(holder, e, i, a) {
				holder.text.setText(e);
				holder.text.setPadding(10 * G.dp, i == 0 ? 10 * G.dp : 0, 10 * G.dp, i == a.length - 1 ? 10 * G.dp : 0);
			}
			self.cls = function() {
				self.lines.length = 0;
				self.history.length = 0;
				self.lines.push(new G.SpannableStringBuilder());
				self.print("WSServer控制台 - 输入exit以退出", new G.StyleSpan(G.Typeface.BOLD));
				self.ready("exit");
			}
			self.print = function(str, span) {
				var t = self.lines[self.lines.length - 1];
				if (span) {
					appendSSB(t, str, span);
				} else {
					t.append(str);
				}
				gHandler.post(function() {try {
					self.prompt.smoothScrollToPosition(self.lines.length - 1);
				} catch(e) {erp(e)}});
			}
			self.ready = function(cmd) {
				cmd = String(cmd);
				self.history[self.lines.length - 1] = cmd;
				self.lines.push(new G.SpannableStringBuilder());
				if (self.lines.length > self.LINE_LIMIT) {
					self.lines.splice(0, self.lines.length - self.LINE_LIMIT - 1);
					self.history.splice(0, self.history.length - self.LINE_LIMIT - 1);
				}
				self.hiscur = -1;
				self.adapter.notifyChange();
				self.print(">  ", new G.ForegroundColorSpan(Common.theme.highlightcolor));
			}
			self.exec = function(_s) {
				var name, startTime;
				if (_s.toLowerCase() == "exit") {
					self.popup.exit();
					return;
				} else if (_s.toLowerCase() == "cls") {
					self.cls();
					return;
				} else if (_s.toLowerCase() == "close") {
					WSServer.sendCommand("closewebsocket");
				} else if (_s.toLowerCase().startsWith("subscribe ")) {
					name = _s.slice(10);
					WSServer.subscribeEvent(name, self.eventReceiver[name] = function(body) {
						G.ui(function() {try {
							var t = body.eventName;
							delete body.eventName;
							self.print(Log.debug(t, body, 0).join("\n"), new G.ForegroundColorSpan(Common.theme.promptcolor));
							self.ready(null);
						}catch(e){erp(e)}});
					});
					self.print("Event subscribed!");
				} else if (_s.toLowerCase().startsWith("unsubscribe ")) {
					name = _s.slice(12);
					WSServer.unsubscribeEvent(name, self.eventReceiver[name]);
					self.print("Event unsubscribed!");
				} else if (_s.toLowerCase().startsWith("/")) {
					startTime = Date.now();
					WSServer.sendCommand(_s.slice(1), function(body) {
						var timer = Date.now() - startTime;
						G.ui(function() {try {
							self.print("Client responded in " + timer + "ms\n");
							self.print(Log.debug("Command", body, 0).join("\n"));
							self.ready(null);
						}catch(e){erp(e)}});
					});
				} else {
					try {
						var _t = eval(_s);
						self.print(Log.debug("D", _t, 0).join("\n"));
					} catch(_e) {
						self.print(_e + "\n" + _e.stack, new G.ForegroundColorSpan(Common.theme.criticalcolor));
					}
				}
				self.ready(_s);
			}
			self.onClose = function() {
				G.ui(function() {try {
					if (self.popup) self.popup.exit();
				}catch(e){erp(e)}});
			}
			function send(cmd, callback) {
				WSServer.sendCommand(cmd, callback);
			}
			function print(str) {
				self.print(str);
			}
			function println(str) {
				self.print(str + "\n");
			}
			self.adapter = SimpleListAdapter.getController(new SimpleListAdapter(self.lines, self.vmaker, self.vbinder));

			self.main = new G.LinearLayout(ctx);
			self.main.setOrientation(G.LinearLayout.VERTICAL);

			self.bar = new G.LinearLayout(ctx);
			self.bar.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
			self.bar.setOrientation(G.LinearLayout.HORIZONTAL);
			Common.applyStyle(self.bar, "bar_float");

			self.cmd = new G.EditText(ctx);
			self.cmd.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2, 1.0));
			self.cmd.setFocusableInTouchMode(true);
			self.cmd.setPadding(5 * G.dp, 10 * G.dp, 0, 10 * G.dp);
			self.cmd.setImeOptions(G.EditorInfo.IME_FLAG_NO_FULLSCREEN);
			Common.applyStyle(self.cmd, "edittext_default", 3);
			self.bar.addView(self.cmd);
			Common.postIME(self.cmd);

			self.eval = new G.TextView(ctx);
			self.eval.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -1));
			self.eval.setGravity(G.Gravity.CENTER);
			self.eval.setText(">");
			self.eval.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
			Common.applyStyle(self.eval, "button_reactive", 3);
			self.eval.setOnTouchListener(new G.View.OnTouchListener({onTouch : function touch(v, e) {try {
				switch (e.getAction()) {
					case e.ACTION_DOWN:
					Common.applyStyle(v, "button_reactive_pressed", 3);
					break;
					case e.ACTION_CANCEL:
					case e.ACTION_UP:
					Common.applyStyle(v, "button_reactive", 3);
				}
				return false;
			} catch(e) {return erp(e), true}}}));
			self.eval.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
				if (!self.cmd.getText().length()) return;
				var s = String(self.cmd.getText());
				self.print(s);
				self.print("\n");
				self.exec(s);
				self.cmd.setText("");
			} catch(e) {erp(e)}}}));
			self.bar.addView(self.eval);

			self.prompt = new G.ListView(ctx);
			self.prompt.setLayoutParams(new G.LinearLayout.LayoutParams(-1, 0, 1.0));
			self.prompt.setDividerHeight(0);
			Common.applyStyle(self.prompt, "message_bg");
			self.prompt.setOnItemClickListener(new G.AdapterView.OnItemClickListener({onItemClick : function(parent, view, pos, id) {try {
				if (self.history[pos]) {
					self.history[self.lines.length - 1] = String(self.cmd.getText());
					self.cmd.setText(self.history[pos]);
					self.cmd.setSelection(self.cmd.length());
				}
			} catch(e) {erp(e)}}}));
			self.prompt.setOnItemLongClickListener(new G.AdapterView.OnItemLongClickListener({onItemLongClick : function(parent, view, pos, id) {try {
				Common.setClipboardText(self.lines[pos]);
				Common.toast("内容已复制");
				return true;
			} catch(e) {return erp(e), true}}}));
			self.prompt.setAdapter(self.adapter.self);
			self.main.addView(self.prompt);
			self.main.addView(self.bar);

			self.popup = new PopupPage(self.main, "wsserver.Console");

			self.cls();
			PWM.registerResetFlag(self, "main");
		}
		if (!WSServer.isConnected()) return Common.toast("请先连接上WSServer");
		self.popup.enter();
	} catch(e) {erp(e)}})},
});