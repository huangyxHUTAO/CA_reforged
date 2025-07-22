const fs = require("fs");
const path = require("path");
const crc32 = require("../crc32");
function crc32wrap(buffer) {
	return crc32(0, buffer, buffer.length, 0);
}
module.exports = function(context, args) {
	var dexPath = path.resolve(context.shellConfig.shellPath, context.shellConfig.dexPath);
	var crc = crc32wrap(fs.readFileSync(dexPath)).toString(16);
	context.dexCrc = crc;
	return args[0].replace(/\$dexCrc\$/g, crc);
}