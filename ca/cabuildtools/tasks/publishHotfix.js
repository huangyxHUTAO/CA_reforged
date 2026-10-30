module.exports = function(context, args) {
	return context.execute("preparePublish")
		.then(context.pipe("publishFile", {
			localPath : "./build/outputs/hotfix/release.js",
			remotePath : "hotfix/release.js"
		}))
		.then(context.pipe("publishFile", {
			localPath : "./build/outputs/hotfix/release.sign",
			remotePath : "hotfix/release.sign"
		}))
		.then(context.pipe("publishFile", {
			localPath : "./build/outputs/hotfix/hotfix.json",
			remotePath : "hotfix.json"
		}))
		.then(context.pipe("endPublish"));
}
module.exports.input = "cli";