MapScript.loadModule("DBSettings", {
	dbFile: "settings.db",
	db: null,
	onCreate() {
		// const file = new java.io.File(ctx.getDir("rhino", 0), this.dbFile);
		const file = new java.io.File(ExternalStorage.getAppSpecificDirectory("settings"), this.dbFile);
		try {
			this.db = android.database.sqlite.SQLiteDatabase.openOrCreateDatabase(file, null);
		} catch(err) {
			erp(err);
			this.db = android.database.sqlite.SQLiteDatabase.create(null);
		}
		this.transaction(() => {
			const dbVersion = this.db.getVersion();
			if (dbVersion < 1) {
				this.createVersionStore();
				this.db.setVersion(1);
			}
		});
	},
	transaction(f) {
		this.db.beginTransaction();
		try {
			f();
			this.db.setTransactionSuccessful();
		} finally {
			this.db.endTransaction();
		}
	},
	objectToContentValues(obj) {
		const keys = Object.keys(obj);
		const ret = new android.content.ContentValues(keys.length);
		keys.forEach((k) => {
			if (typeof obj[k] == "number") {
				ret.put(k, new java.lang.Double(obj[k]));
			} else {
				ret.put(k, obj[k]);
			}
		});
		return ret;
	},
	readCursorRow(cursor) {
		const ret = {};
		const columnNames = cursor.getColumnNames();
		let columnType, columnValue = undefined;
		for (let i = 0; i < columnNames.length; i++) {
			columnType = cursor.getType(i);
			if (columnType == 0) { // FIELD_TYPE_NULL
				columnValue = null;
			} else if (columnType == 1) { // FIELD_TYPE_INTEGER
				columnValue = new java.lang.Long(cursor.getLong(i));
			} else if (columnType == 2) { // FIELD_TYPE_FLOAT
				columnValue = cursor.getDouble(i);
			} else if (columnType == 3) { // FIELD_TYPE_STRING
				columnValue = cursor.getString(i);
			} else if (columnType == 4) { // FIELD_TYPE_BLOB
				columnValue = cursor.getBlob(i);
			}
			ret[columnNames[i]] = columnValue;
		}
		return ret;
	},
	readCursorOnce(cursor) {
		if (cursor.moveToFirst()) {
			return this.readCursorRow(cursor);
		}
		return null;
	},
	readCursorAll(cursor) {
		const ret = new Array(cursor.getCount());
		cursor.moveToPosition(-1);
		while (cursor.moveToNext()) {
			ret[cursor.getPosition()] = this.readCursorRow(cursor);
		}
		return ret;
	},
	forEachColumn(cursor, f) {
		cursor.moveToPosition(-1);
		let column;
		while (cursor.moveToNext()) {
			column = this.readCursorRow(cursor);
			f(column, cursor.getPosition(), cursor);
		}
	},
	escapeIdentifier(identifier) {
		return '"' + identifier.replace(/"/g, '""') + '"';
	},
	buildColumnDefinition(statement, key, value) {
		statement.push(this.escapeIdentifier(key));
		if (typeof value == "object" && value != null) {
			if (value.type) {
				statement.push(" " + value.type.toUpperCase());
			}
			if (value.primaryKey) {
				statement.push(" PRIMARY KEY");
				if (value.autoIncrement) {
					statement.push(" AUTOINCREMENT");
				}
			}
			if (value.unique) {
				statement.push(" UNIQUE");
			}
			if (value.notNull) {
				statement.push(" NOT NULL");
			}
		} else if (typeof value == "string") {
			statement.push(" " + value.toUpperCase());
		}
	},

	BlobType: Packages["[B"],
	// Android do not enforce identifier escapes, so use custom execSql
	prepareSql(statement) {
		const sql = [], args = [];
		let i, j, part;
		if (Array.isArray(statement)) {
			for (i = 0; i < statement.length; i++) {
				part = statement[i];
				if (Array.isArray(part)) {
					sql.push(part[0]);
					for (j = 1; j < part.length; j++) {
						args.push(part[j]);
					}
				} else {
					sql.push(part);
				}
			}
		} else {
			sql.push(statement);
		}
		return [sql.join(""), args];
	},
	compileSQL(statement) {
		const [sql, args] = this.prepareSql(statement);
		let i, arg;
		const stmt = this.db.compileStatement(sql);
		for (i = 1; i <= args.length; i++) {
			arg = args[i - 1];
			if (arg == null) {
				stmt.bindNull(i);
			} else if (typeof arg == "number") {
				stmt.bindDouble(i, arg);
			} else if (typeof arg == "boolean") { // Will cast to 0l or 1l
				stmt.bindLong(i, arg ? 1 : 0);
			} else if (arg instanceof java.lang.Long) {
				stmt.bindLong(i, arg);
			} else if (arg instanceof this.BlobType) {
				stmt.bindBlob(i, arg);
			} else {
				stmt.bindString(i, String(arg));
			}
		}
		return stmt;
	},
	doQuery(statement) {
		const [sql, args] = this.prepareSql(statement);
		return this.db.rawQuery(sql, args);
	},
	createStore(name, fields, throwIfExists) {
		const statement = [];
		statement.push("CREATE TABLE ");
		if (!throwIfExists) {
			statement.push("IF NOT EXISTS ");
		}
		statement.push(this.escapeIdentifier(name));
		statement.push("(");
		Object.entries(fields).forEach((entry, i) => {
			if (i > 0) {
				statement.push(",");
			}
			this.buildColumnDefinition(statement, entry[0], entry[1]);
		});
		statement.push(")");
		this.compileSQL(statement).execute();
	},
	deleteStore(name, ignoreIfExists) {
		const statement = [];
		statement.push("DROP TABLE ");
		if (ignoreIfExists) {
			statement.push("IF EXISTS ");
		}
		statement.push(this.escapeIdentifier(name));
		this.compileSQL(statement).execute();
	},
	renameStore(oldName, newName) {
		const statement = [];
		statement.push("ALTER TABLE ");
		statement.push(this.escapeIdentifier(oldName));
		statement.push(" RENAME TO ");
		statement.push(this.escapeIdentifier(newName));
		this.compileSQL(statement).execute();
	},
	migrateStore(name, changes) {
		Object.entries(changes).forEach((entry) => {
			const key = entry[0], value = entry[1];
			const statement = [];
			statement.push("ALTER TABLE ");
			statement.push(this.escapeIdentifier(name));
			if (value == null) {
				statement.push(" DROP ");
				statement.push(this.escapeIdentifier(key));
			} else if (typeof value == "string") {
				statement.push(" RENAME ");
				statement.push(this.escapeIdentifier(key));
				statement.push(" TO ");
				statement.push(this.escapeIdentifier(value));
			} else if (typeof value == "object") {
				statement.push(" ADD ");
				this.buildColumnDefinition(statement, key, value);
			}
			this.compileSQL(statement).execute();
		});
	},
	isStoreExists(name) {
		const statement = [[
			"SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?",
			name
		]];
		return this.compileSQL(statement).simpleQueryForLong() > 0;
	},
	clearStore(name) {
		return this.deleteItems({ store: name });
	},
	queryItems(options) {
		const statement = [];
		statement.push("SELECT ");
		if (options.distinct) {
			statement.push("DISTINCT ");
		}
		if (options.fields) {
			let escapedFields;
			if (Array.isArray(options.fields)) {
				escapedFields = options.fields.map((e) => this.escapeIdentifier(e));
			} else {
				escapedFields = Object.entries(options.fields).map((e) => {
					return e[1] + " AS " + this.escapeIdentifier(e[0]);
				});
			}
			statement.push(escapedFields.join(","));
		} else {
			statement.push("*");
		}
		statement.push(" FROM ", this.escapeIdentifier(options.store));
		if (options.selection) {
			statement.push(" WHERE ", options.selection);
		}
		if (options.groupBy) {
			statement.push(" GROUP BY ", options.groupBy);
			if (options.having) {
				statement.push(" HAVING ", options.having);
			}
		}
		if (options.orderBy) {
			statement.push(" ORDER BY ", options.orderBy);
		}
		if (options.limit) {
			statement.push(" LIMIT ", options.limit);
		}
		return this.doQuery(statement);
	},
	ConflictAlgorithm: {
		none: "",
		rollback: " OR ROLLBACK",
		abort: " OR ABORT",
		fail: " OR FAIL",
		ignore: " OR IGNORE",
		replace: " OR REPLACE"
	},
	putItems(options) {
		const statement = [];
		statement.push("INSERT");
		statement.push(this.ConflictAlgorithm[options.onConflict || "none"]);
		statement.push(" INTO ")
		statement.push(this.escapeIdentifier(options.store));
		statement.push("(");
		const items = options.items;
		const keys = Object.keys(items[0]);
		keys.forEach((k, i) => {
			if (i > 0) {
				statement.push(",");
			}
			statement.push(this.escapeIdentifier(k));
		});
		statement.push(") VALUES ");
		items.forEach((item, i) => {
			if (i > 0) {
				statement.push(",");
			}
			statement.push("(");
			keys.forEach((k, j) => {
				if (j > 0) {
					statement.push(",");
				}
				statement.push(["?", item[k]]);
			});
			statement.push(")");
		});
		return this.compileSQL(statement).executeInsert();
	},
	setItem(options) {
		return this.putItems({
			store: options.store,
			items: [options.item],
			onConflict: "replace"
		});
	},
	updateItems(options) {
		const statement = [];
		statement.push("UPDATE");
		statement.push(this.ConflictAlgorithm[options.onConflict || "none"]);
		statement.push(this.escapeIdentifier(options.store));
		statement.push(" SET ");
		const changes = options.changes;
		Object.keys(changes).forEach((k, i) => {
			if (i > 0) {
				statement.push(",");
			}
			statement.push(this.escapeIdentifier(k));
			statement.push(["=?", changes[k]]);
		});
		if (options.selection) {
			statement.push(" WHERE ", options.selection);
		}
		return this.compileSQL(statement).executeUpdateDelete();
	},
	deleteItems(options) {
		const statement = [];
		statement.push("DELETE FROM ");
		statement.push(this.escapeIdentifier(options.store));
		if (options.selection) {
			statement.push(" WHERE ", options.selection);
		}
		return this.compileSQL(statement).executeUpdateDelete();
	},
	checkFieldType(value) {
		const type = typeof value;
		if (type == "object" && (value == null || value instanceof this.BlobType)) {
			return;
		}
		if (type == "object"
			|| type == "undefined"
			|| type == "bigint"
			|| type == "symbol"
			|| type == "function") {
			throw new Error("DBSettings cannot storage " + type);
		}
	},

	createVersionStore() {
		this.createStore("version", {
			store_name: { type: "text", primaryKey: true },
			version: "int"
		});
	},
	getStoreVersion(name) {
		const cursor = this.queryItems({
			store: "version",
			fields: ["version"],
			selection: ["store_name = ?", name],
			limit: "1",
		});
		const ret = this.readCursorOnce(cursor);
		return ret ? ret.version : 0;
	},
	setStoreVersion(name, version) {
		this.setItem({
			store: "version",
			item: {
				store_name: name,
				version: version
			}
		});
	},
	deleteStoreWithVersion(name) {
		this.deleteStore(name);
		this.deleteItems({
			store: "version",
			selection: ["store_name = ?", name]
		});
	},

	getUndefinedInstance(cx, scope) {
    try {
        var u = com.xero.ca.script.WrappedUndefined.get(cx, scope);
        if (u) return u;
    } catch(e) {
        // 类不存在，用 Rhino 内置的兜底
    }
    return org.mozilla.javascript.Undefined.instance;
},
	createProxy(target, handler) {
		// Rhino 1.9 起内置了 ES6 Proxy（全局 Proxy，实现是 NativeProxy），
		// 1.7 没有，所以当年只能用 Scriptable 手写一套 trap 模拟。
		// 有原生 Proxy 就走它：语义标准、少两百行代码、数组/JSON.stringify 等都正常；
		// 拿不到（旧版 Rhino）再退回下面的手写实现。
		if (typeof Proxy == "function") {
			var traps = {};
			if (handler.get) {
				traps.get = function(t, k, r) {
					return handler.get(t, k, r);
				};
			}
			traps.set = function(t, k, v, r) {
				if (handler.set) return handler.set(t, k, v, r) !== false;
				t[k] = v;
				return true;
			};
			traps.deleteProperty = function(t, k) {
				if (handler.deleteProperty) handler.deleteProperty(t, k);
				return true; // 原生 Proxy 要求返回布尔值，返回 undefined 会被当成删除失败
			};
			if (handler.has) {
				traps.has = function(t, k) {
					return handler.has(t, k);
				};
			}
			if (handler.ownKeys) {
				traps.ownKeys = function(t) {
					return handler.ownKeys(t);
				};
			}
			if (handler.getPrototypeOf) {
				traps.getPrototypeOf = function(t) {
					return handler.getPrototypeOf(t);
				};
			}
			return new Proxy(target, traps);
		}
		const cx = org.mozilla.javascript.Context.getCurrentContext();
		const topScope = eval.call(null, "this");
		// Rhino 1.9 的 NativeJavaObject 第三个参数从 Class<?> 换成了 TypeInfo，
		// 而脚本里 Class.forName 在反射调用下用引导类加载器、找不到应用类，
		// 所以改由 ScriptInterface 在 Kotlin 侧构造（1.7 的 App 没有这个方法，走旧路径）。
		const targetScriptable = ScriptInterface.wrapAsScriptable
			? ScriptInterface.wrapAsScriptable(target, topScope)
			: new org.mozilla.javascript.NativeJavaObject(topScope, target, org.mozilla.javascript.Scriptable);
		const OriginCall = (method) => targetScriptable[method].bind(targetScriptable);
		const Undefined = this.getUndefinedInstance(cx, topScope);
		const scriptable = new org.mozilla.javascript.Scriptable({
			delete: handler.deleteProperty ? (key) => {
				handler.deleteProperty(target, key);
			} : OriginCall("delete"),
			get: handler.get ? (key, start) => {
				const r = handler.get(target, key, start);
				if (typeof r == "undefined") {
					return Undefined;
				}
				return r;
			} : (key, start) => {
				const r = targetScriptable.get(key, start);
				if (typeof r == "undefined") {
					return Undefined;
				}
				return r;
			},
			getClassName: () => `Proxy<${targetScriptable.getClassName()}>`,
			getDefaultValue: OriginCall("getDefaultValue"),
			getIds: handler.ownKeys ? () => {
				const keys = handler.ownKeys(target);
				const arr = java.lang.reflect.Array.newInstance(java.lang.Object, keys.length);
				for (let i = 0; i < keys.length; i++) {
					if (typeof keys[i] == "number") {
						arr[i] = new java.lang.Integer(keys[i]);
					} else {
						arr[i] = keys[i];
					}
				}
				return arr;
			} : OriginCall("getIds"),
			getParentScope: OriginCall("getParentScope"),
			getPrototype: handler.getPrototypeOf ? () => {
				return handler.getPrototypeOf(target);
			} : OriginCall("getPrototype"),
			has: handler.has ? (key, start) => {
				return handler.has(target, key, start);
			} : OriginCall("has"),
			hasInstance: OriginCall("hasInstance"),
			put: handler.set ? (key, start, value) => {
				handler.set(target, key, value, start);
			} : (key, start, value) => {
				targetScriptable.put(key, target, value);
			},
			setParentScope: OriginCall("setParentScope"),
			setPrototype: handler.setPrototypeOf ? (proto) => {
				return handler.setPrototypeOf(target, proto);
			} : OriginCall("setPrototype")
		});
		return cx.toObject(scriptable, topScope);
	},

	ensureNamespace(storeName) {
		const version = this.getStoreVersion(storeName);
		if (version < 1) {
			this.createStore(storeName, {
				id: { type: "integer", primaryKey: true, autoIncrement: true }, // rowid
				parent: "integer",
				key: null,
				type: "integer",
				value: null
			});
			this.setStoreVersion(storeName, 1);
		}
	},
	allocateRefId(storeName) {
		const query = this.queryItems({
			store: storeName,
			fields: { "max": "max(value)" },
			selection: "type = 3 or type = 4"
		});
		const ret = this.readCursorOnce(query);
		return new java.lang.Long(ret.max == null ? 1 : ret.max + 1);
	},
	convertToJSValue(storeName, dbTypeId, dbValue) {
		switch(Number(dbTypeId)) {
			case 0: // primitive: number / string / byte[] / null
			return dbValue;
			case 1: // boolean
			return dbValue != 0;
			case 2: // Date
			return new Date(dbValue);
			case 3: // object
			return this.getNamespaceProxy(storeName, dbValue, "object");
			case 4: // array
			return this.getNamespaceProxy(storeName, dbValue, "array");
		}
	},
	convertToDBValue(storeName, jsValue) {
		const type = typeof jsValue;
		if (type == "number" || type == "string") {
			return { type: 0, value: jsValue };
		}
		if (type == "boolean") {
			return { type: 1, value: jsValue ? 1 : 0 };
		}
		if (type == "object") {
			if (jsValue == null || jsValue instanceof this.BlobType || jsValue instanceof java.lang.Long) {
				return { type: 0, value: jsValue };
			}
			if (jsValue instanceof Date) {
				return { type: 2, value: jsValue.getTime() };
			}
			const isArray = jsValue instanceof Array;
			if (jsValue.__id__) {
				return {
					type: isArray ? 4 : 3,
					value: jsValue.__id__
				};
			}
			const refId = this.allocateRefId(storeName);
			const proxy = this.getNamespaceProxy(storeName, refId, isArray ? "array" : "object");
			return {
				type: isArray ? 4 : 3,
				value: refId,
				proxy: proxy,
				afterStored: () => {
					Object.entries(jsValue).forEach((entry) => {
						proxy[entry[0]] = entry[1];
					});
				}
			};
		}
	},
	getNamespaceProxy(storeName, startId, startType) {
		const base = startType == "array" ? [] : {};
		const idMap = {};
		const cursor = this.queryItems({
			store: storeName,
			selection: ["parent = ?", startId]
		});
		Object.defineProperty(base, "__id__", { value: startId });
		this.forEachColumn(cursor, (entry) => {
			base[entry.key] = this.convertToJSValue(storeName, entry.type, entry.value);
			idMap[entry.key] = entry.id;
		});
		const proxy = this.createProxy(base, {
			set: (target, key, value) => {
				const converted = this.convertToDBValue(storeName, value);
				if (!converted) throw new Error(`Cannot set ${key} to ${value}`);
				const item = {
					parent: startId,
					key: typeof key == "number" ? new java.lang.Long(key) : key,
					type: converted.type,
					value: converted.value
				};
				if (key in idMap) {
					item.id = idMap[key];
				}
				idMap[key] = this.setItem({
					store: storeName,
					item: item
				});
				target[key] = converted.proxy || value;
				if (converted.afterStored) {
					converted.afterStored();
				}
				return true;
			},
			deleteProperty: (target, key) => {
				const id = idMap[key];
				delete target[key];
				delete idMap[key];
				this.deleteItems({
					store: storeName,
					selection: ["id = ?", id]
				});
			}
		});
		return proxy;
	},
	doNamespaceGC(storeName) {
		const cursor = this.queryItems({
			store: storeName,
		});
		const entries = this.readCursorAll(cursor);
		const visit = (parentRef, parent) => {
			const children = entries.filter((e) => e.parent == parentRef);
			children.forEach((child) => {
				if (child.visited && parent) {
					parent.circular = true;
				}
				child.visited = true;
				if (child.type == 3 || child.type == 4) {
					visit(child.value, child.id);
				}
			});
		};
		visit(0, null);
		this.transaction(() => {
			entries.forEach((e) => {
				if (!e.visited || e.circular) {
					this.deleteItems({
						store: storeName,
						selection: ["id=?", e.id]
					});
				}
			});
		});
	},
	getNamespace(storeName) {
		this.ensureNamespace(storeName);
		this.doNamespaceGC(storeName);
		return this.getNamespaceProxy(storeName, 0, "object");
	}
});

MapScript.loadModule("Settings", DBSettings.getNamespace("settings"));
