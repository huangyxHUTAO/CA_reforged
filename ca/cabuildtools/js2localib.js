const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * 把 SIGNLIB01（分发格式）转成本地格式 LIBSIGN01 + .hash，
 * 也就是 App 在 downloadLib 里做的事（CA.Library.js）。
 *
 * 用法：
 *   node ./cabuildtools/js2localib.js <输入.lib> <源站 uuid> <输出.lib> [app 公钥]
 *
 * app 公钥 = App 内置的 ScriptInterface.getVerifyKey()，在 cadroid 的
 *   app/src/main/java/config/standard/Secret.java 里（HOTFIX_PUBLIC_KEY，Base64 DER）。
 * 支持 PEM 或 Base64 DER 两种写法；不传就是只生成 LIBSIGN01、不写 .hash。
 *
 * LIBSIGN01 结构：
 *   "LIBSIGN01"(9) + int32BE(sourceId 长度)(4) + sourceId + SIGNLIB01 的 [9..]（签名+时间戳+gzip）
 * .hash = SHA1( appVerifyKey || SHA1(payload) )，payload 即上面那段 [9..]
 */

function loadPublicKey(text) {
	text = text.replace(/-----BEGIN PUBLIC KEY-----/, "")
		.replace(/-----END PUBLIC KEY-----/, "")
		.replace(/\s+/g, "");
	return Buffer.from(text, "base64");
}

function main(src, sourceId, dest, pubkeyPath) {
	var raw = fs.readFileSync(src),
		payload, idBytes, lenBuf, out, hashPath;
	if (raw.slice(0, 9).toString() !== "SIGNLIB01") {
		throw new Error("输入不是 SIGNLIB01：" + src);
	}
	payload = raw.slice(9);
	idBytes = Buffer.from(String(sourceId || ""), "utf-8");
	lenBuf = Buffer.alloc(4);
	lenBuf.writeInt32BE(idBytes.length, 0);
	out = Buffer.concat([Buffer.from("LIBSIGN01"), lenBuf, idBytes, payload]);
	fs.writeFileSync(dest, out);
	if (pubkeyPath) {
		var pub = loadPublicKey(fs.readFileSync(pubkeyPath, "utf-8"));
		var h1 = crypto.createHash("sha1").update(payload).digest();
		var h = crypto.createHash("sha1").update(pub).update(h1).digest();
		hashPath = dest + ".hash";
		fs.writeFileSync(hashPath, h);
	}
	return out;
}

if (require.main == module) {
	try {
		var out = main(process.argv[2], process.argv[3], process.argv[4], process.argv[5]);
		console.log("LIBSIGN01 已生成：" + process.argv[4] + "（" + out.length + " 字节）");
		if (process.argv[5]) console.log("已写入 .hash：" + process.argv[4] + ".hash");
	} catch(e) {
		console.log("失败：" + e.message);
		process.exit(1);
	}
}
module.exports = main;
module.exports.loadPublicKey = loadPublicKey;
