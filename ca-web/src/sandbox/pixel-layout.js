/**
 * 像素级布局引擎
 *
 * 目标：把 Android View 树按 measure/layout 语义翻译成精确像素坐标，
 * 取代 CSS flex 估算。控件仍由 CA 引擎创建；这里只决定每个 view 的
 * left/top/width/height（px），等价于 Android 的 onMeasure + onLayout。
 *
 * 尺寸常量（Android）：
 *   MATCH_PARENT = -1  占满父可用
 *   WRAP_CONTENT = -2  按内容
 *   其它数值 = dp（Web 端 1dp = 1px）
 *
 * gravity 常量（低 4 位水平 / 高? 简化 key）：
 *   START/LEFT=0x03, TOP=0x30, RIGHT/END=0x05, BOTTOM=0x50,
 *   CENTER_HORIZONTAL=0x01, CENTER_VERTICAL=0x10, CENTER=0x11
 */

export const MATCH_PARENT = -1;
export const WRAP_CONTENT = -2;

// —— 内容测量：元素临时按内容自排，读自然尺寸 ——
// 用法：在父容器尺寸确定后，把子放入并强制回流一次，再读。
function contentW(el) {
  // 读当前 offset（需已 append 且父宽度受限）
  return el.offsetWidth;
}
function contentH(el) {
  return el.offsetHeight;
}

// 把元素尺寸解析成 (mode: 'match'|'wrap'|'px', value)
function dimOf(lp, key) {
  const v = lp ? lp[key] : undefined;
  if (v === MATCH_PARENT) return { mode: 'match' };
  if (v === WRAP_CONTENT) return { mode: 'wrap' };
  if (typeof v === 'number') return { mode: 'px', value: v };
  return { mode: 'wrap' }; // 缺省按 wrap（Android 缺省 wrap_content）
}

function hasGravity(v, bit) { return (v & bit) === bit; }

function alignX(g, free) {
  // 返回子 x 偏移：free = 父宽-子宽
  if (g == null) return 0;
  if (hasGravity(g, 0x11) || hasGravity(g, 0x01)) return Math.round(free / 2); // CENTER/CENTER_H
  if (hasGravity(g, 0x05) || hasGravity(g, 0x00800005)) return free;          // RIGHT/END
  return 0;
}
function alignY(g, free) {
  if (g == null) return 0;
  if (hasGravity(g, 0x11) || hasGravity(g, 0x10)) return Math.round(free / 2); // CENTER/CENTER_V
  if (hasGravity(g, 0x50)) return free;                                       // BOTTOM
  return 0;
}

/**
 * 子尺寸解析。parentW/H：父内容尺寸。el 已插入父。
 * 先按宽度解析（文本换行需要宽），再量高度。
 */
function resolveChildWH(child, parentW, parentH) {
  const lp = child.layoutParams || {};
  const st = child.el.style;
  const wm = dimOf(lp, 'width');
  const hm = dimOf(lp, 'height');

  // 宽度
  let w;
  if (wm.mode === 'match') {
    w = parentW;
  } else if (wm.mode === 'px') {
    w = Math.min(wm.value, parentW);
  } else {
    // wrap：给最大宽限制，量自然宽（shrink-to-fit）
    st.width = parentW + 'px';
    st.height = 'auto';
    w = Math.min(contentW(child.el), parentW);
  }
  st.width = w + 'px';

  // 高度
  let h;
  if (hm.mode === 'match') {
    h = parentH;
  } else if (hm.mode === 'px') {
    h = Math.min(hm.value, parentH);
  } else {
    st.height = 'auto';
    h = contentH(child.el);
  }
  st.height = h + 'px';
  return { w, h };
}

/**
 * 布局一棵（子）容器。
 * container：AndroidView/ViewGroup 实例；x,y,w,h 为该容器内容盒。
 */
export function layoutView(container, x, y, w, h) {
  const st = container.el.style;
  st.position = 'absolute';
  st.left = x + 'px';
  st.top = y + 'px';
  st.width = w + 'px';
  st.height = h + 'px';
  const tag = container.tagNameForView;
  if (tag === 'LinearLayout') layoutLinear(container, w, h);
  else if (tag === 'FrameLayout') layoutFrame(container, w, h);
  else if (tag === 'ListView' || tag === 'AbsListView' || tag === 'GridView') layoutList(container, w, h);
  // TextView/EditText/Button/ImageView/WebView：叶子，无需子布局
}

function layoutLinear(v, w, h) {
  const vert = v.orientation === 1;
  const kids = (v._children || []).filter(k => k && k.el && k.el.style.display !== 'none');
  if (!kids.length) return;
  // 阶段 1：非 weight/match 先确定尺寸（fixed/wrap），match 与 weight 视作弹性
  const list = [];
  let fixedUsed = 0; // 主轴
  let weightSum = 0;
  let growCount = 0;
  for (const k of kids) {
    const lp = k.layoutParams || {};
    const wgt = lp.weight || 0;
    const main = vert ? lp.height : lp.width;
    if (wgt > 0) { list.push({ k, kind: 'w', wgt }); weightSum += wgt; continue; }
    if (main === MATCH_PARENT) { list.push({ k, kind: 'g' }); growCount++; continue; }
    // 定尺寸：主=wrap 量；px 定值
    const { w: cw, h: ch } = resolveChildWH(k, w, h);
    fixedUsed += vert ? ch : cw;
    list.push({ k, kind: 'f', sz: vert ? ch : cw, cw, ch });
  }
  const free = (vert ? h : w) - fixedUsed;
  let rem = free;
  // 阶段 2：weight 分配
  for (const it of list) {
    if (it.kind !== 'w') continue;
    it.sz = weightSum > 0 ? Math.round(free * it.wgt / weightSum) : 0;
    it.sz = Math.max(0, Math.min(it.sz, rem));
    rem -= it.sz;
  }
  // 剩余给 grow（多个均分）
  if (growCount > 0 && rem > 0) {
    const each = Math.floor(rem / growCount);
    let extra = rem - each * growCount;
    for (const it of list) {
      if (it.kind === 'g') {
        it.sz = each + (extra-- > 0 ? 1 : 0);
        // grow 子尺寸 = 主轴分摊 + 副轴占满
        it.cw = vert ? w : it.sz;
        it.ch = vert ? it.sz : h;
      }
    }
  }
  // 阶段 3：摆放
  let pos = 0;
  for (const it of list) {
    const k = it.k;
    const lp = k.layoutParams || {};
    let cw, ch;
    if (it.kind === 'g') {
      cw = it.cw; ch = it.ch;
    } else if (it.kind === 'w') {
      cw = it.cw !== undefined ? it.cw : (vert ? w : it.sz);
      ch = it.ch !== undefined ? it.ch : (vert ? it.sz : h);
      // weight 子：若未 resolve 尺寸，用主轴 sz + 副轴 match(w/h)
      if (it.cw === undefined) {
        // 补一次 resolve（副轴已知）
        const { w: cw2, h: ch2 } = resolveChildWH(k, vert ? w : it.sz, vert ? it.sz : h);
        cw = vert ? cw2 : it.sz; ch = vert ? it.sz : ch2;
      }
    } else {
      cw = it.cw; ch = it.ch;
    }
    cw = Math.max(0, Math.min(cw, w));
    ch = Math.max(0, Math.min(ch, h - Math.min(pos, h)));
    const g = lp.gravity;
    const x2 = vert ? alignX(g, w - cw) : pos;
    const y2 = vert ? pos : alignY(g, h - ch);
    k.el.style.position = 'absolute';
    k.el.style.left = x2 + 'px';
    k.el.style.top = y2 + 'px';
    k.el.style.width = cw + 'px';
    k.el.style.height = ch + 'px';
    // 递归子容器
    if (isContainer(k)) layoutChildrenInto(k, cw, ch);
    pos += vert ? ch : cw;
  }
}

function layoutFrame(v, w, h) {
  const kids = (v._children || []).filter(k => k && k.el && k.el.style.display !== 'none');
  for (const k of kids) {
    const lp = k.layoutParams || {};
    const { w: cw, h: ch } = resolveChildWH(k, w, h);
    const g = lp.gravity;
    const x2 = alignX(g, w - cw);
    const y2 = alignY(g, h - ch);
    k.el.style.position = 'absolute';
    k.el.style.left = x2 + 'px';
    k.el.style.top = y2 + 'px';
    k.el.style.width = cw + 'px';
    k.el.style.height = ch + 'px';
    if (isContainer(k)) layoutChildrenInto(k, cw, ch);
  }
}

function layoutList(v, w, h) {
  // ListView：子项顺序纵向排（简化不做视口虚拟化；滚动由 overflow 提供）
  const kids = (v._children || []).filter(k => k && k.el && k.el.style.display !== 'none');
  let yy = 0;
  for (const k of kids) {
    const lp = k.layoutParams || {};
    let cw = w, ch;
    const hm = dimOf(lp, 'height');
    if (hm.mode === 'px') ch = hm.value;
    else if (hm.mode === 'match') ch = h - yy;
    else { // wrap
      k.el.style.width = w + 'px';
      k.el.style.height = 'auto';
      ch = contentH(k.el);
    }
    k.el.style.position = 'absolute';
    k.el.style.left = '0px';
    k.el.style.top = yy + 'px';
    k.el.style.width = cw + 'px';
    k.el.style.height = ch + 'px';
    if (isContainer(k)) layoutChildrenInto(k, cw, ch);
    yy += ch;
  }
}

function isContainer(v) {
  const t = v && v.tagNameForView;
  return t === 'LinearLayout' || t === 'FrameLayout' || t === 'ViewGroup' ||
         t === 'ListView' || t === 'AbsListView' || t === 'GridView';
}

// 内部：容器在给定内容尺寸下布局其子
function layoutChildrenInto(container, w, h) {
  const tag = container.tagNameForView;
  if (tag === 'LinearLayout') layoutLinear(container, w, h);
  else if (tag === 'FrameLayout') layoutFrame(container, w, h);
  else if (tag === 'ListView' || tag === 'AbsListView' || tag === 'GridView') layoutList(container, w, h);
}

/**
 * 从根开始全树像素布局。
 * root 的 size 由调用方保证（一般是 fixed/inset 视口）。
 */
export function relayoutRoot(rootView) {
  if (!rootView || !rootView.el) return;
  const w = rootView.el.clientWidth;
  const h = rootView.el.clientHeight;
  const st = rootView.el.style;
  st.position = 'fixed';
  st.left = '0px';
  st.top = '0px';
  st.width = w + 'px';
  st.height = h + 'px';
  if (isContainer(rootView)) layoutChildrenInto(rootView, w, h);
}
