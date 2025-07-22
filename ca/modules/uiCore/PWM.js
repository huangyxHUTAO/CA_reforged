MapScript.loadModule("PWM", {
	floats : [],
	popups : [],
	listener : {},
	resetFlags : [],
	intentBack : false,
	busy : false,
	wm : ctx.getSystemService(ctx.WINDOW_SERVICE),
	onCreate : function() {
		EventSender.init(this);
	},
	initialize : function() {
		PopupPage.on("addPopup", function() {
			PWM.onPageAdd();
		});
	},
	onResume : function() { // 由于图标置顶强制启用，此函数已弃用
		PopupPage.show();
		return false;
	},
	onPageAdd : function() {
		var v;
		this.floats.forEach(function(e) {
			e.bringToFront();
		});
	},
	addFloat : function(w) {
		if (this.floats.indexOf(w) < 0) this.floats.push(w);
		this.trigger("addFloat", w);
	},
	addPopup : function(w) {
		if (this.popups.indexOf(w) < 0) this.popups.push(w);
		this.trigger("addPopup", w);
	},
	dismissFloat : function() {
		var v;
		this.busy = true;
		this.floats.forEach(function(e) {
			e.hide();
		});
		this.busy = false;
		this.trigger("dismissFloat");
	},
	dismissPopup : function() {
		var v;
		this.busy = true;
		this.popups.forEach(function(e) {
			e.hide();
		});
		this.busy = false;
		this.trigger("dismissPopup");
	},
	reset : function() {
		this.trigger("reset");
		this.floats.length = this.popups.length;
		this.clearListeners();
		PopupPage.reset();
		this.initialize();
	},
	resetUICache : function() {
		this.resetFlags.forEach(function(e) {
			e.obj[e.prop] = e.value;
		});
	},
	registerResetFlag : function(obj, prop, value) {
		var i, e;
		for (i in this.resetFlags) {
			e = this.resetFlags[i];
			if (e.obj == obj && e.prop == prop) {
				e.value = value;
				return;
			}
		}
		this.resetFlags.push({
			obj : obj,
			prop : prop,
			value : value
		});
	}
});