MapScript.loadModule("ExpandableListAdapter", (function() {
	const DEPTH_LIMIT = 40;
	function buildExtendData(e, i, parent, children, idHolder, newDepth) {
		return {
			data : e,
			id : idHolder[0]++,
			group : Array.isArray(children),
			children : children,
			extend : null,
			expanded : false,
			children_expanded : 0,
			parent : parent,
			index : i,
			depth : newDepth
		};
	}
	function extendArray(item, getChildren, idHolder, params) {
		if (!item.group) return;
		var newDepth = item.depth + 1;
		if (newDepth > DEPTH_LIMIT) return item.extend = item.children = [];
		item.extend = item.children.map(function(e, i, a) {
			return buildExtendData(e, i, item, getChildren(e, i, a, newDepth, params), idHolder, newDepth);
		});
		return item.extend;
	}
	function makePointer(controller) {
		var i, a = controller.extend;
		for (i = 0; i < a.length; i++) a[i].pos = i;
	}
	function extendNodeTree(controller, node) {
		if (!node.extend) extendArray(data, controller._getChildren, controller.idHolder, controller.params);
		node.extend.forEach(function(e) {
			if (e.group) extendNodeTree(controller, e);
		});
	}
	function expandNode(controller, cursor, data, mode) {
		var i, a = controller.extend, e;
		if (!data.extend) extendArray(data, controller._getChildren, controller.idHolder, controller.params);
		if (mode == 0) mode = data.children_expanded;
		for (i in data.extend) {
			e = data.extend[i];
			if (isNaN(e.pos)) a.splice(cursor[0], 0, e);
			cursor[0]++;
			if (!e.group) continue;
			if (mode > 0) e.expanded = mode == 1;
			e.children_expanded = data.children_expanded;
			if (e.expanded) expandNode(controller, cursor, e, mode);
		}
		data.expanded = true;
	}
	function collapseNode(controller, delpos, data, recursive) {
		var i, a = controller.extend, e;
		for (i in data.extend) {
			e = data.extend[i];
			delpos.push(e.pos);
			if (e.expanded) collapseNode(controller, delpos, e, recursive);
		}
		if (recursive) data.children_expanded = 2;
	}
	function getLastNodePos(node) {
		if (!node.extend || !node.extend.length) return node.pos;
		return getLastNodePos(node.extend[node.extend.length - 1]);
	}
	function updateNode(controller, data, target, isRoot, silent) {
		var i, j, newArr, newExtend, newDepth, e, itemIndex;
		newArr = isRoot ? data.data : controller._getChildren(data.data, data.index, data.parent.children, data.depth, controller.params);
		data.group = Array.isArray(newArr);
		if (!data.group) {
			data.expanded = false;
			data.children_expanded = 0;
		}
		if (!data.expanded) silent = true;
		if (data.group && data.extend) {
			newExtend = [];
			newDepth = data.depth + 1;
			if (data.depth <= DEPTH_LIMIT) {
				for (i = 0; i < newArr.length; i++) {
					itemIndex = -1;
					for (j = 0; j < data.extend.length; j++) {
						if (newArr[i] == data.extend[j].data) {
							itemIndex = j;
							break;
						}
					}
					if (itemIndex < 0) {
						e = buildExtendData(newArr[i], i, data, controller._getChildren(newArr[i], i, newArr, newDepth, controller.params), controller.idHolder, newDepth);
					} else {
						e = data.extend[itemIndex];
						data.extend.splice(itemIndex, 1);
					}
					e.index = i;
					newExtend.push(e);
					if (!silent) target.push(e);
					updateNode(controller, e, target, false, silent);
				}
			}
		}
		data.children = newArr;
		data.extend = newExtend;
		return target;
	}
	function searchNode(controller, data, root, arr) {
		var i = root.children.indexOf(data);
		if (i >= 0) {
			arr.push(i);
			return true;
		}
		if (!root.extend) extendArray(root, controller._getChildren, controller.idHolder, controller.params);
		for (i = 0; i < root.extend.length; i++) {
			if (!root.extend[i].group) continue;
			if (searchNode(controller, data, root.extend[i], arr)) {
				arr.push(i);
				return true;
			}
		}
		return false;
	}
	var r = function(arr, getChildren, itemMaker, itemBinder, groupMaker, groupBinder, params) {
		//arr是列表数组
		//getChildren(element, groupIndex, groupArray, depth, params)返回该group的子对象，如果不是group则返回null
		//itemMaker(holder, params)生成item基础view
		//itemBinder(holder, element, groupIndex, groupArray, depth, params)修改view使其实现指定的item界面
		//groupMaker(holder, params)生成group基础view
		//groupBinder(holder, element, groupIndex, groupArray, depth, isExpanded, params)修改view使其实现指定的group界面
		var root, extend, itemholders = [], groupholders = [], dso = [], controller, idHolder = [0];
		root = {
			data : arr,
			id : idHolder[0]++,
			group : true,
			children : arr,
			extend : null,
			expanded : true,
			depth : -1,
			pos : NaN
		};
		extend = extendArray(root, getChildren, idHolder, params).slice();
		controller = new ExpandableListAdapter.Controller(root, extend, getChildren, groupholders, itemholders, itemMaker, groupMaker, itemBinder, groupBinder, dso, idHolder, params);
		makePointer(controller);
		return new G.ListAdapter({
			getCount : function() {
				return extend.length;
			},
			getItem : function(pos) {
				if (pos == -1) return controller;
				return extend[pos].data;
			},
			getItemId : function(pos) {
				return extend[pos].id;
			},
			getItemViewType : function(pos) {
				return extend[pos].group ? 1 : 0;
			},
			getView : function(pos, convert, parent) {
				var holder, e;
				try {
					e = extend[pos];
					if (e.group) {
						if (!convert || !(convert.getTag() in groupholders)) {
							holder = {};
							convert = groupMaker(holder, params);
							holder.self = convert;
							convert.setTag(groupholders.length.toString());
							groupholders.push(holder);
						}
						holder = groupholders[convert.getTag()];
						holder.pos = parseInt(pos);
						groupBinder(holder, e.data, e.index, e.parent.children, e.depth, e.expanded, params);
					} else {
						if (!convert || !(convert.getTag() in itemholders)) {
							holder = {};
							convert = itemMaker(holder, params);
							holder.self = convert;
							convert.setTag(itemholders.length.toString());
							itemholders.push(holder);
						}
						holder = itemholders[convert.getTag()];
						holder.pos = parseInt(pos);
						itemBinder(holder, e.data, e.index, e.parent.children, e.depth, params);
					}
					return convert;
				} catch(e) {
					var a = new G.TextView(ctx);
					a.setText(e + "\n" + e.stack);
					erp(e);
					return a;
				}
			},
			getViewTypeCount : function() {
				return 2;
			},
			hasStableIds : function() {
				return true;
			},
			isEmpty : function() {
				return extend.length === 0;
			},
			areAllItemsEnabled : function() {
				return true;
			},
			isEnabled : function(pos) {
				return pos >= 0 && pos < extend.length;
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
	r.Controller = function(root, extend, getChildren, groupholders, itemholders, itemMaker, groupMaker, itemBinder, groupBinder, dso, idHolder, params) {
		this.root = root;
		this.extend = extend;
		this._getChildren = getChildren;
		this.groupholders = groupholders;
		this.itemholders = itemholders;
		this.itemMaker = itemMaker;
		this.groupMaker = groupMaker;
		this.itemBinder = itemBinder;
		this.groupBinder = groupBinder;
		this.dso = dso;
		this.idHolder = idHolder;
		this.params = params;
	}
	r.Controller.prototype = {
		bindListView : function(lv, o) {
			var adpt = this;
			lv.setAdapter(adpt.self);
			lv.setOnItemClickListener(new G.AdapterView.OnItemClickListener({onItemClick : function(parent, view, pos, id) {try {
				var hn = parent.getHeaderViewsCount(), fn = parent.getFooterViewsCount(), c = parent.getCount();
				if (pos < hn) {
					if (o.onHeaderClick) o.onHeaderClick(pos);
					return;
				} else if (pos >= c - fn) {
					if (o.onFooterClick) o.onFooterClick(pos - c + fn);
					return;
				}
				pos -= hn;
				var e = adpt.extend[pos], args = [e.data, pos, parent, view, adpt];
				if (e.group) {
					if (e.expanded) {
						adpt.collapse(pos);
						if (o.onGroupCollapse) o.onGroupCollapse.apply(o, args);
					} else {
						adpt.expand(pos);
						if (o.onGroupExpand) o.onGroupExpand.apply(o, args);
					}
					if (o.onGroupClick) o.onGroupClick.apply(o, args);
				} else {
					if (o.onItemClick) o.onItemClick.apply(o, args);
				}
				if (o.onClick) o.onClick.apply(o, args);
			} catch(e) {erp(e)}}}));
			if (o.onLongClick || o.onGroupLongClick || o.onItemLongClick || o.onHeaderLongClick || o.onFooterLongClick) {
				lv.setOnItemLongClickListener(new G.AdapterView.OnItemLongClickListener({onItemLongClick : function(parent, view, pos, id) {try {
					var hn = parent.getHeaderViewsCount(), fn = parent.getFooterViewsCount(), c = parent.getCount();
					if (pos < hn) {
						if (o.onHeaderLongClick) o.onHeaderLongClick(pos);
						return true;
					} else if (pos >= c - fn) {
						if (o.onFooterLongClick) o.onFooterLongClick(pos - c + fn);
						return true;
					}
					pos -= hn;
					var e = adpt.extend[pos], args = [e.data, pos, parent, view, adpt];
					if (e.group) {
						if (o.onGroupLongClick) o.onGroupLongClick.apply(o, args);
					} else {
						if (o.onItemLongClick) o.onItemLongClick.apply(o, args);
					}
					if (o.onLongClick) o.onLongClick.apply(o, args);
					return true;
				} catch(e) {return erp(e), true}}}));
			}
		},
		collapse : function(pos, recursive) {
			var i, e = this.extend[pos], delpos = [];
			if (!e.expanded) return;
			collapseNode(this, delpos, e, recursive);
			for (i = delpos.length - 1; i >= 0; i--) {
				this.extend[delpos[i]].pos = NaN;
				this.extend.splice(delpos[i], 1);
			}
			e.expanded = false;
			makePointer(this);
			this.notifyChange();
		},
		collapseAll : function() {
			var i, a = this.root.extend, e, delpos = [];
			for (i = 0; i < a.length; i++) {
				e = a[i];
				if (e.expanded) {
					collapseNode(this, delpos, e, true);
					e.expanded = false;
				} else if (e.group) {
					e.children_expanded = 2;
				}
			}
			for (i = delpos.length - 1; i >= 0; i--) {
				this.extend[delpos[i]].pos = NaN;
				this.extend.splice(delpos[i], 1);
			}
			makePointer(this);
			this.notifyChange();
		},
		collapseTree : function(pos) {
			this.collapse(pos, true);
		},
		clearHolder : function() {
			var i;
			for (i in this.holders) {
				this.holders[i].self.setTag("");
			}
			this.holders.length = 0;
			this.notifyChange();
		},
		extendAll : function() {
			extendNodeTree(this, this.root);
		},
		expand : function(pos, recursive) {
			var e = this.extend[pos];
			if (!e.group || e.expanded) return;
			expandNode(this, [pos + 1], e, recursive ? 1 : 0);
			makePointer(this);
			this.notifyChange();
		},
		expandAll : function() {
			expandNode(this, [0], this.root, 1);
			makePointer(this);
			this.notifyChange();
		},
		expandTree : function(pos) {
			this.expand(pos, true);
		},
		findNodePath : function(node) {
			var r = [];
			if (searchNode(this, node, this.root, r)) {
				r.reverse();
				return r;
			}
			return null;
		},
		findNodePos : function(node) {
			var i;
			for (i in this.extend) {
				if (extend[i].data == node) return i;
			}
			return -1;
		},
		getChildren : function(pos) {
			return this.extend[pos].children;
		},
		getDepth : function(pos) {
			return this.extend[pos].depth;
		},
		getGroupIndex : function(pos) {
			return this.extend[pos].index;
		},
		getHolder : function(view) {
			return this.holders[view.getTag()];
		},
		getVisibleChildren : function(pos, arr) {
			var i, e = this.extend[pos];
			if (!arr) arr = [];
			if (!e.extend) return arr;
			for (i in e.extend) if (!isNaN(e.extend[i].pos)) arr.push(e.extend[i].pos);
		},
		getItem : function(pos) {
			return this.extend[pos].data;
		},
		getParent : function(pos) {
			return this.extend[pos].parent.pos;
		},
		getSiblings : function(pos, arr) {
			var i, e = this.extend[pos].parent;
			if (!arr) arr = [];
			for (i in e.extend) arr.push(e.extend[i].pos);
		},
		getTree : function(pos, arr) {
			var i, e = this.extend[pos];
			if (!arr) arr = [];
			arr.push(pos);
			if (!e.extend || !e.expanded) return arr;
			for (i in e.extend) {
				this.getTree(e.extend[i].pos, arr);
			}
			return arr;
		},
		getPath : function(pos, arr) {
			if (!arr) arr = [];
			if (isNaN(pos)) return arr;
			this.getPath(this.getParent(pos), arr);
			arr.push(this.extend[pos].index);
			return arr;
		},
		getPosition : function(path) {
			var s = this.root, i;
			for (i = 0; i < path.length; i++) {
				if (!s.extend) return NaN;
				s = s.extend[path[i]];
				if (!s) return NaN;
			}
			return s.pos;
		},
		hasChildren : function(pos) {
			return this.isGroup(pos) && this.extend[pos].children.length > 0;
		},
		isCollapsed : function(pos) {
			return !this.extend[pos].expanded;
		},
		isExpanded : function(pos) {
			return this.extend[pos].expanded;
		},
		isGroup : function(pos) {
			return this.extend[pos].group;
		},
		isVisible : function(node) {
			return this.findNode(node) >= 0;
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
		rebind : function(pos) {
			var i, e;
			for (i in this.groupholders) {
				if (this.groupholders[i].pos == pos) {
					e = this.extend[pos];
					this.groupBinder(this.groupholders[i], e.data, e.index, e.parent.children, e.depth, this.params);
				}
			}
			for (i in this.itemholders) {
				if (this.itemholders[i].pos == pos) {
					e = this.extend[pos];
					this.itemBinder(this.itemholders[i], e.data, e.index, e.parent.children, e.depth, this.params);
				}
			}
		},
		reveal : function(path) {
			var s = this.root, i;
			for (i = 0; i < path.length; i++) {
				if (!s.extend) return NaN;
				s = s.extend[path[i]];
				if (!s) return NaN;
				if (s.group && !s.expanded && i < path.length - 1) this.expand(s.pos);
			}
			return s.pos;
		},
		revealNode : function(node) {
			var a = this.findNodePath(node);
			if (a) return this.reveal(a);
			return NaN;
		},
		setArray : function(a) {
			var i, u;
			this.extend.length = 0;
			this.root.data = this.root.children = a;
			u = extendArray(this.root, this._getChildren, this.idHolder, this.params);
			for (i in u) this.extend.push(u[i]);
			makePointer(this);
			this.notifyChange();
		},
		update : function(pos) {
			Array.prototype.splice.apply(this.extend, updateNode(this, this.extend[pos], [pos + 1, getLastNodePos(this.extend[pos]) - pos], false, false));
			makePointer(this);
			this.notifyChange();
		},
		updateAll : function() {
			Array.prototype.splice.apply(this.extend, updateNode(this, this.root, [0, this.extend.length], true, false));
			makePointer(this);
			this.notifyChange();
		}
	}
	r.control = function(adapter) {
		var r = adapter.getItem(-1);
		r.self = adapter;
		return r;
	}
	return r;
})());