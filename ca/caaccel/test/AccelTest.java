import top.projectxero.ca.accel.Accel;

/** caaccel 的最小单测：不依赖 JUnit，直接 java 跑 */
public class AccelTest {
    public static void main(String[] a) {
        check(Accel.parseColor("#A1B2C3") == 0xFFA1B2C3, "parseColor #RRGGBB");
        check(Accel.parseColor("A1B2C3") == 0xFFA1B2C3, "parseColor RRGGBB");
        check(Accel.parseColor("bad") == 0, "parseColor invalid");
        check(Accel.compareVersion("1.2.3", "1.2.10") < 0, "1.2.3 < 1.2.10");
        check(Accel.compareVersion("2.0", "1.9.9") > 0, "2.0 > 1.9.9");
        check(Accel.compareVersion("1.0", "1.0.0") == 0, "1.0 == 1.0.0");
        check("1.0.0".equals(Accel.version()), "version");
        System.out.println("  all passed");
    }
    static void check(boolean ok, String name) {
        System.out.println("  " + (ok ? "✓" : "✗") + " " + name);
        if (!ok) System.exit(1);
    }
}
