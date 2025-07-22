MapScript.loadModule("Plugins", {
	FEATURES : [
		"injectable",
		//基础特性
		
		"observable",
		//可使用this.observe和this.unobserve
		
		"mainMenuAppendable",
		//可使用Plugins.addMenu
		
		"userExpressionMenuAppendable",
		//可使用Plugins.addExpressionMenu
		
		"corePlugin",
		//可使用this.requestLoadAsCore和this.cancelLoadAsCore
		
		"hookMethod"
		//可使用Plugins.hookMethod
		
		//"quickBarAppendable",
		//可使用Plugins.addQuickBar
		
		//"featureAppendable"
		//可使用Plugins.addFeature
	],
	modules : {},
	observers : {
		Plugin : {
			inject : []
		},
		WSServer : {
			connectionOpen : [],
			connectionClose : []
		},
		Custom : {}
	},
	Plugin : {
		get : function() {
			return this.core;
		},
		observe : function(type, target, f) {
			this._parent.registerObserver(this.uuid, type, target, f);
		},
		unobserve : function(type, target, f) {
			this._parent.unregisterObserver(this.uuid, type, target, f);
		},
		feature : function() {
			for (i in arguments) {
				if (this._parent.FEATURES.indexOf(arguments[i]) < 0) Log.throwError(new Error("Require Feature:" + arguments[i]));
			}
		},
		requestLoadAsCore : function() {
			if (this.corePlugin) return false;
			return CA.Library.enableCoreLibrary(this.path);
		},
		cancelLoadAsCore : function() {
			if (!this.corePlugin) return false;
			return CA.Library.enableLibrary(this.path);
		}
	},
	inject : function(f) {
		var o = Object.create(this.Plugin);
		o._parent = this;
		o.path = CA.Library.currentLoadingLibrary;
		o.corePlugin = CA.Library.loadingStatus == "core";
		try {
			o.core = typeof f == "function" ? f.call(o, o) : Object(f);
		} catch(e) {
			o.error = e;
		}
		this.fillInfo(o);
		if (o.uuid in this.modules) {
			return this.modules[o.uuid].info;
		} else {
			this.modules[o.uuid] = o;
			this.emit("Plugin", "inject", o.uuid);
			if (o.init) o.init(o);
			if (o.core.init) o.core.init(o);
			return o.info;
		}
	},
	fillInfo : function(o) {
		if (!o.core) o.core = {};
		if (!o.info) o.info = {};
		if (!o.name) o.name = o.core.name || "未知插件";
		if (!o.description) o.description = o.core.description || "";
		if (!o.author) o.author = o.core.author || "Anonymous";
		if (!o.uuid) o.uuid = o.core.uuid || (o.author + ":" + o.name);
		if (!o.update) o.update = o.core.update || "store";
		if (!Array.isArray(o.version)) o.version = o.core.version || [0];
		if (!Array.isArray(o.require)) o.require = o.core.require || [];
		if (!Array.isArray(o.menu)) o.menu = o.core.menu || [];
		if (o.error) {
			o.menu.unshift({
				text : "查看错误",
				onclick : function() {
					erp(o.error);
				}
			});
			o.name += "[出错]";
		}
		o.info = {
			name : o.name,
			description : o.description,
			author : o.author,
			uuid : o.uuid,
			version : o.version,
			require : o.require,
			update : o.update,
			menu : o.menu,
			noCommand : o.noCommand
		};
		if (!CA.settings.moduleSettings) CA.settings.moduleSettings = {};
		if (!CA.settings.moduleSettings[o.uuid]) CA.settings.moduleSettings[o.uuid] = {};
		o.settings = CA.settings.moduleSettings[o.uuid];
	},
	registerObserver : function(module, type, target, f) {
		var o = this.getObservers(type, target);
		o.push({
			module : module,
			observer : f
		});
	},
	unregisterObserver : function(module, type, target, f) {
		var i, o;
		if (f) {
			o = this.getObservers(type, target);
			for (i = o.length - 1; i >= 0; i--) {
				if (o[i].module == module && o[i].observer == f) {
					o.splice(i, 1);
				}
			}
		} else if (target) {
			o = this.getObservers(type, target);
			for (i = o.length - 1; i >= 0; i--) {
				if (o[i].module == module) o.splice(i, 1);
			}
		} else if (type) {
			o = this.observers[type];
			if (!o) Log.throwError(new Error("Invalid event type: " + type));
			for (i in o) this.unregisterObserver(module, type, i);
		} else {
			o = this.observers;
			for (i in o) this.unregisterObserver(module, i);
		}
	},
	getObservers : function(type, target) {
		var o = this.observers;
		if (!(type in o)) Log.throwError(new Error("Invalid event type: " + type));
		o = o[type];
		if (!o[target]) o[target] = [];
		return o[target];
	},
	emit : function(type, target) {
		var i, o = this.getObservers(type, target), t;
		for (i in o) {
			t = this.modules[o[i].module];
			if (!t) coutinue;
			try {
				o[i].apply(t, arguments);
			} catch(e) {
				try {
					if (t.onError instanceof Function) t.onError(e);
				} catch(e) {erp(e, true)}
			}
		}
	},
	addMenu : function(obj) {
		var i, a = CA.PluginMenu;
		for (i = 0; i < a.length; i++) {
			if (a[i].text == obj.text) {
				return a[i] = obj;
			}
		}
		a.push(obj);
		return obj;
	},
	addExpressionMenu : function(obj) {
		var i, a = CA.PluginExpression;
		for (i = 0; i < a.length; i++) {
			if (a[i].text == obj.text) {
				return a[i] = obj;
			}
		}
		a.push(obj);
		return obj;
	},
	/**
	 * Hook一个某个对象的一个方法。
	 * @types Plugins.hookMethod(obj: object, propName: string, replacement: (this: object, propName: string, oldFunc: function, arguments: Arguments, tag?: any) => any, tag?: any): function;
	 * @param obj {object} 对象
	 * @param propName {string} 对象属性名称
	 * @param replacement {ReplacementFunction} 用于替换原函数的函数
	 * @param [tag] {any} 标记用数据
	 * 
	 * @callback ReplacementFunction
	 * replacement函数会在hook的方法被调用时执行。
	 * 调用时this对象指向调用原方法时的this对象，通常是被hook方法的对象
	 * @param propName {string} 对象属性名称
	 * @param oldFunction {function} 原函数
	 * @param args {Arguments} 调用的参数
	 * @param [tag] {any} 标记用数据
	 *
	 * @example
	 * Plugins.hookMethod(Common, "showTextDialog", function(propName, oldFunc, args) {
	 *     Log.d("Called showTextDialog:" + args[0]);
	 *     return oldFunc.apply(this, args);
	 * });
	 */
	hookMethod : function self(obj, propName, replacement, tag) {
		var oldFunc = obj[propName];
		if (typeof oldFunc != "function") Log.throwError(new Error(propName + " is not a method."));
		if (oldFunc.__hookHelper__ === self) Log.throwError(new Error(propName + " is already hooked."));
		return obj[propName] = Object.defineProperties(function() {
			return replacement.call(obj, propName, oldFunc, arguments, tag);
		}, {
			"__hookHelper__" : { value : self },
			"__hookReplacement__" : { value : replacement },
			"__hookTag__" : { value : tag }
		});
	}
});