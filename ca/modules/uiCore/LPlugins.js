MapScript.loadModule("LPlugins", {
	onCreate : function self() {
		var i;
		for (i in this) {
			if (this[i] == self) continue;
			L[i] = this[i];
		}
	},
	SimpleAdapter : function(baseView, callback, array) {
		var template = L.Template(baseView), event = EventSender.init({listener : {}});
		var adapter = new SimpleListAdapter(array || [], function(holder) {
			var r;
			event.trigger("beforeCreate", holder, template);
			r = template.create(holder);
			event.trigger("afterCreate", holder, r, template);
			return r;
		}, function(holder, e, i, a) {
			event.trigger("beforeBind", holder, e, i, a, template);
			template.bind(holder, e);
			event.trigger("afterBind", holder, e, i, a, template);
		});
		var controller = SimpleListAdapter.getController(adapter);
		if (callback) callback(controller, template, event);
		return adapter;
	}
});
