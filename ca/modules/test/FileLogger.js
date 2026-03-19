/*LOADER TestOnly()*/
// 使用应用私有目录，避免 Android 11+ 存储权限限制
var fp = ctx.getExternalFilesDir(null).getAbsolutePath() + "/ca.debug.txt";
var pw = new java.io.PrintWriter(fp);
Log.start(function(tag, data) {
	pw.println(new Date() + " " + tag + "\n" + data);
	pw.flush();
});