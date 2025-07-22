const fs = require("fs");
const readConfig = require("../readconfig");
module.exports = function(context, args) {
	var config = readConfig(fs.readFileSync("./config.txt", "utf-8"));
	return context.execute("preparePublish")
		.then(context.pipe("publishDirectory", {
			localPath : config.outputPath,
			remotePath : "."
		}))
		.then(context.pipe("endPublish"));
}
module.exports.input = "cli";