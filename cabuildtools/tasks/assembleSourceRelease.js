const fs = require("fs");
const loader = require("../loader-ast");
module.exports = function(context, args) {
	console.log("[assembleSourceRelease] 开始编译，transformAsync: true");
	var result = loader.load("../ca/main.js", { buildConfig : context.buildConfig }, "utf-8", { transformAsync: true });
	console.log("[assembleSourceRelease] 编译完成，包含 _asyncToGenerator: " + result.includes("_asyncToGenerator"));
	fs.writeFileSync("./build/outputs/releaseSource/main.js", result);
	return result;
};
