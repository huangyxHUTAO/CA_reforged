MapScript.loadModule("EasterEgg", {
	onCreate : function() {
		G.ui(this.initIcon);
	},
	getBitmap : function(w) {
		var zf = new java.util.zip.ZipFile(ctx.getPackageManager().getApplicationInfo("com.mojang.minecraftpe", 128).publicSourceDir);
		var b = zf.getInputStream(zf.getEntry("assets/resource_packs/vanilla/textures/blocks/command_block_front_mipmap.png"));
		var bmp = G.Bitmap.createBitmap(w, w, G.Bitmap.Config.ARGB_8888);
		var cv = new G.Canvas(bmp);
		cv.scale(w / 170, w / 170);
		var pt = new G.Paint();
		pt.setAntiAlias(true);
		pt.setShader(new G.BitmapShader(G.Bitmap.createScaledBitmap(G.BitmapFactory.decodeStream(b), 160, 160, false), G.Shader.TileMode.REPEAT, G.Shader.TileMode.REPEAT));
		cv.drawRect(0, 0, 170, 170, pt);
		pt.setShader(null);
		pt.setTextSize(60);
		var fm = pt.getFontMetrics();
		var th = fm.bottom - fm.top;
		IntColor.Paint.setColor(pt, Common.argbInt(0x80, 0, 0, 0));
		IntColor.Paint.setShadowLayer(pt, 1, 0, 0, pt.getColor());
		cv.drawRoundRect(0, 170 - th, 170, 200, 10, 10, pt);
		IntColor.Paint.setColor(pt, G.Color.WHITE);
		IntColor.Paint.setShadowLayer(pt, 1, 0, 0, G.Color.BLACK);
		cv.drawText(" CA_", 0, 170 - fm.descent, pt);
		return bmp;
	},
	initIcon : function() {
		var img;
		try {
			img = EasterEgg.getBitmap(480);
		} catch(e) {Log.e(e)}
		if (img) {
			CA.Icon.easteregg = function(size) {
				var zp = G.dp * size;
				var frm = new G.FrameLayout(ctx);
				var view = new G.ImageView(ctx);
				view.setImageBitmap(img);
				view.setLayoutParams(new G.FrameLayout.LayoutParams(32 * zp, 32 * zp));
				frm.addView(view);
				return frm;
			};
		}
	}
});