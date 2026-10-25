({
	_client: null,
	_queue: [],
	_connecting: false,
	_retry: 0,

	_initConfig: function () {
		var cfg = CA.settings.LogServer;
		if (!cfg) {
			CA.settings.LogServer = cfg = {
				enabled: false,
				address: "ws://192.168.1.145:2333/logserver"
			}
		}
		// 旧版本存的是 http 地址，WebSocketClient 只认 ws/wss
		if (/^http:\/\//.test(cfg.address)) {
			cfg.address = cfg.address.replace(/^http:\/\//, "ws://");
		}
		return cfg;
	},

	_ensure: function (self) {
		if (self._client) return self._client;
		if (self._connecting) return null;
		self._connecting = true;
		try {
			var Helper = Packages.com.huangyx.ca.script.RhinoWebSocketClientHelper;
			var client = new Helper(CA.settings.LogServer.address,
				new Helper.DelegateInterface({
					onOpen: function (obj, hs) {
						self._connecting = false;
						self._retry = 0;
						self._client = obj;
						var queue = self._queue;
						self._queue = [];
						for (var i = 0; i < queue.length; i++) obj.send(queue[i]);
					},
					onMessage: function () { },
					onClose: function () {
						self._client = null;
						self._connecting = false;
						self._scheduleReconnect(self);
					},
					onError: function () {
						self._client = null;
						self._connecting = false;
						self._scheduleReconnect(self);
					}
				})
			);
			// 内置心跳：30 秒内没收到 pong 就判定断线
			client.setConnectionLostTimeout(30);
			client.connect();
		} catch (e) {
			self._connecting = false;
			self._client = null;
		}
		return self._client;
	},

	_scheduleReconnect: function (self) {
		if (!CA.settings.LogServer || !CA.settings.LogServer.enabled) return;
		var delay = Math.min(30000, 2000 * Math.pow(2, self._retry++));
		gHandler.postDelayed(function () {
			if (CA.settings.LogServer.enabled) self._ensure(self);
		}, delay);
	},

	// 内部工具函数：真正发送
	_post: function (level, text) {
		this._initConfig();
		if (!CA.settings.LogServer.enabled) return;
		var body = JSON.stringify({ msg: String(text), level: level, ts: Date.now() });
		var client = this._ensure(this);
		if (client) {
			try {
				client.send(body);
				return;
			} catch (e) {
				this._client = null;
			}
		}
		// 未连接时入队，避免丢日志（上限 200 条）
		if (this._queue.length < 200) this._queue.push(body);
	},

	// 等级快捷方式
	debug: function (t) { this._post("debug", t); },
	info: function (t) { this._post("info", t); },
	warn: function (t) { this._post("warn", t); },
	error: function (t) { this._post("error", t); },

	// 默认 info
	log: function (t) { this.info(t); },

	// 开关切换时重置连接
	reset: function () {
		var client = this._client;
		this._client = null;
		this._connecting = false;
		this._queue = [];
		if (client) {
			try { client.close(); } catch (e) { }
		}
	}
})
