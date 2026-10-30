const fs = require("fs");
module.exports = function(context, args) {
	fs.writeFileSync("./build/outputs/release/update.json", JSON.stringify({
		"time": context.buildConfig.publishTime,
		"version": context.buildConfig.date,
		"belongs": context.buildConfig.version,
		"info": context.buildConfig.description,
		"downloads": context.updateConfig.downloadSource
	}));
}