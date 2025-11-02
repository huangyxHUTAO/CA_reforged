MapScript.loadModule("SimpleListAdapter", (function () {
	var r = function (arr, maker, binder, params, readOnly) {
		//arr是列表数组，maker(holder, params)生成基础view，binder(holder, element, index, array, params)修改view使其实现指定的界面，readOnly表示是否会从外部修改这个数组
		var src = readOnly ? arr : arr.slice(), holders = [], dso = [], controller;
		controller = new SimpleListAdapter.Controller(src, holders, dso, maker, binder, params, readOnly ? null : arr);
		return new G.ListAdapter({
			getCount: function () {
				return src.length;
			},
			getItem: function (pos) {
				if (pos == -1) return controller;
				return src[pos];
			},
			getItemId: function (pos) {
				return pos;
			},
			getItemViewType: function (pos) {
				return 0;
			},
			getView: function (pos, convert, parent) {
				var holder;
				try {
					var tag = convert ? convert.getTag() : null;
					var index = tag != null ? parseInt(tag) : -1;

					// 检查 convert 是否有效
					if (!convert || tag == null || isNaN(index) || index < 0 || index >= holders.length || !holders[index]) {
						holder = {};
						convert = maker(holder, params);
						holder.self = convert;
						var newIndex = holders.length;
						convert.setTag(newIndex.toString());
						holders.push(holder);

						CA.sendLog.log("创建新holder: index=" + newIndex);
					} else {
						holder = holders[index];
						CA.sendLog.log("复用holder: index=" + index);
					}

					holder.pos = parseInt(pos);
					binder(holder, src[pos], parseInt(pos), src, params);
					return convert;
				} catch (e) {
					var a = new G.TextView(ctx);
					a.setText(e + "\n" + e.stack);
					erp(e);
					return a;
				}
			},
			getViewTypeCount: function () {
				return 1;
			},
			hasStableIds: function () {
				return false;
			},
			isEmpty: function () {
				return src.length === 0;
			},
			areAllItemsEnabled: function () {
				return true;
			},
			isEnabled: function (pos) {
				return pos >= 0 && pos < src.length;
			},
			registerDataSetObserver: function (p) {
				if (dso.indexOf(p) >= 0) return;
				dso.push(p);
			},
			unregisterDataSetObserver: function (p) {
				var i = dso.indexOf(p);
				if (p >= 0) dso.splice(i, 1);
			}
		});
	}
	r.Controller = function (array, holders, dso, maker, binder, params, sync) {
		this.array = array;
		this.holders = holders;
		this.dso = dso;
		this.maker = maker;
		this.binder = binder;
		this.params = params;
		this.sync = sync;
	}
	r.Controller.prototype = {
		clearHolder: function () {
			var i;
			for (i in this.holders) {
				this.holders[i].self.setTag("");
			}
			this.holders.length = 0;
			this.notifyChange();
		},
		getHolder: function (view) {
			return this.holders[view.getTag()];
		},
		notifyChange: function (hasSync) {
			if (!hasSync && this.sync) {
				this.setArray(this.sync);
			}
			this.dso.forEach(function (e) {
				if (e) e.onChanged();
			});
		},
		notifyInvalidate: function () {
			this.dso.forEach(function (e) {
				if (e) e.onInvalidated();
			});
		},
		rebind: function (pos) {
			var i;
			for (i in this.holders) {
				if (this.holders[i].pos == pos) {
					this.binder(this.holders[i], this.array[pos], parseInt(pos), this.array, this.params);
				}
			}
		},
		setArray: function (a) {
			var i;
			if (this.array != a) {
				this.array.length = a.length;
				for (i in a) this.array[i] = a[i];
			}
			this.notifyChange(true);
		},
		setSync: function (a) {
			this.sync = a;
			this.notifyChange(false);
		}
	}
	r.getController = function (adapter) {
		var r = adapter.getItem(-1);
		r.self = adapter;
		return r;
	}
	return r;
})());