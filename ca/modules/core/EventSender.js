MapScript.loadModule("EventSender", {
	init : function(o) {
		o.on = this.on;
		o.off = this.off;
		o.trigger = this.trigger;
		o.clearListeners = this.clearListeners;
		return o;
	},
	on : function(name, f) {
		if (!this.listener[name]) this.listener[name] = [];
		if (this.listener[name].indexOf(f) < 0) this.listener[name].push(f);
		if (this.__eventsender_observer__) this.__eventsender_observer__("on", name, f);
		return this;
	},
	off : function(name, f) {
		var i, t;
		if (this.listener[name]) {
			if (arguments.length == 1) {
				delete this.listener[name];
			} else {
				i = this.listener[name].indexOf(f);
				if (i >= 0) this.listener[name].splice(i, 1);
			}
		}
		if (this.__eventsender_observer__) this.__eventsender_observer__("off", name, f);
		return this;
	},
	trigger : function(name) {
		var i, a;
		if (this.listener[name]) {
			a = this.listener[name];
			for (i = a.length - 1; i >= 0; i--) {
				a[i].apply(this, arguments);
			}
		}
		if (this.__eventsender_observer__) this.__eventsender_observer__("trigger", arguments);
		return this;
	},
	clearListeners : function() {
		var i;
		for (i in this.listener) {
			delete this.listener[i];
		}
		if (this.__eventsender_observer__) this.__eventsender_observer__("clear");
	}
});