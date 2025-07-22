const fs = require("fs");
module.exports = function(context, args) {
	fs.writeFileSync("./build/outputs/release/main.js", args[0]);
	fs.copyFileSync("./build/outputs/release/main.js", "./build/dist/命令助手(" + context.buildConfig.date + ").js");
	return args[0];
}