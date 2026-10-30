const fs = require("fs");
const loader = require("../loader-ast");
const postprocess = require("../postprocess");

module.exports = function(context, args) {
	var result = loader.load("./main.js", {
		buildConfig : context.buildConfig,
		// 更新源配置（config/update-sources.json），注入成核心里的 UpdateSources
		updateSources : require("../../config/update-sources.json")
	}, "utf-8", { transformAsync: true });
	// AST 加载器是逐文件处理的，压缩/日期替换要在拼装结果上统一做一次
	result = postprocess(result, context.buildConfig);
	// caclib 是在线源工程，不参与打包：占位符替换成空数组
	result = result.replace('"__BUILTIN_LIBS__"', "[]");
	return result;
}
