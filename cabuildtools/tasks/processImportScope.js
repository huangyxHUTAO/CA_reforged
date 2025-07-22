const fs = require("fs");
function escapeRegExp(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
function searchClasses(src, scopeName) {
	var regex = new RegExp("\\W" + escapeRegExp(scopeName) + "\\.(\\w+)", "g");
	var r = [], match;
	while (match = regex.exec(src)) {
		if (r.indexOf(match[1]) < 0) r.push(match[1]);
	}
	return r;
}
function peekClass(name, classes, packages) {
	var i, path;
	for (i = 0; i < packages.length; i++) {
		path = packages[i] + "." + name;
		if (classes.indexOf(path) >= 0) return path;
	}
	return null;
}
function locateClasses(names, classes, packages) {
	var i, r = {};
	names.forEach(e => {
		r[e] = peekClass(e, classes, packages);
	});
	return r;
}
module.exports = function(context, args) {
	var param = args[1];
	var target = fs.readFileSync(param.target, "utf-8");
	var names = searchClasses(args[0], param.scopeName);
	var classes = locateClasses(names, param.classes, param.packages);
	names = names.filter(e => {
		if (classes[e] != null) {
			return true;
		} else {
			console.log("Unknown class: " + param.scopeName + "." + e);
			return false;
		}
	});
	names.sort();
	names = names.map(e => "\t" + e + ": " + classes[e]);
	target = target.replace(/\/\/IMPORTS_BEGIN\n([^]*?)\n\/\/IMPORTS_END/, "//IMPORTS_BEGIN\n" + names.join(",\n") + "\n//IMPORTS_END");
	fs.writeFileSync(param.target, target);
}