MapScript.loadModule("L", (function self(defaultContext) {
	var cx = org.mozilla.javascript.Context.getCurrentContext();
	var scope = eval.call(null, "this");
	var baseClass = java.lang.Class.forName("android.view.View"), groupClass = java.lang.Class.forName("android.view.ViewGroup");
	function UCC(str) {
		return str.slice(0, 1).toUpperCase() + str.slice(1);
	}
	function LCC(str) {
		return str.slice(0, 1).toLowerCase() + str.slice(1);
	}
	var LHolder = {
		get : function(name) {
			return name in this.data ? this.data[name] : this.parent ? this.parent.get(name) : undefined;
		},
		getAsTopLevel : function(name) {
			return this.data[name];
		},
		getData : function() {
			return this.data;
		},
		getChildren : function() {
			var p = this, i, r = [], a;
			while (p) {
				if (p.data.children) {
					a = p.data.children;
					for (i in a) r.push(a[i]);
				} else if (p.data.child) {
					r.push(p.data.child);
				}
				p = p.parent;
			}
			return r;
		},
		flatten : function(target) {
			var i;
			if (!target) target = {};
			if (this.parent) this.parent.flatten(target);
			for (i in this.data) {
				target[i] = this.data[i];
			}
			return target;
		}
	}, LValue = {
		get : function(modelContext) {
			if (this.getter) {
				return this.getter(modelContext.data);
			} else if (this.field) {
				return modelContext.data[this.field];
			} else return modelContext.data;
		},
		fill : function(obj, modelContext) {
			var i, r;
			if (!this.isAbstract(obj)) return obj;
			if (obj instanceof LValue) return obj.get(modelContext);
			if (obj instanceof Array) {
				r = obj.slice();
				for (i = 0; i < obj.length; i++) {
					r[i] = this.fill(obj[i], modelContext);
				}
				return r;
			} else if (obj instanceof Object) {
				r = {};
				for (i in obj) {
					r[i] = this.fill(obj[i], modelContext);
				}
				return r;
			}
			return obj;
		},
		isAbstract : function isAbstract(obj) {
			var i;
			if (obj instanceof LValue) return true;
			if (obj instanceof Object) {
				for (i in obj) {
					if (isAbstract(obj[i])) return true;
				}
			}
			return false;
		}
	};
	function createHolder(data, parent) {
		var o = Object.create(LHolder);
		o.data = data;
		o.parent = parent;
		return o;
	}
	function applyAttributes(source, target, modelContext, ignoreLayout) {
		var i, t, e;
		for (i in source) {
			if (ignoreLayout && i.slice(0, 6) == "layout") continue;
			e = source[i];
			if (modelContext && modelContext.data) {
				e = LValue.fill(e, modelContext);
			} else if (LValue.isAbstract(e)) continue;
			t = "set" + UCC(i);
			if (t in target) {
				if (Array.isArray(e)) {
					target[t].apply(target, e);
				} else {
					target[t](e);
				}
			} else if (i in target && typeof target[i] != "function") {
				target[i] = e;
			}
		}
	}
	function findDeclaredMethod(cls, params, parent) {
		try {
			var method = cls.getDeclaredMethod.apply(cls, params);
			return method;
		} catch(e) {/*Class not found*/}
		if (!parent) parent = java.lang.Object;
		if (cls == java.lang.Object || cls == parent) return null;
		return findDeclaredMethod(cls.getSuperclass(), params, parent);
	}
	function generateDefaultLayoutParams(parent) {
		var method = findDeclaredMethod(parent.getClass(), ["generateDefaultLayoutParams"], android.view.ViewGroup);
		method.setAccessible(true);
		return method.invoke(parent);
	}
	function generateLayoutParams(parent, oldLp) {
		var cls = parent.getClass();
		var checkMethod = findDeclaredMethod(cls, ["checkLayoutParams", android.view.ViewGroup.LayoutParams], android.view.ViewGroup);
		var generateMethod = findDeclaredMethod(cls, ["generateLayoutParams", android.view.ViewGroup.LayoutParams], android.view.ViewGroup);
		checkMethod.setAccessible(true);
		generateMethod.setAccessible(true);
		return checkMethod.invoke(parent, oldLp) ? oldLp : generateMethod.invoke(parent, oldLp);
	}
	function attachLayoutParams(lp, json, modelContext) {
		var prefix = "layout", i, attrs;
		if (json.layout) {
			applyAttributes(json.layout, lp, modelContext);
		} else {
			attrs = {};
			for (i in json) {
				if (i.slice(0, prefix.length) != prefix) continue;
				attrs[LCC(i.slice(prefix.length))] = json[i];
			}
			applyAttributes(attrs, lp, modelContext);
		}
	}
	function calculateLayoutParams(parent, json, modelContext, oldLp) {
		var lp;
		if (json.layoutParams) return json.layoutParams;
		if (json.layout instanceof Function) {
			lp = json.layout(parent, view, modelContext.data);
		} else {
			lp = oldLp ? generateLayoutParams(parent, oldLp) : generateDefaultLayoutParams(parent);
			attachLayoutParams(lp, json, modelContext);
		}
		return lp;
	}
	function applyListeners(source, target, modelContext) {
		var i, t, e, suffix = "Listener";
		for (i in source) {
			e = source[i];
			if (modelContext && modelContext.data) {
				e = LValue.fill(e, modelContext);
			} else if (LValue.isAbstract(e)) continue;
			if (typeof e != "object" && typeof e != "function") continue;
			t = "set" + UCC(i) + suffix;
			if (t in target) {
				target[t](e);
			}
		}
	}
	function attachProperties(view, json, modelContext) {
		applyAttributes(json, view, modelContext, true);
		applyListeners(json, view, modelContext);
	}
	function attach(view, json, modelContext, rootView) {
		var parentJson, i, e, lp;
		parentJson = view.tag;
		view.tag = createHolder(json, parentJson instanceof LHolder ? parentJson : null);
		listener.trigger("beforeAttach", view, view.tag);
		attachProperties(view, json, modelContext);
		if (rootView) {
			view.setLayoutParams(calculateLayoutParams(rootView, json, view.getLayoutParams()));
		}
		if (groupClass.isAssignableFrom(view.getClass())) {
			if (json.children) {
				for (i in json.children) {
					e = json.children[i];
					if (modelContext) {
						lp = calculateLayoutParams(view, e, null);
						e = fromJSON(e, view.getContext(), modelContext);
					} else if (e.tag instanceof LHolder) {
						lp = calculateLayoutParams(view, e.tag.flatten(), e.layoutParams);
					} else {
						lp = e.layoutParams;
					}
					view.addView(e, lp);
				}
			} else if (json.child) {
				e = json.child;
				if (modelContext) {
					lp = calculateLayoutParams(view, e, null);
					e = fromJSON(e, view.getContext(), modelContext);
				} else if (e.tag instanceof LHolder) {
					lp = calculateLayoutParams(view, e.tag.flatten(), e.layoutParams);
				} else {
					lp = e.layoutParams;
				}
				view.addView(e, lp);
			}
		}
		if (json.inflate) json.inflate(view);
		listener.trigger("afterAttach", view, view.tag);
		return view;
	}
	function constructView(clazz, context) {
		var constructor, view;
		if (!baseClass.isAssignableFrom(clazz)) Log.throwError(new Error(clazz + " is not a view class"));
		try {
			constructor = clazz.getConstructor(android.content.Context);
		} catch(e) {/* constructor not found */}
		if (!constructor) Log.throwError(new Error("Unable to construct " + clazz));
		return constructor.newInstance(context);
	}
	function inflate(clazz, context, json, modelContext, rootView) {
		return attach(constructView(clazz, context), json, modelContext, rootView);
	}
	function findConstant(cls, name) {
		var field;
		try {
			field = cls.getField(name);
			if (field) {
				return field.get(null);
			}
		} catch(e) {/* field not found or not static */}
		return undefined;
	}
	function calculateConstant(clazz, exp) {
		var i, r;
		exp = exp.split("|").map(function(e) {
			return findConstant(clazz, e) || findConstant(clazz, e.toUpperCase());
		});
		r = exp[0];
		for (i = 1; i < exp.length; i++) {
			if (r == null) r = 0;
			if (typeof exp[i] == "number") {
				r |= exp[i];
			} else {
				r = r || exp[i];
			}
		}
		return r || 0;
	}
	function fromJSON(json, context, modelContext, rootView) {
		if (json instanceof LValue) {
			json = json.get(modelContext);
		}
		var clazz = json._class, view;
		if (typeof clazz == "string") clazz = java.lang.Class.forName(clazz);
		view = inflate(clazz, context, json, modelContext);
		if (modelContext.holder && "_holderId" in json) modelContext.holder[json._holderId] = view;
		return view;
	}
	var LTemplate = {
		init : function(baseView) {
			var self = this;
			this.context = baseView.getContext();
			this.views = [];
			this.jsons = [];
			this.valueData = {};
			this.srcJson = this.viewToJson(baseView);
			this.jsons.forEach(function(e) {
				var k = self.analyseJson(e);
				if (k) self.valueData[e._holderId] = k;
			});
		},
		create : function(holder, rootView) {
			if (!holder) holder = {};
			var view = fromJSON(this.srcJson, this.context, {
				holder : holder._lHolder = {}
			});
			holder._lTag = view.tag;
			holder._lRoot = view;
			view.tag = holder;
			return view;
		},
		bind : function(viewOrHolder, data, rootView) {
			var holder = viewOrHolder instanceof android.view.View ? viewOrHolder.tag : viewOrHolder, vholder;
			var i, modelContext = { data : data }, filledJson, filledHolder;
			vholder = holder._lHolder;
			for (i in this.valueData) {
				filledJson = LValue.fill(this.valueData[i], modelContext);
				filledHolder = createHolder(filledJson, vholder[i].tag instanceof LHolder ? vholder[i].tag : holder._lRoot == vholder[i] ? holder._lTag : createHolder(this.jsons[i], null));
				listener.trigger("beforeAttach", vholder[i], filledHolder);
				attachProperties(vholder[i], filledJson);
				filledJson = filledHolder.flatten();
				if (vholder[i].layoutParams) {
					attachLayoutParams(vholder[i].layoutParams, filledJson);
				} else if (rootView) { 
					vholder[i].layoutParams = calculateLayoutParams(rootView, filledJson, modelContext);
				}
				listener.trigger("afterAttach", vholder[i], filledHolder);
			}
			return viewOrHolder;
		},
		makeView : function(data, rootView) {
			var holder = {}, r = this.create(holder);
			this.bind(holder, data, rootView);
			r.tag = holder._lTag;
			return r;
		},
		viewToJson : function(view) {
			if (view instanceof LValue) return view;
			var holder = view.tag, self = this;
			if (!(holder instanceof LHolder)) Log.throwError(new Error(holder + " is not a LHolder"));
			var json = holder.flatten(), i;
			delete json.child;
			json.children = holder.getChildren().map(function(e) {
				return self.viewToJson(e);
			});
			json._holderId = this.views.length;
			json._class = String(view.getClass().getName());
			this.views.push(view);
			this.jsons.push(json);
			return json;
		},
		analyseJson : function(json) {
			var i, a, r = {}, hasAbstractKey = false;
			a = Object.keys(json);
			for (i = 0; i < a.length; i++) {
				if (a[i] == "child" || a[i] == "children") continue;
				if (LValue.isAbstract(json[a[i]])) {
					hasAbstractKey = true;
					r[a[i]] = json[a[i]];
					delete json[a[i]];
				}
			}
			if (hasAbstractKey) return r;
		}
	};
	var listener = EventSender.init({listener : {}});
	var kv = {
		__noSuchMethod__ : function(name) {
			throw new Error(name + " is not a function, it is undefined.");
		},
		attach : attach,
		inflate : inflate,
		Template : function(view) {
			var o = Object.create(LTemplate);
			o.init(view);
			return o;
		},
		Value : function(f) {
			var o = Object.create(LValue);
			if (f instanceof Function) {
				o.getter = f;
			} else {
				o.field = f;
			}
			return o;
		},
		on : listener.on.bind(listener),
		off : listener.off.bind(listener),
		clearListeners : listener.clearListeners.bind(listener),
		withContext : function(context) {
			return self(context);
		},
		asClass : function self(clazz) {
			return clazz(self);
		}
	};
	var LView = kv.Class = function(clazz, json) {try {
		var r;
		if (typeof clazz == "string") clazz = java.lang.Class.forName(clazz);
		if (typeof json == "function") {
			if (json == kv.asClass) {
				return cx.getWrapFactory().wrapJavaClass(cx, scope, clazz);
			}
			return kv.Class(clazz, json.call(kv));
		} else if (typeof json == "object") { // view builder
			return inflate(clazz, defaultContext, json, null);
		} else if (typeof json == "string") { // constant
			return calculateConstant(clazz, json);
		} else if (typeof json == "undefined") { // no parameter view builder
			return inflate(clazz, defaultContext, {}, null);
		}
	} catch(e) {
		Log.e(e);
		throw e;
	}}
	function wrapViewClass(cls) {
		return LView.bind(kv, cls);
	}
	function withCallback(defaultValue, f) {
		var result = undefined;
		f(function(newValue) {
			result = newValue;
		});
		return result;
	}
	var pprefix = [
		"android.widget.",
		"android.view.",
		"android.view.animation",
		"android.animation.",
		"android.app.",
		"android.content.",
		"android.graphics.",
		"android.graphics.drawable.",
		"android.media.",
		"android.os.",
		"android.text.",
		"android.text.format.",
		"android.text.method.",
		"android.text.style.",
		"android.view.inputmethod.",
		"android.webkit."
	];
	function peekClass(name) {
		var i, forName = java.lang.Class.forName;
		for (i in pprefix) {
			try {return forName(pprefix[i] + name)} catch(e) {}
		}
		return undefined;
	}
	var r = new org.mozilla.javascript.Scriptable({
		delete : function(name) {
			delete kv[name];
		},
		get : function(name, start) {
			var cls;
			if (name in kv) return kv[name];
			cls = withCallback(null, function(consumer) {
				listener.trigger("pickClass", consumer);
			});
			if (!cls) {
				cls = peekClass(name);
			}
			if (!cls) return undefined;
			return kv[name] = wrapViewClass(cls);
		},
		getClassName : function() {
			return "Proxy_L";
		},
		getDefaultValue : function(hint) {
			return kv;
		},
		getIds : function() {
			return Object.keys(kv);
		},
		getParentScope : function() {
			return scope;
		},
		getPrototype : function() {
			return kv;
		},
		has : function(name, start) {
			return name in kv;
		},
		hasInstance : function(instance) {
			return false;
		},
		put : function(name, start, value) {
			kv[name] = value;
		},
		setParentScope : function(scope) {},
		setPrototype : function(protptype) {}
	});
	return cx.toObject(r, scope);
})(ctx));