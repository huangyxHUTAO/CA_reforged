module.exports = function(context, args) {
	return context.execute("getBuildConfig", "release")
		.then(context.task("getUpdateConfig"))
		.then(context.task("getShellConfig"))
		.then(context.task("initDirectory", {
			"./build/": {
				"outputs/": [
					"releaseSource",
					"hotfix",
					"hotfixLib"
				],
				"dist": ""
			}
		}))
		.then(context.task("shellUpdateGradle"))
		.then(context.task("assembleSourceRelease"))
		.then(context.pipe("shellPrepareHotfix"))
		.then(context.pipe("shellEncryptScriptRelease"))
		.then(context.pipe("shellWriteHotfix"))
		.then(context.pipe("shellWriteHotfixSign"))
		.then(context.pipe("shellWriteHotfixLib"))
		.then(context.task("shellWriteUpdate"));
}
module.exports.input = "cli";