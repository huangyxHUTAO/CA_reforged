const path = require("path");
const shellconfig = require("../shellconfig");
module.exports = function(context, args) {
	// 解析 config/import.json（androidJarPath 留空时自动找 SDK 里最新的 platform）
	var importConfig = shellconfig.importConfig(path.resolve(".")), jarClasses = [];
	shellconfig.writeGenerated("./build/generated/importConfig.json", importConfig);
	return context.execute("getBuildConfig", "inspect")
		.then(context.task("readJarClasses", [jarClasses, {
			path : importConfig.androidJarPath
		}]))
		.then(context.task("assembleSource"))
		.then(context.pipe("processImportScope", {
			target : "./modules/uiCore/G.js",
			scopeName : "G",
			classes : jarClasses,
			packages : [
				"android",
				"android.widget",
				"android.view",
				"android.view.animation",
				"android.view.inputmethod",
				"android.animation",
				"android.app",
				"android.content",
				"android.graphics",
				"android.graphics.drawable",
				"android.media",
				"android.os",
				"android.text",
				"android.text.format",
				"android.text.method",
				"android.text.style",
				"android.webkit"
			]
		}));
}
module.exports.input = "cli";