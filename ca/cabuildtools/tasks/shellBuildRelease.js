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
		// 先构建一次 release 以拿到 classes.dex（CRC 要写进脚本）。
		// 注意：AGP 8 没有 :app:buildRelease 这个任务，只有 assembleRelease。
		.then(context.task("shellGradle", ":app:assembleRelease"))
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