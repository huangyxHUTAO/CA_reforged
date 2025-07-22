#!/usr/bin/env node

const process = require("process");
const fs = require("fs");
const pathUtils = require("path");
var Tasks = require("./tasks");
var Build = {
	execute : function(task, args) {
		console.log("Process " + task);
		return executeTask(task, args)
			.then(result => {
				console.log("Success " + task);
				return result;
			}, reason => {
				console.log("Failed  " + task + " : " + reason);
				throw reason;
			});
	},
	task : function(task, args) {
		return () => this.execute(task, args);
	},
	pipe : function(task, args) {
		return result => this.execute(task, [result, args]);
	},
	loadTasks : function(path) {
		initTasks(path);
	},
	Result : {
		OK : "ok"
	}
}
var context = Build.context = Object.create(Build);
function getFileName(nameWithExt) {
	var p = nameWithExt.lastIndexOf(".");
	return p >= 0 ? nameWithExt.slice(0, p) : nameWithExt;
}
function procArgs() {
	var i, args = process.argv, task, taskArgs = [], time = Date.now();
	task = args[2] || "help";
	for (i = 3; i < args.length; i++) {
		taskArgs.push(args[i]);
	}
	console.log("Process " + task);
	try {
		if (!(task in Tasks)) throw new Error("Task not found: " + task);
		if (Tasks[task].input != "cli") throw new Error("Task is not available in CLI: " + task);
		executeTask(task, taskArgs)
			.then(result => {
				console.log("Success " + task + " in " + ((Date.now() - time) / 1000).toFixed(2) + "s");
				return result;
			}, reason => {
				console.log("Failed  " + task);
				console.log(reason);
				process.exit(1);
			});
	} catch(e) {
		console.log(String(e));
	}
}
function initTasks(path) {
	var i, e, fn, ext, files = fs.readdirSync(path);
	for (i = 0; i < files.length; i++) {
		e = pathUtils.resolve(path, files[i]);
		if (fs.statSync(e).isDirectory()) {
			initTasks(e);
		} else {
			ext = pathUtils.extname(e);
			fn = pathUtils.basename(e, ext);
			if (ext.toLowerCase() == ".js" && fn.length != 0) {
				try {
					Tasks[fn] = require(e);
				} catch(e) {
					console.log("Cannot load task: " + fn + "\n" + e);
				}
			}
		}
	}
}
function executeTask(task, args) {
	if (!(task in Tasks)) throw new Error("Task not found: " + task);
	var result;
	try {
		result = Tasks[task](context, args);
	} catch(e) {
		return Promise.reject(e);
	}
	return result instanceof Promise ? result : Promise.resolve(result);
}
initTasks(pathUtils.resolve(__dirname, "./tasks"));
if (require.main == module) {
	procArgs();
} else {
	module.exports = Build;
}