MapScript.loadModule("NetworkUtils", {
	queryPage : function(url) {
		return this.request(url, "GET");
	},
	postPage : function(url, data, headers) {
		return this.request(url, "POST", data, headers);
	},
	request : function(url, method, data, headers) {
		var url = new java.net.URL(url);
		var conn = url.openConnection(), i;
		conn.setConnectTimeout(5000);
		conn.setUseCaches(false);
		conn.setRequestMethod(method);
		if (data) {
			conn.setDoInput(true);
			conn.setDoOutput(true);
		}
		if (headers) {
			if (headers instanceof Object) {
				for (i in headers) {
					conn.setRequestProperty(i, headers[i]);
				}
			} else {
				conn.setRequestProperty("Content-Type", headers);
			}
		}
		var rd, s, ln, err;
		try {
			conn.connect();
			if (data) {
				var wr = conn.getOutputStream();
				wr.write(new java.lang.String(data).getBytes());
				wr.flush();
			}
			rd = new java.io.BufferedReader(new java.io.InputStreamReader(conn.getInputStream()));
			s = [];
			while (ln = rd.readLine()) s.push(ln);
			rd.close();
			return s.join("\n");
		} catch(e) {
			try {
				rd = conn.getErrorStream();
			} catch(er) {
				throw e;
			}
			err = this.RequestError.create(e);
			err.responseCode = conn.getResponseCode();
			err.responseMessage = String(conn.getResponseMessage());
			s = [];
			if (rd) {
				rd = new java.io.BufferedReader(new java.io.InputStreamReader(rd));
				while (ln = rd.readLine()) s.push(ln);
				rd.close();
			}
			err.errorMessage = s.join("\n");
			throw err;
		}
	},
	download : function(url, path) {
		const BUFFER_SIZE = 8192;
		var url = new java.net.URL(url);
		var conn = url.openConnection();
		conn.setConnectTimeout(5000);
		conn.setUseCaches(false);
		conn.setRequestMethod("GET");
		conn.connect();
		var is, os, buf, hr;
		is = conn.getInputStream();
		os = new java.io.FileOutputStream(path);
		buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, BUFFER_SIZE);
		while ((hr = is.read(buf)) > 0) os.write(buf, 0, hr);
		os.close();
		is.close();
	},
	downloadGz : function(url, path, sha1) {
		const BUFFER_SIZE = 8192;
		var url = new java.net.URL(url);
		var conn = url.openConnection();
		conn.setConnectTimeout(5000);
		conn.setUseCaches(false);
		conn.setRequestMethod("GET");
		conn.connect();
		var is, os, buf, hr, digest;
		digest = java.security.MessageDigest.getInstance("SHA-1");
		is = new java.util.zip.GZIPInputStream(new java.security.DigestInputStream(conn.getInputStream(), digest));
		os = new java.io.FileOutputStream(path);
		buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, BUFFER_SIZE);
		while ((hr = is.read(buf)) > 0) os.write(buf, 0, hr);
		os.close();
		is.close();
		return android.util.Base64.encodeToString(digest.digest(), android.util.Base64.NO_WRAP) == sha1;
	},
	verifyFile : function(path, sha1) {
		const BUFFER_SIZE = 8192;
		var is, digest, buf, hr;
		digest = java.security.MessageDigest.getInstance("SHA-1");
		is = new java.io.FileInputStream(path);
		buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, BUFFER_SIZE);
		while ((hr = is.read(buf)) > 0) digest.update(buf, 0, hr);
		is.close();
		return android.util.Base64.encodeToString(digest.digest(), android.util.Base64.NO_WRAP) == sha1;
	},
	toQueryString : function(obj) {
		var i, r = [];
		for (i in obj) {
			if (obj[i] == undefined) continue;
			r.push(i + "=" + encodeURIComponent(obj[i]));
		}
		return r.join("&");
	},
	getIps : function() {
		var ni = Common.iterableToArray(java.net.NetworkInterface.getNetworkInterfaces());
		var i, e, ips = [];
		for (i = 0; i < ni.length; i++) {
			e = Common.iterableToArray(ni[i].getInetAddresses());
			for (j = 0; j < e.length; j++) {
				ip = e[j];
				if (ip instanceof java.net.Inet4Address) {
					ips.push(ip.getHostAddress());
				}
			}
		}
		return ips;
	},
	RequestError : (function() {
		var o = Object.create(Error.prototype);
		o.toString = function() {
			return [
				"RequestError: " + this.responseCode + " " + this.responseMessage,
				this.errorMessage,
				this.error
			].join("\n");
		}
		o.create = function(err) {
			var r = Object.create(this);
			r.error = err;
			r.message = err.message;
			r.stack = err.stack;
			return r;
		}
		return o;
	})(),
	requestApi : function(method, url) {
		var regexp = /:(\w+)/g, argCount = arguments.length, argIndex = 2;
		var params, foundParam, query, content, result;
		if (regexp.test(url) && argIndex < argCount) {
			foundParam = false;
			params = arguments[argIndex];
			url = url.replace(regexp, function(match, key) {
				if (key in params) {
					foundParam = true;
					return encodeURIComponent(params[key]);
				} else {
					return match;
				}
			});
			if (foundParam) argIndex++;
		}
		if (method == "GET" || method == "HEAD" || method == "DELETE") {
			query = arguments[argIndex];
		} else {
			if (argCount - argIndex > 1) {
				query = arguments[argIndex];
				argIndex++;
			}
			content = arguments[argIndex];
		}
		if (query) {
			url += "?" + this.toQueryString(query);
		}
		try {
			//Log.d(method + " " + url + "\n" + JSON.stringify(content, null, 4));
			result = JSON.parse(NetworkUtils.request(
				url,
				method,
				content ? JSON.stringify(content) : null,
				content ? "application/json" : null
			));
			//Log.d(JSON.stringify(result, null, 4));
		} catch(e) {
			//Log.d(e);
			throw NetworkUtils.parseError(e);
		}
		return result.result;
	},
	parseError : function(e) {
		var json, message;
		if (!e.errorMessage) return e;
		if (e.responseCode == 500) {
			return "内部错误";
		} else if (e.responseCode == 503) {
			return "服务不可用";
		}
		try {
			json = JSON.parse(e.errorMessage);
		} catch(err) {/* Not a json */}
		if (!json) return e;
		message = this.errorMessages[json.error];
		if (!message) {
			message = "未知错误(" + json.error + ")\n" + json;
		}
		return message;
	},
	addErrorMessages : function(messages) {
		var i;
		for (i in messages) {
			this.errorMessages[i] = messages[i];
		}
	},
	connectWSEvent : function(uri, listeners) {
		if (typeof ScriptInterface != "object") {
			return null;
		}
		var wsInterface, wsClient = ScriptInterface.createWSClient(uri, {
			onOpen : function(thisObj, handshake) {try {
				wsInterface.available = true;
				if (listeners.onOpen) listeners.onOpen(wsInterface);
			} catch(e) {erp(e)}},
			onClose : function(thisObj, code, reason, remote) {try {
				wsInterface.available = false;
				if (listeners.onClose) listeners.onClose(wsInterface, code, reason, remote);
			} catch(e) {erp(e)}},
			onMessage : function(thisObj, message) {try {
				var json;
				try {
					json = JSON.parse(message);
					if (typeof json != "object") throw null;
				} catch(e) {
					wsInterface.sendError("wsevent.invalidFormat");
					wsClient.close();
					return;
				}
				switch (json.type) {
					case "event":
					if (listeners.onEvent) listeners.onEvent(wsInterface, json.name, json.data);
					break;
					case "command":
					if (listeners.onCommand) listeners.onCommand(wsInterface, json.requestId, json.name, json.data);
					break;
					case "command_response":
					if (listeners.onCommandResponse) listeners.onCommandResponse(wsInterface, json.requestId, json.data);
					break;
					case "ping":
					wsInterface.sendPong(json.time);
					break;
					case "pong":
					if (listeners.onPingPong) listeners.onPingPong(wsInterface, (android.os.SystemClock.uptimeMillis() - time) / 1000);
					break;
					default:
					wsInterface.sendError("wsevent.invalidType");
				}
			} catch(e) {erp(e)}},
			onError : function(thisObj, err) {try {
				if (listeners.onError) listeners.onError(wsInterface, err);
			} catch(e) {erp(e)}}
		});
		wsInterface = {
			sendRaw : function() {
				wsClient.send(JSON.stringify(json));
			},
			sendEvent : function(eventName, data) {
				wsInterface.sendRaw({
					type : "event",
					name : eventName,
					data : data
				});
			},
			sendCommand : function(requestId, commandName, data) {
				wsInterface.sendRaw({
					type : "command",
					requestId : requestId,
					name : commandName,
					data : data
				});
			},
			sendCommandResponse : function(requestId, data) {
				wsInterface.sendRaw({
					type : "command_response",
					requestId : requestId,
					data : data
				});
			},
			sendError : function(error, data) {
				wsInterface.sendRaw({
					type : "error",
					error : error,
					data : data
				});
			},
			sendPing : function() {
				wsInterface.sendRaw({
					type : "ping",
					time : android.os.SystemClock.uptimeMillis()
				});
			},
			sendPong : function(time) {
				wsInterface.sendRaw({
					type : "pong",
					time : time
				});
			},
			close : function() {
				wsClient.close();
			},
			client : wsClient,
			listeners : listeners,
			available : false
		};
		wsClient.connect();
		return wsInterface;
	},
	onCreate : function() {
		Object.defineProperty(this, "errorMessages", {
			enumerable: false,
			configurable: false,
			writable: false,
			value: Object.create(null)
		});
	},
	urlBase : {
		api : "https://ca.projectxero.top",
		ws : "wss://ca.projectxero.top"
	}
});