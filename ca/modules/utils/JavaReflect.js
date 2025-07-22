MapScript.loadModule("JavaReflect", {
	constructor : function(clazz, argTypes) {
		var i, invokeArgs = new Array(argTypes.length), constructor;
		clazz = this.parseClass(clazz);
		for (i = 0; i < argTypes.length; i++) {
			invokeArgs[i] = this.parseClass(argTypes[i]);
		}
		constructor = clazz.getConstructor(invokeArgs);
		return this.toPrimitiveAcceptable(invokeArgs, constructor.newInstance.bind(constructor));
	},
	declaredConstructor : function(clazz, argTypes) {
		var i, invokeArgs = new Array(argTypes.length), constructor;
		clazz = this.parseClass(clazz);
		for (i = 0; i < argTypes.length; i++) {
			invokeArgs[i] = this.parseClass(argTypes[i]);
		}
		constructor = clazz.getDeclaredConstructor(invokeArgs);
		constructor.setAccessible(true);
		return this.toPrimitiveAcceptable(invokeArgs, constructor.newInstance.bind(constructor));
	},
	method : function(clazz, methodName, argTypes) {
		var i, invokeArgs = new Array(argTypes.length), method;
		clazz = this.parseClass(clazz);
		for (i = 0; i < argTypes.length; i++) {
			invokeArgs[i] = this.parseClass(argTypes[i]);
		}
		method = clazz.getMethod(methodName, invokeArgs);
		return this.toPrimitiveAcceptable([clazz].concat(invokeArgs), method.invoke.bind(method));
	},
	declaredMethod : function(clazz, methodName, argTypes) {
		var i, invokeArgs = new Array(argTypes.length), method;
		clazz = this.parseClass(clazz);
		for (i = 0; i < argTypes.length; i++) {
			invokeArgs[i] = this.parseClass(argTypes[i]);
		}
		method = clazz.getDeclaredMethod(methodName, invokeArgs);
		method.setAccessible(true);
		return this.toPrimitiveAcceptable([clazz].concat(invokeArgs), method.invoke.bind(method));
	},
	staticMethod : function(clazz, methodName, argTypes) {
		var i, invokeArgs = new Array(argTypes.length), method;
		clazz = this.parseClass(clazz);
		for (i = 0; i < argTypes.length; i++) {
			invokeArgs[i] = this.parseClass(argTypes[i]);
		}
		method = clazz.getMethod(methodName, invokeArgs);
		if (!java.lang.reflect.Modifier.isStatic(method.getModifiers())) {
			throw new Error("Method is not static");
		}
		return this.toPrimitiveAcceptable(invokeArgs, method.invoke.bind(method, null));
	},
	declaredStaticMethod : function(clazz, methodName, argTypes) {
		var i, invokeArgs = new Array(argTypes.length), method;
		clazz = this.parseClass(clazz);
		for (i = 0; i < argTypes.length; i++) {
			invokeArgs[i] = this.parseClass(argTypes[i]);
		}
		method = clazz.getDeclaredMethod(methodName, invokeArgs);
		method.setAccessible(true);
		if (!java.lang.reflect.Modifier.isStatic(method.getModifiers())) {
			throw new Error("Method is not static");
		}
		return this.toPrimitiveAcceptable(invokeArgs, method.invoke.bind(method, null));
	},
	field : function(clazz, fieldName) {
		var field;
		clazz = this.parseClass(clazz);
		field = clazz.getField(fieldName);
		return {
			get : field.get.bind(field),
			set : this.toPrimitiveAcceptable([field.getType()], field.set.bind(field))
		};
	},
	declaredField : function(clazz, fieldName) {
		var field;
		clazz = this.parseClass(clazz);
		field = clazz.getField(fieldName);
		field.setAccessible(true);
		return {
			get : field.get.bind(field),
			set : this.toPrimitiveAcceptable([field.getType()], field.set.bind(field))
		};
	},
	parseClass : function(type) {
		if (typeof type == "string") {
			try {
				return java.lang.Class.forName(type, true, ctx.getClassLoader());
			} catch(e) {/* Class not found */}
			if (type == "string") return java.lang.Class.forName("java.lang.String");
			if (type == "boolean") return java.lang.Boolean.TYPE;
			if (type == "byte") return java.lang.Byte.TYPE;
			if (type == "char") return java.lang.Character.TYPE;
			if (type == "double") return java.lang.Double.TYPE;
			if (type == "float") return java.lang.Float.TYPE;
			if (type == "int") return java.lang.Integer.TYPE;
			if (type == "long") return java.lang.Long.TYPE;
			if (type == "short") return java.lang.Short.TYPE;
			if (type == "void") return java.lang.Void.TYPE;
			if (type.slice(-2) == "[]") {
				return this.parseArrayDefinition(type);
			}
			if (type.indexOf("$") < 0) {
				return this.guessSubclass(type);
			}
			throw new Error("Unable to parse \"" + type + "\" to class");
		} else if (type instanceof java.lang.Class) {
			return type;
		} else if (type.arrayOf) {
			return this.arrayClass(type.arrayOf, type.dimensions);
		} else {
			return type.getClass();
		}
	},
	parseArrayDefinition : function(str) {
		var start, current, dimensions = 0;
		start = current = str.indexOf("[]");
		while (current < str.length) {
			if (str.slice(current, current + 2) != "[]") {
				throw new Error("Not an array definition");
			}
			dimensions++;
			current += 2;
		}
		return this.arrayClass(str.slice(0, start), dimensions);
	},
	guessSubclass : function(className) {
		var parts = className.split("."), i;
		for (i = parts.length - 1; i > 0; i--) {
			try {
				return java.lang.Class.forName(parts.slice(0, i).join(".") + "$" + parts.slice(i).join("$"), true, ctx.getClassLoader());
			} catch(e) {/* Class not found */}
		}
		throw new Error("Unable to parse \"" + className + "\" to class");
	},
	arrayClass : function(arrayOf, dimensions) {
		var i, str = "[";
		arrayOf = this.parseClass(arrayOf);
		dimensions = parseInt(dimensions);
		if (!(dimensions > 0)) dimensions = 1;
		for (i = 1; i < dimensions; i++) str += "[";
		if (arrayOf.isPrimitive()) {
			if (arrayOf == java.lang.Boolean.TYPE) {
				str += "Z";
			} else if (arrayOf == java.lang.Byte.TYPE) {
				str += "B";
			} else if (arrayOf == java.lang.Character.TYPE) {
				str += "C";
			} else if (arrayOf == java.lang.Double.TYPE) {
				str += "D";
			} else if (arrayOf == java.lang.Float.TYPE) {
				str += "F";
			} else if (arrayOf == java.lang.Integer.TYPE) {
				str += "I";
			} else if (arrayOf == java.lang.Long.TYPE) {
				str += "J";
			} else if (arrayOf == java.lang.Short.TYPE) {
				str += "S";
			} else { // void
				throw new Error("Component type cannot be void");
			}
		} else if (arrayOf.isArray()) {
			str += arrayOf.getName();
		} else {
			str += "L" + arrayOf.getName() + ";";
		}
		return java.lang.Class.forName(str, true, ctx.getClassLoader());
	},
	array : function(arrayOf) {
		var i, args = new Array(arguments.length);
		args[0] = this.parseClass(arrayOf);
		for (i = 1; i < arguments.length; i++) {
			args[i] = arguments[i];
		}
		return java.lang.reflect.Array.newInstance.apply(null, args);
	},
	getPrimitiveWrapper : function(clazz) {
		if (clazz.isPrimitive()) {
			if (clazz == java.lang.Boolean.TYPE) {
				return java.lang.Boolean.valueOf;
			} else if (clazz == java.lang.Byte.TYPE) {
				return java.lang.Byte.valueOf;
			} else if (clazz == java.lang.Character.TYPE) {
				return java.lang.Character.valueOf;
			} else if (clazz == java.lang.Double.TYPE) {
				return java.lang.Double.valueOf;
			} else if (clazz == java.lang.Float.TYPE) {
				return java.lang.Float.valueOf;
			} else if (clazz == java.lang.Integer.TYPE) {
				return java.lang.Integer.valueOf;
			} else if (clazz == java.lang.Long.TYPE) {
				return java.lang.Long.valueOf;
			} else if (clazz == java.lang.Short.TYPE) {
				return java.lang.Short.valueOf;
			} else { // void
				return null;
			}
		} else {
			return null;
		}
	},
	toPrimitiveAcceptable : function(hints, f) {
		var wrappers, self = this;
		if (hints.some(function(e) {
			return e.isPrimitive();
		})) {
			wrappers = hints.map(function(e) {
				return self.getPrimitiveWrapper(e);
			});
			return function() {
				var args = arguments;
				return f.apply(this, wrappers.map(function(wrapper, i) {
					return wrapper != null ? wrapper(args[i]) : args[i];
				}));
			};
		} else {
			return f;
		}
	}
});