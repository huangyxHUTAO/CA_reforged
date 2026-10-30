# 选择器补全的返回值结构

命令助手的智能补全里，`matchParam` 对选择器/参数类输入返回一个固定结构的对象。
这份说明来自社区版 `modules/CA.IntelliSense.js` 旁边的笔记，用来对照每种输入阶段
`length` / `recommend` / `assist` / `menu` / `output` / `input` / `canFinish` 分别是什么。

## 示例 1：正在输入选择器类型（如 `@`）

```json
{
  "length": 1,
  "recommend": {
    "@a - 选择所有玩家": "@a",
    "@p - 选择距离最近的玩家": "@p",
    "@r - 选择随机玩家": "@r",
    "@s - 选择命令执行者": "@s",
    "@e - 选择所有实体": "@e"
  },
  "input": [
    "@a - 选择所有玩家",
    "@p - 选择距离最近的玩家",
    "@r - 选择随机玩家",
    "@s - 选择命令执行者",
    "@e - 选择所有实体"
  ],
  "canFinish": false
}
```

## 示例 2：正在输入参数（如 `@a[`）

```json
{
  "length": 2,
  "assist": {
    "[...] - 插入参数": "["
  },
  "input": [
    "[...] - 插入参数"
  ],
  "canFinish": true
}
```

此时等价于：

```js
{
  "length": 2,
  "recommend": {
    "[...] - 插入参数": ps + "["
  },
  "input": [
    "[...] - 插入参数"
  ],
  "canFinish": true
}
```

## 示例 3：输入参数名时的补全（如 `@a[na`）

```json
{
  "length": 5,
  "recommend": {
    "= - 输入参数": "@a[na=",
    "name - 名称": "@a[name="
  },
  "input": [
    "= - 输入参数",
    "name - 名称"
  ],
  "canFinish": false
}
```

## 示例 4：输入参数值时的补全（如 `@a[name=Steve`）

```json
{
  "length": 11,
  "recommend": {
    ", - 下一个参数": "@a[name=Steve,",
    "! - 反向选择": "@a[name=!Steve"
  },
  "output": {
    "] - 结束参数": "@a[name=Steve]"
  },
  "menu": {},
  "input": [
    ", - 下一个参数",
    "] - 结束参数",
    "! - 反向选择"
  ],
  "canFinish": true
}
```

## 示例 5：输入完毕（如 `@a[name=Steve]`）

```json
{
  "length": 13,
  "canFinish": true
}
```

## 字段总结

```js
t = {
  length: selectorEnd, // 这一段匹配消耗的字符数
  recommend: {},       // 替换选择器文本（最常用）
  assist: {},          // 在已有文本后追加
  menu: {},            // 替换整个输入框
  output: {},          // 结束参数类补全，选完自动跳到下一个参数（和 length 配合）

  input: [],           // 显示用的候选键名，点击后取上面几组映射里的值
  canFinish: canFinish // 选择器是否已经结束
}
```

几个约定：

- `recommend` 最常用；只要键名列表，直接 `Object.keys(recommend)` 就是 `input`
- 结束类补全（如 `]`）放 `output`，因为它会改变 `length`
- 想直接拿到按格式排好序的候选，用
  `getSelectorParamCompletions(input, base, selectors, addtext, sort)`
  —— 它内部就是按上面结构拼的，返回可直接当 `output` 用的对象

## 相关代码

| 位置 | 作用 |
|---|---|
| `CA.IntelliSense.parseSelectorPath` | 把当前输入解析成 `{state, stack, keys, currentInput, debug}` |
| `CA.IntelliSense.matchParam` | 按参数类型返回上面这个结构 |
| `CA.IntelliSense.getSelectorParamCompletions` | 参数补全的通用拼装 |
| `CA.IntelliSense.getSchemaByContext` | 方块状态（`status` 参数）按上下文找 schema |
