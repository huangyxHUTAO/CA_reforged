package com.qq.e.comm.util;

/**
 * 优量汇 AdError 的空实现（桩），只在本地缺 GDTActionSDK aar 时参与编译，
 * 见 app/src/stub/gdt 与 app/build.gradle。
 */
public class AdError {
    private final int code;
    private final String msg;

    public AdError() {
        this(0, null);
    }

    public AdError(int code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    public int getErrorCode() {
        return code;
    }

    public String getErrorMsg() {
        return msg;
    }
}
