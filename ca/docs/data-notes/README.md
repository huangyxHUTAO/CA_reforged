# data/ 下各数据文件的说明

`data/` 里放的是构建时直接内联进脚本的纯数据（JSON），JSON 本身写不了注释，
每个文件对应的字段含义、修改方式都记在这一组文档里。

| 文档 | 对应数据文件 | 用途 |
| --- | --- | --- |
| [theme.md](theme.md) | `data/theme.json` | 主题配色表 |
| [tips.md](tips.md) | `data/tips.json` | 启动时随机展示的小知识 |
| [keepermenu.md](keepermenu.md) | `data/keepermenu.json` | 通知栏快捷菜单默认动作 |
| [packnames.md](packnames.md) | `data/packnames.json` | Minecraft 各渠道包名 |
| [idlibs/default.md](idlibs/default.md) | `data/idlibs/default.json` | 默认命令库 |
| [idlibs/addition.md](idlibs/addition.md) | `data/idlibs/addition.json` | 补充命令库 |
| [idlibs/education.md](idlibs/education.md) | `data/idlibs/education.json` | 教育版命令库 |
| [idlibs/experiment.md](idlibs/experiment.md) | `data/idlibs/experiment.json` | 实验性玩法命令库 |
| [idlibs/basicedu.md](idlibs/basicedu.md) | `data/idlibs/basicedu.json` | 基础教学库 |
| [JSONSchema.md](JSONSchema.md) | `data/idlibs/JSONSchema.json` | 内置的 JSON Schema 包（jsonPro 用） |
| [states.md](states.md) | `data/idlibs/states.json` | 方块状态包（status 参数补全用） |

## 维护约定

1. 改 `data/` 里的 JSON 前，先看这里对应文档的字段说明
2. 新增数据文件时，在这里补一篇同名说明并加进上表
3. 这些文档**不参与构建**，只是给人看的（构建只读 `data/*.json`）
