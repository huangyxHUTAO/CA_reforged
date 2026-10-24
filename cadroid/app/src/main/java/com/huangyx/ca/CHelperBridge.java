package com.huangyx.ca;

import android.content.res.AssetManager;

import yancey.chelper.core.CHelperCore;
import yancey.chelper.core.CommandContext;

/**
 * 命令引擎桥接层：给 JS 侧调用的静态入口。
 *
 * 目前只做最小验证（解析后原样返回命令文本），后续再补结构、提示、补全、高亮。
 */
public final class CHelperBridge {
    private static CHelperCore sCore;
    private static String sPack;

    private CHelperBridge() {
    }

    /**
     * 内核是否可用：.so 能加载且 assets 里有 cpack。
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

    private static boolean hasAnyCpack(AssetManager assets) {
        try {
            String[] list = assets.list("cpack");
            return list != null && list.length > 0;
        } catch (Throwable t) {
            return false;
        }
    }

    public static synchronized String probe(AssetManager assets, String pack, String command) {
        try {
            if (sCore == null || !pack.equals(sPack)) {
                if (sCore != null) {
                    sCore.close();
                }
                sCore = CHelperCore.fromAssets(assets, "cpack/" + pack);
                sPack = pack;
            }
            CommandContext context = new CommandContext(sCore.createContextPointer(command));
            try {
                return context.getCommand();
            } finally {
                context.close();
            }
        } catch (Throwable t) {
            return "CHelper error: " + t;
        }
    }

    /**
     * 返回命令结构（语法骨架）字符串，失败时返回错误说明。
     */
    public static synchronized String structure(AssetManager assets, String pack, String command) {
        try {
            if (sCore == null || !pack.equals(sPack)) {
                if (sCore != null) {
                    sCore.close();
                }
                sCore = CHelperCore.fromAssets(assets, "cpack/" + pack);
                sPack = pack;
            }
            CommandContext context = new CommandContext(sCore.createContextPointer(command));
            try {
                return context.getStructure();
            } finally {
                context.close();
            }
        } catch (Throwable t) {
            return "CHelper error: " + t;
        }
    }
}
