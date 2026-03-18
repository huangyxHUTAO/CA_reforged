const fs = require("fs");
const loader = require("../loader-ast");
module.exports = function(context, args) {
	var result = loader.load("./main.js", { buildConfig : context.buildConfig });
	return result;
};
