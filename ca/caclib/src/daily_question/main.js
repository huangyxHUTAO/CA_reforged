Plugins.inject(function(host) {
/*LOADER
fs.writeFileSync("./outputs/question.html", load("./question.html")); // 导出网页版本
*/
host.name = "每日问题";
host.author = "ProjectXero";
host.version = [1, 0, 1];
host.uuid = "9ab8c0af-8749-4758-9e96-c25d340c9ee3";
host.description = "每日一问题，提升你的命令水平";
host.init = function() {
	Plugins.addMenu({
		text : "每日问题",
		onclick : function() {
			show();
		}
	});
}
var Verify = Loader.fromFile("./verify.js");
var contentView = {}, popup, ans, curq;
function initView() {
	contentView.main = L.ScrollView({
		fillViewport : true,
		style : "message_bg",
		child : L.LinearLayout({
			orientation : L.LinearLayout("vertical"),
			layout : { width : -1, height : -1 },
			padding : [15 * G.dp, 15 * G.dp, 15 * G.dp, 0],
			children : [
				L.TextView({
					text : "每日问题",
					padding : [0, 0, 0, 10 * G.dp],
					layout : { width : -1, height : -2 },
					gravity : L.Gravity("center"),
					style : "textview_default",
					fontSize : 4
				}),
				contentView.problem = L.TextView({
					padding : [0, 0, 0, 10 * G.dp],
					layout : { width : -1, height : -2 },
					gravity : L.Gravity("center"),
					style : "textview_default",
					fontSize : 3
				}),
				contentView.answer = L.EditText({
					padding : [0, 0, 0, 0],
					imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
					style : "edittext_default",
					fontSize : 2,
					gravity : L.Gravity("top|start"),
					layout : { width : -1, height : 0, weight : 1.0 }
				}),
				L.TextView({
					text : "提交答案",
					padding : [20 * G.dp, 10 * G.dp, 20 * G.dp, 10 * G.dp],
					gravity : L.Gravity("center"),
					layout : { width : -1, height : -2 },
					style : "button_critical",
					fontSize : 4,
					onClick : function() {
						ans = String(contentView.answer.getText());
						if (checkAnswer(ans)) {
							popup.exit();
						} else {
							Common.toast("答案错误");
						}
					}
				}),
				L.TextView({
					text : "关闭",
					padding : [20 * G.dp, 10 * G.dp, 20 * G.dp, 10 * G.dp],
					gravity : L.Gravity("center"),
					layout : { width : -1, height : -2 },
					style : "button_critical",
					fontSize : 4,
					onClick : function() {
						popup.exit();
					}
				}),
				contentView.about = L.TextView({
					padding : [5 * G.dp, 5 * G.dp, 5 * G.dp, 15 * G.dp],
					layout : { width : -1, height : -2 },
					gravity : L.Gravity("center"),
					style : "textview_default",
					fontSize : 2
				})
			]
		})
	});
	popup = new PopupPage(contentView.main, "dailyquestion.Main");
	popup.on("exit", function() {
		if (host.settings) {
			host.settings.lastInput = String(contentView.answer.getText());
			host.settings.lastExpired = Verify.getNextUpdateTime().getTime();
		}
	});
	PWM.registerResetFlag(contentView, "main");
}
function fixZero(s, n) {
	s = String(s);
	return n > s.length ? fixZero("0" + s, n) : s;
}
function toChineseDateTime(date) {
	return date.getFullYear() + "年" + (date.getMonth() + 1) + "月" + date.getDate() + "日 " + fixZero(date.getHours(), 2) + ":" + fixZero(date.getMinutes(), 2) + ":" + fixZero(date.getSeconds(), 2);
}
function updateView() {
	contentView.problem.setText(curq.question);
	contentView.answer.setText(ans);
	contentView.answer.setHint(curq.answerType == "number" ? "请使用一个数字来解答以下问题（允许使用1.203e56这样的科学表示法）" : "请使用一句命令来解答以下问题（如非必要，请不要使用嵌套命令）");
	contentView.about.setText("下次更换问题于" + toChineseDateTime(Verify.getNextUpdateTime()) + "\n题库:" + Verify.getCount() + "题 | " + Verify.getLastUpdateAt() + "\n\n命令助手讨论区 @ ProjectXero");
}
function checkAnswer(answer) {
	var code;
	try {
		code = Verify.checkAnswer(answer);
		if (code) {
			Common.showTextDialog("祝贺你！你答对了！\n密码为：" + fixZero(code, 6));
			return true;
		}
	} catch(e) {
		Log.e(e);
	}
	return false;
}
function show() {
	Verify.setDate(Date.now());
	curq = Verify.requestQuestion();
	if (host.settings && Number(host.settings.lastExpired) > Date.now()) {
		ans = host.settings.lastInput;
		if (checkAnswer(ans)) return;
	} else {
		ans = "";
	}
	if (!contentView.main) initView();
	updateView();
	popup.enter();
}
})