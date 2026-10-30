package top.projectxero.ca.accel;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 加速库入口。
 *
 * 设计原则：
 * 1. 纯 Java，不依赖 Android、不依赖 Rhino —— 可以单独在 JVM 上跑单测
 * 2. 所有方法都是 static、无状态，Rhino 直接 Callable 调用
 * 3. 每个方法在 JS 侧都有等价实现，jar 不存在时自动回退
 *
 * 版本：{ VERSION } 由构建脚本注入
 */
public final class Accel {
    private Accel() {}

    /** 供 JS 探测版本，回退实现与加速实现共用同一套约定 */
    public static String version() {
        return "1.0.0";
    }

/**
     * 补全的字符串匹配。对应 JS: CA.IntelliSense.matchString。
     *
     * 输入的 a 支持两种形态：
     *   - List&lt;String&gt;：候选值列表
     *   - Map&lt;String,String&gt;：候选值 → 描述
     * 返回匹配到的新增条目，由 JS 侧合并进 r.input / r.output，
     * 这样调用方拿到的 r 与纯 JS 实现完全一致。
     *
     * 相比 JS 版的收益：JS 版用 indexOf 去重是 O(n²)，这里用 LinkedHashSet 是 O(n)。
     */
    public static Result matchString(String ps, Object a) {
        Result r = new Result();
        String p = ps == null ? "" : ps;
        if (a instanceof Map) {
            List<String> withDesc = new ArrayList<String>();
            List<String> plain = new ArrayList<String>();
            for (Object o : ((Map<?, ?>) a).entrySet()) {
                Map.Entry<?, ?> e = (Map.Entry<?, ?>) o;
                String key = String.valueOf(e.getKey());
                String val = e.getValue() == null ? "" : String.valueOf(e.getValue());
                if (key.indexOf(p) < 0 && val.indexOf(p) < 0) continue;
                if (val.length() > 0) {
                    String display = key + " - " + val;
                    r.outputs.put(display, key);
                    withDesc.add(display);
                } else {
                    r.outputs.put(key, key);
                    plain.add(key);
                }
            }
            Collections.sort(withDesc);
            Collections.sort(plain);
            r.inputs.addAll(withDesc);
            r.inputs.addAll(plain);
        } else if (a instanceof Iterable) {
            List<String> hits = new ArrayList<String>();
            for (Object o : (Iterable<?>) a) {
                String e = String.valueOf(o);
                if (e.indexOf(p) < 0) continue;
                r.outputs.put(e, e);
                hits.add(e);
            }
            Collections.sort(hits);
            r.inputs.addAll(hits);
        }
        return r;
    }

/**
     * 批量过滤：保留 arr 中包含 s 的元素，返回下标掩码。
     *
     * 对应 JS 侧的 setFilter(function(e, i) { return e.indexOf(s) >= 0; })：
     * 语义完全一样，但字符串查找在 Java 里一次做完，JS 侧只剩 keep[i] 取下标，
     * 避免每个元素都从 Java 回调进 Rhino 做一次 String.indexOf。
     */
    public static boolean[] filter(String[] arr, String s) {
        boolean[] keep = new boolean[arr == null ? 0 : arr.length];
        if (arr == null) return keep;
        String p = s == null ? "" : s;
        for (int i = 0; i < arr.length; i++) {
            String e = arr[i];
            keep[i] = e != null && e.contains(p);
        }
        return keep;
    }

/**
     * 版本号数组比较。对应 JS: NeteaseAdapter.compareVersion。
     * 非数字段按 -1 处理（与原实现一致）。
     */
    public static int compareVersionArray(int[] a, int[] b) {
        int n = Math.max(a == null ? 0 : a.length, b == null ? 0 : b.length);
        for (int i = 0; i < n; i++) {
            int p1 = (a != null && i < a.length) ? a[i] : -1;
            int p2 = (b != null && i < b.length) ? b[i] : -1;
            if (p1 < p2) return -1;
            if (p1 > p2) return 1;
        }
        return 0;
    }

    /**
     * 枚举候选分类。对应 CA.IntelliSense 的 enum 对象分支里那段判定：
     *
     *   if (ps.startsWith(e + " ") || ps == e)      -> 精确命中（可结束），位 1
     *   else if (e.indexOf(ps) >= 0 || t[e].indexOf(ps) >= 0) -> 模糊命中，位 2
     *
     * 返回与 keys 等长的标志数组，JS 侧只做位测试，不再碰字符串。
     */
    public static int[] classify(String[] keys, String[] descs, String ps) {
        int n = keys == null ? 0 : keys.length;
        int[] flags = new int[n];
        String p = ps == null ? "" : ps;
        for (int i = 0; i < n; i++) {
            String k = keys[i];
            if (k == null) continue;
            if (p.equals(k) || p.startsWith(k + " ")) {
                flags[i] = 1;
                continue;
            }
            String d = (descs != null && i < descs.length && descs[i] != null) ? descs[i] : "";
            if (k.contains(p) || d.contains(p)) flags[i] = 2;
        }
        return flags;
    }

    /** matchString 的结果：新增的候选与新增的显示映射 */
    public static final class Result {
        public final List<String> inputs = new ArrayList<String>();
        public final Map<String, String> outputs = new LinkedHashMap<String, String>();
    }

    /**
     * 把 #RRGGBB 解析成 ARGB int。
     * 对应 JS: Common.argbInt / 颜色串解析。
     *
     * @param hex 形如 "#A1B2C3" 或 "A1B2C3"
     * @return ARGB 整数；解析失败返回 0
     */
    public static int parseColor(String hex) {
        if (hex == null) return 0;
        String s = hex.trim();
        if (s.startsWith("#")) s = s.substring(1);
        if (s.length() != 6) return 0;
        int rgb = 0;
        for (int i = 0; i < 6; i++) {
            int d = Character.digit(s.charAt(i), 16);
            if (d < 0) return 0;
            rgb = (rgb << 4) | d;
        }
        return 0xFF000000 | rgb;
    }

    /**
     * 版本号比较（按点分段，逐段数值比较）。
     * 对应 JS: NeteaseAdapter 里的版本判断。
     *
     * @return 负数表示 a &lt; b，0 相等，正数表示 a &gt; b
     */
    public static int compareVersion(String a, String b) {
        if (a == null && b == null) return 0;
        if (a == null) return -1;
        if (b == null) return 1;
        String[] pa = a.split("\\.");
        String[] pb = b.split("\\.");
        int n = Math.max(pa.length, pb.length);
        for (int i = 0; i < n; i++) {
            long x = i < pa.length ? parseLong(pa[i]) : 0;
            long y = i < pb.length ? parseLong(pb[i]) : 0;
            if (x != y) return x < y ? -1 : 1;
        }
        return 0;
    }

    private static long parseLong(String s) {
        try {
            return Long.parseLong(s.trim());
        } catch (Exception e) {
            return 0;
        }
    }
}
