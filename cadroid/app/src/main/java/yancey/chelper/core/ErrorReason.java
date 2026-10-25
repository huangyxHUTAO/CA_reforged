package yancey.chelper.core;

/**
 * 语法错误（对应 CHelper-Core 的 ErrorReason）。
 *
 * JNI 通过反射填充字段，字段名不能改。
 */
public class ErrorReason {
    public String errorReason;
    public int start;
    public int end;
}
