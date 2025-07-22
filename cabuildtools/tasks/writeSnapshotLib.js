const fs = require("fs");
const asLibrary = require("../js2lib");
module.exports = function(context, args) {
	fs.writeFileSync("./build/outputs/snapshotLib/snapshot.lib", asLibrary(Buffer.from([
		'Plugins.inject(function(o){',
			'const id=' + JSON.stringify(context.buildConfig.date) + ';',
			'function u(p,b){',
				'var o=new java.io.FileOutputStream(p);',
				'o.write(android.util.Base64.decode(b,2));',
				'o.close();',
			'}',
			'o.name="命令助手快照包 - "+id;',
			'o.description="命令助手快照安装器\\n";',
			'o.uuid="f6cf1729-3861-481b-a9ac-e3f48cbc4a94";',
			'o.author="命令助手制作组";',
			'o.version=[1,0];',
			'if (CA.publishDate==id){return void(o.description+="您正在使用本快照或更高版本\\n\\n"+ds)}',
			'if(MapScript.host!="Android")return void(o.description+="本快照仅适用于App版");',
			'u(MapScript.baseDir+"snapshot.js",' + JSON.stringify(Buffer.from(args[0]).toString("base64")) + ');',
			'ctx.getSharedPreferences("user_settings",ctx.MODE_PRIVATE).edit().putString("debugSource",MapScript.baseDir+"snapshot.js").apply()',
			'AndroidBridge.createShortcut(new android.content.Intent("com.xero.ca.DEBUG_EXEC").setComponent(new android.content.ComponentName("com.xero.ca","com.xero.ca.MainActivity")).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK),"快照命令助手",com.xero.ca.R.mipmap.icon_small);',
			'Common.showTextDialog(o.description+="快照已安装完毕，您可以在桌面找到快照版的快捷方式");',
			'CA.Library.removeLibrary(path);',
		'})'
	].join("\n"))));
	fs.copyFileSync("./build/outputs/snapshotLib/snapshot.lib", "./build/dist/命令助手快照" + context.buildConfig.date + ".lib");
	return args[0];
}