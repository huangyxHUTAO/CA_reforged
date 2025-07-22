const path = require("path");
const signscript = require("../signscript");
module.exports = function(context, args) {
	var signPath = path.resolve(context.shellConfig.shellPath, context.shellConfig.releaseSignPath);
	return signscript(args[0], signPath);
}