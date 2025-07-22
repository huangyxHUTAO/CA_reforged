const fs = require("fs");
const jszip = require("jszip");
function getShortName(name) {
	var i = name.lastIndexOf(".");
	return i >= 0 ? name.slice(i + 1) : name;
}
module.exports = function(context, args) {
	var r = args[0], param = args[1];
	return jszip.loadAsync(fs.readFileSync(param.path)).then(zf => {
		zf.forEach((path, entry) => {
			var name;
			if (path.endsWith(".class") || path.endsWith(".java")) {
				name = path.replace(/\.\w+$/, "").replace(/\//g, ".").replace(/\$/g, ".");
				if (/^\d/.test(getShortName(name))) return;
				if (r.indexOf(name) < 0) r.push(name);
			}
		});
		return r;
	});
}