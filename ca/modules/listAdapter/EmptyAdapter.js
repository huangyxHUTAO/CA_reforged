MapScript.loadModule("EmptyAdapter", (function() {
	var k = [], v = [];
	function build() {
		var text = new G.TextView(ctx);
		text.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
		text.setText("空空如也");
		text.setPadding(0, 40 * G.dp, 0, 40 * G.dp);
		text.setGravity(G.Gravity.CENTER);
		text.setFocusable(true);
		Common.applyStyle(text, "textview_prompt", 4);
		return text;
	}
	function resize(view, parent) {
		var c = parent.getChildCount();
		var h = parent.getHeight();
		if (c > 0) {
			h -= parent.getChildAt(c - 1).getBottom();
		}
		h -= parent.getDividerHeight();
		if (h < 100 * G.dp) h = -2;
		view.getLayoutParams().height = h;
		view.setLayoutParams(view.getLayoutParams());
	}
	return new G.ListAdapter({
		getCount : function() {
			return 1;
		},
		getItem : function(pos) {
			return null;
		},
		getItemId : function(pos) {
			return pos;
		},
		getItemViewType : function(pos) {
			return 0;
		},
		getView : function(pos, convert, parent) {
			try {
				var i = k.indexOf(parent);
				if (i < 0) {
					k.push(parent);
					v.push(convert = build());
				} else {
					convert = v[i];
				}
				//resize(convert, parent);
				return convert;
			} catch(e) {
				var a = new G.TextView(ctx);
				a.setText(e + "\n" + e.stack);
				erp(e);
				return a;
			}
		},
		getViewTypeCount : function() {
			return 1;
		},
		hasStableIds : function() {
			return true;
		},
		isEmpty : function() {
			return false;
		},
		areAllItemsEnabled : function() {
			return true;
		},
		isEnabled : function(pos) {
			return true;
		},
		registerDataSetObserver : function(p) {},
		unregisterDataSetObserver : function(p) {}
	});
})());