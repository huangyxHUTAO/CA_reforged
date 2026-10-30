/**
 * 构建产物后处理。
 *
 * 旧加载器在 load() 末尾把 main.js 里 /*LOADER*\/ 块设置的 postprocessor
 * 应用到「整个拼装结果」上；AST 加载器是逐文件处理的，Babel 重新生成代码后
 * 压缩结果会被排版回去（体积 1.37MB → 1.91MB），{DATE} 之外的处理也会失效。
 *
 * 所以这里把同样的规则抽出来，由 assembleSource* 任务在最后统一应用一次。
 * 规则必须与 main.js 里的 LOADER 块保持一致。
 */
const jsmin = require("jsmin").jsmin;

module.exports = function postprocess(source, buildConfig) {
	var variants = buildConfig.variants;
	if (variants == "release") {
		return jsmin(source, 1)
			.replace(/\{DATE\}/g, buildConfig.date)
			.replace(/^\s+/, "")
			.replace(/^"ui";\n/, "")
			.replace(/CA\.RELEASE/g, "true");
	}
	if (variants == "snapshot") {
		return source.replace(/\{DATE\}/g, "S" + buildConfig.date);
	}
	if (/^(beta|dev|canary)$/.test(variants)) {
		return jsmin(source, 1)
			.replace(/\{DATE\}/g, buildConfig.date)
			.replace(/^\s+/, "");
	}
	if (variants == "debug") {
		return source.replace(/\{DATE\}/g, buildConfig.date);
	}
	return source;
};
