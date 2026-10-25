package yancey.chelper.core;

/**
 * 点击补全建议后的结果（对应 CHelper-Core 的 ClickSuggestionResult）。
 *
 * JNI 通过反射填充字段，字段名不能改。
 */
public class ClickSuggestionResult {
    /** 应用建议后的完整命令文本 */
    public String text;
    /** 新的光标位置 */
    public int selection;
}
