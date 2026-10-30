const fs = require("fs");
const zlib = require("zlib");
module.exports = function(source, signPath, targetPath) {
	var srcbuf = zlib.gzipSync(Buffer.from(source));
	var sgnbuf = fs.readFileSync(signPath);
	var i, srcsize = srcbuf.length, sgnsize = sgnbuf.length;
	for (i = 0; i < srcsize; i++) {
		srcbuf[i] ^= sgnbuf[i % sgnsize];
	}
	return srcbuf;
}