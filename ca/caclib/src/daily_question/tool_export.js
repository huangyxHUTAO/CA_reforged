var loader = require("../../loader");
var fs = require("fs");
fs.writeFileSync("../DailyQuestion.js", loader.load("./main.js"));
fs.writeFileSync("../../pages/question.html", loader.load("./question.html"));