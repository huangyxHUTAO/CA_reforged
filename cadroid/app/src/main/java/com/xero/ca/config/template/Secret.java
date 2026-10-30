package com.xero.ca.config.template;

import android.util.Base64;

/**
 * 配置候选文件之一：模板。所有账号/密钥都留空（对应功能自动关闭），
 * 是三级回退的最后一级，保证任何时候都能编译。
 *
 * 本文件入库，保证 clone 下来不做任何配置也能编译。
 *
 * 用法：把本文件复制成 app/src/main/java/com/xero/ca/config/local/Secret.java 填自己的值即可
 * （那个路径已被 .gitignore 忽略，不会被提交）。合并是**逐条**的：某个 getter 在
 * 私人文件里返回空字符串，就单独回退到 com/xero/ca/config/standard/Secret.java 的对应值；默认那条也是空，
 * 才落回 com/xero/ca/config/template/Secret.java 的空实现。合并逻辑见 app/secret-config.gradle，
 * 生成 com/xero/ca/gen/Secret.java 参与编译。
 */
public class Secret {
    /**
     * 热更新（core.js / core.sign）校验用的 RSA 公钥（X.509 SubjectPublicKeyInfo DER）。
     * 与 app/signatures/privateKey.pem 配对，私钥由 CA 的 cabuild shellBuildRelease
     * （shellWriteHotfixSign）用来给热更新包签名。
     * 这是公钥、不是秘密，所以两份 Secret 里都写死同一份；换签名密钥时同步更新。
     */
    private static final String HOTFIX_PUBLIC_KEY =
            "MIIBIDANBgkqhkiG9w0BAQEFAAOCAQ0AMIIBCAKCAQEA1pMZBN7GCySx7cdi4NnYJT4+zWzrHeL/" +
            "Boyo6LyozWvTeG6nCqds5g67D5k1Wf/ZPnepQ+foPUtkuOT+otPmVvHiZ6gbv7IwtXjCBEO+THIY" +
            "uEb1IRWG8DihTonCvjh/jr7Pj8rD2h7jMMnqk9Cnw9xK81AiDVAIBzLggJcX7moFM1nmppTsLLPy" +
            "hKCkZsh6lNg7MQk6ZzcuL2QSwG5tQvFYGN/+A4HMDNRE2mzdw7gkWBlIAbMlZBNPv96YySh3SNv1" +
            "Z2pUDYFUyLvKB7niR1UzEcRrmvdv3uzMjmnnyKLQjngmIJQ/mXJ9PAT+cpkdmd+brjigshd/ox1b" +
            "av7pHwIBAw==";

    public static byte[] getVerifyKey() {
        return Base64.decode(HOTFIX_PUBLIC_KEY, Base64.DEFAULT);
    }

    /** Gitee OAuth 应用 client id，空字符串表示不使用 Gitee 登录/反馈 */
    public static String getGiteeClientId() {
        return "";
    }

    /** Gitee OAuth 应用 client secret */
    public static String getGiteeClientSecret() {
        return "";
    }

    /** 自建反馈平台 token */
    public static String getGiteeFeedbackToken() {
        return "";
    }

    /** TalkingData 统计 token，空字符串表示不初始化统计 */
    public static String getTDToken() {
        return "";
    }

    /** 优量汇（GDT）媒体 AppID，在优量汇开发者后台的“媒体管理”里获取，为空表示不展示广告 */
    public static String getGDTAppID() {
        return "";
    }

    /** 优量汇（GDT）开屏广告位 ID，为空表示不展示广告 */
    public static String getGDTPosID() {
        return "";
    }
}
