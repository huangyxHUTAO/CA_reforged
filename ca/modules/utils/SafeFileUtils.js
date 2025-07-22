MapScript.loadModule("SafeFileUtils", {
	read : function(file) {
		var safeFile = this.getSafeFile(file);
		try {
			if (safeFile.isFile()) {
				return this.readUnsafe(safeFile);
			}
		} catch(e) {Log.e(e)}
		try {
			if (file.isFile()) {
				return this.readUnsafe(file);
			}
		} catch(e) {Log.e(e)}
		return null;
	},
	readText : function(file, defaultValue) {
		var result = this.read(file);
		return result ? this.bytesToStr(result) : defaultValue;
	},
	readJSON : function(file, defaultValue) {
		var result = this.readText(file, null);
		if (result != null) {
			try {
				return eval("(" + result + ")");
			} catch(e) {Log.e(e)}
		}
		return defaultValue;
	},
	write : function(file, bytes, off, len) {
		var safeFile = this.getSafeFile(file);
		var fbytes = this.gzipBytes(bytes, off, len);
		this.writeBytes(safeFile, fbytes);
		this.writeBytes(file, fbytes);
	},
	writeText : function(file, str) {
		return this.write(file, this.strToBytes(str));
	},
	writeJSON : function(file, json) {
		return this.writeText(file, MapScript.toSource(json));
	},
	delete : function(file) {
		var safeFile = this.getSafeFile(file);
		if (file.exists() && !file.delete()) return false;
		if (safeFile.exists() && !safeFile.delete()) return false;
		return true;
	},
	
	getSafeFile : function(file) {
		return new java.io.File(file.getPath() + ".new");
	},
	readUnsafe : function(file) {
		var BUFFER_SIZE = 2048;
		var stream, os, buf, hr;
		stream = new java.util.zip.GZIPInputStream(new java.io.FileInputStream(file));
		os = new java.io.ByteArrayOutputStream();
		buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, BUFFER_SIZE);
		while ((hr = stream.read(buf)) > 0) os.write(buf, 0, hr);
		stream.close();
		return os.toByteArray();
	},
	writeUnsafe : function(file, bytes, off, len) {
		var stream, os;
		if (isNaN(off)) off = 0;
		if (isNaN(len)) len = bytes.length - off;
		stream = new java.util.zip.GZIPOutputStream(new java.io.FileOutputStream(file));
		stream.write(bytes, off, len);
		stream.close();
	},
	readBytes : function(file) {
		var BUFFER_SIZE = 2048;
		var stream, os, buf, hr;
		stream = new java.io.FileInputStream(file);
		os = new java.io.ByteArrayOutputStream();
		buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, BUFFER_SIZE);
		while ((hr = stream.read(buf)) > 0) os.write(buf, 0, hr);
		stream.close();
		return os.toByteArray();
	},
	writeBytes : function(file, bytes, off, len) {
		var stream, os;
		if (isNaN(off)) off = 0;
		if (isNaN(len)) len = bytes.length - off;
		stream = new java.io.FileOutputStream(file);
		stream.write(bytes, off, len);
		stream.close();
	},
	gzipBytes : function(bytes, off, len) {
		var stream, bs;
		if (isNaN(off)) off = 0;
		if (isNaN(len)) len = bytes.length - off;
		bs = new java.io.ByteArrayOutputStream();
		stream = new java.util.zip.GZIPOutputStream(bs);
		stream.write(bytes, off, len);
		stream.close();
		return bs.toByteArray();
	},
	ungzipBytes : function(bytes, off, len) {
		const BUFFER_SIZE = 2048;
		var is, os, buf, hr;
		if (isNaN(off)) off = 0;
		if (isNaN(len)) len = bytes.length - off;
		is = new java.util.zip.GZIPInputStream(new java.io.ByteArrayInputStream(bytes, off, len));
		os = new java.io.ByteArrayOutputStream();
		buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, BUFFER_SIZE);
		while ((hr = is.read(buf)) > 0) os.write(buf, 0, hr);
		is.close();
		return os.toByteArray();
	},
	strToBytes : function(str, charset) {
		var s = new java.lang.String(str);
		return charset ? s.getBytes(charset) : s.getBytes();
	},
	bytesToStr : function(bytes, off, len, charset) {
		if (isNaN(off)) off = 0;
		if (isNaN(len)) len = bytes.length - off;
		if (charset) {
			return String(new java.lang.String(bytes, off, len, charset));
		} else {
			return String(new java.lang.String(bytes, off, len));
		}
	}
});