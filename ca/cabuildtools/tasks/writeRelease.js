const fs = require("fs");
module.exports = function(context, args) {
	fs.writeFileSync("./build/outputs/release/main.js", args[0]);
	var channel = context.buildConfig.channel,
		suffix = " " + channel;
	fs.copyFileSync("./build/outputs/release/main.js", "./build/dist/命令助手(" + context.buildConfig.date + ")" + suffix + ".js");
	return args[0];
}