/** 渠道参数：-beta / -dev / -canary（不带则是默认渠道） */
function channelOf(args) {
	var list = args || [], i;
	for (i = 0; i < list.length; i++) {
		if (list[i] == "-beta" || list[i] == "--beta") return "beta";
		if (list[i] == "-dev" || list[i] == "--dev") return "dev";
		if (list[i] == "-canary" || list[i] == "--canary") return "canary";
	}
	return null;
}

module.exports = function(context, args) {
	// 带 -beta 时 variants = "beta"：产物名带 -beta 后缀，且不写 update.json（避免覆盖正式更新）
	var channel = channelOf(args);
	// 不带渠道参数就是 standard（正式版）；带参数时渠道名同时作为 variants
	return context.execute("getBuildConfig", [channel || "release", channel || "standard"])
		.then(context.task("getUpdateConfig"))
		.then(context.task("initDirectory", {
			"./build/": {
				"outputs/": [
					"releaseSource",
					"release",
					"snapshotLib"
				],
				"dist": ""
			}
		}))
		.then(context.task("assembleSourceRelease"))
		// 安装器 lib 用未压缩的源码（和快照包的机制一致）
		.then(context.pipe("writeSnapshotLib"))
		.then(context.pipe("compressSource"))
		.then(context.pipe("writeRelease"))
		.then(function(r) {
			return context.buildConfig.variants == "release" ? context.execute("writeUpdateRelease") : r;
		});
}
module.exports.input = "cli";
