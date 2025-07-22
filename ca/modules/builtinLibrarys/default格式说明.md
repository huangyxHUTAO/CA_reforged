# default_1.19.30.21 命令库格式说明

本文件用于说明 default_1.19.30.21 版本命令库（JSON/JSONC）的结构和字段，适用于 CA 命令助手。

## 主体结构
- **$schema**：可选，推荐填写为 https://ca.projectxero.top/clib/schema_v1.json，便于编辑器校验和智能提示。
- **name**：命令库名称。
- **author**：作者。
- **description**：描述信息。
- **uuid**：唯一标识符，推荐使用 UUID。
- **version**：版本号，数组形式，如 [1,19,30,21]。
- **require**：依赖包列表，可为 UUID 字符串数组，也可为对象（含 uuid、min、max 字段）。
- **minCAVersion**：可选，命令助手最低版本要求。
- **update**：可选，更新链接。
- **deprecated**：可选，布尔值，标记为废弃。

## 数据部分
- **commands**：命令集合，键为命令名，值为命令定义（支持别名、参数、描述、帮助等）。
- **idlist**：ID表定义列表，支持 name、list（或 lists）字段。
- **enums**：枚举定义表，支持数组或对象形式。
- **selectors**：选择器定义表，支持 hasInverted（可反选）等属性。
- **json**：JSON模式表，定义命令参数/组件结构。
- **help**：帮助页面表，键为ID，值为URL或HTML代码。
- **tutorials**：教程列表，支持分步、命令、链接等段落类型。

## 版本包（versionPack）
- **versionPack**：用于版本控制的内容包。支持对象或数组结构。
  - **mode**：合并模式（merge/overwrite/remove）。
  - **minSupportVer/maxSupportVer/supportVer**：支持的版本区间。
  - **commands/enums/selectors/json/help/tutorials/idlist**：同主数据结构。
  - **remove模式**：可指定要移除的命令、枚举、选择器、JSON、帮助、教程、ID表等。

## 命令定义补充
- **description**：命令描述。
- **noparams**：无参数重载定义。
- **patterns**：命令重载定义，支持多种参数类型（text、rawjson、json、plain、selector、uint、int、float、relative、position、custom、enum、command、subcommand、string）。
- **help**：帮助页面链接。
- **alias**：命令别名定义。
- **content**：占位符命令定义。

## 其他补充
- **minSupportVer/targetSupportVer**：为兼容旧格式，仍可保留，但推荐使用 minCAVersion 和 supportVer。
- **filterFlag**：用于版本包移除内容时，值为 null。
- **segmentRawJSON**：ISegment原始字符串，支持多种富文本格式、颜色、图片、链接等。
- **教程（tutorials）**：支持分步、命令、链接、引导文本等丰富内容。

详细字段和示例请参考 https://ca.projectxero.top/clib/schema_v1.json。