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
		conn.connect(args);
	});
}