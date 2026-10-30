import top.projectxero.ca.accel.Accel;
import java.util.*;

/** 新增加速点的等价性用例 */
public class MoreAccelTest {
    public static void main(String[] a) {
        // compareVersionArray：与 JS 实现逐项对齐
        check(Accel.compareVersionArray(new int[]{1,2,3}, new int[]{1,2,10}) == -1, "1.2.3 < 1.2.10");
        check(Accel.compareVersionArray(new int[]{2,0}, new int[]{1,9,9}) == 1, "2.0 > 1.9.9");
        check(Accel.compareVersionArray(new int[]{1,0}, new int[]{1}) == 1, "1.0 > 1（缺位按 -1，0 > -1，与 JS 原实现一致）");
        check(Accel.compareVersionArray(new int[]{1}, new int[]{1,0}) == -1, "1 < 1.0（缺位 -1 < 0，与 JS 原实现一致）");
        check(Accel.compareVersionArray(new int[]{}, new int[]{}) == 0, "空数组相等");

        // classify：精确命中 / 模糊命中 / 不命中
        String[] keys = {"block", "block_state", "item", "minecraft:stone"};
        String[] descs = {"方块", "方块状态", "物品", null};
        int[] f = Accel.classify(keys, descs, "block");
        check(f[0] == 1, "'block' 精确命中（ps == e）");
        check(f[1] == 2, "'block_state' 模糊命中（e 含 ps）");
        check(f[2] == 0, "'item' 不命中");
        check(f[3] == 0, "'minecraft:stone' 不命中");

        int[] f2 = Accel.classify(keys, descs, "block ");
        check(f2[0] == 1, "'block ' 精确命中（ps.startsWith(e + ' ')）");
        check(f2[1] == 0, "'block_state' 对 'block ' 不命中");

        int[] f3 = Accel.classify(keys, descs, "方块");
        check(f3[0] == 2 && f3[1] == 2, "描述命中");

        System.out.println("  all passed");
    }

    static void check(boolean ok, String name) {
        System.out.println("  " + (ok ? "✓" : "✗") + " " + name);
        if (!ok) System.exit(1);
    }
}
