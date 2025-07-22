module.exports = function(context, args) {
	return context.execute("getBuildConfig", "release")
		.then(context.task("getUpdateConfig"))
		.then(context.task("initDirectory", {
			"./build/": {
				"outputs/": [
					"releaseSource",
					"release"
				],
				"dist": ""
			}
		}))
		.then(context.task("assembleSourceRelease"))
		.then(context.pipe("compressSource"))
		.then(context.pipe("writeRelease"))
		.then(context.task("writeUpdateRelease"));
}
module.exports.input = "cli";