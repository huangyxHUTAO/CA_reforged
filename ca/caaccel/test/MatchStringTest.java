import top.projectxero.ca.accel.Accel;
import java.util.*;

/** matchString 的等价性用例：与 JS 回退实现逐项对齐 */
public class MatchStringTest {
    public static void main(String[] a) {
        // 用例 1：数组，前缀匹配
        Accel.Result r1 = Accel.matchString("ap", Arrays.asList("apple", "apricot", "banana"));
        check(r1.inputs.equals(Arrays.asList("apple", "apricot")), "数组匹配 inputs");
        check(r1.outputs.size() == 2 && "apple".equals(r1.outputs.get("apple")), "数组匹配 outputs");

        // 用例 2：对象，key 或描述命中
        Map<String, String> m = new LinkedHashMap<>();
        m.put("apple", "苹果");
        m.put("banana", "");
        m.put("cherry", "樱桃");
        Accel.Result r2 = Accel.matchString("ap", m);
        check(r2.inputs.equals(Arrays.asList("apple - 苹果")), "对象匹配：只命中 apple");
        check("apple".equals(r2.outputs.get("apple - 苹果")), "对象匹配：output 映射回 key");

        // 用例 3：描述命中
        Accel.Result r3 = Accel.matchString("樱", m);
        check(r3.inputs.equals(Arrays.asList("cherry - 樱桃")), "描述命中");

        // 用例 4：空前缀 → 全部命中
        Accel.Result r4 = Accel.matchString("", Arrays.asList("a", "b"));
        check(r4.inputs.equals(Arrays.asList("a", "b")), "空前缀全命中");

        // 用例 5：无命中
        Accel.Result r5 = Accel.matchString("zzz", Arrays.asList("a", "b"));
        check(r5.inputs.isEmpty() && r5.outputs.isEmpty(), "无命中");

        // 用例 6：排序（带描述的在前，按字典序）
        Map<String, String> m2 = new LinkedHashMap<>();
        m2.put("zebra", "斑马");
        m2.put("apple", "苹果");
        Accel.Result r6 = Accel.matchString("", m2);
        check(r6.inputs.equals(Arrays.asList("apple - 苹果", "zebra - 斑马")), "带描述的按字典序");

        System.out.println("  all passed");
    }

    static void check(boolean ok, String name) {
        System.out.println("  " + (ok ? "✓" : "✗") + " " + name);
        if (!ok) System.exit(1);
    }
}
