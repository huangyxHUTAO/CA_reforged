# data/idlibs/default.json 说明

单人模式下与核心玩法相关的常用命令，并且内置对应版本的 ID 表。**默认启用**。

命令库名：默认命令库
作者：CA制作组
UUID：acf728c5-dd5d-4a38-b43d-7c4f18149fbd
版本：1.21.0.21
描述：该命令库主要包含了单人模式下与核心玩法相关的常用命令用法，并且内置了对应版本的ID表。

## 字段说明

  - `$schema` —— 命令库格式定义，线上地址 `https://ca.projectxero.top/clib/schema_v1.json`
  - `name` —— 命令库显示名
  - `author` —— 作者
  - `description` —— 一句话说明这个库包含什么、什么时候该启用
  - `uuid` —— 全局唯一标识，版本更新/去重都靠它，不要改
  - `version` —— 版本号数组 [major, minor, patch, build]（当前 4 项）
  - `require` —— 依赖的其他命令库 uuid 列表，加载前会先加载它们（当前 0 项）
  - `minSupportVer` —— 要求的最低游戏版本
  - `minCAVersion` —— 要求的最低命令助手版本（日期串）
  - `commands` —— 命令定义：命令名 → 参数/说明，补全的主要数据源（当前 0 项）
  - `idlist` —— 内置 ID 表：方块/物品/实体等的可用值，按游戏版本分组（当前 19 项）
  - `enums` —— 枚举表：某类参数允许的取值（如 effect、enchant_type）（当前 25 项）
  - `selectors` —— 目标选择器参数表：x/y/z/r/rm… 各自的类型与说明（当前 18 项）
  - `json` —— JSON 片段支持：block_selector、item_component 的补全模板（当前 2 项）
  - `help` —— 命令帮助文本（当前 1 项）
  - `versionPack` —— 按游戏版本打包的数据集，键是版本号，值是那版新增/变化的内容（当前 68 项）

## 修改方式

  1. 改这个文件确认字段含义
  2. 改 data/idlibs/default.json 里对应的值
  3. uuid 不要改：改了会被当成另一个库
