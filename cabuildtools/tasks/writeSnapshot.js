const fs = require("fs");
const zlib = require("zlib");
module.exports = function(context, args) {
	fs.writeFileSync("./build/outputs/snapshot/snapshot.js", zlib.gzipSync(Buffer.from(args[0])));
	return args[0];
}