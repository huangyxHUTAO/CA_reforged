const fs = require("fs");
const path = require("path");
module.exports = function(context, args) {
	var script = path.resolve(context.shellConfig.shellPath, "./app/src/main/assets/script.js");
	fs.writeFileSync(script, args[0]);
}