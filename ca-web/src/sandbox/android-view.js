/**
 * Android View 翻译层 —— 把 android.widget.* / android.view.* 包成真 DOM 元素
 *
 * 设计：
 * - 每个 AndroidView 实例包装一个 HTMLElement（this.el）
 * - Android API 翻译成 DOM API（setText → textContent, setOnClickListener → addEventListener, addView → appendChild）
 * - LayoutParams 转 CSS（LayoutParams(int w, int h) 的 -1=MATCH_PARENT, -2=WRAP_CONTENT）
 *
 * 最小实现：只覆盖 CA 当前用到的方法。新增方法按需扩展。
 */

/** LayoutParams 数值常量 */
const MATCH_PARENT = -1;
const WRAP_CONTENT = -2;

/** 翻译 LayoutParams 尺寸到 CSS */
function dimToCss(value, parentSize) {
  if (value === MATCH_PARENT) return '100%';
  if (value === WRAP_CONTENT) return 'fit-content';
  if (typeof value === 'number') return value + 'px';
  return value;
}

/** 翻译 Gravity 标志到 CSS justify-content / align-items */
const GRAVITY_MAP = {
  0x03: 'left', 0x05: 'right', 0x01: 'top', 0x10: 'bottom', 0x11: 'center',
  0x30: 'center', 0x33: 'center', 0x13: 'center', 0x31: 'center',
  CENTER: 'center', CENTER_HORIZONTAL: 'center', CENTER_VERTICAL: 'center',
  LEFT: 'flex-start', RIGHT: 'flex-end', TOP: 'flex-start', BOTTOM: 'flex-end',
  START: 'flex-start', END: 'flex-end'
};
function gravityToCss(g) {
  if (g === undefined || g === null) return '';
  return GRAVITY_MAP[g] || '';
}

/** Java CharSequence/Editable 包装 —— CA 代码对 getText() 结果调 .length()/.setSpan() */
export class CharSequenceWrap {
  constructor(str = '', spans = []) {
    this._s = String(str);
    this._spans = spans;
  }
  length() { return this._s.length; }
  toString() { return this._s; }
  valueOf() { return this._s; }
  charAt(i) { return this._s.charAt(i); }
  charCodeAt(i) { return this._s.charCodeAt(i); }
  subSequence(a, b) { return new CharSequenceWrap(this._s.slice(a, b), this._spans); }
  substring(a, b) { return this._s.substring(a, b); }
  slice(a, b) { return this._s.slice(a, b); }
  indexOf(x, from) { return this._s.indexOf(x, from); }
  lastIndexOf(x) { return this._s.lastIndexOf(x); }
  matches(re) { return re.test(this._s); }
  getBytes() { return new TextEncoder().encode(this._s); }
  compareTo(o) { const b = String(o); return this._s < b ? -1 : this._s > b ? 1 : 0; }
  equals(o) { return o != null && (o.toString ? o.toString() : String(o)) === this._s; }
  hashCode() { let h = 0; for (let i = 0; i < this._s.length; i++) h = (h * 31 + this._s.charCodeAt(i)) | 0; return h; }
  isEmpty() { return this._s.length === 0; }
  trim() { return new CharSequenceWrap(this._s.trim(), this._spans); }
  toUpperCase() { return new CharSequenceWrap(this._s.toUpperCase(), this._spans); }
  toLowerCase() { return new CharSequenceWrap(this._s.toLowerCase(), this._spans); }
  split(sep) { return this._s.split(sep); }
  startsWith(p) { return this._s.startsWith(p); }
  endsWith(p) { return this._s.endsWith(p); }
  contains(p) { return this._s.includes(p); }
  replace(a, b, str) { this._s = this._s.slice(0, a) + String(str) + this._s.slice(b); return this; }
  insert(pos, str) { return this.replace(pos, pos, str); }
  append(str) { this._s += String(str); return this; }
  delete(a, b) { this._s = this._s.slice(0, a) + this._s.slice(b); return this; }
  clear() { this._s = ''; return this; }
  clearSpans() { this._spans.length = 0; return this; }
  setSpan(what, start, end, flags) {
    this._spans.push({ what, start, end, flags });
    return this;
  }
  removeSpan(what) {
    this._spans = this._spans.filter(s => s.what !== what);
    return this;
  }
  getSpans(a, b) {
    return this._spans.filter(s => s.start <= (b ?? this._s.length) && s.end >= (a ?? 0)).map(s => s.what);
  }
  getSpanStart(what) {
    const s = this._spans.find(s => s.what === what);
    return s ? s.start : -1;
  }
  getSpanEnd(what) {
    const s = this._spans.find(s => s.what === what);
    return s ? s.end : -1;
  }
}

/** AndroidView 基类 —— 包装一个 DOM 元素 */
export class AndroidView {
  constructor(tagName = 'div') {
    // 兼容 new G.View(ctx)：ctx 是 context，不是 tagName
    const VALID = /^[a-z][a-z0-9-]*$/i;
    const tag = (typeof tagName === 'string' && VALID.test(tagName)) ? tagName : 'div';
    this.el = document.createElement(tag);
    this.el.__caView = this; // DOM → AndroidView 反向引用（弹窗布局器用）
    // 注意：不默认 position:absolute（会让 flex/block 布局错乱）。
    // 只有 FrameLayout 子（叠放）和 WindowManager 根（fixed）才需要定位。
    this.el.style.boxSizing = 'border-box';
    this._classDisplay = 'block'; // 子类覆盖（LinearLayout->flex 等）
    this.children = [];
    this.layoutParams = { width: WRAP_CONTENT, height: WRAP_CONTENT, gravity: 0 };
    this.tagNameForView = 'View';
    this.id = AndroidView._idCounter++;
    this.visibility = 0; // 0=VISIBLE
    this._listeners = {};
  }
  static _idCounter = 1;

  // ===== LayoutParams =====
  setLayoutParams(lp) {
    this.layoutParams = lp || {};
    this.__lpSet = true;
    // WM 兼容兜底：buildLayoutParams 会对 p 调 setTitle 等
    if (typeof this.layoutParams.setTitle !== 'function') {
      this.layoutParams.setTitle = function () { return this; };
    }
    if (typeof this.layoutParams.getTitle !== 'function') {
      this.layoutParams.getTitle = function () { return ''; };
    }
    this._applyLayout();
    return this;
  }
  getLayoutParams() {
    if (!this.layoutParams) {
      this.layoutParams = { width: WRAP_CONTENT, height: WRAP_CONTENT, gravity: 0 };
    }
    // 无条件附加 WM 兼容方法（buildLayoutParams 会对 p 调 setTitle/setMargins）
    const lp = this.layoutParams;
    if (typeof lp.setTitle !== 'function') lp.setTitle = function () { return this; };
    if (typeof lp.getTitle !== 'function') lp.getTitle = function () { return ''; };
    if (typeof lp.setMargins !== 'function') {
      lp.setMargins = function (l, t, r, b) {
        this.leftMargin = l; this.topMargin = t; this.rightMargin = r; this.bottomMargin = b;
        return this;
      };
    }
    return lp;
  }

  _applyLayout() {
    const lp = this.layoutParams;
    if (!lp) return;
    const st = this.el.style;
    const parent = this._parent;
    const pLinear = parent && parent.tagNameForView === 'LinearLayout';
    const pFrame = parent && parent.tagNameForView === 'FrameLayout';
    // 复位此前可能残留的 flex 规则（避免多次 setLayoutParams 累积）
    st.flexGrow = '';
    st.flexShrink = '';
    st.flexBasis = '';

    if (pLinear) {
      // —— Android LinearLayout 子语义 ——
      // 主轴：weight>0 → flex-grow=weight,basis 0；height/width==MATCH_PARENT(-1)
      //   且无 weight → 占剩余（Android 中 MATCH_PARENT 在 LinearLayout 里吃掉
      //   wrap 兄弟剩下的空间，约等于 grow:1 basis 0）
      //   否则 wrap(内容)/固定px → grow 0 basis auto
      const vert = parent.orientation === 1; // 父 LinearLayout 是否垂直
      const main = vert ? lp.height : lp.width;
      const cross = vert ? lp.width : lp.height;
      const wgt = lp.weight || 0;
      if (wgt > 0) {
        st.flexGrow = String(wgt);
        st.flexShrink = '1';
        st.flexBasis = '0%';
      } else if (main === MATCH_PARENT) {
        st.flexGrow = '1';
        st.flexShrink = '1';
        st.flexBasis = '0%';
      } else {
        st.flexGrow = '0';
        st.flexShrink = '0';
        st.flexBasis = 'auto';
        // 主轴固定值也写尺寸（wrap/px 都行）
        if (vert) st.height = dimToCss(main);
        else st.width = dimToCss(main);
      }
      // 交叉轴尺寸直译（垂直布局时 width 生效）
      if (vert) {
        st.width = dimToCss(cross);
        // 高度交给 flex（上面已决定）
        if (wgt > 0 || main === MATCH_PARENT) st.height = '';
      } else {
        st.height = dimToCss(cross);
        if (wgt > 0 || main === MATCH_PARENT) st.width = '';
      }
    } else {
      // —— FrameLayout 子 / 普通父 ——
      // FrameLayout 子 Android 默认 LP 是 MATCH_PARENT（由 addView 补默认），
      // 这里 width/height 直译：MATCH → 100%（相对父，父已由 flex/100% 确定）
      st.width = dimToCss(lp.width);
      st.height = dimToCss(lp.height);
    }
    if (lp.gravity !== undefined) {
      const g = gravityToCss(lp.gravity);
      if (g) {
        this.el.style.display = 'flex';
        this.el.style.justifyContent = g;
        this.el.style.alignItems = g;
      }
    }
  }

  // ===== Children =====
  addView(child, index, params) {
    if (!child) return;
    // Android 重载：addView(child, LayoutParams) —— 第二参是 LP 对象而非 index
    if (index && typeof index === 'object') {
      params = index;
      index = undefined;
    }
    if (child instanceof AndroidView) {
      child._parent = this;
      // Android 默认 LP：仅在引擎从未显式 setLayoutParams 时补默认
      // （FrameLayout 子 → MATCH_PARENT；LinearLayout 子 → wrap_content）
      let lp = params;
      if (!lp && !child.__lpSet) {
        if (this.tagNameForView === 'FrameLayout') {
          lp = new FrameLayout.LayoutParams(-1, -1);
        } else if (this.tagNameForView === 'LinearLayout') {
          lp = new LinearLayout.LayoutParams(-2, -2);
        }
      }
      if (lp) {
        child.__lpSet = true;
        child.setLayoutParams(lp);
      } else if (child._applyLayout) {
        // LP 已由引擎设过：父类型可能影响布局语义（LinearLayout vs 其他），重算一次
        child._applyLayout();
      }
      this.children.push(child);
      const where = (typeof index === 'number' && this.el.children[index])
        ? this.el.children[index]
        : null;
      if (where) this.el.insertBefore(child.el, where);
      else this.el.appendChild(child.el);
    }
    return this;
  }
  /**
   * FrameLayout 的 Android measure/layout 语义补齐：
   * - 自身 LP 高度为 wrap_content 时，父高 = 最高子 + 自身 padding（CSS absolute 子
   *   不参与 fit-content 高度，会塌成 padding，弹窗内容容器即此症状）；
   * - 子按 LP.gravity 在容器内容盒内对齐（CENTER/RIGHT/BOTTOM...，gravity 0 保持 0,0）。
   * 递归先子后父；gravity 0 的子位置不变，match 全屏容器布局不受影响。
   */
  static layoutWrapFrames(view) {
    if (!view || !view.el) return;
    for (const c of view.children || []) AndroidView.layoutWrapFrames(c);
    if (view.tagNameForView !== 'FrameLayout') return;
    const lp = view.layoutParams || {};
    const el = view.el;
    if (!el.isConnected) return;
    const cs = getComputedStyle(el);
    const padT = parseFloat(cs.paddingTop) || 0;
    const padB = parseFloat(cs.paddingBottom) || 0;
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    // wrap 高：量子（子 absolute，offsetHeight 是其自身内容高，含子上下 margin）
    if (lp.height === WRAP_CONTENT) {
      let maxH = 0;
      for (const c of view.children || []) {
        if (!c.el || !c.el.isConnected) continue;
        const clp = c.layoutParams || {};
        maxH = Math.max(maxH, c.el.offsetHeight + (clp.topMargin || 0) + (clp.bottomMargin || 0));
      }
      if (maxH > 0) el.style.height = (maxH + padT + padB) + 'px';
    }
    // gravity 定位子（absolute 子相对 padding box，需加上 padding 起点）。
    // margin 是 Android 语义里子与父的额外间距（如 dialog 卡片 20dp 边距），
    // 引擎 resize 时 setMargins 写进 LP，这里消费：match 子宽 = 内容宽 - 左右 margin。
    const contentW = el.clientWidth - padL - padR;
    const contentH = el.clientHeight - padT - padB;
    for (const c of view.children || []) {
      if (!c.el || !c.el.isConnected) continue;
      const clp = c.layoutParams || {};
      const g = clp.gravity || 0;
      const lm = clp.leftMargin || 0, tm = clp.topMargin || 0;
      const rm = clp.rightMargin || 0, bm = clp.bottomMargin || 0;
      // match 宽的子按减去 margin 后的内容宽显式定宽（CSS 100% 吃不到 margin）
      if (clp.width === MATCH_PARENT) {
        c.el.style.width = Math.max(0, contentW - lm - rm) + 'px';
      }
      const cw = c.el.offsetWidth, ch = c.el.offsetHeight;
      let x = padL + lm, y = padT + tm;
      if (g & 0x01) x = padL + lm + Math.round((contentW - lm - rm - cw) / 2);   // CENTER_HORIZONTAL
      else if ((g & 0x05) || (g & 0x00800005)) x = padL + lm + (contentW - lm - rm - cw); // RIGHT/END
      if (g & 0x10) y = padT + tm + Math.round((contentH - tm - bm - ch) / 2);   // CENTER_VERTICAL
      else if (g & 0x50) y = padT + tm + (contentH - tm - bm - ch);              // BOTTOM
      c.el.style.left = x + 'px';
      c.el.style.top = y + 'px';
    }
  }
  addView2(child, params) { return this.addView(child); }
  removeView(child) {
    if (child && child.el && child.el.parentNode === this.el) {
      this.el.removeChild(child.el);
    }
    this.children = this.children.filter(c => c !== child);
    return this;
  }
  removeAllViews() {
    this.children = [];
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);
    return this;
  }
  getChildCount() { return this.children.length; }
  getChildAt(i) { return this.children[i]; }
  getParent() { return this._parent || null; }
  indexOfChild(child) { return this.children.indexOf(child); }

  // ===== Visibility / Alpha =====
  setVisibility(v) {
    this.visibility = v;
    // 尊重 Android 语义：GONE(8) 完全移除 / INVISIBLE(4) 保留空间 / VISIBLE(0) 显示
    // （引擎动画结束回调会负责把 GONE 的视图恢复 VISIBLE——见 CAAnimation.start）
    if (v === 8) {
      this.el.style.display = 'none';
    } else if (v === 4) {
      this.el.style.display = this._classDisplay || 'block';
      this.el.style.visibility = 'hidden';
    } else {
      this.el.style.display = this._classDisplay || 'block';
      this.el.style.visibility = '';
    }
    return this;
  }
  getVisibility() { return this.visibility; }
  setAlpha(a) { this.el.style.opacity = String(a); return this; }

  // ===== Background / Padding =====
  setBackgroundColor(color) {
    // Android color 是 32-bit ARGB int。转 CSS
    this.el.style.backgroundColor = colorToCss(color);
    return this;
  }
  setBackground(drawable) { return this.setBackgroundColor(drawable); }
  setBackgroundDrawable(d) { return this.setBackgroundColor(d); }
  setPadding(left, top, right, bottom) {
    this.el.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
    return this;
  }
  setPaddingRelative(s, t, e, b) { return this.setPadding(s, t, e, b); }

  // ===== Text / TextColor =====
  setText(text) {
    if (text != null && typeof text === 'object' && typeof text.toString === 'function') {
      // Spannable/Spanned：按 _spans 渲染成带色/字体的 HTML，保留 \n
      this.el.innerHTML = renderSpannable(text);
    } else {
      this.el.textContent = text == null ? '' : String(text);
    }
    return this;
  }
  getText() { return this.el.textContent; }
  setTextColor(color) { this.el.style.color = colorToCss(color); return this; }
  setHint(h) { this.el.placeholder = h || ''; return this; }
  setHintTextColor(c) { this.el.style.setProperty('::placeholder', ''); /* CSS pseudo 难处理，no-op */ return this; }
  setTextSize(size) {
    // size 是 sp
    this.el.style.fontSize = (size * 1) + 'px';
    return this;
  }
  setTypeface(t) {
    // 传入的是 {bold/italic} 或 G.Typeface 常量（0/1/2/3）或 iconFont 对象
    if (t && typeof t === 'object') {
      if (t.bold === 1 || t.bold === true) this.el.style.fontWeight = '700';
      if (t.italic) this.el.style.fontStyle = 'italic';
      if (t.name && /icon/i.test(String(t.name))) this.el.style.fontFamily = 'IconFont, sans-serif';
    } else if (t === 1 || t === 3) {
      this.el.style.fontWeight = '700';
    } else if (t === 2 || t === 3) {
      this.el.style.fontStyle = 'italic';
    }
    return this;
  }
  setMovementMethod() { return this; }
  setTransformationMethod() { return this; }
  setLinkTextColor(c) { this.el.style.color = colorToCss(c); return this; }
  setPaintFlags() { return this; }
  setIncludeFontPadding() { return this; }
  setLineSpacing(add, mult) {
    // Android: lineHeight ≈ fontSize*mult + add(px)
    this.el.style.lineHeight = `calc(${(mult == null ? 1 : mult)}em + ${(add || 0)}px)`;
    return this;
  }
  setHighlightColor() { return this; }
  setVerticalScrollbarPosition() { return this; }
  setScrollbarFadingEnabled() { return this; }
  setVerticalFadingEdgeEnabled() { return this; }
  setHorizontalFadingEdgeEnabled() { return this; }
  setTextScaleX() { return this; }
  setLetterSpacing() { return this; }
  setFontFeatureSettings() { return this; }
  setAutoLinkMask() { return this; }
  setGravity(g) {
    this.el.style.textAlign = (g === 5) ? 'right' : (g === 3) ? 'left' : 'center';
    return this;
  }
  setSingleLine(b) {
    this.el.style.whiteSpace = b ? 'nowrap' : 'pre-wrap';
    this.el.style.overflow = b ? 'hidden' : 'visible';
    return this;
  }

  // ===== Size =====
  setWidth(w) { this.el.style.width = dimToCss(w); return this; }
  setHeight(h) { this.el.style.height = dimToCss(h); return this; }
  setMinWidth(w) { this.el.style.minWidth = dimToCss(w); return this; }
  setMaxWidth(w) { this.el.style.maxWidth = dimToCss(w); return this; }
  setMinHeight(h) { this.el.style.minHeight = dimToCss(h); return this; }
  setMaxHeight(h) { this.el.style.maxHeight = dimToCss(h); return this; }
  getWidth() { return this.el.offsetWidth; }
  getHeight() { return this.el.offsetHeight; }
  getMeasuredWidth() { return this._measuredW || this.el.scrollWidth || 0; }
  getMeasuredHeight() { return this._measuredH || this.el.scrollHeight || 0; }
  measure(widthSpec, heightSpec) {
    // 简化：记录规格，未挂载时给估算值
    this._measuredW = this.el.scrollWidth || this.el.offsetWidth || 16;
    this._measuredH = this.el.scrollHeight || this.el.offsetHeight || 16;
    return this;
  }
  requestLayout() { return this.invalidate(); }

  // ===== Position =====
  setX(x) { this.el.style.left = (x || 0) + 'px'; return this; }
  setY(y) { this.el.style.top = (y || 0) + 'px'; return this; }
  setTranslationX(x) { this.el.style.transform = `translateX(${x || 0}px)`; return this; }
  setTranslationY(y) { this._ty = y || 0; this.el.style.transform = `translate(${this._tx || 0}px, ${this._ty}px)`; return this; }
  getTranslationX() { return this._tx || 0; }
  getTranslationY() { return this._ty || 0; }
  getX() { return parseFloat(this.el.style.left) || 0; }
  getY() { return parseFloat(this.el.style.top) || 0; }
  getLeft() { return this.getX(); }
  getTop() { return this.getY(); }
  getRight() { return this.getX() + this.el.offsetWidth; }
  getBottom() { return this.getY() + this.el.offsetHeight; }
  getRawX() { return this.getX(); }
  getRawY() { return this.getY(); }

  // ===== Event listeners =====
  setOnClickListener(listener) {
    this._listeners.click = listener;
    this.el.onclick = (e) => listener && listener.onClick(this);
    // 可点击语义：挂 click listener 的 view 对鼠标应表现为可点（Android clickable）。
    // 输入控件例外——EditText/textarea 即使有 click listener 也该是文本光标（I-beam）。
    this.el.style.cursor = listener ? this._isTextInput() ? 'text' : 'pointer' : '';
    return this;
  }
  /**
   * 长按由引擎自己的 touch 链处理：ACTION_DOWN 时 postDelayed(300ms) 起
   * 计时器、ACTION_UP 时 removeCallbacks 取消（见 CA.js 的 touch listener）。
   * 翻译层只负责把鼠标映射成 ACTION_DOWN/MOVE/UP——左键按下=手指按下、
   * 抬起=手指离开、拖动=ACTION_MOVE。这里只记录 listener，不额外造长按
   * 计时器（否则和引擎的计时器重复触发，且抬起取消不掉=粘住）。
   */
  setOnLongClickListener(listener) {
    this._listeners.longClick = listener;
    return this;
  }
  _isTextInput() { return this.el.tagName === 'TEXTAREA' || this.el.tagName === 'INPUT'; }
  setOnFocusChangeListener(listener) {
    this._listeners.focus = listener;
    this.el.onfocus = (e) => listener && listener.onFocusChange(this, true);
    this.el.onblur = (e) => listener && listener.onFocusChange(this, false);
    return this;
  }
  setOnTouchListener(listener) {
    this._listeners.touch = listener;
    // 引擎 listener 期望 Android MotionEvent：getAction/getX/getY/getRawX/getRawY/getEventTime
    // 真实 DOM PointerEvent 已含 clientX/Y（=raw），需包一层。
    // ACTION_* 常量与 getAction 必须真实映射——引擎手势全靠
    // `e.getAction() == e.ACTION_DOWN` / `case e.ACTION_MOVE:` 分支，缺了会全部静默失效。
    const ACTIONS = { ACTION_DOWN: 0, ACTION_UP: 1, ACTION_MOVE: 2, ACTION_CANCEL: 3, ACTION_OUTSIDE: 4 };
    const TYPE_TO_ACTION = { pointerdown: 0, pointermove: 2, pointerup: 1, pointercancel: 3 };
    const wrap = (e) => ({
      ...ACTIONS,
      getAction: () => TYPE_TO_ACTION[e.type] ?? 0,
      getActionMasked: () => TYPE_TO_ACTION[e.type] ?? 0,
      getX: () => e.clientX,
      getY: () => e.clientY,
      getRawX: () => e.clientX,
      getRawY: () => e.clientY,
      getEventTime: () => e.timeStamp,
      getDownTime: () => e.timeStamp,
      setAction: () => {},
      _e: e
    });
    // 用 addEventListener 而非 on* 属性：on* 属性 handler 返回 false 会被浏览器
    // 当成 preventDefault，而引擎 onTouch 返回 false 只是 Android 语义的"不消费事件"，
    // 会误吞掉 pointerdown 默认行为（text 光标点击定位失效）。
    // addEventListener 忽略返回值，引擎返回 true/false 都不会影响 DOM 默认动作。
    const types = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
    const handler = (e) => { try { listener && listener.onTouch(this, wrap(e)); } catch (err) { erp(err); } };
    for (const type of types) {
      this.el.removeEventListener(type, this._touchHandler);
    }
    this._touchHandler = handler;
    for (const type of types) {
      this.el.addEventListener(type, handler);
    }
    return this;
  }
  setOnKeyListener(listener) {
    this._listeners.key = listener;
    this.el.onkeydown = (e) => listener && listener.onKeyDown(this, e.keyCode, e);
    this.el.onkeyup = (e) => listener && listener.onKeyUp(this, e.keyCode, e);
    return this;
  }
  addOnLayoutChangeListener(listener) {
    // ResizeObserver 模拟
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => listener && listener.onLayoutChange(
        this, this.el.offsetLeft, this.el.offsetTop,
        this.el.offsetLeft + this.el.offsetWidth, this.el.offsetTop + this.el.offsetHeight
      ));
      ro.observe(this.el);
    }
    return this;
  }
  setOnEditorActionListener(listener) {
    this._listeners.editorAction = listener;
    this.el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') listener && listener.onEditorAction(this, e.keyCode, e);
    });
    return this;
  }

  // ===== Misc =====
  setId(id) { this.id = id; this.el.dataset.id = id; return this; }
  getId() { return this.id; }
  setContentDescription(d) { this.el.title = d || ''; this.el.setAttribute('aria-label', d || ''); return this; }
  getContentDescription() { return this.el.title; }
  setTag(tag) { this._tag = tag; return this; }
  getTag() { return this._tag; }
  setFocusable(b) { this.el.tabIndex = b ? 0 : -1; return this; }
  setFocusableInTouchMode(b) { return this.setFocusable(b); }
  requestFocus() { this.el.focus(); return this; }
  hasFocus() { return this.el === document.activeElement; }
  invalidate() { /* DOM 自动重绘 */ return this; }
  postInvalidate() { return this.invalidate(); }
  post(action) { queueMicrotask(action); return this; }
  postDelayed(action, ms) {
    // 记住定时器句柄，让 removeCallbacks 能真正取消——引擎的鼠标点击
    // (ACTION_DOWN 起 postDelayed / ACTION_UP 取消) 依赖这个，否则"点击"
    // 会退化成"长按"（定时器取消不掉，300ms 后照样弹菜单）
    const h = setTimeout(() => {
      if (this.__pending) this.__pending.delete(h);
      try { action.run ? action.run() : action(); } catch (e) { erp(e); }
    }, ms);
    (this.__pending = this.__pending || new Set()).add(h);
    return this;
  }
  removeCallbacks(action) {
    if (!this.__pending) return;
    if (action == null) { for (const h of this.__pending) clearTimeout(h); this.__pending.clear(); return; }
    // action 可传具体 Runnable 或 undefined（全清）
    for (const h of this.__pending) clearTimeout(h);
    this.__pending.clear();
  }
  removeCallbacksAndMessages() { this.removeCallbacks(); }
  setEnabled(b) { this.el.style.pointerEvents = b ? 'auto' : 'none'; this.el.disabled = !b; return this; }
  isEnabled() { return this.el.style.pointerEvents !== 'none'; }
  setSelected(b) { this.el.classList.toggle('selected', !!b); return this; }
  setActivated(b) { return this.setSelected(b); }
  setLongClickable(b) { return this; }
  setClickable(b) { this.el.style.cursor = b ? (this._isTextInput() ? 'text' : 'pointer') : ''; return this; }
  setFocusableInTouchMode(b) { return this.setFocusable(b); }
  setHint(h) { if ('placeholder' in this.el) this.el.placeholder = h || ''; return this; }
  performClick() { this.el.click(); return true; }
  performLongClick() { this._listeners.longClick && this._listeners.longClick.onLongClick(this); return true; }

  // ===== ImeAction / InputType (EditText) =====
  setImeOptions(opts) { return this; }
  setInputType(t) { return this; }
  setFilters(filters) { this._filters = filters; return this; }
  getFilters() { return this._filters || []; }
  addTextChangedListener(listener) {
    this._textWatchers = this._textWatchers || [];
    this._textWatchers.push(listener);
    if (!this.__caInputHooked) {
      this.__caInputHooked = true;
      const target = this.el;
      this.__caInputHookedEl = target;
      target.addEventListener('input', () => this._notifyTextChanged());
    }
    return this;
  }
  removeTextChangedListener(listener) {
    this._textWatchers = (this._textWatchers || []).filter(w => w !== listener);
    return this;
  }
  /**
   * 触发 TextWatcher 回调（顺序对齐 Android：beforeTextChanged → onTextChanged → afterTextChanged）。
   * DOM input 事件与编程式 setText 共用此入口。
   */
  _notifyTextChanged() {
    const s = (this.el.value !== undefined ? this.el.value : this.el.textContent) || '';
    const editable = {
      length: () => s.length,
      toString: () => s,
      charAt: (i) => s.charAt(i),
      subSequence: (a, b) => s.slice(a, b)
    };
    for (const w of (this._textWatchers || [])) {
      try {
        w.beforeTextChanged && w.beforeTextChanged(s, 0, 0, 0);
        w.onTextChanged && w.onTextChanged(s, 0, 0, 0);
        w.afterTextChanged && w.afterTextChanged(editable);
      } catch (e) { console.error('[ca textwatcher]', e); }
    }
  }
  setEllipsize(e) { this.el.style.overflow = 'hidden'; this.el.style.textOverflow = 'ellipsis'; return this; }
  setShadowLayer(r, dx, dy, c) { this.el.style.textShadow = `${dx}px ${dy}px ${r}px ${colorToCss(c)}`; return this; }
  setHorizontallyScrolling(b) { return this; }
  setCursorVisible(b) { return this; }
  setKeyListener(l) { this._keyListener = l; return this; }
  setOnSelectionChangeListener(l) {
    this._selectionListener = l;
    if (!this.__caSelHooked) {
      this.__caSelHooked = true;
      this.el.addEventListener('keyup', () => {
        const l2 = this._selectionListener;
        if (l2 && typeof l2.onSelectionChanged === 'function') {
          l2.onSelectionChanged(this.el.selectionStart || 0, this.el.selectionEnd || 0);
        } else if (typeof l2 === 'function') {
          l2(this.el.selectionStart || 0, this.el.selectionEnd || 0);
        }
      });
      this.el.addEventListener('click', () => {
        const l2 = this._selectionListener;
        if (l2 && typeof l2.onSelectionChanged === 'function') {
          l2.onSelectionChanged(this.el.selectionStart || 0, this.el.selectionEnd || 0);
        }
      });
    }
    return this;
  }
  setOnTouchEventListener() { return this; }
  setTransformationMethod(m) { return this; }
  setScroller(s) { return this; }
  bringPointIntoView() { return this; }
  extendSelection() { return this; }
  setMaxLines(n) { this.el.maxLength = n; return this; }
  setMinLines(n) { return this; }
  setLines(n) { this.el.rows = n; return this; }
  setSelection(start, end) {
    this.el.setSelectionRange(start, end);
    return this;
  }
  setSelectionStart(s) { this.el.setSelectionRange(s, s); return this; }
  getSelectionStart() { return this.el.selectionStart || 0; }
  getSelectionEnd() { return this.el.selectionEnd || 0; }
  getText() {
    const raw = (this.el.value !== undefined && this.el.tagName !== 'DIV') ? this.el.value : this.el.textContent;
    return new CharSequenceWrap(raw, this._spans || []);
  }
  getRawText() {
    return (this.el.value !== undefined && this.el.tagName !== 'DIV') ? this.el.value : this.el.textContent;
  }
  setSelection(i) { this.el.setSelectionRange && this.el.setSelectionRange(i, i); return this; }
  getEditableText() { return this.getText(); }
  getTextSize() { return parseFloat(getComputedStyle(this.el).fontSize) || 14; }

  // ===== 子类标识 =====
  getClass() { return { getName: () => this.tagNameForView }; }
  isAssignableFrom(other) { return other && other.tagNameForView === this.tagNameForView; }
  getContext() { return globalThis.ctx; }

  // ===== 补齐常用（AndroidView 通用） =====
  setElevation(e) {
    if (e) this.el.style.boxShadow = `0 ${(e / 2)}px ${e}px rgba(0,0,0,0.25)`;
    return this;
  }
  setCornerRadius(r) { this.el.style.borderRadius = (r || 0) + 'px'; return this; }
  setOutlineProvider() { return this; }
  setClipToOutline(b) { return this; }
  setWillNotDraw() { return this; }
  setLayerType() { return this; }
  startAnimation(a) { try { a && typeof a.start === 'function' && a.start(); } catch (e) {} return this; }
  clearAnimation() { return this; }
  clearAnimation() { return this; }
  animate() { return { setDuration: () => this, setInterpolator: () => this, start: () => this, alpha: () => this, translationY: () => this }; }
  bringToFront() { if (this.el.parentNode) this.el.parentNode.appendChild(this.el); return this; }
  setOnScrollChangeListener() { return this; }
  setOnSystemUiVisibilityChangeListener() { return this; }
  addOnAttachStateChangeListener() { return this; }
  removeOnAttachStateChangeListener() { return this; }
  onTouchEvent() { return true; }
  onKeyDown() { return false; }
  getScrollY() { return 0; }
  getScrollX() { return 0; }
  scrollTo(x, y) { this.el.scrollTo(x, y); return this; }
  scrollBy(x, y) { this.el.scrollBy(x, y); return this; }
  canScrollVertically() { return false; }
  isShown() { return !!this.el.offsetParent; }
  isAttachedToWindow() { return !!this.el.isConnected; }
  getLocationOnScreen() { const r = this.el.getBoundingClientRect(); return [r.left, r.top]; }
  getLocationInWindow() { return this.getLocationOnScreen(); }
  getDisplay() { return { getWidth: () => window.innerWidth, getHeight: () => window.innerHeight }; }
  isHardwareAccelerated() { return true; }
  setOverScrollMode() { return this; }
  setVerticalScrollBarEnabled() { return this; }
  setHorizontalScrollBarEnabled() { return this; }
  setScrollContainer() { return this; }
  getResources() { return globalThis.ctx?.getResources?.(); }
  setMinimumWidth() { return this; }
  setMinimumHeight() { return this; }
  setNextFocusDownId() { return this; }
  setNextFocusUpId() { return this; }
  getHandler() { return globalThis.gHandler; }
  isClickable() { return true; }
  isLongClickable() { return true; }
  setKeepScreenOn() { return this; }
  setSoundEffectsEnabled() { return this; }
  setHapticFeedbackEnabled() { return this; }
  performHapticFeedback() { return this; }
  getDrawableState() { return []; }
  hasOnClickListeners() { return !!this._listeners.click; }
  setOnClickListenerWithIcon() { return this; }
  setRoundRectRadius(r) { this.el.style.borderRadius = (r || 0) + 'px'; return this; }
  setDefaultWindowRoundRectRadius() { return this; }
}

// ===== AndroidView 静态常量（G.View.VISIBLE/GONE 等直接属性访问，不走 Proxy） =====
AndroidView.VISIBLE = 0;
AndroidView.INVISIBLE = 4;
AndroidView.GONE = 8;
AndroidView.NO_ID = -1;
AndroidView.SCROLLBAR_POSITION_LEFT = 1;
AndroidView.SCROLLBAR_POSITION_RIGHT = 2;
AndroidView.OVER_SCROLL_ALWAYS = 0;
AndroidView.OVER_SCROLL_IF_CONTENT_SCROLLS = 1;
AndroidView.SYSTEM_UI_FLAG_VISIBLE = 0;
AndroidView.SYSTEM_UI_FLAG_HIDE_NAVIGATION = 2;
AndroidView.SYSTEM_UI_FLAG_IMMERSIVE = 2048;
AndroidView.IMPORTANT_FOR_ACCESSIBILITY_AUTO = 0;
AndroidView.KEEP_SCREEN_ON = 0x4000000;
AndroidView.TEXT_ALIGNMENT_TEXT_START = 3;

// ===== AndroidView 静态内部类（供 new G.View.OnTouchListener({...}) 等） =====
AndroidView.OnTouchListener = class {
  constructor(o) { if (o) Object.assign(this, o); }
};
AndroidView.OnClickListener = class {
  constructor(o) { if (o) Object.assign(this, o); }
};
AndroidView.OnLongClickListener = class {
  constructor(o) { if (o) Object.assign(this, o); }
};
AndroidView.OnKeyListener = class {
  constructor(o) { if (o) Object.assign(this, o); }
};
AndroidView.OnFocusChangeListener = class {
  constructor(o) { if (o) Object.assign(this, o); }
};
AndroidView.OnLayoutChangeListener = class {
  constructor(o) { if (o) Object.assign(this, o); }
};
AndroidView.OnEditorActionListener = class {
  constructor(o) { if (o) Object.assign(this, o); }
};
AndroidView.OnAttachStateChangeListener = class {
  constructor(o) { if (o) Object.assign(this, o); }
};
AndroidView.OnSystemUiVisibilityChangeListener = class {
  constructor(o) { if (o) Object.assign(this, o); }
};

/** Android color int (0xAARRGGBB) 转 CSS */
function colorToCss(color) {
  if (color == null) return '';
  if (typeof color === 'string') return color;
  if (typeof color !== 'number') return '';
  const a = (color >>> 24) & 0xff;
  const r = (color >>> 16) & 0xff;
  const g = (color >>> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r},${g},${b},${a / 255})`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/**
 * 把带 _spans 的 Spannable/CharSequence 渲染成 HTML。
 * span 对象由 android-shim 注册，带 _type/_args；ForegroundColorSpan 额外有 _color。
 * 处理流程：收集 span 边界 → 按区间取活跃 span → 逐层嵌套包裹。
 */
function renderSpannable(text) {
  const s = typeof text.toString === 'function' ? String(text.toString()) : String(text);
  const spans = (Array.isArray(text._spans) ? text._spans : [])
    .filter(sp => sp && typeof sp.start === 'number' && typeof sp.end === 'number');
  if (!spans.length) return escapeHtml(s);
  const pts = new Set([0, s.length]);
  for (const sp of spans) { pts.add(sp.start); pts.add(sp.end); }
  const points = [...pts].filter(p => p >= 0 && p <= s.length).sort((a, b) => a - b);
  let out = '';
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (b <= a) continue;
    let html = escapeHtml(s.slice(a, b));
    const active = spans.filter(sp => sp.start <= a && sp.end >= b);
    for (const sp of active) {
      const span = sp.span;
      if (!span) continue;
      const t = span._type || (span.constructor && span.constructor.name) || '';
      const args = span._args || [];
      const c = (span._color != null) ? span._color : args[0];
      switch (t) {
        case 'ForegroundColorSpan':
          if (c != null) html = `<span style="color:${colorToCss(c)}">${html}</span>`;
          break;
        case 'BackgroundColorSpan':
          if (c != null) html = `<span style="background-color:${colorToCss(c)}">${html}</span>`;
          break;
        case 'AbsoluteSizeSpan':
          if (c != null) html = `<span style="font-size:${Number(c)}px">${html}</span>`;
          break;
        case 'RelativeSizeSpan':
          if (c != null) html = `<span style="font-size:${Number(c)}em">${html}</span>`;
          break;
        case 'StyleSpan': {
          const st = Number(args[0]);
          if (st === 1 || st === 3) html = `<b>${html}</b>`;
          if (st === 2 || st === 3) html = `<i>${html}</i>`;
          break;
        }
        case 'UnderlineSpan': html = `<u>${html}</u>`; break;
        case 'StrikethroughSpan': html = `<s>${html}</s>`; break;
        case 'SubscriptSpan': html = `<sub>${html}</sub>`; break;
        case 'SuperscriptSpan': html = `<sup>${html}</sup>`; break;
        default: break;
      }
    }
    out += html;
  }
  return out;
}

/** ==================== 子类 ==================== */

export class ViewGroup extends AndroidView {
  constructor() { super('div'); this.tagNameForView = 'ViewGroup'; }
}

export class FrameLayout extends ViewGroup {
  constructor() {
    super();
    this.tagNameForView = 'FrameLayout';
    this._classDisplay = 'block';
    this.el.style.display = 'block';
    // Android FrameLayout 语义：子元素按 LP 尺寸在左上(或 gravity)叠放，
    // 后 addView 的盖在上层。因此容器相对定位、子 absolute。
    this.el.style.position = 'relative';
    this.el.style.overflow = 'hidden';
  }
  static get LayoutParams() {
    return class FrameLayoutLayoutParams {
      constructor(w, h, g) { this.width = w; this.height = h; this.gravity = g || 0; }
    };
  }
  // 子 addView：强制叠放（absolute + 左上锚定），再由 _applyLayout 按 LP 定尺寸
  addView(child, index, params) {
    const r = super.addView(child, index, params);
    if (child && child.el) {
      child.el.style.position = 'absolute';
      if (!child.el.style.left) child.el.style.left = '0px';
      if (!child.el.style.top) child.el.style.top = '0px';
      child._applyLayout();
    }
    return r;
  }
}

export class LinearLayout extends ViewGroup {
  constructor() {
    super();
    this.tagNameForView = 'LinearLayout';
    this._classDisplay = 'flex';
    this.el.style.display = 'flex';
    this.el.style.flexDirection = 'column';
    this.orientation = 1; // 1=VERTICAL
  }
  setWeightSum(w) { this.el.style.flexBasis = 'auto'; return this; }
  setBaselineAligned(b) { this.el.style.alignItems = b ? 'baseline' : 'stretch'; return this; }
  setMeasureWithLargestChild() { return this; }
  setDividerDrawable() { return this; }
  setDividerPadding() { return this; }
  setShowDividers() { return this; }
  setOrientation(o) {
    this.orientation = o;
    this.el.style.flexDirection = (o === 0) ? 'row' : 'column';
    return this;
  }
  static get LayoutParams() {
    return class LinearLayoutLayoutParams {
      constructor(w, h, wgt) { this.width = w; this.height = h; this.weight = wgt || 0; this.gravity = 0; }
    };
  }
}

export class TextView extends AndroidView {
  constructor() {
    super('span');
    this.tagNameForView = 'TextView';
    this._classDisplay = 'inline-block';
    this.el.style.display = 'inline-block';
    // Android TextView 默认按词/字符换行，且保留显式 \n
    this.el.style.whiteSpace = 'pre-wrap';
    this.el.style.wordBreak = 'break-word';
  }
}

export class Button extends TextView {
  constructor() { super(); this.tagNameForView = 'Button'; this.el.tagName = 'button'; this.el.style.cursor = 'pointer'; }
}

export class EditText extends TextView {
  constructor() {
    super();
    this.tagNameForView = 'EditText';
    this.el = document.createElement('textarea');
    // textarea 不 absolute，参与 flex 布局
    this.el.style.boxSizing = 'border-box';
    this.el.style.background = 'transparent';
    this.el.style.color = 'inherit';
    this.el.style.border = 'none';
    this.el.style.outline = 'none';
    this.el.style.resize = 'none';
    this.el.style.whiteSpace = 'pre-wrap';
    this.el.style.overflowWrap = 'break-word';
    this.el.style.fontFamily = 'inherit';
    this.el.style.fontSize = 'inherit';
    // textarea 的 UA 默认 rows=2（双行约 62px），会把 wrap 高的父 LinearLayout
    // （命令栏 bar）撑成双行高度。Android EditText 是单行输入、靠 flex 拉伸
    // 跟随父高——这里固定 rows=1 且高度交给 flex。
    this.el.rows = 1;
    this.el.style.height = 'auto';
    this.el.style.minHeight = '0';
    // Android EditText 点击必然聚焦；真机里 pointerdown 默认聚焦被上层引擎
    // touch 监听链的 preventDefault 取消（表现为点击后无光标、无法输入）。
    // 这里用 capture 阶段手动聚焦——这是输入控件"可聚焦"语义的正确翻译。
    const ensureFocus = () => { if (document.activeElement !== this.el) this.el.focus(); };
    this.el.addEventListener('pointerdown', ensureFocus, true);
    this.el.addEventListener('mousedown', ensureFocus, true);
    this.el.addEventListener('touchstart', ensureFocus, true);
    this.el.addEventListener('click', () => { ensureFocus(); }, true);
    this.el.tabIndex = 0;
    // 输入控件的光标必须是文本 I-beam，不被 click listener / clickable 的 pointer 覆盖
    this.el.style.cursor = 'text';
  }
  setText(t) {
    const s = t == null ? '' : String(t);
    const changed = this.el.value !== s;
    this.el.value = s;
    // Android：setText 编程式改文本同样触发 TextWatcher（补全/粘贴等走 setText 的路径靠它驱动刷新）
    if (changed) this._notifyTextChanged();
    return this;
  }
  getText() { return new CharSequenceWrap(this.el.value, this._spans || []); }
  getRawText() { return this.el.value; }
  setSingleLine(b) {
    this.el.style.whiteSpace = b ? 'nowrap' : 'pre-wrap';
    if (b) this.el.setAttribute('rows', '1');
    return this;
  }
}

export class ImageView extends AndroidView {
  constructor() { super('img'); this.tagNameForView = 'ImageView'; }
  setImageBitmap(bmp) { /* no-op */ return this; }
  setImageResource(id) {
    // 支持 Android R.drawable.* / R.mipmap.* 整数 ID
    // 从全局资源映射查找对应的 Data URL
    if (typeof id === 'number' && globalThis.__caResMap) {
      const url = globalThis.__caResMap.getDrawableUrl(id) || globalThis.__caResMap.getMipmapUrl(id);
      if (url) this.el.src = url;
    } else if (typeof id === 'string') {
      // 字符串 URL 直接用
      this.el.src = id;
    }
    return this;
  }
  setImageDrawable(d) { return this; }
  setScaleType(t) { return this; }
}

/** android.widget.Space —— 空白占位控件（设置页分区间距用），高度由 LP 决定 */
export class Space extends AndroidView {
  constructor() { super('div'); this.tagNameForView = 'Space'; }
}

export class AbsListView extends ViewGroup {
  constructor() {
    super();
    this.tagNameForView = 'AbsListView';
    this._classDisplay = 'block';
    this.el.style.display = 'block';
    this.adapter = null;
    this._headers = [];
    this._footers = [];
  }
  static LayoutParams = class {
    constructor(w, h) { this.width = w; this.height = h; this.gravity = 0; }
  };
  setAdapter(adapter) {
    // 忠实 Android：AbsListView.setAdapter 会向旧 adapter 注销、向新 adapter 注册
    // 一个 DataSetObserver。引擎改数据走 controller.setArray/notifyChange →
    // dso.forEach(onChanged)，翻译层靠它触发重建（否则列表永远停在首次渲染）。
    this._unregisterObserver();
    this.adapter = adapter;
    if (adapter && typeof adapter.registerDataSetObserver === 'function') {
      this._dso = {
        onChanged: () => this._rebuild(),
        onInvalidated: () => this._rebuild()
      };
      try { adapter.registerDataSetObserver(this._dso); } catch (e) { erp(e); }
    }
    this._rebuild();
    return this;
  }
  _unregisterObserver() {
    if (this.adapter && this._dso && typeof this.adapter.unregisterDataSetObserver === 'function') {
      try { this.adapter.unregisterDataSetObserver(this._dso); } catch (e) { /* 引擎实现有 if(p>=0) 的 bug，忽略 */ }
    }
    this._dso = null;
  }
  /**
   * 完整重建行视图。Android 语义：header 与 footer 不属于 adapter，
   * setAdapter / notifyDataSetChanged 都会保留它们；列表位置 = header + adapter 行 + footer。
   * 每个可见子节点（含 header/footer）按最终位置打 data-idx。
   */
  _rebuild() {
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);
    let pos = 0;
    const place = (view) => {
      if (view && view.el) {
        view.el.style.display = 'block';
        view.el.setAttribute('data-idx', String(pos));
        this.el.appendChild(view.el);
        pos++;
      }
    };
    this._headers.forEach(place);
    if (this.adapter && typeof this.adapter.getCount === 'function') {
      const n = this.adapter.getCount();
      for (let i = 0; i < n; i++) {
        let item;
        try { item = this.adapter.getView(i, null, this); } catch (e) { erp(e); }
        place(item);
      }
    }
    this._footers.forEach(place);
  }
  addHeaderView(v) {
    if (!v || !v.el) return this;
    if (!this._headers.includes(v)) {
      if (v.el.parentNode && v.el.parentNode !== this.el) v.el.remove();
      this._headers.push(v);
      this._rebuild();
    }
    return this;
  }
  removeHeaderView(v) {
    const i = this._headers.indexOf(v);
    if (i >= 0) { this._headers.splice(i, 1); this._rebuild(); }
    return this;
  }
  addFooterView(v) {
    if (!v || !v.el) return this;
    if (!this._footers.includes(v)) {
      if (v.el.parentNode && v.el.parentNode !== this.el) v.el.remove();
      this._footers.push(v);
      this._rebuild();
    }
    return this;
  }
  removeFooterView(v) {
    const i = this._footers.indexOf(v);
    if (i >= 0) { this._footers.splice(i, 1); this._rebuild(); }
    return this;
  }
  getHeaderViewsCount() { return this._headers.length; }
  getFooterViewsCount() { return this._footers.length; }
  _hitIndex(e) {
    const node = e.target.closest('[data-idx]');
    if (!node || node.parentNode !== this.el) return -1;
    return [...this.el.children].indexOf(node);
  }
  setOnItemClickListener(listener) {
    this._itemClick = listener;
    this.el.onclick = (e) => {
      const idx = this._hitIndex(e);
      if (idx >= 0) listener && listener.onItemClick(this, null, idx, idx);
    };
    return this;
  }
  /**
   * 列表项长按：Android ListView 的长按由引擎 touch 链 + postDelayed 计时
   * 处理（CA.js 在 ACTION_DOWN 起计时、ACTION_UP 取消）。翻译层只记录
   * listener，不做 contextmenu / 独立计时器——那是重复实现且取消不掉。
   */
  setOnItemLongClickListener(listener) {
    this._itemLongClick = listener;
    return this;
  }
  setSelection(i) { return this; }
  setFastScrollEnabled(b) { return this; }
  setFastScrollAlwaysVisible(b) { return this; }
  setDivider(h) { return this; }
  setDividerHeight(h) { this.el.style.rowGap = (h || 0) + 'px'; return this; }
  setSmoothScrollbarEnabled() { return this; }
  setScrollingCacheEnabled() { return this; }
  setCacheColorHint() { return this; }
  setStackFromBottom(b) { if (b) this.el.style.display = 'flex', this.el.style.flexDirection = 'column-reverse'; return this; }
  setTranscriptMode() { return this; }
  getItemAtPosition(i) { return this.adapter && this.adapter.getItem ? this.adapter.getItem(i) : null; }
  getItemIdAtPosition(i) { return this.adapter && this.adapter.getItemId ? this.adapter.getItemId(i) : i; }
  getPositionForView() { return -1; }
  pointToPosition() { return -1; }
  getCheckedItemPosition() { return -1; }
  clearChoices() { return this; }
  setChoiceMode() { return this; }
  setSelector() { return this; }
  smoothScrollToPosition(i) {
    const child = this.el.children[i];
    if (child) child.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return this;
  }
  setOnScrollListener() { return this; }
  onFilterComplete() { this._rebuild && this._rebuild(); return this; }
}

export class ListView extends AbsListView {
  constructor() {
    super();
    this.tagNameForView = 'ListView';
    this._classDisplay = 'block';
    this.el.style.display = 'block';
    this.el.style.overflowY = 'auto';
  }
}

export class GridView extends AbsListView {
  constructor() {
    super();
    this.tagNameForView = 'GridView';
    this._classDisplay = 'grid';
    this.el.style.display = 'grid';
    this.el.style.gridTemplateColumns = 'repeat(auto-fill, minmax(80px, 1fr))';
  }
}

/** WebView —— 用 iframe 承载，loadUrl/loadData 可用 */
export class WebView extends AndroidView {
  constructor() {
    super('div');
    this.tagNameForView = 'WebView';
    this.el.style.cssText += 'display:block;overflow:hidden;';
    const frame = document.createElement('iframe');
    frame.style.cssText = 'width:100%;height:100%;border:none;background:#fff;';
    this.el.appendChild(frame);
    this._frame = frame;
  }
  loadUrl(url) { try { this._frame.src = String(url); } catch (e) {} return this; }
  loadData(html, mime) {
    try { this._frame.srcdoc = String(html); } catch (e) {}
    return this;
  }
  loadDataWithBaseURL(base, html) { return this.loadData(html); }
  getSettings() { return new Proxy({}, { get: () => () => {} }); }
  setWebViewClient(c) { this._client = c; return this; }
  setWebChromeClient(c) { this._chrome = c; return this; }
  addJavascriptInterface() { return this; }
  clearHistory() { return this; }
  clearCache() { return this; }
  destroy() { if (this._frame.parentNode) this._frame.parentNode.removeChild(this._frame); return this; }
  reload() { try { this._frame.contentWindow?.location?.reload(); } catch (e) {} return this; }
  stopLoading() { return this; }
  goBack() { return this; }
  goForward() { return this; }
  canGoBack() { return false; }
  getUrl() { return this._frame.src || ''; }
  evaluateJavascript(js, cb) {
    try { const r = this._frame.contentWindow?.eval?.(js); cb && cb(r); } catch (e) {}
  }
}

export class AdapterView extends ViewGroup {
  constructor() { super(); this.tagNameForView = 'AdapterView'; }
  setAdapter(a) { this.adapter = a; return this; }
  getAdapter() { return this.adapter; }
  static OnItemClickListener = class {
    constructor(o) { if (o) Object.assign(this, o); }
  };
  static OnItemLongClickListener = class {
    constructor(o) { if (o) Object.assign(this, o); }
  };
  static OnItemSelectedListener = class {
    constructor(o) { if (o) Object.assign(this, o); }
  };
}

/** ==================== 注册到 PATH_CACHE ==================== */

let registered = false;
export function registerAndroidViews(R) {
  if (registered) return;
  R('android.view.View', AndroidView);
  R('android.view.ViewGroup', ViewGroup);
  R('android.widget.FrameLayout', FrameLayout);
  R('android.widget.LinearLayout', LinearLayout);
  R('android.widget.TextView', TextView);
  R('android.widget.Button', Button);
  R('android.widget.EditText', EditText);
  R('android.widget.ImageView', ImageView);
  R('android.widget.Space', Space);
  R('android.widget.AbsListView', AbsListView);
  R('android.widget.ListView', ListView);
  R('android.widget.GridView', GridView);
  R('android.widget.AdapterView', AdapterView);
  R('android.webkit.WebView', WebView);
  R('com.huangyx.ca.MyEditText', EditText);
  R('android.view.ViewGroup.LayoutParams', class {
    constructor(w, h) { this.width = w; this.height = h; this.gravity = 0; }
  });

  // android.view.Gravity 常量
  R('android.view.Gravity', new Proxy({
    NO_GRAVITY: 0, TOP: 0x30, BOTTOM: 0x50, LEFT: 0x03, RIGHT: 0x05,
    CENTER_HORIZONTAL: 0x01, CENTER_VERTICAL: 0x10, CENTER: 0x11,
    FILL: 0x77, FILL_HORIZONTAL: 0x07, FILL_VERTICAL: 0x70,
    START: 0x00800003, END: 0x00800005
  }, { get: (t, p) => p in t ? t[p] : 0 }));

  registered = true;
}

// ===== 常用 widget 静态常量（G.LinearLayout.HORIZONTAL 等直接属性访问） =====
LinearLayout.HORIZONTAL = 0;
LinearLayout.VERTICAL = 1;
LinearLayout.SHOW_DIVIDER_NONE = 0;
LinearLayout.SHOW_DIVIDER_BEGINNING = 1;
LinearLayout.SHOW_DIVIDER_MIDDLE = 2;
LinearLayout.SHOW_DIVIDER_END = 4;
TextView.AUTO_LINK_WEB_URLS = 1;
TextView.AUTO_LINK_EMAIL_ADDRESSES = 2;
TextView.AUTO_LINK_PHONE_NUMBERS = 4;
TextView.AUTO_LINK_MAP_ADDRESSES = 8;
EditText.TYPE_CLASS_TEXT = 1;
EditText.TYPE_CLASS_NUMBER = 2;
EditText.TYPE_TEXT_VARIATION_PASSWORD = 0x80;
EditText.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD = 0x90;
EditText.TYPE_TEXT_FLAG_NO_SUGGESTIONS = 0x80000;
EditText.TYPE_TEXT_FLAG_AUTO_CORRECT = 0x8000;
EditText.TYPE_TEXT_FLAG_CAP_SENTENCES = 0x4000;
EditText.IME_ACTION_DONE = 6;
EditText.IME_ACTION_NEXT = 5;
EditText.IME_ACTION_SEND = 4;
EditText.IME_ACTION_SEARCH = 3;
EditText.IME_ACTION_GO = 2;
EditText.IME_ACTION_DEFAULT = 0;
EditText.IME_FLAG_NO_FULLSCREEN = 0x2000000;
EditText.IME_FLAG_NAVIGATE_NEXT = 0x8000000;
