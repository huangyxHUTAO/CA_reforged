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

    /**
     * 指定光标位置上的补全候选数量
     */
    public int getSuggestionsSize(int index) {
        long p = pointer;
        return p == 0L ? 0 : getSuggestionsSize0(p, index);
    }

    /**
     * 取第 which 个补全候选（index 是光标位置）
     */
    public Suggestion getSuggestion(int index, int which) {
        long p = pointer;
        return p == 0L ? null : getSuggestion0(p, index, which);
    }

    public void close() {
        long p = pointer;
        pointer = 0L;
        if (p != 0L) release0(p);
    }

    private static native String command0(long pointer);

    private static native String getStructure0(long pointer);

    private static native int getSuggestionsSize0(long pointer, int index);

    private static native Suggestion getSuggestion0(long pointer, int index, int which);

    private static native void release0(long pointer);
}
