const fs = require("fs");
const path = require("path");

module.exports = function(context, args) {
	var operations = prepareUpload([], args[1].localPath, args[1].remotePath);
	if (args[0].enableAsyncUpload) {
		return Promise.all(operations.map(e => {
			console.log("Publishing " + e.remotePath);
			return args[0].upload(context, e);
		})).then(() => args[0]);
	} else {
		return Promise.resolve(0)
			.then(function executor(index) {
				if (index < operations.length) {
					console.log("Publishing " + operations[index].remotePath);
					return args[0].upload(context, operations[index])
						.then(e => executor(index + 1));
				} else {
					return args[0];
				}
			})
	}
}

// fs.globSync（Node 22+）一次列出一层下的所有条目，省掉手写递归。
// 用 {*,.*} 是因为 glob 默认跳过以点开头的条目；但 ** 不会深入隐藏目录，
// 所以遇到隐藏目录再单独递归进去（构建产物里一般没有，兜底用）。
function prepareUpload(operations, localPath, remotePath) {
	var seen = Object.create(null);
	function addFile(entry) {
		var absolute = path.join(entry.parentPath, entry.name);
		var relative = path.relative(localPath, absolute);
		// 隐藏目录靠递归兜底时会和通配结果重叠，这里按相对路径去重
		if (seen[relative]) return;
		seen[relative] = true;
		operations.push({
			localPath : absolute,
			remotePath : remotePath + "/" + relative.split(path.sep).join("/")
		});
	}
	function collect(dir) {
		fs.globSync("**/{*,.*}", { cwd : dir, withFileTypes : true }).forEach(function(entry) {
			if (!entry.isDirectory()) {
				addFile(entry);
			} else if (entry.name.charAt(0) === ".") {
				collect(path.join(entry.parentPath, entry.name));
			}
		});
	}
	collect(localPath);
	return operations;
}
