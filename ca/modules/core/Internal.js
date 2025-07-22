MapScript.loadModule("Internal", (function() {
	const KEY = (function() {
		var obj = Object.create(null);
		Object.freeze(obj);
		return obj;
	})();
	var internalLoading = false;
	var namespaces = {};
	return {
		onCreate : function() {
			internalLoading = true;
		},
		initialize : function() {
			Object.freeze(namespaces);
			internalLoading = false;
		},
		getKey : function() {
			if (internalLoading) return KEY;
		},
		get : function(id, providedKey) {
			if (internalLoading || providedKey === KEY) return namespaces[id];
		},
		add : function(id, namespace) {
			if (!internalLoading) {
				throw new Error("Internal is freezed");
			}
			if (id in namespaces) {
				throw new Error(id + " is occupied");
			}
			namespace["internal"] = namespaces;
			Object.defineProperty(namespaces, id, {
				enumerable : false,
				writable : false,
				configurable : true,
				value : namespace
			});
			return namespace;
		},
		once : function(key, value) {
			return function(providedKey) {
				var val = value;
				value = null;
				if (key !== providedKey) return null; 
				return val;
			}
		}
	};
})());