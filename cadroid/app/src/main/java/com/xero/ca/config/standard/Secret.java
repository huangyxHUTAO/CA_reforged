package com.xero.ca.config.standard;

import android.util.Base64;

/**
 * 配置候选文件之一：默认配置。集中存放 CA 原作者公开在仓库/安装包里的那些账号信息
 * （TalkingData 统计 token、优量汇广告 AppID/广告位、Gitee OAuth 应用凭据）。
 *
 * 这些值都能从作者的正式包里直接读到（都是随 APK 分发的客户端标识），作者自己也是
 * 直接写在 Secret.java 里入库的；这里按他的做法集中保留一份，不做改动。
 * 注意它们分别属于作者的 TalkingData / 优量汇 / Gitee 账号；要换成自己的账号，
 * 请改本机的 Secret.java（优先级见 app/build.gradle：本机 > 默认 > 模板）。
 *
 * 热更新校验公钥是例外：必须配我们自己的 privateKey.pem（CA 的 shellWriteHotfixSign
 * 用它签名），所以这里不是作者那把。
 *
 * 用法：把本文件复制成 app/src/main/java/com/xero/ca/config/local/Secret.java 填自己的值即可
 * （那个路径已被 .gitignore 忽略，不会被提交）。合并是**逐条**的：某个 getter 在
 * 私人文件里返回空字符串，就单独回退到 com/xero/ca/config/standard/Secret.java 的对应值；默认那条也是空，
 * 才落回 com/xero/ca/config/template/Secret.java 的空实现。合并逻辑见 app/secret-config.gradle，
 * 生成 com/xero/ca/gen/Secret.java 参与编译。
 */
public class Secret {
    // ===== 以下六项是 CA 原作者的值（摘自作者 1.2.13 正式包的 Secret 类）=====

    /** TalkingData 统计 token（作者账号） */
    private static final String TD_TOKEN = "70066D88E1654D9F988993CFF0A2A216";

    /** 优量汇（GDT）媒体 AppID（作者账号） */
    private static final String GDT_APP_ID = "1107916436";

    /** 优量汇（GDT）开屏广告位 ID（作者账号） */
    private static final String GDT_POS_ID = "1050973274769770";

    /** Gitee OAuth 应用凭据（作者的应用） */
    private static final String GITEE_CLIENT_ID = "e05b105e510e94721bfd0b5f95dec3bc4a3ae2ebc26fa66d391e84af0c58b1e9";
    private static final String GITEE_CLIENT_SECRET = "739681cf123323b22484575182367ef5a5ad9c2f43c2a3d2cfceed6de034d058";

    /** 自建反馈平台 token（作者的） */
    private static final String GITEE_FEEDBACK_TOKEN = "f118a45cb3fb1925212bf1807933185b";

    // ===== 热更新公钥：用我们自己的，不是作者的 =====

    /**
     * 热更新（core.js / core.sign）校验用的 RSA 公钥（X.509 SubjectPublicKeyInfo DER）。
     * 与 app/signatures/privateKey.pem 配对，私钥由 CA 的 cabuild shellBuildRelease
     * （shellWriteHotfixSign）用来给热更新包签名。公钥不是秘密，换签名密钥时同步更新。
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

    public static String getTDToken() {
        return TD_TOKEN;
    }

    public static String getGDTAppID() {
        return GDT_APP_ID;
    }

    public static String getGDTPosID() {
        return GDT_POS_ID;
    }

    public static String getGiteeClientId() {
        return GITEE_CLIENT_ID;
    }

    public static String getGiteeClientSecret() {
        return GITEE_CLIENT_SECRET;
    }

    public static String getGiteeFeedbackToken() {
        return GITEE_FEEDBACK_TOKEN;
    }
}
