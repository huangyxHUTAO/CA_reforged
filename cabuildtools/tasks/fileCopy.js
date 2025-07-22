const fs = require("fs");
module.exports = function(context, args) {
	return new Promise(function(resolve, reject) {
		fs.copyFile(args.src, args.dest, function(err) {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}