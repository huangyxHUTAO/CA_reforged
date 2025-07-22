const clibspawn = require("../clibspawn");
module.exports = function(context, args) {
	return clibspawn();
}
module.exports.input = "cli";