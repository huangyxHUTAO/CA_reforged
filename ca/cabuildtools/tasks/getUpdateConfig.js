const path = require("path");

module.exports = function(context, args) {
	context.updateConfig = require(path.resolve("./config/update-sources.json"));
}
