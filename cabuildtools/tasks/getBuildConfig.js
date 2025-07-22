const fs = require("fs");
const readConfig = require("../readconfig");

module.exports = function(context, args) {
	context.buildConfig = readConfig(fs.readFileSync("./config/build.txt", "utf-8"));
	context.buildConfig.variants = args;
	context.buildConfig.publishTime = Date.now();
}