# data/idlibs/states.json 说明

「方块状态包」：给命令参数类型 `status` 提供各方块的状态补全。比如
/setblock ~ ~ ~ stone[`"button_pressed_bit"=...`] 里的 `[...]` 部分。

命令库名：方块状态包
作者：南鸢晨星 & CHelper
UUID：`4145a166-7f9e-4ee6-969e-b3b0582ee94f`
版本：1.0.0
描述：感谢同为命令助手的CHelper开源了方块状态，本包进行了转换格式和补充。
编译时间：2025-08-30 10:44:08

## 字段说明

- `name` / `author` / `description` / `uuid` / `version` —— 包信息
- `require` —— 依赖列表（当前为空）
- `states` —— 命名空间 → 状态表。目前只有 `block` 一个命名空间

`states.block` 是一个数组，每项形如：

```json
{
	"context": [
		"acacia_button",
		"bamboo_button",
		"…"
	],
	"schema": {
		"\"button_pressed_bit\"": {
			"name": "按钮是否按下",
			"type": "enum",
			"list": {
				"false": "[默认] 按钮没有处于按下状态",
				"true": "按钮处于按下状态"
			}
		}
	}
}
```

| 字段 | 作用 |
| --- | --- |
| `context` | 适用哪些方块（方块 id 列表）；命令里的 `status` 参数按**上一个参数**的值来匹配 |
| `schema` | 状态名 → 参数定义（和命令参数同一种结构，支持 `enum` / `list` / `prompt` 等） |

当前收录 132 组方块状态。

## 怎么被用上

命令定义里参数写成：

```json
{"type": "status", "name": "方块状态", "subject": "block"}
```

输入该参数时，`CA.IntelliSense` 会：

1. 取上一个参数的值（方块 id）当上下文
2. 通过 `getSchemaByContext(方块id, "block")` 找到对应的 `schema`
3. 按选择器语法补全状态名、枚举值、逗号和 `]`

## 修改方式

1. 新增方块：往 `states.block` 里加一项，`context` 写方块 id，`schema` 写它的状态
2. 状态值有固定选项的用 `"type": "enum"` + `"list"`；自由输入用 `"type": "text"`
3. 改完跑一次构建，`builtinData.js` 会把这份 JSON 内联进去
