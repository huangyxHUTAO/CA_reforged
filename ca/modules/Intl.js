MapScript.loadModule("Intl", {
	rescache : {},
	getLocales : function() {
		var r, i, a;
		if (android.os.Build.VERSION.SDK_INT >= 24) {
			a = ctx.getResources().getConfiguration().getLocales();
			r = new Array(a.size());
			for (i = 0; i < r.length; i++) {
				r[i] = a.get(i);
			}
			return r;
		} else {
			return [java.util.Locale.getDefault()];
		}
	},
	getData : function(path, root) {
		var i, seg = path.split("."), data = root || this.namespaces;
		for (i = 0; i < seg.length; i++) {
			data = data[seg[i]];
			if (typeof data == "undefined") return undefined;
		}
		return data;
	},
	createNamespace : function(path, root) {
		var i, seg = path.split("."), data = root || this.namespaces;
		for (i = 0; i < seg.length; i++) {
			if (typeof data[seg[i]] == "undefined") {
				data[seg[i]] = Object.create(this.Namespace);
			}
			data = data[seg[i]];
		}
		return data;
	},
	getNamespace : function(path, createIfNotExist) {
		var namespace = this.getData(path);
		if (typeof namespace == "undefined") {
			if (createIfNotExist) {
				namespace = this.createNamespace(path);
			} else {
				return undefined;
			}
		}
		return namespace;
	},
	mapNamespace : function(obj, propertyName, path) {
		var cache;
		Object.defineProperty(obj, propertyName, {
			enumerable: false,
			configurable: true,
			get: function() {
				var data;
				if (!cache) {
					data = Intl.getNamespace(path, true);
					cache = data;
				}
				return cache;
			}
		});
	},
	getRes : function(name) {
		var res, id;
		if (name in this.rescache) return this.rescache[name];
		res = ctx.getResources();
		id = res.getIdentifier(name, "string", "android");
		if (id != 0) {
			return this.rescache[name] = String(res.getString(id));
		} else {
			return undefined;
		}
	},
	resolve : java.lang.String.format,
	get : function(path, root) {
		var entry = Object.create(this.Entry);
		entry.id = path;
		entry.root = root;
		return entry;
	},
	Namespace : {
		get : function(id) {
			return Intl.get(id, this);
		},
		resolve : function(id) {
			var i, args = new Array(arguments.length);
			for (i = 1; i < arguments.length; i++) args[i] = arguments[i];
			args[0] = Intl.getData(id, this);
			return Intl.resolve.apply(Intl, args);
		},
		toString : function() {
			return this.__defaultEntry__;
		}
	},
	Entry : {
		get : function() {
			return Intl.getData(this.id, this.root);
		},
		resolve : function() {
			var i, args = new Array(arguments.length + 1);
			args[0] = this.get();
			for (i = 0; i < arguments.length; i++) args[i + 1] = arguments[i];
			return Intl.resolve.apply(Intl, args);
		},
		toString : function() {
			if (this === Intl.Entry) return "[class Entry]"; 
			return String(this.get());
		}
	},
	mixNamespace : function(o, target) {
		var i, oldValue;
		if (typeof o == "object") {
			for (i in o) {
				oldValue = target[i];
				if (oldValue instanceof this.Namespace) {
					this.mixNamespace(o[i], oldValue);
				} else {
					target[i] = this.cloneNamespace(o[i]);
				}
			}
		} else {
			target.__defaultEntry__ = o;
		}
	},
	cloneNamespace : function(o) {
		var r, i;
		if (typeof o == "object") {
			r = Object.create(this.Namespace);
			for (i in o) {
				r[i] = this.cloneNamespace(o[i]);
			}
			return r;
		} else {
			return o;
		}
	},
	getFitLocaleIndex : function(range) {
		var i, e;
		for (i = 0; i < this.locales.length; i++) {
			e = this.locales[i];
			if (range.language && range.language != e.getLanguage()) continue;
			if (range.country && range.country != e.getCountry()) continue;
			if (range.variant && range.variant != e.getVariant()) continue;
			return i;
		}
		if (range.unspecifiedLang) {
			return this.locales.length;
		} else {
			return -1;
		}
	},
	loadLang : function(range, o, full) {
		var index = this.getFitLocaleIndex(range);
		if (index < 0) return false;
		if (this.currentLocIndex == index) {
			this.mixNamespace(o, this.namespaces);
		} else if (this.currentLocIndex > index || this.currentLocIndex < 0) {
			this.currentLocIndex = index;
			if (full) {
				this.namespaces = this.cloneNamespace(o);
			} else {
				this.namespaces = this.cloneNamespace(this.defaultLang);
				this.mixNamespace(o, this.namespaces);
			}
		} else {
			return false;
		}
		return true;
	},
	lookupLang : function(ranges) {
		var minIndex, minValue = Infinity, v, i;
		for (i in ranges) {
			v = this.getFitLocaleIndex(ranges[i]);
			if (v >= 0 && v < minValue) {
				minIndex = i;
			}
		}
		return minIndex;
	},
	onCreate : function() {
		this.locales = this.getLocales();
		this.currentLocIndex = -1;
	}
});
