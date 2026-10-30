var fs = require("fs");
var process = require("process");
var zlib = require("zlib");
var crypto = require("crypto");
var js2lib = require("./js2lib");

function main(src, prvkey, dest) {	
	var s = js2lib(src), prv = fs.readFileSync(prvkey), o;
	var dh1 = Buffer.alloc(9);
	var sign = crypto.createSign("RSA-SHA256");
	sign.update(s.slice(7));
	var dh2 = sign.sign(prv.toString());
	dh1.write("SIGNLIB01");
	o = Buffer.alloc(dh1.length + dh2.length + s.length - 7);
	dh1.copy(o, 0);
	dh2.copy(o, dh1.length);
	s.copy(o, dh1.length + dh2.length, 7);
	if (dest) fs.writeFileSync(dest, o);
	return o;
}

if (require.main == module) main(process.argv[2], process.argv[3], process.argv[4]);
module.exports = main;