MapScript.loadModule("DexPlugin", {
	load : function(packageName, mainClass) {
		var r, pi, dir, cx, cl;
		try {
			pi = ctx.getPackageManager().getPackageInfo(packageName, 0);
			dir = pi.applicationInfo.publicSourceDir;
			cx = org.mozilla.javascript.Context.getCurrentContext();
			cl = Packages.dalvik.system.DexClassLoader(
				dir,
				ctx.getDir("dex", 0).getAbsolutePath(),
				null,
				cx.getApplicationClassLoader()
			);
		} catch(e) {Log.e(e)}
		if (!cl) return null;
		r = Object.create(this);
		r.classes = {};
		r.packageInfo = pi;
		r.classLoader = cl;
		if (mainClass) r.mainClass = r.get(mainClass);
		return r;
	},
	get : function(className) {
		var cx, cls;
		if (className) {
			if (className in this.classes) {
				cls = this.classes[className];
			} else {
				try {
					cx = org.mozilla.javascript.Context.getCurrentContext();
					cls = cx.getWrapFactory().wrapJavaClass(cx, MapScript.global, this.classLoader.loadClass(className));
				} catch(e) {Log.e(e)}
				this.classes[className] = cls;
			}
		} else {
			cls = this.mainClass;
		}
		return cls;
	}
});