### 示例1：正在输入选择器类型（如 @）

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

### 示例2：正在输入参数（如 @a[）
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
此时等价于
```JavaScript
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

### 示例3：输入参数名时的补全（如 @a[na）
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

### 示例4：输入参数值时的补全（如 @a[name=Steve）
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

### 示例5：输入完毕（如 @a[name=Steve]）
```json
{
  "length": 13,
  "canFinish": true
}
```

---

这些示例涵盖了 `recommend`、`output`、`menu`、`input` 等字段的典型用法，便于你理解每个字段在不同阶段的作用。

总之，`recommend` 字段是最常用的，此时`outpu`字段可以直接`Object.keys(recommend)`，来获取`recommend`中的键名作为输出。但是已经编写了函数`getSelectorParamCompletions(input, base, selectors, sort = false)`，可以直接获取`output`字段的内容，并且支持补全和排序。

# 总结
```JavaScript
t = {
  "length": selectorEnd,
  "recommend": {}, // 命令对应的补全，替换选择器文本（推荐使用）
  "assist": {}, // 命令对应的补全，增加的文本
  "menu": {},   // 命令对应的补全，替换整个文本框
  "output": {}, // 结束的参数，选择后自动到下一个参数（与length有关）

  "input": [] , // 显示使用的，最后定向到上面的键
  "canFinish": canFinish // 选择器是否结束
}
```