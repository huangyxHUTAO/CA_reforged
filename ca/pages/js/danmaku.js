var commands = [
	"/clone <起点> <终点> <目标点> [遮罩模式] [复制模式]",
	"/clone <起点> <终点> <目标点> filtered <复制模式> <方块ID> [数据值]",
	"/execute <目标> <坐标> <命令>",
	"/execute <目标> <点A> detect <点B> <方块ID> <数据值> <命令>",
	"/fill <点A> <点B> <方块ID> [数据值] [旧方块处理方式]",
	"/fill <点A> <点B> <方块ID> <数据值> replace <被替换方块ID> [被替换方块数据值]",
	"/gamemode <模式>",
	"/gamemode <模式> <玩家>",
	"/give <目标> <物品ID> [数量] [数据值] [数据标签]",
	"/kill <目标>",
	"/say <信息>",
	"/setblock <坐标> <方块ID> [数据值] [旧方块处理方式]",
	"/setworldspawn <坐标>",
	"/spawnpoint <目标>",
	"/spawnpoint <目标> <坐标>",
	"/summon <实体ID> [生成位置]",
	"/tell <目标> <私密信息>",
	"/testforblock <坐标> <方块ID> [数据值]",
	"/testforblocks <起点> <终点> <目标点> [模式]",
	"/time add <增加时间>",
	"/time query <时间类型>",
	"/time set <时间>",
	"/time set <时间>",
	"/tp <目的地实体>",
	"/tp <目的地坐标> [水平旋转值] [垂直旋转值]",
	"/tp <目标实体> <目的地实体>",
	"/tp <目标实体> <目的地坐标> [水平旋转值] [垂直旋转值]",
	"/tp <目的地坐标> facing <面向坐标>",
	"/tp <目的地坐标> facing <面向实体>",
	"/tp <目标实体> <目的地坐标> facing <面向坐标>",
	"/tp <目标实体> <目的地坐标> facing <面向实体>",
	"/weather <天气类型> [持续时间]",
	"/weather query",
	"/xp <数量> [目标玩家]",
	"/xp <等级>L [目标玩家]",
	"/enchant <目标> <附魔ID> [等级]",
	"/enchant <目标> <附魔ID> [等级]",
	"/clear <目标>",
	"/clear <目标> <物品ID> [物品特殊值] [最大数量]",
	"/difficulty <新难度>",
	"/effect <目标> clear",
	"/effect <目标> <状态效果> [持续秒数] [级别] [是否隐藏粒子]",
	"/gamerule <规则名>",
	"/gamerule <规则名> <值>",
	"/gamerule <规则名>",
	"/gamerule <规则名> <值>",
	"/me <信息>",
	"/playsound <声音ID> <目标> [位置] [音量] [音调] [最小音量]",
	"/replaceitem block <坐标> <格子类型> <格子ID> <物品ID> [数量] [数据值] [数据标签]",
	"/replaceitem entity <目标> <格子类型> <格子ID> <物品ID> [数量] [数据值] [数据标签]",
	"/spreadplayers <x坐标> <z坐标> <分散间距> <最大范围> <实体>",
	"/stopsound <目标> [声音ID]",
	"/stopsound <目标> [声音ID]",
	"/testfor <目标实体>",
	"/title <目标> clear",
	"/title <目标> reset",
	"/title <目标> subtitle <副标题>",
	"/title <目标> title <标题>",
	"/title <目标> times <淡入时间> <停留时间> <淡出时间>",
	"/title <目标> actionbar <活动栏文字>",
	"/alwaysday [是否锁定]",
	"/tickingarea add <起点> <终点> <区域ID>",
	"/tickingarea add circle <中心> <半径> <区域ID>",
	"/tickingarea remove <Position>",
	"/tickingarea remove <区域ID>",
	"/tickingarea remove_all",
	"/tickingarea list [all-dimensions]",
	"/deop <玩家>",
	"/op <玩家>",
	"/wsserver <服务器URL>",
	"/locate <结构ID>",
	"/transferserver <服务器地址> <端口号>",
	"/setmaxplayers <数量上限>",
	"/mixer start <版本ID> [分享码]",
	"/mixer stop",
	"/mixer scene <场景名>"
];
var Danmaku = {
	from : function(node) { // static
		var o = Object.create(this);
		o.node = node;
		o.tick = 0;
		o.danmaku = [];
		return o;
	},
	run : function(interval) {
		var self = this;
		this.loopFunc = setInterval(function() {
			self.update();
		}, this.interval = interval);
		return this;
	},
	update : function() {
		this.tick++;
		var i, a = this.danmaku;
		for (i = a.length - 1; i >= 0; i--) {
			if (!a[i].started) {
				a[i].started = false;
				a[i].node.style.transform = "translateX(-" + (this.node.clientWidth + a[i].node.clientWidth) + "px)";
			}
			if (a[i].recycleTick < this.tick) {
				a[i].node.parentNode.removeChild(a[i].node);
				a.splice(i, 1);
			}
		}
	},
	add : function(str, tick, speed, y, size, color, f) {
		var node = document.createElement("span");
		node.innerHTML = str;
		node.style.transitionProperty = "transform";
		node.style.transitionDuration = (this.node.clientWidth / speed) + "ms";
		node.style.transitionTimingFunction = "linear";
		node.style.display = "inline";
		node.style.position = "absolute"
		node.style.top = y + "px";
		node.style.left = this.node.clientWidth + "px";
		node.style.whiteSpace = "nowrap";
		node.style.willChange = "transform";
		if (size) node.style.fontSize = size;
		if (color) node.style.color = color;
		if (f) f(node);
		node.className = "danmaku";
		this.node.appendChild(node);
		this.danmaku.push({
			str : str,
			tick : tick,
			recycleTick : tick + (this.node.clientWidth / speed) / this.interval,
			speed : speed,
			y : y,
			node : node,
			started : false
		});
		return this;
	}
};
var dan, node;
window.addEventListener("load", function() {
	node = document.getElementById("danmaku_area");
	dan = Danmaku.from(node).run(50);
	setInterval(randomAddDanmaku, 500);
	document.getElementById("logo").addEventListener("click", randomAddDanmaku);
});
function randomAddDanmaku() {
	if (Math.random() * dan.danmaku.length > 10) return;
	dan.add(
		commands[Math.floor(Math.random() * commands.length)].replace(/</g, "&lt;").replace(/>/g, "&gt;"),
		dan.tick,
		Math.random() * 0.12 + 0.08,
		Math.random() * node.clientHeight
	);
}
