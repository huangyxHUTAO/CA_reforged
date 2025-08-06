MapScript.loadModule("ExternalStorage", {
	onCreate() {
		this.StorageRoot = this.getExternalStorageRoot();
		this.AppFilesRoot = this.getAppSpecificDirectory(null);
		this.ImportFilesRoot = this.getAppSpecificDirectory("import");
		this.TempFilesRoot = this.getAppSpecificDirectory("temp");
		this.AppFilesRoot.mkdirs();
	},
	initialize() {
		this.cleanTempFiles();
	},
	getStorageAccessLevel() {
		if (android.os.Build.VERSION.SDK_INT >= 30) { // Android 11 (R)
			if (android.os.Environment.isExternalStorageManager()) {
				return "storage";
			}
		}
		if (android.os.Build.VERSION.SDK_INT >= 29) { // Android 10 (Q)
			if (android.os.Environment.isExternalStorageLegacy()) {
				const canReadStorage = AndroidBridge.requestPermissions([
					"android.permission.READ_EXTERNAL_STORAGE"
				], "", null, 3) == 0;
				if (canReadStorage) {
					return "storage";
				}
			}
			return "self";
		}
		const canAccessStorage = AndroidBridge.requestPermissions([
			"android.permission.READ_EXTERNAL_STORAGE",
			"android.permission.WRITE_EXTERNAL_STORAGE"
		], "", null, 3) == 0;
		return canAccessStorage ? "storage" : "self";
	},
	getExternalStorageRoot() {
		if (android.os.Build.VERSION.SDK_INT >= 30) {
			const storageManager = ctx.getSystemService(ctx.STORAGE_SERVICE);
			const primaryVolume = storageManager.getPrimaryStorageVolume();
			return primaryVolume.getDirectory();
		} else {
			return android.os.Environment.getExternalStorageDirectory();
		}
	},
	getAppSpecificDirectory(name) {
		return ctx.getExternalFilesDir(name) || ctx.getDir(name, 0);
	},
	getAppSpecificCacheDirectory() {
		return ctx.getExternalCacheDir() || ctx.getCacheDir();
	},
	getAccessibleRoot() {
		const accessLevel = this.getStorageAccessLevel();
		if (accessLevel == "storage" && this.StorageRoot) {
			return this.StorageRoot;
		}
		return this.AppFilesRoot;
	},
	isParentOrSelf(file, parent) {
		const filePath = file instanceof java.io.File ? file.getCanonicalPath() : file;
		const parentPath = parent instanceof java.io.File ? parent.getCanonicalPath() : parent;
		return parentPath == filePath || filePath.startsWith(parentPath + java.io.File.separator);
	},
	isInStorage(path) {
		if (!this.StorageRoot) return false;
		return this.isParentOrSelf(path, this.StorageRoot);
	},
	isAccessible(path) {
		return this.isParentOrSelf(path, this.getAccessibleRoot());
	},
	releaseEmptyDirectory(file, root) {
		const children = file.list();
		if (children && children.length == 0) {
			const parentFile = file.getParentFile();
			if (this.isParentOrSelf(parentFile, root)) {
				if (file.delete()) {
					this.releaseEmptyDirectory(parentFile);
				}
			}
		}
	},
	ensureExternalStorage(callback) {
		Common.showConfirmDialog({
			title: "权限请求",
			description: "访问此部分数据需要申请额外的权限，是否继续？",
			callback: (id) => {
				if (id != 0) return;
				if (android.os.Build.VERSION.SDK_INT >= 30) {
					this.requestManageStoragePermission(callback);
				} else {
					this.requestStoragePermission(callback);
				}
			}
		});
	},
	requestStoragePermission(callback) {
		AndroidBridge.requestPermissionsByGroup([{
			permissions : [
				"android.permission.READ_EXTERNAL_STORAGE",
				"android.permission.WRITE_EXTERNAL_STORAGE"
			],
			explanation : "读取内部存储\n写入内部存储\n\n这些权限将用于读写命令库、编辑JSON、记录错误日志等",
			callback: (flag, success, denied, sync) => {
				if (!sync) {
					if (success.length > 0) {
						Common.toast("权限请求成功");
						if (callback) callback();
					}
				}
			},
			mode : 2
		}]);
	},
	requestManageStoragePermission(callback) {
		const intent = new android.content.Intent(android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
		intent.setData(android.net.Uri.parse("package:" + ctx.getPackageName()));
		AndroidBridge.beginForegroundTask("requestManageStoragePermission", (activity) => {
			let paused = false, granted = false;
			const checkPermission = () => {
				if (granted) return;
				if (android.os.Environment.isExternalStorageManager()) {
					granted = true;
					Common.toast("权限请求成功");
					if (callback) callback();
				}
			};
			try {
				activity.startActivity(intent);
				return {
					onPause() {try {
						paused = true;
					} catch(e) {erp(e)}},
					onResume() {try {
						if (!paused) return;
						checkPermission();
						activity.finish();
					} catch(e) {erp(e)}},
					onDestroy() {try {
						checkPermission();
						PopupPage.show();
					} catch(e) {erp(e)}},
				};
			} catch(err) {
				Log.e(e);
				Common.toast("调用外部应用失败，请检查您是否授予了命令助手后台弹出界面或类似的权限\n" + e);
				activity.finish();
			}
		});
	},

	// 存在3种URI
	// 文件URI，file:// 可以执行任意操作
	// 树文档URI，有限操作
	// 普通URI，只能读写
	toUri(obj) {
		if (obj instanceof android.net.Uri) {
			return obj;
		}
		if (obj instanceof java.io.File) {
			return android.net.Uri.fromFile(obj);
		}
		const uri = android.net.Uri.parse(String(obj));
		if (uri.isAbsolute()) {
			return uri;
		} else {
			return android.net.Uri.fromFile(new java.io.File(uri.path || ""));
		}
	},
	uriToFile(uri) {
		if (uri.getScheme() == "file") {
			return new java.io.File(uri.getPath());
		}
		return null;
	},
	getUriType(uri) {
		if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			return "documentsProvider"
		} else {
			return uri.getScheme();
		}
	},
	queryForUri(uri, column, columnType, defaultValue) {
		const resolver = ctx.getContentResolver();
		let cursor, r = defaultValue;
		try {
			cursor = resolver.query(uri, [android.provider.DocumentsContract.Document[column]], null, null, null);
			if (!cursor) throw new Error("Uri is not available for query");
			if (cursor.moveToFirst() && !cursor.isNull(0)) {
				if (columnType == "string") {
					r = String(cursor.getString(0));
				} else if (columnType == "integer") {
					r = cursor.getLong(0);
				} else if (columnType == "float") {
					r = cursor.getDouble(0);
				} else if (columnType = "blob") {
					r = cursor.getBlob(0);
				}
			}
		} catch(e) {Log.e(e)}
		if (cursor) cursor.close();
		return r;
	},
	exists(uri) {
		if (uri.getScheme() == "file") {
			return this.uriToFile(uri).exists();
		} else if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			return this.queryForUri(uri, "COLUMN_DOCUMENT_ID", "string", null) != null;
		}
		return false;
	},
	isDirectory(uri) {
		if (uri.getScheme() == "file") {
			return this.uriToFile(uri).isDirectory();
		} else if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			const mimeType = this.queryForUri(uri, "COLUMN_MIME_TYPE", "string", null);
			return android.provider.DocumentsContract.Document.MIME_TYPE_DIR.equals(mimeType);
		}
		return false;
	},
	isFile(uri) {
		if (uri.getScheme() == "file") {
			return this.uriToFile(uri).isFile();
		} else if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			const mimeType = this.queryForUri(uri, "COLUMN_MIME_TYPE", "string", null);
			return mimeType && !android.provider.DocumentsContract.Document.MIME_TYPE_DIR.equals(mimeType);
		}
		return false;
	},
	canRead(uri) {
		if (uri.getScheme() == "file") {
			return this.uriToFile(uri).canRead();
		}
		return ctx.checkCallingOrSelfUriPermission(uri, android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION) == 0;
	},
	canWrite(uri) {
		if (uri.getScheme() == "file") {
			return this.uriToFile(uri).canWrite();
		}
		return ctx.checkCallingOrSelfUriPermission(uri, android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION) == 0;
	},
	getName(uri) {
		if (uri.getScheme() == "file") {
			return String(this.uriToFile(uri).getName());
		} else if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			return this.queryForUri(uri, "COLUMN_DISPLAY_NAME", "string", null);
		}
		return null;
	},
	getMimeType(uri) {
		if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			const mimeType = this.queryForUri(uri, "COLUMN_MIME_TYPE", "string", null);
			if (android.provider.DocumentsContract.Document.MIME_TYPE_DIR.equals(mimeType)) {
				return null;
			}
			return mimeType;
		}
		return this.getMimeTypeFromExtension(this.getExtensionFromName(this.uriToName(uri)));
	},
	getLastModified(uri) {
		if (uri.getScheme() == "file") {
			return this.uriToFile(uri).lastModified();
		} else if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			return this.queryForUri(uri, "COLUMN_LAST_MODIFIED", "integer", null);
		}
		return null;
	},
	getLength(uri) {
		if (uri.getScheme() == "file") {
			return this.uriToFile(uri).length();
		} else if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			return this.queryForUri(uri, "COLUMN_SIZE", "integer", null);
		}
		return null;
	},
	delete(uri) {
		if (uri.getScheme() == "file") {
			return this.deleteTreeFile(this.uriToFile(uri));
		} else if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			try {
				const resolver = ctx.getContentResolver();
				return android.provider.DocumentsContract.deleteDocument(resolver, uri);
			} catch(e) {Log.e(e)}
		}
		return false;
	},
	deleteTreeFile(file) {
		if (file.isDirectory()) {
			const childrens = file.listFiles();
			if (childrens) {
				childrens.forEach((child) => this.deleteTreeFile(child));
			}
		}
		return file.delete();
	},
	renameFile(uri, newName) {
		if (uri.getScheme() == "file") {
			const source = this.uriToFile(uri);
			const dest = new java.io.File(source.getParent(), newName);
			if (source.renameTo(dest)) {
				return this.toUri(dest);
			}
		} else if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			try {
				const resolver = ctx.getContentResolver();
				return android.provider.DocumentsContract.renameDocument(resolver, uri, newName);
			} catch(e) {Log.e(e)}
		}
		return null;
	},
	listFiles(uri) {
		if (uri.getScheme() == "file") {
			const files = this.uriToFile(uri).listFiles();
			if (files) {
				return files.map((e) => this.toUri(e));
			}
		} else if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			const resolver = ctx.getContentResolver();
			const parentId = android.provider.DocumentsContract.getDocumentId(uri);
			const childrenUri = android.provider.DocumentsContract.buildChildDocumentsUriUsingTree(uri, parentId);
			let cursor, r = [], success = false;
			try {
				cursor = resolver.query(childrenUri, [android.provider.DocumentsContract.Document.COLUMN_DOCUMENT_ID], null, null, null);
				if (!cursor) throw new Error("Uri is not available for query");
				let childId, childUri;
				while (cursor.moveToNext()) {
					childId = cursor.getString(0);
					childUri = android.provider.DocumentsContract.buildDocumentUriUsingTree(uri, childId);
					r.push(childUri);
				}
				success = true;
			} catch(e) {Log.e(e)}
			if (cursor) cursor.close();
			if (success) {
				return r;
			}
		}
		return null;
	},
	listFilesWithDetails(uri) {
		if (uri.getScheme() == "file") {
			const files = this.uriToFile(uri).listFiles();
			if (files) {
				return files.map((file) => ({
					uri: this.toUri(file),
					name: file.getName(),
					directory: file.isDirectory(),
					lastModified: file.lastModified(),
					length: file.length()
				}));
			}
		} else if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			const resolver = ctx.getContentResolver();
			const parentId = android.provider.DocumentsContract.getDocumentId(uri);
			const childrenUri = android.provider.DocumentsContract.buildChildDocumentsUriUsingTree(uri, parentId);
			let cursor, r = [], success = false;
			try {
				cursor = resolver.query(childrenUri, [
					android.provider.DocumentsContract.Document.COLUMN_DOCUMENT_ID,
					android.provider.DocumentsContract.Document.COLUMN_MIME_TYPE,
					android.provider.DocumentsContract.Document.COLUMN_DISPLAY_NAME,
					android.provider.DocumentsContract.Document.COLUMN_LAST_MODIFIED,
					android.provider.DocumentsContract.Document.COLUMN_SIZE
				], null, null, null);
				const docIdColumn = cursor.getColumnIndexOrThrow(android.provider.DocumentsContract.Document.COLUMN_DOCUMENT_ID);
				const mimeTypeColumn = cursor.getColumnIndexOrThrow(android.provider.DocumentsContract.Document.COLUMN_MIME_TYPE);
				const nameColumn = cursor.getColumnIndexOrThrow(android.provider.DocumentsContract.Document.COLUMN_DISPLAY_NAME);
				const mtimeColumn = cursor.getColumnIndexOrThrow(android.provider.DocumentsContract.Document.COLUMN_LAST_MODIFIED);
				const sizeColumn = cursor.getColumnIndexOrThrow(android.provider.DocumentsContract.Document.COLUMN_SIZE);
				let childId, childUri, childMimeType;
				while (cursor.moveToNext()) {
					childId = cursor.getString(docIdColumn);
					childMimeType = cursor.getString(mimeTypeColumn);
					childUri = android.provider.DocumentsContract.buildDocumentUriUsingTree(uri, childId);
					r.push({
						uri: childUri,
						mimeType: String(childMimeType),
						name: String(cursor.getString(nameColumn)),
						directory: childMimeType == android.provider.DocumentsContract.Document.MIME_TYPE_DIR,
						lastModified: cursor.getLong(mtimeColumn),
						length: cursor.getLong(sizeColumn)
					});
				}
				success = true;
			} catch(e) {Log.e(e)}
			if (cursor) cursor.close();
			if (success) {
				return r;
			}
		}
		return null;
	},
	getParentDirectory(uri) {
		if (uri.getScheme() == "file") {
			const parentFile = this.uriToFile(uri).getParentFile();
			if (!this.StorageRoot || this.isParentOrSelf(parentFile, this.StorageRoot)) {
				return this.toUri(parentFile);
			}
		} else if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			if (android.os.Build.VERSION.SDK_INT >= 26) {
				try {
					const resolver = ctx.getContentResolver();
					const path = android.provider.DocumentsContract.findDocumentPath(resolver, uri);
					if (path) {
						const segments = path.getPath();
						if (segments.length > 1) {
							return android.provider.DocumentsContract.buildDocumentUriUsingTree(uri, segments[segments.length - 2]);
						}
					}
				} catch(e) {Log.e(e)}
			}
		}
		return null;
	},
	getChildFile(uri, name) {
		if (uri.getScheme() == "file") {
			const parentFile = this.uriToFile(uri);
			const childFile = new java.io.File(parentFile, name);
			if (childFile.exists()) {
				return this.toUri(childFile);
			}
		} else {
			const children = this.listFilesWithDetails(uri);
			if (children) {
				const child = children.find((f) => f.name == name);
				if (child) return child.uri;
			}
		}
		return null;
	},
	createFile(uri, name, mimeType) {
		if (uri.getScheme() == "file") {
			const directory = this.uriToFile(uri);
			const newFile = new java.io.File(directory, name);
			if (newFile.createNewFile()) {
				return this.toUri(newFile);
			}
		} else if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			try {
				const resolver = ctx.getContentResolver();
				return android.provider.DocumentsContract.createDocument(resolver, uri, mimeType, name);
			} catch(e) {Log.e(e)}
		}
		return null;
	},
	createDirectory(uri, name) {
		if (uri.getScheme() == "file") {
			const directory = this.uriToFile(uri);
			const newDirectory = new java.io.File(directory, name);
			if (newDirectory.mkdir()) {
				return this.toUri(newDirectory);
			}
		} else if (android.provider.DocumentsContract.isDocumentUri(ctx, uri)) {
			try {
				const resolver = ctx.getContentResolver();
				const mimeType = android.provider.DocumentsContract.Document.MIME_TYPE_DIR;
				return android.provider.DocumentsContract.createDocument(resolver, uri, mimeType, name);
			} catch(e) {Log.e(e)}
		}
		return null;
	},
	uriToName(uri) {
		const name = this.getName(uri);
		if (name != null) return name;
		return String(uri.getLastPathSegment()) || String(uri);
	},
	uriToReadablePath(uri) {
		const file = this.uriToFile(uri);
		if (file) {
			return String(file.getPath());
		} else {
			return decodeURIComponent(String(uri).replace(/%2(5|F)/g, encodeURIComponent));
		}
	},
	getExtensionFromName(name) {
		const dot = name.lastIndexOf(".");
		if (dot >= 1) {
			return name.slice(dot + 1);
		} else {
			return "";
		}
	},
	getMimeTypeFromExtension(extension) {
		const mimeTypeMap = android.webkit.MimeTypeMap.getSingleton();
		const mimeType = mimeTypeMap.getMimeTypeFromExtension(extension);
		if (mimeType) return String(mimeType);
		return null;
	},
	getLengthString(uri, longer) {
		const length = this.getLength(uri);
		if (longer) {
			return String(android.text.format.Formatter.formatFileSize(ctx, length));
		} else {
			return String(android.text.format.Formatter.formatShortFileSize(ctx, length));
		}
	},
	getLastModifiedString(uri) {
		const lastModified = this.getLastModified(uri);
		return new Date(lastModified).toLocaleString();
	},
	openInputStream(uri) {
		const resolver = ctx.getContentResolver();
		return resolver.openInputStream(uri);
	},
	openOutputStream(uri, mode) {
		const resolver = ctx.getContentResolver();
		if (mode) {
			return resolver.openOutputStream(uri, mode);
		}
		return resolver.openOutputStream(uri, "wt");
	},
	pipe(input, output, bufferSize) {
		const buffer = JavaReflect.array("byte", bufferSize || 2048);
		let readBytes;
		while ((readBytes = input.read(buffer)) > 0) output.write(buffer, 0, readBytes);
	},
	copy(sourceUri, destUri) {
		const input = this.openInputStream(sourceUri);
		const output = this.openOutputStream(destUri, "wt");
		this.pipe(input, output);
		input.close();
		output.close();
	},
	readFileContent(uri, encoding, defaultValue) {
		try {
			const input = this.openInputStream(uri);
			const output = new java.io.ByteArrayOutputStream();
			this.pipe(input, output);
			input.close();
			if (encoding) {
				return new java.lang.String(output.toByteArray(), encoding);
			} else {
				return output.toByteArray();
			}
		} catch(e) {
			return typeof defaultValue == "function" ? defaultValue(e) : defaultValue;
		}
	},
	writeFileContent(uri, content, encoding, append) {
		const output = this.openOutputStream(uri, append ? "wa" : "wt");
		if (encoding || typeof content == "string" || content instanceof java.lang.CharSequence) {
			output.write(new java.lang.String(content).getBytes(encoding || "UTF-8"));
		} else {
			output.write(content);
		}
		output.close();
	},
	createImportFile(hint) {
		let importFile;
		this.ImportFilesRoot.mkdirs();
		if (!hint) hint = "*";
		if (hint.indexOf("*") >= 0) {
			for (let index = 1; index < 10000; index++) {
				importFile = new java.io.File(this.ImportFilesRoot, hint.replace("*", index));
				if (!importFile.exists()) break;
			}
		} else {
			importFile = new java.io.File(this.ImportFilesRoot, hint);
		}
		return importFile;
	},
	tryReleaseImportFile(fileOrPath) {
		const file = new java.io.File(fileOrPath);
		if (this.isParentOrSelf(file, this.ImportFilesRoot)) {
			file.delete();
			this.releaseEmptyDirectory(file.getParentFile(), this.ImportFilesRoot);
			return true;
		}
		return false;
	},
	tryReleaseImportUri(uri) {
		const importFile = this.uriToFile(uri);
		if (importFile) {
			return this.tryReleaseImportFile(importFile);
		}
		return false;
	},
	importFile(uri, hint) {
		const importFile = this.createImportFile(hint.replace("**", this.uriToName(uri)));
		const input = this.openInputStream(uri);
		importFile.getParentFile().mkdirs();
		const output = new java.io.FileOutputStream(importFile);
		this.pipe(input, output);
		input.close();
		return importFile;
	},
	createTempFile(hint) {
		let tempFile;
		this.TempFilesRoot.mkdirs();
		if (!hint) hint = "*";
		if (hint.indexOf("*") >= 0) {
			for (let index = 1; index < 10000; index++) {
				tempFile = new java.io.File(this.TempFilesRoot, hint.replace("*", index));
				if (!tempFile.exists()) break;
			}
		} else {
			tempFile = new java.io.File(this.TempFilesRoot, hint);
		}
		return tempFile;
	},
	cleanTempFiles() {
		this.deleteTreeFile(this.TempFilesRoot);
	},
	selectContent(mimeType, callback) {
		let intent = new android.content.Intent(android.content.Intent.ACTION_GET_CONTENT);
		intent.setType(mimeType);
		intent.addCategory(android.content.Intent.CATEGORY_OPENABLE);
		intent = android.content.Intent.createChooser(intent, "选择");
		AndroidBridge.startActivityForResult(intent, (resultCode, data) => {
			if (resultCode != -1) return; // RESULT_OK
			callback(data.getData());
		});
	},
	createDocument(mimeType, defaultTitle, callback, initialUri) {
		const intent = new android.content.Intent(android.content.Intent.ACTION_CREATE_DOCUMENT);
		intent.addCategory(android.content.Intent.CATEGORY_OPENABLE);
		intent.addFlags(android.content.Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
		intent.setType(mimeType);
		if (defaultTitle) {
			intent.putExtra(android.content.Intent.EXTRA_TITLE, new java.lang.String(defaultTitle));
		}
		if (initialUri) {
			intent.putExtra(android.provider.DocumentsContract.EXTRA_INITIAL_URI, initialUri);
		}
		AndroidBridge.startActivityForResult(intent, (resultCode, data) => {
			if (resultCode != -1) return; // RESULT_OK
			callback(data.getData());
		});
	},
	openDocument(mimeType, callback, initialUri, allowMultiple) {
		const intent = new android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT);
		intent.addCategory(android.content.Intent.CATEGORY_OPENABLE);
		intent.addFlags(android.content.Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
		if (Array.isArray(mimeType)) {
			const mimeTypeList = JavaReflect.array("string", mimeType.length);
			mimeType.forEach((e, i) => mimeTypeList[i] = e);
			intent.putExtra(android.content.Intent.EXTRA_MIME_TYPES, mimeTypeList);
			intent.setType("*/*");
		} else {
			intent.setType(mimeType);
		}
		if (initialUri) {
			intent.putExtra(android.provider.DocumentsContract.EXTRA_INITIAL_URI, initialUri);
		}
		if (allowMultiple) {
			intent.putExtra(android.content.Intent.EXTRA_ALLOW_MULTIPLE, true);
		}
		AndroidBridge.startActivityForResult(intent, (resultCode, data) => {
			if (resultCode != -1) return; // RESULT_OK
			const uri = data.getData();
			if (allowMultiple) {
				const clipData = data.getClipData();
				if (clipData) {
					const uriList = [];
					for (let i = 0; i < clipData.getItemCount(); i++) {
						uriList.push(clipData.getItemAt(i).getUri());
					}
					callback(uriList);
				} else {
					callback(uri ? [uri] : []);
				}
			} else {
				callback(uri);
			}
		});
	},
	openDocumentTree(callback, initialUri, showAdvanced) {
		const intent = new android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT_TREE);
		intent.addFlags(android.content.Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
		if (initialUri) {
			intent.putExtra(android.provider.DocumentsContract.EXTRA_INITIAL_URI, initialUri);
		}
		if (showAdvanced) {
			intent.putExtra("android.provider.extra.SHOW_ADVANCED", true);
			intent.putExtra("android.content.extra.SHOW_ADVANCED", true);
		}
		AndroidBridge.startActivityForResult(intent, (resultCode, data) => {
			if (resultCode != -1) return; // RESULT_OK 
			const uri = data.getData();
			this.checkReleaseUriPermissions();
			this.tryTakeUriPermission(uri);
			const documentId = android.provider.DocumentsContract.getTreeDocumentId(uri);
			const documentUri = android.provider.DocumentsContract.buildDocumentUriUsingTree(uri, documentId);
			callback(documentUri, uri);
		});
	},
	requestDocumentTreeAccess(path, callback) {
		const authority = "com.android.externalstorage.documents"
		const documentId = "primary:" + path;
		const treeUri = android.provider.DocumentsContract.buildTreeDocumentUri(authority, documentId);
		const documentUri = android.provider.DocumentsContract.buildDocumentUriUsingTree(treeUri, documentId);
		if (this.canRead(documentUri)) {
			this.tryTakeUriPermission(treeUri);
			callback(documentUri);
			return;
		}
		Common.showConfirmDialog({
			title: "目录访问权限",
			description: "为了获得访问对应目录的权限，请在之后弹出的界面中选择“使用此文件夹”。",
			buttons: ["同意", "取消"],
			callback: (id) => {
				if (id != 0) return;
				this.openDocumentTree(() => {
					if (this.canRead(documentUri)) {
						if (callback) callback(documentUri);
					} else {
						Common.toast("权限授予失败");
					}
				}, documentUri, true);
			}
		});
	},
	needAdditionalPermissions(uri) {
		if (uri.getScheme() == "file") {
			const file = this.uriToFile(uri);
			if (this.isInStorage(file)) {
				if (this.isAccessible(file)) {
					const androidData = new java.io.File(this.StorageRoot, "Android/data");
					const androidObb = new java.io.File(this.StorageRoot, "Android/obb")
					if (this.isParentOrSelf(file, androidData)) {
						return "androidData";
					}
					if (this.isParentOrSelf(file, androidObb)) {
						return "androidObb";
					}
					if (file.canRead()) {
						return null;
					}
				} else {
					return "storage";
				}
			}
			return "";
		}
		return null;
	},
	requestAdditionalPermissions(type, callback) {
		if (type == "storage") {
			this.ensureExternalStorage(() => {
				if (callback) callback(this.toUri(this.getAccessibleRoot()));
			});
		} else if (type == "androidData" || type == "androidObb") {
			let requestDirectory = type == "androidData" ? "Android/data" : "Android/obb";
			if (android.os.Build.VERSION.SDK_INT >= 33) { // Android 13 (Tiramisu)
				this.listAppExternalPath(requestDirectory, (pkg) => {
					requestDirectory = `${requestDirectory}/${pkg}`;
					this.requestDocumentTreeAccess(requestDirectory, callback);
				});
			} else {
				this.requestDocumentTreeAccess(requestDirectory, callback);
			}
		}
	},
	listAppExternalPath(prefix, callback) {
		Common.showProgressDialog((dialog) => {
			dialog.setText("正在加载列表……");
			const pm = ctx.getPackageManager();
			let packages = [];
			let i, info, packageName;
			const applications = pm.getInstalledApplications(0);
			const applicationCount = applications.size();
			for (i = 0; i < applicationCount; i++) {
				dialog.setText(`正在加载列表……\n应用: ${i + 1} / ${applicationCount}`);
				info = applications.get(i);
				packages.push({
					packageName: info.packageName,
					text: info.loadLabel(pm)
				});
			}
			const mainIntent = new android.content.Intent(android.content.Intent.ACTION_MAIN);
			mainIntent.addCategory(android.content.Intent.CATEGORY_LAUNCHER);
			const launchables = pm.queryIntentActivities(mainIntent, 0);
			const launchableCount = launchables.size();
			for (i = 0; i < launchableCount; i++) {
				dialog.setText(`正在加载列表……\n主 Activity: ${i + 1} / ${launchableCount}`);
				info = launchables.get(i);
				packageName = info.activityInfo.packageName;
				if (packages.find((e) => e.packageName == packageName)) continue;
				packages.push({
					packageName,
					text: info.activityInfo.loadLabel(pm)
				});
			}
			packages = packages.filter((e) => {
				const directory = new java.io.File(this.StorageRoot, `${prefix}/${e.packageName}`);
				e.description = String(directory.getCanonicalPath());
				return directory.exists();
			});
			packages.sort((a, b) => Common.stringComparator(a.description, b.description));
			dialog.close();
			if (dialog.cancelled) return;
			Common.showListChooser(packages, (id) => {
				callback(packages[id].packageName);
			});
		}, true);
	},
	isPersistedUriPermission(uri) {
		//  1 - uri 永久可用
		//  0 - uri 暂时可用，每次使用时需要 tryTakeUriPermission(uri) 刷新时间
		// -1 - uri 不可用
		if (uri.getScheme() == "file") {
			return this.uriToFile(uri).canRead() ? 1 : -1;
		} else {
			return ctx.checkCallingOrSelfUriPermission(uri, android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
		}
	},
	tryTakeUriPermission(uri) {
		if (uri.getScheme() == "file") {
			return this.uriToFile(uri).canRead();
		}
		try {
			const resolver = ctx.getContentResolver();
			resolver.takePersistableUriPermission(uri, 0x3); // Intent.FLAG_GRANT_READ_URI_PERMISSION | FLAG_GRANT_WRITE_URI_PERMISSION
			return true;
		} catch(e) {
			Log.e(e);
			return false;
		}
	},
	releaseUriPermissions(uri) {
		const resolver = ctx.getContentResolver();
		resolver.releasePersistableUriPermission(uri, 0x3);
	},
	releaseAllUriPermissions() {
		const resolver = ctx.getContentResolver();
		const permissionList = resolver.getPersistedUriPermissions();
		for (let i = 0; i < permissionList.size(); i++) {
			resolver.releasePersistableUriPermission(permissionList.get(i).getUri(), 0x3);
		}
	},
	checkReleaseUriPermissions() {
		const resolver = ctx.getContentResolver();
		const permissionList = resolver.getPersistedUriPermissions();
		const permissions = new Array(permissionList.size());
		for (let i = 0; i < permissions.length; i++) {
			permissions[i] = permissionList.get(i);
		}
		if (permissions.length > 100) {
			permissions.sort((a, b) => {
				return b.getPersistedTime() - a.getPersistedTime();
			});
			permissions.slice(100).forEach((e) => {
				resolver.releasePersistableUriPermission(e.getUri(), 0x3);
			});
		}
	},
	showImportActions(options) {
		const importCallback = (uri) => {
			if (options.uri) {
				if (options.allowMultiple) {
					options.uri(Array.isArray(uri) ? uri : [uri]);
				} else {
					if (Array.isArray(uri)) {
						uri.forEach((e) => options.uri(e));
					} else {
						options.uri(uri);
					}
				}
			} else if (options.file) { 
				Common.showProgressDialog((dialog) => {
					dialog.setTextDelayed("正在导入文件……", 200);
					let files;
					if (Array.isArray(uri)) {
						files = uri.map((e) => this.importFile(e, options.hint));
					} else {
						files = [this.importFile(uri, options.hint)];
					}
					dialog.close(() => {
						if (options.allowMultiple) {
							options.file(files);
						} else {
							files.forEach((e) => options.file(e));
						}
					});
				});
			}
		};
		Common.showOperateDialog([{
			text: "从其他应用导入",
			onclick: () => {
				this.selectContent(options.mimeType, importCallback);
			}
		}, {
			text: "从文件管理器导入",
			onclick: () => {
				this.openDocument(options.mimeType, importCallback, null, options.allowMultiple);
			}
		}, {
			gap : 10 * G.dp
		}, {
			text: "使用内置文件浏览器导入",
			onclick: () => {
				this.showFileDialog({
					type: options.allowMultiple ? 3 : 0,
					callback: importCallback
				});
			}
		}]);
	},
	showOpenActions(options) {
		const openCallback = (uri) => {
			if (options.allowMultiple) {
				options.callback(Array.isArray(uri) ? uri : [uri]);
			} else {
				if (Array.isArray(uri)) {
					uri.forEach((e) => options.callback(e));
				} else {
					options.callback(uri);
				}
			}
		};
		Common.showOperateDialog([{
			text: "从文件管理器打开",
			onclick: () => {
				this.openDocument(options.mimeType, openCallback, null, options.allowMultiple);
			}
		}, {
			gap : 10 * G.dp
		}, {
			text: "使用内置文件浏览器打开",
			onclick: () => {
				this.showFileDialog({
					type: options.allowMultiple ? 3 : 0,
					callback: openCallback
				});
			}
		}]);
	},
	showOpenDirectoryActions(options) {
		Common.showOperateDialog([{
			text: "从文件管理器选择目录",
			onclick: () => {
				this.openDocumentTree(options.callback);
			}
		}, {
			gap : 10 * G.dp
		}, {
			text: "使用内置文件浏览器选择目录（兼容模式）",
			onclick: () => {
				this.showFileDialog({
					type: 2,
					callback: options.callback
				});
			}
		}]);
	},
	showExportActions(options) {
		const exportCallback = (uri, next) => {
			if (typeof options.export == "function") {
				options.export(uri);
				if (next) next();
			} else {
				Common.showProgressDialog((dialog) => {
					dialog.setTextDelayed("正在导出文件……", 200);
					this.copy(ExternalStorage.toUri(options.export), uri);
					dialog.close(() => {
						if (next) next();
					});
				});
			}
		};
		Common.showOperateDialog([{
			text: "分享至其他应用",
			onclick: () => {
				const tempFile = this.createTempFile(options.hint);
				exportCallback(ExternalStorage.toUri(tempFile), () => {
					AndroidBridge.sendFile(tempFile, options.mimeType, true);
				});
			}
		}, {
			text: "导出至文件管理器",
			onclick: () => {
				this.createDocument(options.mimeType, options.hint, exportCallback);
			}
		}, {
			gap : 10 * G.dp
		}, {
			text: "使用内置文件浏览器导出（兼容模式）",
			onclick: () => {
				this.showFileDialog({
					type: 1,
					defaultFileName: options.hint,
					callback: exportCallback
				});
			}
		}]);
	},
	showSaveActions(options) {
		Common.showOperateDialog([{
			text: "保存至文件管理器",
			onclick: () => {
				this.createDocument(options.mimeType, options.hint, options.callback);
			}
		}, {
			gap : 10 * G.dp
		}, {
			text: "使用内置文件浏览器保存（兼容模式）",
			onclick: () => {
				this.showFileDialog({
					type: 1,
					defaultFileName: options.hint,
					callback: options.callback
				});
			}
		}]);
	},
	showFileDialog: function self(o) {G.ui(() => {try {
		if (!self.popup) {
			self.intl = Intl.getNamespace("common.FileChooser");
			self.vmaker = function() {
				const name = new G.TextView(ctx);
				name.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
				name.setSingleLine(true);
				name.setEllipsize(G.TextUtils.TruncateAt.END);
				name.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				return name;
			}
			self.vbinder = function(holder, e) {
				if (e.parent) {
					holder.self.setText("\ud83d\udcc2 " + self.intl.parentDir); // Emoji: Expanded Folder
					Common.applyStyle(holder.self, "item_default", 3);
				} else {
					let icon = "\ud83d\udcc4"; // Emoji: Document;
					if (e.directory) {
						icon = "\ud83d\udcc1"; // Emoji: Collapsed Folder
					}
					holder.self.setText(icon + " " + e.name);
					if (e.selected) {
						Common.applyStyle(holder.self, "item_highlight", 3);
						holder.self.setBackgroundColor(Common.theme.go_bgcolor);
					} else {
						Common.applyStyle(holder.self, "item_default", 3);
						holder.self.setBackgroundColor(G.Color.TRANSPARENT);
					}
				}
			}
			self.compare = (a, b) => {
				if (a.directory != b.directory) {
					return a.directory ? -1 : 1;
				}
				return a.name.localeCompare(b.name);
			}
			self.choose = function(e) {
				const o = self.sets;
				if (o.check && !o.check(e)) return false;
				self.popup.exit();
				if (!o.result) {
					o.result = e;
					if (o.callback) o.callback(e);
					self.lastDir = o.stack[0];
				}
				return true;
			}
			self.postRefresh = function() {
				Common.showProgressDialog((dialog) => {
					dialog.setTextDelayed(self.intl.loading, 200);
					self.refresh();
				});
			}
			self.refresh = function() {
				const o = self.sets;
				const children = ExternalStorage.listFilesWithDetails(o.stack[0]) || [];
				if (o.filter) {
					for (let i = 0; i < children.length; i++){
						if (!o.filter(children[i])) {
							children.splice(i, 1);
							i--;
						}
					}
				}
				children.sort(o.compare || self.compare);
				const parent = ExternalStorage.getParentDirectory(o.stack[0]);
				if (parent) {
					if (ExternalStorage.canRead(parent) || ExternalStorage.needAdditionalPermissions(parent)) {
						children.unshift({
							parent: true,
							uri: parent,
							directory: true
						});
					}
				} else if (o.stack.length > 1) {
					children.unshift({
						parent: true,
						uri: o.stack[1],
						directory: true
					});
				}
				G.ui(() => {try {
					self.path.setText(o.stack[0].toString());
					self.adapter.setArray(children);
				} catch(e) {erp(e)}});
			}
			self.authorizeAndOpen = function(uri) {
				const additionPermission = ExternalStorage.needAdditionalPermissions(uri);
				if (!additionPermission) {
					if (additionPermission == "") {
						Common.toast(self.intl.directoryCannotRead);
					}
					return;
				}
				ExternalStorage.requestAdditionalPermissions(additionPermission, (newUri) => {
					const type = ExternalStorage.getUriType(newUri);
					if (type == ExternalStorage.getUriType(o.stack[0])) {
						o.stack = [newUri];
					} else {
						o.stack.unshift(newUri);
					}
					self.postRefresh();
				});
			}
			self.linear = new G.LinearLayout(ctx);
			self.linear.setOrientation(G.LinearLayout.VERTICAL);

			self.header = new G.LinearLayout(ctx);
			self.header.setOrientation(G.LinearLayout.HORIZONTAL);
			Common.applyStyle(self.header, "bar_float");

			self.back = new G.TextView(ctx);
			self.back.setText("< " + Common.intl.back);
			self.back.setGravity(G.Gravity.CENTER);
			self.back.setPadding(20 * G.dp, 0, 20 * G.dp, 0);
			Common.applyStyle(self.back, "button_highlight", 2);
			self.back.setOnClickListener(new G.View.OnClickListener({onClick(v) {try {
				self.popup.exit();
				return true;
			} catch(e) {erp(e)}}}));
			self.header.addView(self.back, new G.LinearLayout.LayoutParams(-2, -1));

			self.title = new G.TextView(ctx);
			self.title.setPadding(0, 10 * G.dp, 0, 10 * G.dp);
			Common.applyStyle(self.title, "textview_default", 4);
			self.header.addView(self.title, new G.LinearLayout.LayoutParams(-2, -2));

			self.path = new G.TextView(ctx);
			self.path.setGravity(G.Gravity.CENTER | G.Gravity.LEFT);
			self.path.setPadding(15 * G.dp, 0, 5 * G.dp, 0);
			self.path.setSingleLine(true);
			self.path.setEllipsize(G.TextUtils.TruncateAt.START);
			Common.applyStyle(self.path, "textview_prompt", 2);
			self.path.setOnClickListener(new G.View.OnClickListener({onClick : function(v) {try {
				const o = self.sets;
				Common.showInputDialog({
					title: self.intl.path,
					singleLine: true,
					defaultValue: o.stack[0].toString(),
					callback(s) {
						const uri = ExternalStorage.toUri(s);
						if (!ExternalStorage.isDirectory(uri)) {
							return Common.toast(self.intl.directoryCannotRead);
						}
						if (ExternalStorage.canRead(uri)) {
							o.stack = [uri];
							self.postRefresh();
						} else {
							self.authorizeAndOpen(uri);
						}
					}
				});
				return true;
			} catch(e) {erp(e)}}}));
			self.header.addView(self.path, new G.LinearLayout.LayoutParams(0, -1, 1.0));

			self.newDir = new G.TextView(ctx);
			self.newDir.setText("\ud83d\udcc1+"); // Emoji:Collapsed Folder
			self.newDir.setGravity(G.Gravity.CENTER);
			self.newDir.setPadding(20 * G.dp, 0, 20 * G.dp, 0);
			Common.applyStyle(self.newDir, "button_default", 2);
			self.newDir.setOnClickListener(new G.View.OnClickListener({onClick(v) {try {
				Common.showInputDialog({
					title: self.intl.createDir,
					callback(s) {
						if (!s.length) {
							Common.toast(self.intl.emptyDirName);
							return;
						} else {
							try {
								const newDirectory = ExternalStorage.createDirectory(self.sets.cursor, s);
								if (!newDirectory) {
									Common.toast(self.intl.failedCreateDir);
									return;
								}
								self.postRefresh();
							} catch (e) {
								Common.toast(self.intl.resolve("errCreateDir", e));
							}
						}
					}
				});
				return true;
			} catch(e) {erp(e)}}}));
			self.header.addView(self.newDir, new G.LinearLayout.LayoutParams(-2, -1));
			self.linear.addView(self.header, new G.LinearLayout.LayoutParams(-1, -2));

			self.adapter = SimpleListAdapter.getController(new SimpleListAdapter([], self.vmaker, self.vbinder, null, true));

			self.list = new G.ListView(ctx);
			self.list.setAdapter(self.adapter.self);
			Common.applyStyle(self.list, "message_bg");
			self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({onItemClick(parent, view, pos, id) {try {
				const o = self.sets;
				const e = self.adapter.array[pos];
				if (e.directory) {
					if (ExternalStorage.canRead(e.uri)) {
						if (e.parent) {
							if (o.stack.length > 1 && o.stack[1].equals(e.uri)) {
								o.stack.shift();
							}
							o.stack[0] = e.uri;
						} else {
							o.stack.unshift(e.uri);
						}
						self.postRefresh();
					} else {
						self.authorizeAndOpen(e.uri);
					}
				} else if (o.type == 0) { 
					self.choose(e.uri);
				} else if (o.type == 1) {
					self.fname.setText(e.name);
				} else if (o.type == 3) {
					e.selected = !e.selected;
					self.adapter.notifyChange();
				}
				return true;
			} catch(e) {erp(e)}}}));
			self.list.setOnItemLongClickListener(new G.AdapterView.OnItemLongClickListener({onItemLongClick(parent, view, pos, id) {try {
				const e = self.adapter.array[pos];
				if (!e.parent) {
					Common.toast(e.name);
				}
				return true;
			} catch(e) {return erp(e), true}}}));
			self.list.setFastScrollEnabled(true);
			self.list.setFastScrollAlwaysVisible(false);
			self.linear.addView(self.list, new G.LinearLayout.LayoutParams(-1, 0, 1.0));

			self.inputbar = new G.LinearLayout(ctx);
			self.inputbar.setOrientation(G.LinearLayout.HORIZONTAL);
			Common.applyStyle(self.inputbar, "bar_float");

			self.fname = new G.EditText(ctx);
			self.fname.setHint(self.intl.fileName);
			self.fname.setSingleLine(true);
			self.fname.setGravity(G.Gravity.LEFT | G.Gravity.CENTER);
			self.fname.setInputType(G.InputType.TYPE_CLASS_TEXT);
			self.fname.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
			Common.applyStyle(self.fname, "edittext_default", 3);
			self.inputbar.addView(self.fname, new G.LinearLayout.LayoutParams(0, -1, 4.0));

			self.exit = new G.TextView(ctx);
			self.exit.setText(Common.intl.ok);
			self.exit.setGravity(G.Gravity.CENTER);
			self.exit.setPadding(10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp);
			Common.applyStyle(self.exit, "button_critical", 3);
			self.exit.setOnClickListener(new G.View.OnClickListener({onClick (v) {try {
				const o = self.sets;
				if (o.type == 1) {
					const fname = String(self.fname.getText());
					if (!fname.length) {
						Common.toast(self.intl.emptyFileName);
						return true;
					}
					const newFile = ExternalStorage.createFile(o.stack[0], fname, o.mimeType);
					if (!newFile) {
						Common.toast(self.intl.invaildFileName);
						return true;
					}
					self.choose(newFile);
				} else if (o.type == 2) {
					self.choose(o.stack[0]);
				} else if (o.type == 3) {
					const selected = self.adapter.array.filter((e) => e.selected);
					self.choose(selected.map((e) => e.uri));
				}
				return true;
			} catch(e) {erp(e)}}}));
			self.inputbar.addView(self.exit, new G.LinearLayout.LayoutParams(0, -2, 1.0));
			self.linear.addView(self.inputbar, new G.LinearLayout.LayoutParams(-1, -2));

			self.popup = new PopupPage(self.linear, "ExternalStorage.FileChooser");

			PWM.registerResetFlag(self, "popup");
		}
		if (o.onDismiss) self.popup.on("exit", o.onDismiss);
		self.sets = o;
		o.result = null;
		try {
			o.stack = [ExternalStorage.toUri(o.initial || self.lastDir || ExternalStorage.getAccessibleRoot())];
			if (!ExternalStorage.canRead(o.stack[0])) {
				o.stack = [ExternalStorage.toUri(ExternalStorage.getAccessibleRoot())];
			}
		} catch (e) {
			Common.toast(self.intl.resolve("errAccessDir", e));
			return;
		}
		if (ExternalStorage.getUriType(o.stack[0]) != "file") {
			o.stack.push(ExternalStorage.toUri(ExternalStorage.getAccessibleRoot()));
		}
		self.title.setText(Common.toString(o.title || self.intl.defaultTitle));
		switch (o.type) {
			case 1: //新建文件（保存）
			self.exit.setVisibility(G.View.VISIBLE);
			self.fname.setVisibility(G.View.VISIBLE);
			self.fname.setText(String(o.defaultFileName || ""));
			break;
			case 2: //选择目录（打开）
			case 3: //选择多个文件（打开）
			self.exit.setVisibility(G.View.VISIBLE);
			self.fname.setVisibility(G.View.GONE);
			break;
			default:
			o.type = 0;
			case 0: //选择文件（打开）
			self.exit.setVisibility(G.View.GONE);
			self.fname.setVisibility(G.View.GONE);
		}
		self.popup.enter();
		self.postRefresh();
	} catch(e) {erp(e)}})}
});