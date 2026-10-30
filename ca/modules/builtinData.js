/*LOADER
if (variables.buildConfig.variants == "release") {
	postprocessor = function(src) {
		var jsmin = require("jsmin").jsmin;
		return jsmin(src, 2);
	};
}
*/
CA.Library.recommended = ["default", "addition", "basicedu"];
CA.Library.inner["default"] = Loader.fromFile("../data/idlibs/default.json");
CA.Library.inner["addition"] = Loader.fromFile("../data/idlibs/addition.json");
CA.Library.inner["education"] = Loader.fromFile("../data/idlibs/education.json");
CA.Library.inner["experiment"] = Loader.fromFile("../data/idlibs/experiment.json");
CA.Library.inner["basicedu"] = Loader.fromFile("../data/idlibs/basicedu.json");
// JSON Schema 包：给 jsonPro 参数提供补全/校验用的 schema
CA.Library.inner["JSONSchema"] = Loader.fromFile("../data/idlibs/JSONSchema.json");
CA.Library.inner["states"] = Loader.fromFile("../data/idlibs/states.json");
CA.Library.defaultDisabled = Object.keys(CA.Library.inner).filter(function(e) { 
	return CA.Library.recommended.indexOf(e) < 0;
});

Common.themelist = (function(list) {
	Object.keys(list).forEach(function(k) {
		if (list[k].nameKey) {
			list[k].name = Intl.get(list[k].nameKey);
			delete list[k].nameKey;
		}
	});
	return list;
})(Loader.fromFile("../data/theme.json"));

CA.tips = CA.defalutTips = Loader.fromFile("../data/tips.json");