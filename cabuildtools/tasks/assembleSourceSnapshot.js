const fs = require("fs");
const loader = require("../loader");
module.exports = function(context, args) {
	var result = loader.load("./main.js", { buildConfig : context.buildConfig });
	fs.writeFileSync("./build/outputs/snapshotSource/main.js", result);
	return result;
}