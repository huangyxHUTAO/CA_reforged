module.exports = function(context, args) {
	return context.execute("getBuildConfig", "debug")
		.then(context.task("getShellConfig"))
		.then(context.task("initDirectory", {
			"./build/": {
				"outputs/": [
					"debugApk"
				],
				"dist": ""
			}
		}))
		.then(context.task("shellUpdateGradle"))
		.then(context.task("assembleSource"))
		.then(context.pipe("shellEncryptScriptDebug"))
		.then(context.pipe("shellWriteScript"))
		.then(context.task("shellGradle", ":app:assembleDebug"))
		.then(context.task("shellExportDebugApk"));
}
module.exports.input = "cli";
