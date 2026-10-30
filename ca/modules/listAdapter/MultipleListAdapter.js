MapScript.loadModule("MultipleListAdapter", (function() {
	var r = function(arr, types, getType, params) {
		//arr是列表数组，types为View的类型数组/键值对，每个成员为一个对象，包含以下成员：
		//maker(holder, params)生成基础view，binder(holder, element, index, array, params)修改view使其实现指定的界面
		//getType(e, i, a, params)返回元素对应的view类型
		var i, vtypes = [], src = arr, holders = {}, dso = [], controller;
		for (i in types) {
			vtypes.push(i);
			holders[i] = [];
		}
		controller = new MultipleListAdapter.Controller(src, holders, dso, types, vtypes, getType, params);
		return new G.ListAdapter({
			getCount : function() {
				return src.length;
			},
			getItem : function(pos) {
				if (pos == -1) return controller;
				return src[pos];
			},
			getItemId : function(pos) {
				return pos;
			},
			getItemViewType : function(pos) {
				var i = vtypes.indexOf(String(getType(src[pos], pos, src, params)));
				return i;
			},
			getView : function(pos, convert, parent) {
				var holder, vtype;
				try {
					vtype = getType(src[pos], pos, src, params);
					if (!convert || !(convert.getTag() in holders[vtype])) {
						holder = {};
						convert = types[vtype].maker(holder, params);
						holder.self = convert;
						convert.setTag(holders[vtype].length.toString());
						holders[vtype].push(holder);
					}
					holder = holders[vtype][convert.getTag()];
					holder.pos = parseInt(pos);
					types[vtype].binder(holder, src[pos], parseInt(pos), src, params);
					return convert;
				} catch(e) {
					var a = new G.TextView(ctx);
					a.setText(e + "\n" + e.stack);
					erp(e);
					return a;
				}
			},
			getViewTypeCount : function() {
				return vtypes.length;
			},
			hasStableIds : function() {
				return false;
			},
			isEmpty : function() {
				return src.length === 0;
			},
			areAllItemsEnabled : function() {
				return true;
			},
			isEnabled : function(pos) {
				return pos >= 0 && pos < src.length;
			},
			registerDataSetObserver : function(p) {
				if (dso.indexOf(p) >= 0) return;
				dso.push(p);
			},
			unregisterDataSetObserver : function(p) {
				var i = dso.indexOf(p);
				if (p >= 0) dso.splice(i, 1);
			}
		});
	}
	r.Controller = function(array, holders, dso, types, vtypes, getType, params) {
		this.array = array;
		this.holders = holders;
		this.dso = dso;
		this.types = types;
		this.vtypes = vtypes;
		this.getType = getType;
		this.params = params;
	}
	r.Controller.prototype = {
		clearHolder : function() {
			var i, j, e;
			for (i in this.holders) {
				e = this.holders[i];
				for (j in e) {
					e[j].self.setTag("");
				}
				e.length = 0;
			}
			this.notifyChange();
		},
		getHolder : function(pos, view) {
			return this.holders[this.getType(this.array[pos], pos, this.array, this.params)][view.getTag()];
		},
		notifyChange : function() {
			this.dso.forEach(function(e) {
				if (e) e.onChanged();
			});
		},
		notifyInvalidate : function() {
			this.dso.forEach(function(e) {
				if (e) e.onInvalidated();
			});
		},
		setArray : function(a) {
			var i;
			if (this.array != a) {
				this.array.length = 0;
				for (i in a) this.array.push(a[i]);
			}
			this.notifyChange();
		}
	}
	r.getController = function(adapter) {
		var r = adapter.getItem(-1);
		r.self = adapter;
		return r;
	}
	return r;
})());