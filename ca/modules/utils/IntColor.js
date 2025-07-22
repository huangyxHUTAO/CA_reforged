MapScript.loadModule("IntColor", (function() {
	var r = {};
	try {
		r.Color = {};
		r.Color.alpha = JavaReflect.staticMethod("android.graphics.Color", "alpha", ["int"]);
		r.Color.argb = JavaReflect.staticMethod("android.graphics.Color", "argb", ["int", "int", "int", "int"]);
		r.Color.blue = JavaReflect.staticMethod("android.graphics.Color", "blue", ["int"]);
		r.Color.green = JavaReflect.staticMethod("android.graphics.Color", "green", ["int"]);
		r.Color.red = JavaReflect.staticMethod("android.graphics.Color", "red", ["int"]);
		r.Color.rgb = JavaReflect.staticMethod("android.graphics.Color", "rgb", ["int", "int", "int"]);

		r.Canvas = {};
		r.Canvas.drawColor = JavaReflect.method("android.graphics.Canvas", "drawColor", ["int"]);

		r.Bitmap = {};
		r.Bitmap.eraseColor = JavaReflect.method("android.graphics.Bitmap", "eraseColor", ["int"]);

		r.Paint = {};
		r.Paint.setColor = JavaReflect.method("android.graphics.Paint", "setColor", ["int"]);
		r.Paint.setShadowLayer = JavaReflect.method("android.graphics.Paint", "setShadowLayer", ["float", "float", "float", "int"]);

		r.LinearGradient = {};
		r.LinearGradient.buildFromArray = JavaReflect.constructor("android.graphics.LinearGradient", ["float", "float", "float", "float", "int[]", "float[]", "android.graphics.Shader.TileMode"]);
		r.LinearGradient.buildFromEnds = JavaReflect.constructor("android.graphics.LinearGradient", ["float", "float", "float", "float", "int", "int", "android.graphics.Shader.TileMode"]);

		r.RadialGradient = {};
		r.RadialGradient.buildFromArray = JavaReflect.constructor("android.graphics.RadialGradient", ["float", "float", "float", "int[]", "float[]", "android.graphics.Shader.TileMode"]);
		r.RadialGradient.buildFromCenterEdge = JavaReflect.constructor("android.graphics.RadialGradient", ["float", "float", "float", "int", "int", "android.graphics.Shader.TileMode"]);

		r.SweepGradient = {};
		r.SweepGradient.buildFromArray = JavaReflect.constructor("android.graphics.SweepGradient", ["float", "float", "int[]", "float[]"]);
		r.SweepGradient.buildFromEnds = JavaReflect.constructor("android.graphics.SweepGradient", ["float", "float", "int", "int"]);
		
		if (android.os.Build.VERSION.SDK_INT >= 26) {
			r.Color.alphaLong = JavaReflect.staticMethod("android.graphics.Color", "alpha", ["long"]);
			r.Color.argbFloat = JavaReflect.staticMethod("android.graphics.Color", "argb", ["float", "float", "float", "float"]);
			r.Color.blueLong = JavaReflect.staticMethod("android.graphics.Color", "blue", ["long"]);
			r.Color.greenLong = JavaReflect.staticMethod("android.graphics.Color", "green", ["long"]);
			r.Color.redLong = JavaReflect.staticMethod("android.graphics.Color", "red", ["long"]);
			r.Color.rgbFloat = JavaReflect.staticMethod("android.graphics.Color", "rgb", ["float", "float", "float"]);
			r.Color.valueOf = JavaReflect.staticMethod("android.graphics.Color", "valueOf", ["int"]);
			r.Color.valueOfLong = JavaReflect.staticMethod("android.graphics.Color", "valueOf", ["long"]);
		}
		if (android.os.Build.VERSION.SDK_INT >= 29) {
			r.Canvas.drawColorLong = JavaReflect.method("android.graphics.Canvas", "drawColor", ["long"]);
			r.Canvas.drawColorWithBlendMode = JavaReflect.method("android.graphics.Canvas", "drawColor", ["int", "android.graphics.BlendMode"]);
			r.Canvas.drawColorWithBlendModeLong = JavaReflect.method("android.graphics.Canvas", "drawColor", ["long", "android.graphics.BlendMode"]);
			r.Bitmap.eraseColorLong = JavaReflect.method("android.graphics.Bitmap", "eraseColor", ["long"]);
			r.Paint.setColorLong = JavaReflect.method("android.graphics.Paint", "setColor", ["long"]);
			r.Paint.setShadowLayerLong = JavaReflect.method("android.graphics.Paint", "setShadowLayer", ["float", "float", "float", "long"]);
			r.LinearGradient.buildFromArrayLong = JavaReflect.constructor("android.graphics.LinearGradient", ["float", "float", "float", "float", "long[]", "float[]", "android.graphics.Shader.TileMode"]);
			r.LinearGradient.buildFromEndsLong = JavaReflect.constructor("android.graphics.LinearGradient", ["float", "float", "float", "float", "long", "long", "android.graphics.Shader.TileMode"]);
			r.RadialGradient.buildFromArrayLong = JavaReflect.constructor("android.graphics.RadialGradient", ["float", "float", "float", "long[]", "float[]", "android.graphics.Shader.TileMode"]);
			r.RadialGradient.buildFromCenterEdgeLong = JavaReflect.constructor("android.graphics.RadialGradient", ["float", "float", "float", "long", "long", "android.graphics.Shader.TileMode"]);
			r.SweepGradient.buildFromArrayLong = JavaReflect.constructor("android.graphics.SweepGradient", ["float", "float", "long[]", "float[]"]);
			r.SweepGradient.buildFromEndsLong = JavaReflect.constructor("android.graphics.SweepGradient", ["float", "float", "long", "long"]);
		}
	} catch(e) {
		erp(e);
	}
	return r;
})());