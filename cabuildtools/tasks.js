var Tasks = {};

const PACKAGE = JSON.parse(require("fs").readFileSync(__dirname + "/package.json", "utf-8"));

Tasks.help = function(context, args) {
	if (args[0]) {
		var task;
		if (!(args[0] in Tasks)) throw new Error("Task not found: " + args[0]);
		console.log("Task : " + args[0]);
		task = Tasks[args[0]];
		if (typeof task.help == "function") {
			task.help(args);
		} else {
			console.log(task.help || "(Nothing)");
		}
	} else {
		console.log("CA Build Tools " + PACKAGE.version);
		console.log("\nUsage: cabuild <task> [args...]");
		console.log("\nAvailable Tasks:");
		
		// 显示所有 CLI 可用的任务
		var cliTasks = [], otherTasks = [];
		for (var i in Tasks) {
			if (Tasks[i].input == "cli") {
				cliTasks.push(i);
			} else {
				otherTasks.push(i);
			}
		}
		
		cliTasks.sort().forEach(function(name) {
			var task = Tasks[name];
			var desc = "";
			if (typeof task.help == "string") {
				desc = task.help.split("\n")[0] || "";
			}
			console.log("  " + name.padEnd(20) + " " + desc);
		});
		
		console.log("\n" + cliTasks.length + " task(s) available.");
		console.log("\nRun 'cabuild help <task>' for more detail of a task.");
	}
}
Tasks.help.input = "cli";
Tasks.help.help = function() {
	console.log("cabuild help - Show help message of tool");
	console.log("cabuild help <task> - Show help message of a task");
}

Tasks.tasks = function(context, args) {
	var i, showAll = args[0] == "all", result = [];
	for (i in Tasks) {
		if (showAll || Tasks[i].input == "cli") {
			result.push(i);
		}
	}
	console.log("All Tasks:");
	console.log("  " + result.join("\n  "));
	console.log(result.length + " task(s).");
}
Tasks.tasks.input = "cli";
Tasks.tasks.help = function() {
	console.log("cabuild tasks - Show all available tasks");
	console.log("cabuild tasks all - Show all tasks");
}

module.exports = Tasks;