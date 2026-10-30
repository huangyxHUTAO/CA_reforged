const fs = require("fs");
const path = require("path");
const vm = require("vm");

var sourceCache = {};
function parseLnCol(str, offset, result) {
	var lfIndex = 0, lnOffset = 0, ln = 0;
	while ((lfIndex = str.indexOf("\n", lnOffset)) >= 0) {
		if (lfIndex > offset) break;
		lnOffset = lfIndex + 1;
		ln++;
	}
	result.lineOffset = ln;
	result.columnOffset = offset - lnOffset;
	return result;
}
function load(sourcePath, parentDef, charset) {
	sourcePath = fs.realpathSync(sourcePath);
	if (sourcePath in sourceCache) return sourceCache[sourcePath];
	var def = Object.create(parentDef || null), testOnly;
	var source = fs.readFileSync(sourcePath, charset || "utf-8");
	var sandboxSource = source, sourceUpdated = false;
	var parent = path.resolve(sourcePath, "../");
	var sandbox = vm.createContext({
		fs : fs, path : path,
		get source() {
			return sandboxSource;
		},
		set source(v) {
			sandboxSource = v;
			sourceUpdated = true;
		},
		sourceParent : parent,
		sourcePath : sourcePath,
		replacement : "",
		postprocessor : null,
		variables : def,
		define : function(key, value) {
			def[key] = value;
		},
		undefine : function(key) {
			delete def[key];
		},
		isDefined : function(key) {
			return key in def;
		},
		getDef : function(key) {
			return def[key];
		},
		load : function(sourcePath, cs) {
			return load(path.resolve(parent, sourcePath), def, cs || charset);
		},
		require : function(modulePath, relativeToLoader) {
			if (path.basename(modulePath) != modulePath && !relativeToLoader) {
				modulePath = path.resolve(parent, modulePath);
			}
			return require(modulePath);
		},
		requireFromLoader : function(modulePath) {
			return require(modulePath);
		},
		TestOnly : function() {
			testOnly = true;
		}
	});
	source = source.replace(/\/\*LOADER\s([\s\S]+?)\*\//g, function(match, code, offset) {
		sandbox.replacement = "";
		vm.runInContext(code, sandbox, parseLnCol(source, offset + 9, {
			filename : sourcePath
		}));
		return sandbox.replacement;
	});
	if (testOnly) return "";
	if (sourceUpdated) source = sandboxSource;
	source = source.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.split("\n")
		.map(e => e.replace(/Loader.fromFile\((".+")\)/g, function(match, mpath) {
			var res, frontSpace = e.match(/^\s*/);
			mpath = JSON.parse(mpath);
			res = load(parent ? parent + "/" + mpath : mpath, def, charset).split("\n");
			if (frontSpace) {
				res = res.map(e => frontSpace[0] + e);
			}
			return res.join("\n");
		}))
		.join("\n");
	if (sandbox.postprocessor) {
		source = sandbox.postprocessor(source);
	}
	return sourceCache[sourcePath] = source;
}
module.exports = {
	load : load
};