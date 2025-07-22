const fs = require("fs");
const readConfig = require("../readconfig");
module.exports = function(context, args) {
	var importConfig = readConfig(fs.readFileSync("./config/import.txt", "utf-8")), jarClasses = [];
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