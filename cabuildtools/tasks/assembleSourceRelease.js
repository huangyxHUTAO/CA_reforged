const fs = require("fs");
const loader = require("../loader-ast");
module.exports = function(context, args) {
	var result = loader.load("./main.js", { buildConfig : context.buildConfig });
	fs.writeFileSync("./build/outputs/releaseSource/main.js", result);
	return result;
}