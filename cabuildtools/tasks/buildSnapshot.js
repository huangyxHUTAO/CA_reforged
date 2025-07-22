module.exports = function(context, args) {
	return context.execute("getBuildConfig", "snapshot")
		.then(context.task("getUpdateConfig"))
		.then(context.task("initDirectory", {
			"./build/": {
				"outputs/": [
					"snapshotSource",
					"snapshot",
					"snapshotLib"
				],
				"dist": ""
			}
		}))
		.then(context.task("assembleSourceSnapshot"))
		.then(context.pipe("writeSnapshot"))
		.then(context.pipe("writeSnapshotLib"))
		.then(context.task("writeUpdateSnapshot"));
}
module.exports.input = "cli";