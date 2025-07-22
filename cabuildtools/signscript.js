const zlib = require("zlib");
module.exports = function(source, signPath, targetPath) {
	// 只做 GZIP，不做签名异或
	return zlib.gzipSync(Buffer.from(source));
}