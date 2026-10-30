MapScript.loadModule("LPlugins", {
	onCreate: function self() {
		let i;
		for (i in this) {
			if (this[i] == self) continue;
			L[i] = this[i];
		}
	},
	SimpleAdapter(baseView, callback, array) {
		const template = L.Template(baseView), event = EventSender.init({listener : {}});
		const adapter = new SimpleListAdapter(array || [], function(holder) {
			event.trigger("beforeCreate", holder, template);
			const r = template.create(holder);
			event.trigger("afterCreate", holder, r, template);
			return r;
		}, function(holder, e, i, a) {
			event.trigger("beforeBind", holder, e, i, a, template);
			template.bind(holder, e);
			event.trigger("afterBind", holder, e, i, a, template);
		});
		const controller = SimpleListAdapter.getController(adapter);
		if (callback) callback(controller, template, event);
		return adapter;
	}
});
