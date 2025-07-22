const fs = require("fs");
const path = require("path");
const readConfig = require("../readconfig");
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
	context.publishConfig = readConfig(fs.readFileSync("./config/publish.txt", "utf-8"));
	if (args) {
		publishCfg = readConfig(fs.readFileSync(path.resolve("./config", context.publishConfig[args]), "utf-8"));
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