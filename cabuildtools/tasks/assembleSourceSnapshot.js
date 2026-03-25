const fs = require("fs");
const loader = require("../loader-ast");
module.exports = function(context, args) {
	var result = loader.load("../ca/main.js", { buildConfig : context.buildConfig }, "utf-8", { transformAsync: true });
	fs.writeFileSync("./build/outputs/snapshotSource/main.js", result);
	return result;
}