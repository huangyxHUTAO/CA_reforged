var fs = require("fs");
var process = require("process");
var zlib = require("zlib");

function main(src, dest) {
	var s, o;
	var dh = Buffer.alloc(15), date = Date.now();
	s = src instanceof Buffer ? src : fs.readFileSync(src);
	dh.write("LIBRARY");
	dh.writeInt32BE(Math.floor(date / 0xffffffff), 7);
	dh.writeInt32BE(date & 0xffffffff, 11);
	s = zlib.gzipSync(s);
	o = Buffer.alloc(dh.length + s.length);
	dh.copy(o, 0);
	s.copy(o, dh.length);
	if (dest) fs.writeFileSync(dest, o);
	return o;
}

if (require.main == module) main(process.argv[2], process.argv[3]);
module.exports = main;