const path = require("path");

/**
 * args 可以是：
 *   "release" / "snapshot" / 渠道名 —— 老用法，渠道名由 variants 推出来
 *   [variants, channel]              —— 分别指定构建形态（决定核心行为）与对外渠道名
 */
module.exports = function(context, args) {
	var variants, channel;
	if (Array.isArray(args)) {
		variants = args[0];
		channel = args[1];
	} else {
		variants = args;
	}
	if (!channel) channel = variants == "release" || variants == "snapshot" ? "standard" : variants;
	context.buildConfig = Object.assign({}, require(path.resolve("./config/build.json")));
	context.buildConfig.variants = variants;
	context.buildConfig.channel = channel;
	context.buildConfig.publishTime = Date.now();
}
