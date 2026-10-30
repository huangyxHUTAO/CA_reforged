/*LOADER TestOnly()*/
var fp = new android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/ca.debug.txt";
var pw = new java.io.PrintWriter(fp);
Log.start(function(tag, data) {
	pw.println(new Date() + " " + tag + "\n" + data);
	pw.flush();
});