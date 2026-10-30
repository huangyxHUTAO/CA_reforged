module.exports = function(context, args) {
	return context.execute("getBuildConfig", "debug")
		.then(context.task("getShellConfig"))
		.then(context.task("shellUpdateGradle"))
		.then(context.task("assembleSource"))
		.then(context.pipe("shellEncryptScriptDebug"))
		.then(context.pipe("shellWriteScript"));
}
module.exports.input = "cli";