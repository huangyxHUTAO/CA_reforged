module.exports = function(context, args) {
	return context.execute("preparePublish")
		.then(context.pipe("publishFile", {
			localPath : "./build/outputs/release/update.json",
			remotePath : "update.json"
		}))
		.then(context.pipe("endPublish"));
}
module.exports.input = "cli";