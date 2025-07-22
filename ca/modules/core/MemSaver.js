MapScript.loadModule("MemSaver", {
	lru : [],
	onCreate : function() {
		this.trimFunction = this.trimProto.bind(null, Function.prototype);
	},
	cache : function(target, onTrimMemory) {
		target.__lru_onTrim__ = onTrimMemory;
		if (this.lru.lastIndexOf(target) < 0) this.lru.push(target);
	},
	accessStart : function(target) {
		var i;
		target.__lru_accessing__ = true;
		i = this.lru.lastIndexOf(target);
		if (i >= 0) {
			this.bringToEnd(i);
		} else {
			this.cache(target);
		}
	},
	accessEnd : function(target) {
		target.__lru_accessing__ = false;
		if (this.needTrim()) this.startTrim();
	},
	startTrim : function () {
		var i, a = this.lru;
		for (i = a.length - 1; i >= 0; i--) {
			if (!a[i].__lru_accessing__) {
				if (a[i].__lru_onTrim__ && a[i].__lru_onTrim__(a[i])) a.splice(i, 1);
			}
		}
	},
	needTrim : function() {
		return false;
	},
	trimProto : function(proto, obj) {
		var a = Object.getOwnPropertyNames(obj), i;
		for (i = 0; i < a.length; i++) {
			if (a[i] in proto) continue;
			delete obj[a[i]];
		}
	},
	bringToEnd : function(index) {
		var a = this.lru;
		var i, t = a[index];
		for (i = index + 1; i < a.length; i++) a[i - 1] = a[i];
		a[a.length - 1] = t;
	}
});