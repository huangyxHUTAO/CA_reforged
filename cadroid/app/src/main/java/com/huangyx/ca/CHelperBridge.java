package com.huangyx.ca;

import android.content.res.AssetManager;

import yancey.chelper.core.CHelperCore;
import yancey.chelper.core.ClickSuggestionResult;
import yancey.chelper.core.CommandContext;
import yancey.chelper.core.ErrorReason;
import yancey.chelper.core.Suggestion;

/**
 * 命令引擎桥接层：给 JS 侧调用的静态入口。
 *
 * 内核是单例，切换 cpack 时释放旧的；任何一步失败都要把引用清空，
 * 否则会留下一个已 close 的 core，下次调用抛 "CHelper Core is closed"。
 */
public final class CHelperBridge {
    private static CHelperCore sCore;
    private static String sPack;

    private CHelperBridge() {
    }

    private static void ensureCore(AssetManager assets, String pack) {
        if (sCore != null && pack.equals(sPack)) return;
        if (sCore != null) {
            try {
                sCore.close();
            } catch (Throwable ignore) {
            }
            sCore = null;
        }
        sPack = null;
        sCore = CHelperCore.fromAssets(assets, "cpack/" + pack);
        sPack = pack;
    }

    /**
     * 内核是否可用：assets 里有 cpack，且 .so 能加载。
     */
    public static boolean isAvailable(AssetManager assets) {
        try {
            if (!hasAnyCpack(assets)) return false;
            Class.forName("yancey.chelper.core.CHelperCore");
            return true;
        } catch (Throwable t) {
            return false;
        }
    }

    private static RuntimeException fail(String op, Throwable t) {
        android.util.Log.e("CA", "CHelper " + op + " failed", t);
        return t instanceof RuntimeException
                ? (RuntimeException) t
                : new RuntimeException("CHelper " + op + ": " + t, t);
    }

    private static boolean hasAnyCpack(AssetManager assets) {
        try {
            String[] list = assets.list("cpack");
            return list != null && list.length > 0;
        } catch (Throwable t) {
            return false;
        }
    }

    /**
     * 一次解析取回全部补全数据，避免同一条命令重复解析 4 次。
     * 返回：{ structure, hint, error, suggestions[] }，用 "\u0001" 分段。
     */
    public static synchronized String query(AssetManager assets, String pack, String command, int cursor) {
        try {
            ensureCore(assets, pack);
            CommandContext context = new CommandContext(sCore.createContextPointer(command));
            try {
                String structure = context.getStructure();
                String hint = context.getParamHint(cursor);
                String error = "";
                ErrorReason[] reasons = context.getErrorReasons();
                if (reasons != null && reasons.length > 0 && reasons[0] != null) {
                    error = reasons[0].errorReason == null ? "" : reasons[0].errorReason;
                }
                StringBuilder sb = new StringBuilder();
                sb.append(structure == null ? "" : structure).append('\u0001');
                sb.append(hint == null ? "" : hint).append('\u0001');
                sb.append(error).append('\u0001');
                int size = context.getSuggestionsSize(cursor);
                if (size > 200) size = 200;
                for (int i = 0; i < size; i++) {
                    Suggestion s = context.getSuggestion(cursor, i);
                    if (s == null) continue;
                    String name = s.name == null ? "" : s.name;
                    String desc = s.description == null ? "" : s.description;
                    if (sb.length() > 0 && sb.charAt(sb.length() - 1) != '\u0001') sb.append('\u0002');
                    sb.append(desc.isEmpty() ? name : name + " - " + desc);
                }
                return sb.toString();
            } finally {
                context.close();
            }
        } catch (Throwable t) {
            throw fail("query", t);
        }
    }

    public static synchronized String probe(AssetManager assets, String pack, String command) {
        try {
            ensureCore(assets, pack);
            CommandContext context = new CommandContext(sCore.createContextPointer(command));
            try {
                return context.getCommand();
            } finally {
                context.close();
            }
        } catch (Throwable t) {
            throw fail("probe", t);
        }
    }

    public static synchronized String structure(AssetManager assets, String pack, String command) {
        try {
            ensureCore(assets, pack);
            CommandContext context = new CommandContext(sCore.createContextPointer(command));
            try {
                return context.getStructure();
            } finally {
                context.close();
            }
        } catch (Throwable t) {
            throw fail("structure", t);
        }
    }

    public static synchronized String paramHint(AssetManager assets, String pack, String command, int cursor) {
        try {
            ensureCore(assets, pack);
            CommandContext context = new CommandContext(sCore.createContextPointer(command));
            try {
                return context.getParamHint(cursor);
            } finally {
                context.close();
            }
        } catch (Throwable t) {
            throw fail("paramHint", t);
        }
    }

    public static synchronized String[] errorReasons(AssetManager assets, String pack, String command) {
        try {
            ensureCore(assets, pack);
            CommandContext context = new CommandContext(sCore.createContextPointer(command));
            try {
                ErrorReason[] reasons = context.getErrorReasons();
                if (reasons == null || reasons.length == 0) return new String[0];
                String[] out = new String[reasons.length];
                for (int i = 0; i < reasons.length; i++) {
                    ErrorReason r = reasons[i];
                    out[i] = (r == null || r.errorReason == null ? "" : r.errorReason)
                            + "\t" + (r == null ? 0 : r.start)
                            + "\t" + (r == null ? 0 : r.end);
                }
                return out;
            } finally {
                context.close();
            }
        } catch (Throwable t) {
            throw fail("errorReasons", t);
        }
    }

    /**
     * 补全候选，格式为 "值 - 说明"（引擎层统一），失败返回空数组。
     */
    public static synchronized String[] suggestions(AssetManager assets, String pack, String command, int cursor) {
        try {
            ensureCore(assets, pack);
            CommandContext context = new CommandContext(sCore.createContextPointer(command));
            try {
                int size = context.getSuggestionsSize(cursor);
                if (size <= 0) return new String[0];
                if (size > 200) size = 200;
                String[] out = new String[size];
                for (int i = 0; i < size; i++) {
                    Suggestion s = context.getSuggestion(cursor, i);
                    if (s == null) {
                        out[i] = "";
                    } else {
                        String name = s.name == null ? "" : s.name;
                        String desc = s.description == null ? "" : s.description;
                        out[i] = desc.isEmpty() ? name : name + " - " + desc;
                    }
                }
                return out;
            } finally {
                context.close();
            }
        } catch (Throwable t) {
            throw fail("suggestions", t);
        }
    }

    /**
     * 应用某条补全建议，返回 {新命令文本, 新光标位置}；失败返回 {null, "0"}。
     */
    public static synchronized String[] applySuggestion(AssetManager assets, String pack, String command, int cursor, int which) {
        try {
            ensureCore(assets, pack);
            CommandContext context = new CommandContext(sCore.createContextPointer(command));
            try {
                ClickSuggestionResult result = context.applySuggestion(cursor, which);
                if (result == null || result.text == null) {
                    return new String[]{null, "0"};
                }
                return new String[]{result.text, String.valueOf(result.selection)};
            } finally {
                context.close();
            }
        } catch (Throwable t) {
            throw fail("applySuggestion", t);
        }
    }
}
