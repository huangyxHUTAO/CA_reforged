const fs = require("fs");
const path = require("path");
function flatten(prefix, o, target) {
	var i;
	if (Array.isArray(o)) {
		for (i in o) {
			if (typeof o[i] == "string") {
				target.push(prefix + o[i]);
			} else {
				flatten(prefix, o[i], target);
			}
		}
	} else {
		for (i in o) {
			if (typeof o[i] == "string") {
				target.push(prefix + i + o[i]);
			} else {
				flatten(prefix + i, o[i], target);
			}
		}
	}
	return target;
}
function flattenDir(o) {
	var target = [];
	flatten("", o, []).map(e => path.resolve(e)).forEach(e => {
		var nodes = [e], parent;
		while(1) {
			parent = path.resolve(nodes[0], "../");
			if (parent && parent != nodes[0]) {
				nodes.unshift(parent);
			} else {
				break;
			}
		}
		nodes.forEach(e => {
			if (!target.includes(e)) target.push(e);
		});
	});
	return target;
}
module.exports = function(context, args) {
	flattenDir(args).forEach(e => {
		if (fs.existsSync(e)) {
			if (!fs.statSync(e).isDirectory()) {
				throw new Error("Cannot create directory " + e);
			}
		} else {
			fs.mkdirSync(e);
		}
	})
}