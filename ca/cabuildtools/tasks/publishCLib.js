const path = require("path");
const fs = require("fs");
module.exports = function(context, args) {
	var config = require(path.resolve("./config.js"));
	return context.execute("preparePublish")
		.then(context.pipe("publishDirectory", {
			localPath : config.outputPath,
			remotePath : "."
		}))
		.then(context.pipe("endPublish"));
}
module.exports.input = "cli";