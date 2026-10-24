package yancey.chelper.core;

/**
 * 一条命令的解析上下文（对应 CHelper-Core 的 CommandContext）。
 *
 * 用完必须 close()，否则 C++ 侧的内存不会释放。
 */
public final class CommandContext {
    private long pointer;

    public CommandContext(long pointer) {
        if (pointer == 0L) {
            throw new IllegalArgumentException("CommandContext pointer is 0");
        }
        this.pointer = pointer;
    }

    public String getCommand() {
        long p = pointer;
        return p == 0L ? null : command0(p);
    }

    public String getStructure() {
        long p = pointer;
        return p == 0L ? null : getStructure0(p);
    }

    public void close() {
        long p = pointer;
        pointer = 0L;
        if (p != 0L) release0(p);
    }

    private static native String command0(long pointer);

    private static native String getStructure0(long pointer);

    private static native void release0(long pointer);
}
