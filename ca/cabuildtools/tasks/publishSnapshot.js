module.exports = function(context, args) {
	return context.execute("preparePublish")
		.then(context.pipe("publishFile", {
			localPath : "./build/outputs/snapshot/snapshot.json",
			remotePath : "snapshot.json"
		}))
		.then(context.pipe("publishFile", {
			localPath : "./build/outputs/snapshot/snapshot.js",
			remotePath : "snapshot.js"
		}))
		.then(context.pipe("endPublish"));
}
module.exports.input = "cli";