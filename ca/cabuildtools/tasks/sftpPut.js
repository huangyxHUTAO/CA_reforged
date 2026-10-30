const ssh2 = require("ssh2");
module.exports = function(context, args) {
	return new Promise(function(resolve, reject) {
		var sftp = args.session.sftp;
		sftp.fastPut(args.localPath, args.remotePath, function(err) {
			if (err) {
				reject(err);
				return;
			}
			resolve();
		});
	});
}