MapScript.loadModule("MoreListAdapter", (function() {
	var r = function(baseAdapter, loader) {
		//baseAdapter 原始ListAdapter
		//loader Loader接口
		// loadingView 加载指示器View
		// loaderView 加载按钮View，启用自动加载时可不提供
		// autoload 自动加载（加载到loaderView自动进行load操作）
		// load(callback, session) 异步加载下一部分
		// loading （只读）表示是否加载中 
		// finished （只读）表示是否没有内容需要加载
		// latestSession （只读）表示上个加载的过程ID，未加载时返回null
		var baseAdapterCount, baseAdapterTypeCount, dso = [], autoload = loader.autoload, controller;
		controller = new r.Controller(baseAdapter, dso, loader);
		if (autoload) {
			loader.loaderView = new G.View(ctx);
		}
		return new G.ListAdapter({
			getCount : function() {
				baseAdapterCount = baseAdapter.getCount();
				return loader.finished ? baseAdapterCount : baseAdapterCount + 1;
			},
			getItem : function(pos) {
				if (pos == -1) return controller;
				if (pos == baseAdapterCount) return loader;
				return baseAdapter.getItem(pos);
			},
			getItemId : function(pos) {
				if (pos == baseAdapterCount) return loader.loading ? 9999 : 9998;
				return baseAdapter.getItemId(pos);
			},
			getItemViewType : function(pos) {
				if (pos == baseAdapterCount) return loader.loading ? baseAdapterTypeCount + 1 : baseAdapterTypeCount;
				return baseAdapter.getItemViewType(pos);
			},
			getView : function(pos, convert, parent) {
				if (pos == baseAdapterCount) {
					if (!loader.loading && autoload) {
						controller.postLoad();
					}
					return loader.loading ? loader.loadingView : loader.loaderView;
				}
				return baseAdapter.getView(pos, convert, parent);
			},
			getViewTypeCount : function() {
				baseAdapterTypeCount = baseAdapter.getViewTypeCount();
				return baseAdapterTypeCount + 2;
			},
			hasStableIds : function() {
				return baseAdapter.hasStableIds();
			},
			isEmpty : function() {
				return false;
			},
			areAllItemsEnabled : function() {
				return baseAdapter.areAllItemsEnabled();
			},
			isEnabled : function(pos) {
				if (pos == baseAdapterCount) {
					return true;
				}
				return baseAdapter.isEnabled(pos);
			},
			registerDataSetObserver : function(p) {
				baseAdapter.registerDataSetObserver(p);
				if (dso.indexOf(p) >= 0) return;
				dso.push(p);
			},
			unregisterDataSetObserver : function(p) {
				baseAdapter.unregisterDataSetObserver(p);
				var i = dso.indexOf(p);
				if (p >= 0) dso.splice(i, 1);
			}
		});
	}, latestSession = 0;
	r.Controller = function(baseAdapter, dso, loader) {
		this.base = baseAdapter;
		this.dso = dso;
		this.loader = loader;
	}
	r.Controller.prototype = {
		notifyChange : function() {
			var i;
			for (i in this.dso) {
				this.dso[i].onChanged();
			}
		},
		requestLoad : function() {
			var session = ++latestSession;
			this.loader.loading = true;
			this.loader.latestSession = session;
			this.loader.load(this.asyncLoadComplete.bind(this, session), session);
			if (this.loader.loading) {
				this.notifyChange();
			}
		},
		postLoad : function() {
			var self = this;
			gHandler.post(function() {try {
				self.requestLoad();
			} catch(e) {erp(e)}});
		},
		cancelLoading : function() {
			this.loader.latestSession = null;
			this.loader.loading = false;
		},
		updateFinished : function(finished, alreadyNotify) {
			this.loader.finished = Boolean(finished);
			if (!alreadyNotify) this.notifyChange();
		},
		reset : function(finished, alreadyNotify) {
			this.cancelLoading();
			this.updateFinished(finished, alreadyNotify);
		},
		asyncLoadComplete : function(session, finished, alreadyNotify) {
			if (this.loader.latestSession == session) {
				this.loader.loading = false;
				this.updateFinished(finished, alreadyNotify);
			}
		}
	}
	r.getController = function(adapter) {
		var r = adapter.getItem(-1);
		r.self = adapter;
		return r;
	}
	return r;
})());