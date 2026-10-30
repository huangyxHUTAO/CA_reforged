const fs = require("fs");
const zlib = require("zlib");
module.exports = function(context, args) {
	var name = context.buildConfig.variants + ".js";
	fs.writeFileSync("./build/outputs/snapshot/" + name, zlib.gzipSync(Buffer.from(args[0])));
	return args[0];
}