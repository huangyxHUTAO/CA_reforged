import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;
import top.projectxero.ca.accel.Accel;

import java.util.*;

/**
 * matchString 的 JS(Rhino) 与 Java 实现对比基准。
 *
 * 用同一份数据、同一批前缀，各跑 N 轮，比较总耗时。
 * 数据模拟真实补全场景：几千个候选值，其中一部分带描述。
 */
public class BenchMatchString {
    static final int CANDIDATES = 3000;
    static final int ROUNDS = 200;
    static final int WARMUP = 20;

    public static void main(String[] args) throws Exception {
        // 造数据
        List<String> list = new ArrayList<>();
        Map<String, String> map = new LinkedHashMap<>();
        for (int i = 0; i < CANDIDATES; i++) {
            String k = "minecraft:" + String.format("block_%04d", i);
            list.add(k);
            map.put(k, "方块 " + i);
        }
        String[] prefixes = {"mine", "block_00", "block_01", "1", "zzz"};

        // JS 侧：把 jsMatchString 原样喂给 Rhino
        String jsSrc = "function jsMatchString(ps, a, r) {\n" +
            "  var t, t2, t3;\n" +
            "  if (!(r instanceof Object)) r = {};\n" +
            "  if (!Array.isArray(r.input)) r.input = [];\n" +
            "  if (!(r.output instanceof Object)) r.output = {};\n" +
            "  if (Array.isArray(a)) {\n" +
            "    t = [];\n" +
            "    a.forEach(function(e) {\n" +
            "      if (e.indexOf(ps) < 0) return;\n" +
            "      r.output[e] = e;\n" +
            "      if (r.input.indexOf(e) < 0) t.push(e);\n" +
            "    });\n" +
            "    t.sort();\n" +
            "    r.input = r.input.concat(t);\n" +
            "  } else {\n" +
            "    t = []; t2 = [];\n" +
            "    Object.keys(a).forEach(function(e) {\n" +
            "      if (e.indexOf(ps) < 0 && a[e].indexOf(ps) < 0) return;\n" +
            "      if (a[e]) {\n" +
            "        t3 = e + ' - ' + a[e];\n" +
            "        r.output[t3] = e;\n" +
            "        if (r.input.indexOf(t3) < 0) t.push(t3);\n" +
            "      } else {\n" +
            "        r.output[e] = e;\n" +
            "        if (r.input.indexOf(e) < 0) t2.push(e);\n" +
            "      }\n" +
            "    });\n" +
            "    t.sort(); t2.sort();\n" +
            "    r.input = r.input.concat(t, t2);\n" +
            "  }\n" +
            "  return r;\n" +
            "}\n";

        Context cx = Context.enter();
        cx.setOptimizationLevel(-1);   // 和 App 里一致：纯解释模式
        Scriptable scope = cx.initStandardObjects();
        cx.evaluateString(scope, jsSrc, "bench", 1, null);
        Object fnObj = scope.get("jsMatchString", scope);

        // 构造 JS 侧用的原生数组 / 对象（App 里脚本传的就是 JS 原生结构）
        Scriptable jsList = cx.newArray(scope, list.toArray());
        Scriptable jsMapObj = cx.newObject(scope);
        for (Map.Entry<String, String> e : map.entrySet()) {
            jsMapObj.put(e.getKey(), jsMapObj, e.getValue());
        }

        // 预热
        for (int i = 0; i < WARMUP; i++) {
            for (String p : prefixes) {
                Accel.matchString(p, list);
                Accel.matchString(p, map);
                ((org.mozilla.javascript.Function) fnObj).call(cx, scope, scope,
                    new Object[]{p, jsList, null});
                ((org.mozilla.javascript.Function) fnObj).call(cx, scope, scope,
                    new Object[]{p, jsMapObj, null});
            }
        }

        long jsArr = 0, jsMap = 0, cpuArr = 0, cpuMap = 0;
        for (int i = 0; i < ROUNDS; i++) {
            for (String p : prefixes) {
                long t0 = System.nanoTime();
                ((org.mozilla.javascript.Function) fnObj).call(cx, scope, scope,
                    new Object[]{p, jsList, null});
                jsArr += System.nanoTime() - t0;

                t0 = System.nanoTime();
                Accel.matchString(p, list);
                cpuArr += System.nanoTime() - t0;

                t0 = System.nanoTime();
                ((org.mozilla.javascript.Function) fnObj).call(cx, scope, scope,
                    new Object[]{p, jsMapObj, null});
                jsMap += System.nanoTime() - t0;

                t0 = System.nanoTime();
                Accel.matchString(p, map);
                cpuMap += System.nanoTime() - t0;
            }
        }
        Context.exit();

        int calls = ROUNDS * prefixes.length;
        System.out.printf("  候选 %d 个，前缀 %d 种，每种跑 %d 轮，共 %d 次调用%n",
            CANDIDATES, prefixes.length, ROUNDS, calls);
        System.out.println();
        System.out.printf("  数组输入  JS(Rhino): %8.2f ms   Java: %8.2f ms   加速 %.1fx%n",
            jsArr / 1e6, cpuArr / 1e6, (double) jsArr / Math.max(1, cpuArr));
        System.out.printf("  对象输入  JS(Rhino): %8.2f ms   Java: %8.2f ms   加速 %.1fx%n",
            jsMap / 1e6, cpuMap / 1e6, (double) jsMap / Math.max(1, cpuMap));
    }
}
