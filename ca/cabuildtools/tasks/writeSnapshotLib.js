const fs = require("fs");
const asLibrary = require("../js2lib");

/**
 * 生成「安装器」库（.lib）：把当前构建的脚本装进 App 并设置为调试源。
 *
 * 渠道由 variants 决定：release / beta / dev / canary（以及作者原有的 snapshot）。
 * 同版本号下渠道优先级为 canary > dev > beta > release，低优先级不会覆盖高优先级。
 */
module.exports = function(context, args) {
	var variants = context.buildConfig.variants,
		channel = context.buildConfig.channel,
		// 快照形态（作者原有的 snapshot 构建）沿用历史 uuid，是唯一特例；
		// 其余渠道各用固定 uuid，保证同渠道的新构建能被识别为更新
		uuid = variants == "snapshot" ? "f6cf1729-3861-481b-a9ac-e3f48cbc4a94" : ({
			standard : "1d6b8f24-3a9c-4e57-b0d8-7f2c5a4e9b61",
			beta : "3c1f0b52-8f4d-4a86-9f4e-6b2d7c9a1e05",
			dev : "8e4a2d61-5b7c-4f39-9a1d-2c6e7f8b0a43",
			canary : "b7d1c394-2e6a-4c58-8f07-9d3b1e5a6c27"
		}[channel] || "1d6b8f24-3a9c-4e57-b0d8-7f2c5a4e9b61"),
		libName = channel,
		// 不带渠道参数（release 的 standard / snapshot 的 snapshot）就是普通快照版；
		// 带了 -beta / -dev / -canary 才在名字后面标渠道
		plainName = channel == "standard" || channel == "snapshot",
		displayName = plainName ? "命令助手快照版" : "命令助手快照版 - " + channel,
		fileName = variants + ".lib",
		scriptName = variants + ".js";

	fs.writeFileSync("./build/outputs/snapshotLib/" + fileName, asLibrary(Buffer.from([
		'Plugins.inject(function(o){',
			'const id=' + JSON.stringify(context.buildConfig.date) + ';',
			// 渠道优先级：canary > dev > beta > release（snapshot 视为 dev 一档）
			'const rank=function(v){',
				'return v=="canary"?3:(v=="dev"||v=="snapshot")?2:v=="beta"?1:0',
			'};',
			'function u(p,b){',
				'var o=new java.io.FileOutputStream(p);',
				'o.write(android.util.Base64.decode(b,2));',
				'o.close();',
			'}',
			'o.name=' + JSON.stringify(displayName) + ';',
			'o.installer=true;', // 安装器包：进列表但不参与更新检查
			// 快捷方式统一命名：不管哪个渠道，装上去的都是「快照版」入口
			'o.shortcutName=' + JSON.stringify("命令助手快照版") + ';',
			'o.description=' + JSON.stringify("命令助手" + libName + "安装器\n") + ';',
			'o.uuid=' + JSON.stringify(uuid) + ';',
			'o.author="命令助手制作组";',
			// 版本号取构建时刻（年月日时分秒）：同一天重新构建也会被识别为更新
			'o.version=' + JSON.stringify((function() { var t = new Date(context.buildConfig.publishTime || context.buildConfig.date); return [t.getFullYear(), t.getMonth() + 1, t.getDate(), t.getHours(), t.getMinutes(), t.getSeconds()]; })()) + ';',
			// 版本号相同的话，只有渠道优先级更高时才允许覆盖
			'if(id<CA.publishDate){return void(o.description+="您正在使用本' + libName + '或更高版本\\n\\n")}',
			'if(id==CA.publishDate&&rank(' + JSON.stringify(channel) + ')<rank(CA.variants)){',
				'return void(o.description+="当前已装同版本的更高渠道构建（"+(CA.variants||"standard")+"），无需安装本' + libName + '\\n\\n")',
			'}',
			'if(MapScript.host!="Android")return void(o.description+="本' + libName + '仅适用于App版");',
			'u(MapScript.baseDir+' + JSON.stringify(scriptName) + ',' + JSON.stringify(Buffer.from(args[0]).toString("base64")) + ');',
			'ctx.getSharedPreferences("user_settings",ctx.MODE_PRIVATE).edit().putString("debugSource",MapScript.baseDir+' + JSON.stringify(scriptName) + ').apply()',
			// 快捷方式：组件名用当前包名（改包版也能用）。部分壳子的 AndroidBridge.createShortcut
			// 自身有 bug（setIcon 传了 object），失败时退回标准 API 自己建一个。
			'var scIntent=new android.content.Intent("com.xero.ca.DEBUG_EXEC")' +
				'.setComponent(new android.content.ComponentName(ctx.getPackageName(),"com.xero.ca.MainActivity"))' +
				'.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK),scName=' + JSON.stringify("命令助手快照版") + ',scIcon=com.xero.ca.R.mipmap.icon_small;',
			'try{',
				'AndroidBridge.createShortcut(scIntent,scName,scIcon);',
			'}catch(e){',
				'try{',
					'var mgr=ctx.getSystemService(ctx.SHORTCUT_SERVICE),si=new android.content.pm.ShortcutInfo.Builder(ctx,scName)' +
						'.setShortLabel(scName).setLongLabel(scName).setIntent(scIntent)' +
						'.setIcon(android.graphics.drawable.Icon.createWithResource(ctx,scIcon)).build();',
					'mgr.requestPinShortcut(si,null);',
				'}catch(e2){Log.w(e2)}',
			'}',
			'Common.showTextDialog(o.description+="' + libName + '已安装完毕，您可以在桌面找到' + libName + '版的快捷方式");',
			// 不再自删：安装器以 [安装器] 身份留在列表里，执行过一次后只显示不再执行
		'})'
	].join("\n"))));
	fs.copyFileSync("./build/outputs/snapshotLib/" + fileName, "./build/dist/命令助手" + channel + context.buildConfig.date + ".lib");
	return args[0];
}
