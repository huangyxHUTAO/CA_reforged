# data/packnames.json 说明

Minecraft 及其各渠道分发的包名列表，用于 NeteaseAdapter 识别「哪个是游戏」。

字段：纯字符串数组，每项一个包名。
- com.mojang.minecraftpe           国际版（Google Play / 官网）
- com.netease.*                   网易版（各渠道：小米、华为、B站、4399、百度…）
- com.tencent.tmgp.wdsj666        腾讯渠道

新增渠道时直接往数组里加，顺序不重要（代码会遍历匹配）。
