module.exports = function(context, args) {
	return context.execute("getBuildConfig", "release")
		.then(context.task("getUpdateConfig"))
		.then(context.task("getShellConfig"))
		.then(context.task("initDirectory", {
			"./build/": {
				"outputs/": [
					"releaseSource",
					"releaseApk",
					"hotfix",
					"hotfixLib"
				],
				"dist": ""
			}
		}))
		.then(context.task("shellUpdateGradle"))
		.then(context.task("shellGradle", ":app:buildRelease"))
		.then(context.task("assembleSourceRelease"))
		.then(function self(script) {
			return context.execute("shellAddDexVerify", [script])
				.then(context.pipe("shellEncryptScriptRelease"))
				.then(context.pipe("shellWriteScript"))
				.then(context.task("shellPrepareHotfix", [script]))
				.then(context.pipe("shellEncryptScriptRelease"))
				.then(context.pipe("shellWriteHotfix"))
				.then(context.pipe("shellWriteHotfixSign"))
				.then(context.pipe("shellWriteHotfixLib"))
				.then(context.task("shellGradle", ":app:assembleRelease"))
				.then(context.pipe("shellCheckDexUnchanged"))
				.then(unchanged => unchanged ? null : self(script));
		})
		.then(context.task("shellAlignApk"))
		.then(context.task("shellSignApk"))
		.then(context.task("shellExportApk"))
		.then(context.task("shellWriteUpdate"));
}
module.exports.input = "cli";