/*LOADER
if (variables.buildConfig.variants == "release") {
	postprocessor = function(src) {
		var jsmin = require("jsmin").jsmin;
		return jsmin(src, 2);
	};
}
*/
Intl.defaultLang = Loader.fromFile("./zh_CN/main.json");
switch (Intl.lookupLang({
	"zh_CN" : {
		language : "zh",
		country : "CN"
	},
	"en_US" : {
		language : "en",
		country : "US"
	}
})) {
	case "en_US":
	Intl.loadLang({
		language : "en",
		country : "US"
	}, Loader.fromFile("./en_US/main.json"), false);
	break;
	default:
	Intl.loadLang({
		language : "zh",
		country : "CN",
		unspecifiedLang : true
	}, {}, false);
}
//这个分号表示这是个代码块而不是表达式;