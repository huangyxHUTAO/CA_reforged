function loadClass(ctx, path, className) {
	var context = org.mozilla.javascript.Context.getCurrentContext();
	return context.getWrapFactory().wrapJavaClass(context, this, new Packages.dalvik.system.DexClassLoader(path, ctx.getDir("dex", 0).getAbsolutePath(), null, context.getApplicationClassLoader()).loadClass(className));
}
function saveStream(stream, path) {
	const BUFFER_SIZE = 4096;
	var os, buf, hr;
	(new java.io.File(path)).getParentFile().mkdirs();
	os = new java.io.FileOutputStream(path);
	buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, BUFFER_SIZE);
	while ((hr = stream.read(buf)) > 0) os.write(buf, 0, hr);
}

var ctx = com.mojang.minecraftpe.MainActivity.currentMainActivity.get();
var zf = new java.util.zip.ZipFile(ctx.getPackageManager().getApplicationInfo("com.xero.ca", 128).publicSourceDir);
var df = new java.io.File(ctx.getDir("adapter", 0), "ca.dex").getAbsolutePath();
saveStream(zf.getInputStream(zf.getEntry("classes.dex")), df);
var Adapter = loadClass(ctx, df, "com.xero.ca.MCAdapter")(ctx, "ModPE in Sandbox", 2);

var z = 0, info = Adapter.getBundle();
function modTick() {
	if (--z > 0) return;
	var p = Player.getEntity(), b = Level.getBiome(Player.getX(), Player.getZ());
	info.putStringArray("playernames", Server.getAllPlayerNames());
	info.putDoubleArray("playerposition", [Player.getX(), Player.getY(), Player.getZ()]);
	info.putDoubleArray("playerrotation", [Entity.getPitch(p), Entity.getYaw(p)]);
	info.putIntArray("pointedblockpos", [Player.getPointedBlockX(), Player.getPointedBlockY(), Player.getPointedBlockZ()]);
	info.putIntArray("pointedblockinfo", [Player.getPointedBlockId(), Player.getPointedBlockData(), Player.getPointedBlockSide()]);
	info.putString("levelbiome", String(Level.biomeIdToName(b) + "(" + b + ")"));
	info.putInt("levelbrightness", Level.getBrightness(Player.getX(), Player.getY(), Player.getZ()));
	info.putInt("leveltime", Level.getTime());
	Adapter.update();
	z = 5;
}

(function(global) {
	[
		"attackHook",
		"chatHook",
		"continueDestroyBlock",
		"destroyBlock",
		"playerAddExpHook",
		"playerExpLevelChangeHook",
		"screenChangeHook",
		"newLevel",
		"startDestroyBlock",
		"leaveGame",
		"useItem"
	].forEach(function(e) {
		global[e] = function() {
			var i, arr = [];
			for (i in arguments) arr.push(arguments[i]);
			Adapter.event(e, JSON.stringify(arr));
		}
	});
})(this);
