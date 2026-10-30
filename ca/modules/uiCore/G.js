/*LOADER
if (variables.buildConfig.variants == "release") {
	postprocessor = function(src) {
		var jsmin = require("jsmin").jsmin;
		return jsmin(src, 2);
	};
}
*/
MapScript.loadModule("G", {
	onCreate : function() {
		var t;
		t = ctx.getResources().getDisplayMetrics();
		this.screenHeight = t.heightPixels;
		this.screenWidth = t.widthPixels;
		this.dp = t.density;
		this.sp = t.scaledDensity;
		this.scaleFactor = this.sp / this.dp;
		if (ctx.runOnUiThread) {
			this.ui = ctx.runOnUiThread.bind(ctx);
		} else if (MapScript.host == "Android") {
			this.ui = ScriptInterface.runOnUiThread.bind(ScriptInterface);
		} else {
			var uiThread = gHandler.getLooper().getThread();
			this.ui = function(f) {
				if (uiThread != java.lang.Thread.currentThread()) {
					gHandler.post(f);
				} else {
					f();
				}
			}
		}
	},
	initialize : function() {
		G.supportFloat = G.shouldFloat = MapScript.host == "AutoJs" || MapScript.host == "Android";
		if (G.supportFloat) {
			if (!SettingsCompat.ensureCanFloat(true)) {
				G.supportFloat = false;
				if (MapScript.host == "Android") {
					var activity = ScriptInterface.getBindActivity();
					if (activity != null) {
						MapScript.global.ctx = activity;
					} else {
						G.supportFloat = true;
						ScriptInterface.quit();
					}
				}
			}
		}
		if (android.os.Build.VERSION.SDK_INT >= 21) {
			this.style = "Material";
			ctx.setTheme(android.R.style.Theme_Material_Light);
		} else if (android.os.Build.VERSION.SDK_INT >= 11) {
			this.style = "Holo";
			ctx.setTheme(android.R.style.Theme_Holo_Light);
		} else {
			this.style = "Basic";
			ctx.setTheme(android.R.style.Theme_Light);
		}
	},
//IMPORTS_BEGIN
	AbsListView: android.widget.AbsListView,
	AbsoluteSizeSpan: android.text.style.AbsoluteSizeSpan,
	AccelerateInterpolator: android.view.animation.AccelerateInterpolator,
	AdapterView: android.widget.AdapterView,
	AlignmentSpan: android.text.style.AlignmentSpan,
	AlphaAnimation: android.view.animation.AlphaAnimation,
	AnimatedImageDrawable: android.graphics.drawable.AnimatedImageDrawable,
	Animation: android.view.animation.Animation,
	AnimationSet: android.view.animation.AnimationSet,
	BackgroundColorSpan: android.text.style.BackgroundColorSpan,
	Bitmap: android.graphics.Bitmap,
	BitmapDrawable: android.graphics.drawable.BitmapDrawable,
	BitmapFactory: android.graphics.BitmapFactory,
	BitmapShader: android.graphics.BitmapShader,
	BulletSpan: android.text.style.BulletSpan,
	Button: android.widget.Button,
	Canvas: android.graphics.Canvas,
	CheckBox: android.widget.CheckBox,
	Color: android.graphics.Color,
	ColorDrawable: android.graphics.drawable.ColorDrawable,
	CompoundButton: android.widget.CompoundButton,
	CycleInterpolator: android.view.animation.CycleInterpolator,
	DecelerateInterpolator: android.view.animation.DecelerateInterpolator,
	Drawable: android.graphics.drawable.Drawable,
	EditText: android.widget.EditText,
	EditorInfo: android.view.inputmethod.EditorInfo,
	ForegroundColorSpan: android.text.style.ForegroundColorSpan,
	FrameLayout: android.widget.FrameLayout,
	Gravity: android.view.Gravity,
	GridView: android.widget.GridView,
	HorizontalScrollView: android.widget.HorizontalScrollView,
	Html: android.text.Html,
	ImageDecoder: android.graphics.ImageDecoder,
	ImageSpan: android.text.style.ImageSpan,
	ImageView: android.widget.ImageView,
	InputFilter: android.text.InputFilter,
	InputMethodManager: android.view.inputmethod.InputMethodManager,
	InputType: android.text.InputType,
	Layout: android.text.Layout,
	LinearLayout: android.widget.LinearLayout,
	LinkMovementMethod: android.text.method.LinkMovementMethod,
	ListAdapter: android.widget.ListAdapter,
	ListView: android.widget.ListView,
	MotionEvent: android.view.MotionEvent,
	Paint: android.graphics.Paint,
	Path: android.graphics.Path,
	PixelFormat: android.graphics.PixelFormat,
	PopupWindow: android.widget.PopupWindow,
	PorterDuff: android.graphics.PorterDuff,
	PorterDuffXfermode: android.graphics.PorterDuffXfermode,
	R: android.R,
	Rect: android.graphics.Rect,
	RelativeSizeSpan: android.text.style.RelativeSizeSpan,
	ScaleAnimation: android.view.animation.ScaleAnimation,
	ScrollView: android.widget.ScrollView,
	SeekBar: android.widget.SeekBar,
	Selection: android.text.Selection,
	Shader: android.graphics.Shader,
	Space: android.widget.Space,
	SpanWatcher: android.text.SpanWatcher,
	SpannableString: android.text.SpannableString,
	SpannableStringBuilder: android.text.SpannableStringBuilder,
	Spanned: android.text.Spanned,
	StrikethroughSpan: android.text.style.StrikethroughSpan,
	StyleSpan: android.text.style.StyleSpan,
	SubscriptSpan: android.text.style.SubscriptSpan,
	SuperscriptSpan: android.text.style.SuperscriptSpan,
	Surface: android.view.Surface,
	TabStopSpan: android.text.style.TabStopSpan,
	TableLayout: android.widget.TableLayout,
	TableRow: android.widget.TableRow,
	TextUtils: android.text.TextUtils,
	TextView: android.widget.TextView,
	TextWatcher: android.text.TextWatcher,
	Toast: android.widget.Toast,
	TranslateAnimation: android.view.animation.TranslateAnimation,
	Typeface: android.graphics.Typeface,
	TypefaceSpan: android.text.style.TypefaceSpan,
	URLSpan: android.text.style.URLSpan,
	UnderlineSpan: android.text.style.UnderlineSpan,
	ValueAnimator: android.animation.ValueAnimator,
	View: android.view.View,
	ViewConfiguration: android.view.ViewConfiguration,
	ViewGroup: android.view.ViewGroup,
	WebView: android.webkit.WebView,
	WindowManager: android.view.WindowManager
//IMPORTS_END
});