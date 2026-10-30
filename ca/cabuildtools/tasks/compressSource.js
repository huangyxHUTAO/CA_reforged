const zlib = require("zlib");
module.exports = function(context, args) {
	var b = Buffer.from(args[0]);
	b = zlib.gzipSync(b); //GZIP压缩
	var r = '"ui";\nvar a=new java.io.BufferedReader(new java.io.InputStreamReader(new java.util.zip.GZIPInputStream(new java.io.ByteArrayInputStream(android.util.Base64.decode("' + b.toString("base64") + '",2))))),b=[],c;while(c=a.readLine())b.push(c);a.close();eval(b.join("\\n"));';
	return r;
}