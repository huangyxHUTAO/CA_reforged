const ssh2 = require("ssh2");
module.exports = function(context, args) {
	return new Promise(function(resolve, reject) {
		var conn = new ssh2.Client();
		conn.on("ready", function() {
			conn.sftp(function(err, sftp) {
				if (err) {
					reject(err);
					return;
				}
				resolve({ sftp : sftp, connection : conn });
			});
		});
		conn.connect(Object.assign({
			readyTimeout : 30000,      // 握手超时，默认 20s，网络差时容易误判
			keepaliveInterval : 15000, // 上传大文件时保活，避免中途被断开
			keepaliveCountMax : 3
		}, args));
	});
}