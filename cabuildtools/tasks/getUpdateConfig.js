const fs = require("fs");
const readConfig = require("../readconfig");

module.exports = function(context, args) {
	context.updateConfig = readConfig(fs.readFileSync("./config/update.txt", "utf-8"));
}