MapScript.loadModule("FilterListAdapter", (function() {
	var r = function(wrap) {
		this._wrap = wrap;
		this._dso = [];
		this._pos = [];
	}
	r.prototype = {
		tryAttach : function() {
			var self = this;
			try {
				new java.lang.Runnable({run : function() { //防止直接从InterfaceAdapter抛出
					self._wrap.registerDataSetObserver(new JavaAdapter(android.database.DataSetObserver, {
						onChanged : function() {
							self.requestFilter();
						}
					}));
				}}).run();
				return true;
			} catch(e) {Log.e(e)}
			return false;
		},
		build : function() {
			if (this.buildAdapter) return this.buildAdapter;
			var self = this;
			return this.buildAdapter = new G.ListAdapter({
				getCount : function() {
					return self._filter ? self._pos.length : self._wrap.getCount();
				},
				getItem : function(pos) {
					return self._wrap.getItem(self.getRealPosition(pos));
				},
				getItemId : function(pos) {
					return self._wrap.getItemId(self.getRealPosition(pos));
				},
				getItemViewType : function(pos) {
					return self._wrap.getItemViewType(self.getRealPosition(pos));
				},
				getView : function(pos, convert, parent) {
					return self._wrap.getView(self.getRealPosition(pos), convert, parent);
				},
				getViewTypeCount : function() {
					return self._wrap.getViewTypeCount();
				},
				hasStableIds : function() {
					return self._wrap.hasStableIds();
				},
				isEmpty : function() {
					return self._filter ? self._pos.length === 0 : self._wrap.isEmpty();
				},
				areAllItemsEnabled : function() {
					return self._wrap.areAllItemsEnabled();
				},
				isEnabled : function(pos) {
					return self._wrap.isEnabled(self.getRealPosition(pos));
				},
				registerDataSetObserver : function(p) {
					self._wrap.registerDataSetObserver(p);
					if (self._dso.indexOf(p) >= 0) return;
					self._dso.push(p);
				},
				unregisterDataSetObserver : function(p) {
					self._wrap.unregisterDataSetObserver(p);
					var i = self._dso.indexOf(p);
					if (p >= 0) self._dso.splice(i, 1);
				}
			});
		},
		setFilter : function(f) {
			this._filter = f;
			this.requestFilter();
		},
		clearFilter : function() {
			this.setFilter(null);
		},
		hasFilter : function() {
			return this._filter != null;
		},
		requestFilter : function() {
			if (this._filter != null) {
				var i, n = this._wrap.getCount();
				this._pos.length = 0;
				for (i = 0; i < n; i++) {
					if (this._filter(this._wrap.getItem(i), i)) this._pos.push(i);
				}
			}
			this.notifyDataSetChanged();
		},
		getRealPosition : function(pos) {
			return this._filter ? (this._pos[pos] || 0) : pos;
		},
		notifyDataSetChanged : function() {
			var i;
			for (i in this._dso) {
				this._dso[i].onChanged();
			}
		}
	}
	return r;
})());