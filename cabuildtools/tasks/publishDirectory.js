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

function prepareUpload(operations, localPath, remotePath) {
	var files = fs.readdirSync(localPath), newPath;
	files.forEach(e => {
		newPath = path.resolve(localPath, e);
		if (fs.statSync(newPath).isDirectory()) {
			prepareUpload(operations, newPath, remotePath + "/" + e);
		} else {
			operations.push({
				localPath : newPath,
				remotePath : remotePath + "/" + e
			});
		}
	});
	return operations;
}