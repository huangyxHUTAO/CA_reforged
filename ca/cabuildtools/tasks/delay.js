module.exports = function(context, args) {
	return new Promise(function(resolve, reject) {
		var ms = parseInt(Array.isArray(args) ? args[0] : args);
		if (ms > 0) {
			setTimeout(function() {
				resolve();
			}, ms);
		} else {
			reject(new Error("delay should not be " + ms));
		}
	});
}
module.exports.input = "cli";