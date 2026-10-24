package yancey.chelper.core;

/**
 * 补全候选（对应 CHelper-Core 的 Suggestion）。
 *
 * JNI 会通过反射直接填充这两个字段，所以字段名和类型不能改。
 */
public class Suggestion {
    public String name;
    public String description;
}
