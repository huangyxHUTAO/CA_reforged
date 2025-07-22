const fs = require("fs");
const path = require("path");
const process = require("process");
const crypto = require("crypto");
const readConfig = require("./readconfig");
const loader = require("./loader");
const js2lib = require("./js2lib");
const js2signlib = require("./js2signlib");

function main() {
	var indexFile = JSON.parse(fs.readFileSync("./index.json", "utf-8"));
	var config = readConfig(fs.readFileSync("./config.txt", "utf-8"));
	var lockFile;
	try {
		lockFile = JSON.parse(fs.readFileSync("./index.lock.json", "utf-8"));
	} catch(e) {
		lockFile = { clib : {} };
	}
	var map = {};
	var index = indexFile.map(e => {
		var info = resolveLib(e, config);
		console.log("Indexing " + info.name);
		if (info.source) compileLibIfNeeded(info, config, lockFile.clib);
		fs.writeFileSync(info.updatePath, JSON.stringify(toUpdate(info, config)));
		map[info.uuid] = info.updateUrl;
		if (info.private) {
			return null;
		} else {
			return toIndex(info, config);
		}
	}).filter(e => e != null);
	writeIndex(index, config);
	writeMap(map, config);
	writeAuthorities(config);
	writeVerifyKey(config);
	writeInfo(config);
	fs.writeFileSync("./index.lock.json", JSON.stringify(lockFile));
}

/*
如何生成所需的signKey(私钥)和verifyKey(公钥)：
1) 打开openssl
2) genrsa -out 输出私钥文件.pem 密钥位数(e.g. 2048)
3) rsa -in 输出私钥文件.pem -out 输出公钥文件.pub -pubout
*/

function digestSHA1(data) {
	var digest = crypto.createHash("sha1");
	digest.update(data);
	return digest.digest("base64");
}

function resolveLib(info, config) {
	var lib;
	if (info.path) {
		lib = readConfig(fs.readFileSync(path.resolve(info.path, "library.txt"), "utf-8"));
	} else {
		throw new Error("not supported");
	}
	if (lib.source) {
		lib.sourcePath = path.resolve(info.path, lib.source);
		lib.outputPath = path.resolve(config.outputPath, lib.id + ".lib");
		lib.outputUrl = config.outputUrl + lib.id + ".lib";
	} else if (lib.downloadUrl) {
		lib.outputUrl = lib.downloadUrl;
	}
	if (!lib.updateUrl) {
		lib.updatePath = path.resolve(config.outputPath, lib.id + ".json");
		lib.updateUrl = config.outputUrl + lib.id + ".json";
	}
	return lib;
}

function compileLibIfNeeded(info, config, lockfile) {
	var source;
	if (!lockfile[info.id] || lockfile[info.id].version != info.version) { // 文件改变了
		console.log("Compiling " + info.name);
		source = Buffer.from(loader.load(info.sourcePath));
		if (config.signKey) {
			js2signlib(source, config.signKey, info.outputPath);
		} else {
			js2lib(source, info.outputPath);
		}
		lockfile[info.id] = {
			version : info.version
		};
	}
	info.sha1 = digestSHA1(fs.readFileSync(info.outputPath));
}

function toIndex(o, config) {
	var r = {
		"name": o.name,
		"author": o.author,
		"description": o.description,
		"uuid": o.uuid,
		"version": o.versionCode,
		"requirement": o.requirement,
		"downloadurl" : o.outputUrl,
		"updateurl" : o.updateUrl,
		"sha1": o.sha1
	};
	return r;
}

function toUpdate(o, config) {
	var r = {
		"uuid": o.uuid,
		"version": o.versionCode,
		"url": o.outputUrl,
		"message": o.updateMessage,
		"source": config.outputUrl,
		"sha1": o.sha1
	};
	return r;
}

function writeIndex(index, config) {
	var i, pageNo, r, perPage = config.perPage, indexFile;
	console.log("Wrinting Index");
	for (i = 0, pageNo = 0; i < index.length; i += perPage, pageNo++) {
		indexFile = path.resolve(config.outputPath, "index" + (pageNo > 0 ? "-" + pageNo : "") + ".json");
		r = {
			sourceId : config.sourceId,
			pageNo : pageNo,
			content : index.slice(i, i + perPage)
		};
		if (i + perPage < index.length) {
			r.nextPage = config.outputUrl + "index-" + (pageNo + 1) + ".json";
		}
		fs.writeFileSync(indexFile, JSON.stringify(r));
	}
	config.outputIndexUrl = config.outputUrl + "index.json";
	config.outputIndexPageCount = pageNo;
	config.outputIndexLibCount = index.length;
}

function writeMap(map, config) {
	var mapFile = path.resolve(config.outputPath, "map.json");
	config.outputMapUrl = config.outputUrl + "map.json";
	fs.writeFileSync(mapFile, JSON.stringify({
		sourceId : config.sourceId,
		content : map
	}));
}

function writeAuthorities(config) {
	// console.log("Wrinting Authorities...");
	// if (!libs.authorities) libs.authorities = {};
	// for (i in libs.authorities) {
	// 	if (!libs.authorities[i].startsWith("http")) {
	// 		fs.copyFileSync(libs.authorities[i], libs.sourceDir + i + ".key");
	// 		libs.authorities[i] = libs.sourceUrl + i + ".key";
	// 	}
	// }
	// libs.authorities[libs.sourceId] = libs.verifyKey ? libs.sourceUrl + "verify.key" : undefined;
	// fs.writeFileSync(libs.sourceDir + "authorities.json", JSON.stringify({
	// 	sourceId : libs.sourceId,
	// 	content : libs.authorities
	// }));
}

function writeVerifyKey(config) {
	var data, verifyPath;
	if (config.verifyKey) {
		console.log("Wrinting Verify Key");
		data = fs.readFileSync(config.verifyKey, "utf-8").split(/\r?\n/);
		verifyPath = path.resolve(config.outputPath, "verify.key");
		fs.writeFileSync(verifyPath, Buffer.from(data.slice(1, -2).join(""), "base64"));
		config.outputVerifyKeyUrl = config.outputUrl + "verify.key";
	}
}

function writeInfo(config) {
	var infoPath = path.resolve(config.outputPath, "info.json");
	console.log("Writing Info");
	fs.writeFileSync(infoPath, JSON.stringify({
		sourceId : config.sourceId,
		map : config.outputMapUrl,
		index : config.outputIndexUrl,
		indexPages : config.outputIndexPageCount,
		indexLibs : config.outputIndexLibCount,
		pubkey : config.outputVerifyKeyUrl,
		authorities : config.outputAuthoritiesUrl,
		lastUpdate : Date.now(),
		maintainer : config.maintainer || config.outputUrl,
		details : config.details
	}));
}

if (require.main == module) main();
module.exports = main;