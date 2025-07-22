const fs = require("fs");
function rmdir(path) {
	if (!fs.existsSync(path)) return;
	var e, files = fs.readdirSync(path);
	for (e of files) {
		if (fs.statSync(path + "/" + e).isDirectory()) {
			rmdir(path + "/" + e);
		} else {
			fs.unlinkSync(path + "/" + e);
		}
	}
	fs.rmdirSync(path);
}
module.exports = function(context, args) {
	rmdir("./build");
}
module.exports.input = "cli";