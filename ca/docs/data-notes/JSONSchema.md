# data/idlibs/JSONSchema.json 说明

内置的 **JSON Schema 包**：给 `jsonPro` 类型的命令参数提供补全与校验规则。
它本身也是一个普通的拓展包（`CA.Library.inner["JSONSchema"]`），不是 JSON Schema 定义文件。

命令库名：JSON Schema包
作者：南鸢晨星
UUID：`a1471826-7086-022e-cd02-8a5a317e825a`
版本：1.0.0
描述：提供 JSON Schema 验证功能

## 字段说明

- `name` / `author` / `description` —— 包信息，显示在拓展包列表里
- `uuid` —— 全局唯一标识，不要改
- `require` —— 依赖列表（当前为空）
- `version` —— 版本号数组
- `jsonSchema` —— 这个包真正的内容：**命名空间 → JSON Schema** 的映射

## 目前提供的 schema

| 名称 | 用途 |
| --- | --- |
| `rawtext` | Minecraft 基岩版文本组件（`/tellraw`、`/titleraw` 的 JSON 参数） |

`rawtext` 覆盖了文本组件的四种形态：

- `{ "text": "…" }` —— 纯文本
- `{ "translate": "…", "with": … }` —— 翻译文本，`with` 可以再嵌 `rawtext`
- `{ "score": { "name": …, "objective": … } }` —— 记分板分数
- `{ "selector": "@a" }` —— 实体选择器

其中 `name` 和 `selector` 带 `"ca:parser": "selector"`，命令助手会按选择器语法做补全。

## 怎么被用上

命令定义里写：

```json
{ "type": "jsonPro", "name": "JSON文本", "schema": "rawtext" }
```

输入到该参数时，`CA.IntelliSense` 会去 `library.jsonSchema[cp.schema]` 取这份 schema，
交给内置的 JSON 语言服务做补全和实时校验。

## 修改方式

1. 改本文件里的 `jsonSchema`（**必须是标准 JSON**，不能写注释；说明放这里）
2. 新增 schema 时直接在 `jsonSchema` 下加一个命名空间
3. 这些 schema 会被合并进 `library.jsonSchema`，多个包可以提供同名 schema（按加载顺序覆盖）
