const fs = require("fs");
const path = require("path");
const readConfig = require("../readconfig");

/**
 * 读发布配置：优先 .json，其次 .js（兼容老配置），最后兼容老的 .txt（readConfig 解析）。
 * CA 根目录用 config/publish.json，caclib 子树里那份 config/publish.txt 也能读。
 */
function loadPublishConfig(base) {
	var stem = base.replace(/\.(js|json|txt)$/, "");
	if (fs.existsSync(stem + ".json")) return JSON.parse(fs.readFileSync(stem + ".json", "utf-8"));
	if (fs.existsSync(stem + ".js")) return require(path.resolve(stem + ".js"));
	if (fs.existsSync(stem + ".txt")) return readConfig(fs.readFileSync(stem + ".txt", "utf-8"));
	throw new Error("找不到发布配置：" + base + "（.js / .json / .txt 均可）");
}
var localInterface = {
	enableAsyncUpload : true,
	upload : function(context, args) {
		return context.execute("fileCopy", {
			src : args.localPath,
			dest : this.destRoot + "/" + args.remotePath
		});
	},
	close : function() {}
};
var sftpInterface = {
	enableAsyncUpload : true,
	upload : function(context, args) {
		return context.execute("sftpPut", {
			session : this,
			localPath : args.localPath,
			remotePath : this.remoteRoot + "/" + args.remotePath
		});
	},
	close : function(context) {
		return context.execute("sftpDisconnect", {
			session : this
		});
	}
}
module.exports = function(context, args) {
	var publishCfg;
	context.publishConfig = loadPublishConfig("./config/publish");
	if (args) {
		var name = context.publishConfig[args];
		if (!name) throw new Error("发布配置里没有名为 " + args + " 的目标（检查 config/publish.json）");
		publishCfg = loadPublishConfig(path.resolve("./config", name));
	} else {
		publishCfg = context.publishConfig;
	}
	if (publishCfg.method == "local") {
		return Promise.resolve()
			.then(function(v) {
				var o = Object.create(localInterface);
				o.destRoot = publishCfg.destPath;
				return o;
			});
	} else if (publishCfg.method == "sftp") {
		return context.execute("sftpConnect", publishCfg.sshConfig)
			.then(function(v) {
				var o = Object.create(sftpInterface);
				o.sftp = v.sftp;
				o.connection = v.connection;
				return o;
			});
	} else {
		throw new Error("Unknown publish method: " + publishCfg.method);
	}
}