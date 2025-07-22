package javax.lang.model;

public class SourceVersion {
    public static SourceVersion latestSupported() {
        return new SourceVersion();
    }
    public final int ordinal() {
        return 8;
    }
}
