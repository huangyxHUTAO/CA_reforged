const fs = require("fs");
const asLibrary = require("../js2lib");
module.exports = function(context, args) {
	var bc = context.buildConfig;
	var ver = bc.version.split(".").map((e) => parseInt(e));
	fs.writeFileSync("./build/outputs/hotfixLib/hotfix.lib", asLibrary(Buffer.from([
		'Plugins.inject(function(o){',
			'const pub=' + JSON.stringify(bc.date) + ',ver=' + JSON.stringify(ver) + ',shell=' + JSON.stringify(context.gradleConfig.shellVersion) + ',ds=' + JSON.stringify(bc.description) + ';',
			'function u(p,b){',
				'var o=new java.io.FileOutputStream(p);',
				'o.write(android.util.Base64.decode(b,2));',
				'o.close();',
			'}',
			'o.name="命令助手尝鲜包 - "+pub;',
			'o.description="命令助手Beta版安装器\\n";',
			'o.uuid="64ac6220-cf64-465a-8af8-1c9dd2835cd0";',
			'o.author="命令助手制作组";',
			'o.version=ver;',
			'if (Date.parse(CA.publishDate)>=Date.parse(pub)){',
				'CA.Library.removeLibrary(path);',
				'return void(o.description+="您正在使用本尝鲜版或更高版本\\n\\n"+ds);',
			'}',
			'if(MapScript.host!="Android")return void(o.description+="本安装器仅在App版上可用");',
			'if(shell!=ScriptActivity.getShellVersion())return void(o.description+="本安装器不适用于您的版本");',
			'u(MapScript.baseDir+"core.js",' + JSON.stringify(args[0].toString("base64")) + ');',
			// 移除对 release.sign 文件的处理
			'Common.showTextDialog(o.description+="重新启动命令助手后即可使用");',
		'})'
	].join(""))));
	fs.copyFileSync("./build/outputs/hotfixLib/hotfix.lib", "./build/dist/命令助手(" + bc.date + ").lib");
	return args[0];
}