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
		console.log("\nTo run a build, run cabuild <task> ...");
		console.log("\nTo see a list of available tasks, run cabuild tasks");
		console.log("\nTo see more detail of a task, run cabuild help <task>");
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