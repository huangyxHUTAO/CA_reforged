package yancey.chelper.core;

import android.content.res.AssetManager;

/**
 * CHelper 内核的 Java 绑定（对应 CHelper-Core 的 JNI 符号）。
 *
 * JNI 符号是 Java_yancey_chelper_core_CHelperCore_*，所以包名和类名不能改。
 */
public final class CHelperCore {
    static {
        System.loadLibrary("CHelperAndroid");
    }

    private long pointer;

    private CHelperCore(AssetManager assetManager, String cpackPath) {
        pointer = create0(assetManager, cpackPath);
        if (pointer == 0L) {
            throw new RuntimeException("fail to init CHelper Core: " + cpackPath);
        }
    }

    /**
     * 从应用内置资源包加载内核，path 形如 "cpack/release-vanilla-1.21.132.1.cpack"
     */
    public static CHelperCore fromAssets(AssetManager assetManager, String path) {
        return new CHelperCore(assetManager, path);
    }

    /**
     * 从文件加载内核
     */
    public static CHelperCore fromFile(String path) {
        return new CHelperCore(null, path);
    }

    public long createContextPointer(String command) {
        if (pointer == 0L) {
            throw new IllegalStateException("CHelper Core is closed");
        }
        return createContext0(pointer, command);
    }

    public void close() {
        long p = pointer;
        pointer = 0L;
        if (p != 0L) release0(p);
    }

    private static native long create0(AssetManager assetManager, String cpackPath);

    private static native void release0(long pointer);

    private static native long createContext0(long core, String command);
}
