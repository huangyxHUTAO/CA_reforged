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
    // 注意：不默认 position:absolute（会让 flex/block 布局错乱）。
    // 只有 FrameLayout 子（叠放）和 WindowManager 根（fixed）才需要定位。
    this.el.style.boxSizing = 'border-box';
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
    this.el.style.width = dimToCss(lp.width);
    this.el.style.height = dimToCss(lp.height);
    // weight 字段：LinearLayout.LayoutParams(-1, 0, 1) 第三参数
    // Web flex：flex: weight 1 1 auto
    if (lp.weight) {
      this.el.style.flex = `${lp.weight} 1 0%`;
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
    if (child instanceof AndroidView) {
      child._parent = this;
      if (params) child.setLayoutParams(params);
      this.children.push(child);
      const where = (typeof index === 'number' && this.el.children[index])
        ? this.el.children[index]
        : null;
      if (where) this.el.insertBefore(child.el, where);
      else this.el.appendChild(child.el);
    }
    return this;
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
      this.el.style.display = '';
      this.el.style.visibility = 'hidden';
    } else {
      this.el.style.display = '';
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
  setText(text) { this.el.textContent = text == null ? '' : String(text); return this; }
  getText() { return this.el.textContent; }
  setTextColor(color) { this.el.style.color = colorToCss(color); return this; }
  setHint(h) { this.el.placeholder = h || ''; return this; }
  setHintTextColor(c) { this.el.style.setProperty('::placeholder', ''); /* CSS pseudo 难处理，no-op */ return this; }
  setTextSize(size) {
    // size 是 sp
    this.el.style.fontSize = (size * 1) + 'px';
    return this;
  }
  setTypeface(t) { /* 字体——no-op */ return this; }
  setMovementMethod() { return this; }
  setTransformationMethod() { return this; }
  setLinkTextColor(c) { this.el.style.color = colorToCss(c); return this; }
  setPaintFlags() { return this; }
  setIncludeFontPadding() { return this; }
  setLineSpacing() { return this; }
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
    this.el.style.whiteSpace = b ? 'nowrap' : 'normal';
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
    return this;
  }
  setOnLongClickListener(listener) {
    this._listeners.longClick = listener;
    this.el.oncontextmenu = (e) => { e.preventDefault(); listener && listener.onLongClick(this); return false; };
    return this;
  }
  setOnFocusChangeListener(listener) {
    this._listeners.focus = listener;
    this.el.onfocus = (e) => listener && listener.onFocusChange(this, true);
    this.el.onblur = (e) => listener && listener.onFocusChange(this, false);
    return this;
  }
  setOnTouchListener(listener) {
    this._listeners.touch = listener;
    // 引擎 listener 期望 Android MotionEvent：getAction/getX/getY/getRawX/getRawY/getEventTime
    // 真实 DOM PointerEvent 已含 clientX/Y（=raw），需包一层
    const wrap = (e) => ({
      getAction: () => 0, // ACTION_DOWN 等我们不区分
      getActionMasked: () => 0,
      getX: () => e.clientX,
      getY: () => e.clientY,
      getRawX: () => e.clientX,
      getRawY: () => e.clientY,
      getEventTime: () => e.timeStamp,
      getDownTime: () => e.timeStamp,
      _e: e
    });
    const handler = (e) => listener && listener.onTouch(this, wrap(e));
    this.el.onpointerdown = handler;
    this.el.onpointermove = handler;
    this.el.onpointerup = handler;
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
  postDelayed(action, ms) { setTimeout(action, ms); return this; }
  removeCallbacks() {}
  setEnabled(b) { this.el.style.pointerEvents = b ? 'auto' : 'none'; this.el.disabled = !b; return this; }
  isEnabled() { return this.el.style.pointerEvents !== 'none'; }
  setSelected(b) { this.el.classList.toggle('selected', !!b); return this; }
  setActivated(b) { return this.setSelected(b); }
  setLongClickable(b) { return this; }
  setClickable(b) { this.el.style.cursor = b ? 'pointer' : ''; return this; }
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
      target.addEventListener('input', () => {
        const s = target.value !== undefined ? target.value : target.textContent;
        for (const w of (this._textWatchers || [])) {
          try {
            w.beforeTextChanged && w.beforeTextChanged(s, 0, 0, 0);
            w.onTextChanged && w.onTextChanged(s, 0, 0, 0);
            w.afterTextChanged && w.afterTextChanged({
              length: () => s.length,
              toString: () => s,
              charAt: (i) => s.charAt(i),
              subSequence: (a, b) => s.slice(a, b)
            });
          } catch (e) { console.error('[ca textwatcher]', e); }
        }
      });
    }
    return this;
  }
  removeTextChangedListener(listener) {
    this._textWatchers = (this._textWatchers || []).filter(w => w !== listener);
    return this;
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

/** ==================== 子类 ==================== */

export class ViewGroup extends AndroidView {
  constructor() { super('div'); this.tagNameForView = 'ViewGroup'; }
}

export class FrameLayout extends ViewGroup {
  constructor() {
    super();
    this.tagNameForView = 'FrameLayout';
    this.el.style.display = 'block';
  }
  static get LayoutParams() {
    return class FrameLayoutLayoutParams {
      constructor(w, h, g) { this.width = w; this.height = h; this.gravity = g || 0; }
    };
  }
}

export class LinearLayout extends ViewGroup {
  constructor() {
    super();
    this.tagNameForView = 'LinearLayout';
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
  constructor() { super('span'); this.tagNameForView = 'TextView'; this.el.style.display = 'inline-block'; }
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
  }
  setText(t) { this.el.value = t == null ? '' : String(t); return this; }
  getText() { return new CharSequenceWrap(this.el.value, this._spans || []); }
  getRawText() { return this.el.value; }
  setSingleLine(b) {
    this.el.style.whiteSpace = b ? 'nowrap' : 'normal';
    this.el.style.overflow = b ? 'hidden' : 'auto';
    if (b) this.el.setAttribute('rows', '1');
    return this;
  }
}

export class ImageView extends AndroidView {
  constructor() { super('img'); this.tagNameForView = 'ImageView'; }
  setImageBitmap(bmp) { /* no-op */ return this; }
  setImageResource(id) { return this; }
  setImageDrawable(d) { return this; }
  setScaleType(t) { return this; }
}

export class AbsListView extends ViewGroup {
  constructor() { super(); this.tagNameForView = 'AbsListView'; this.adapter = null; }
  static LayoutParams = class {
    constructor(w, h) { this.width = w; this.height = h; this.gravity = 0; }
  };
  setAdapter(adapter) {
    this.adapter = adapter;
    this._rebuild();
    return this;
  }
  _rebuild() {
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);
    if (!this.adapter || typeof this.adapter.getCount !== 'function') return;
    const n = this.adapter.getCount();
    for (let i = 0; i < n; i++) {
      const item = this.adapter.getView(i, null, this);
      if (item && item.el) this.el.appendChild(item.el);
    }
  }
  setOnItemClickListener(listener) {
    this._itemClick = listener;
    this.el.onclick = (e) => {
      const idx = [...this.el.children].indexOf(e.target.closest('[data-idx]'));
      if (idx >= 0) listener && listener.onItemClick(this, null, idx, idx);
    };
    return this;
  }
  setOnItemLongClickListener(listener) {
    this._itemLongClick = listener;
    this.el.oncontextmenu = (e) => {
      e.preventDefault();
      const idx = [...this.el.children].indexOf(e.target.closest('[data-idx]'));
      if (idx >= 0) listener && listener.onItemLongClick(this, null, idx, idx);
      return false;
    };
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
  addFooterView(v) {
    if (v && v.el) {
      v.el.classList.add('ca-footer');
      this.el.appendChild(v.el);
    }
    return this;
  }
  removeFooterView(v) {
    if (v && v.el && v.el.parentNode === this.el) this.el.removeChild(v.el);
    return this;
  }
  addHeaderView(v) { return this.addFooterView(v); }
  removeHeaderView(v) { return this.removeFooterView(v); }
  getHeaderViewsCount() { return this.el.querySelectorAll('.ca-footer').length; }
  getFooterViewsCount() { return this.getHeaderViewsCount(); }
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
    this.el.style.display = 'block';
    this.el.style.overflowY = 'auto';
  }
}

export class GridView extends AbsListView {
  constructor() {
    super();
    this.tagNameForView = 'GridView';
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
