# Async/Await 支持文档

## 概述

从 `feature/babel-async-await` 分支开始，构建系统支持将 `async/await` 语法转译为 Rhino 1.7.15.1 兼容的代码。

## 原理

使用 Babel 的 `@babel/plugin-transform-async-to-generator` 插件，将：

```javascript
async function fetchData() {
    const user = await getUser();
    return user;
}
```

转译为：

```javascript
function fetchData() {
    return _asyncToGenerator(function* () {
        const user = yield getUser();
        return user;
    })();
}
```

Rhino 1.7.15.1 支持 Generators (`function*`) 和 Promise，因此转译后的代码可以正常运行。

## 使用方法

### 在构建任务中启用

修改 `cabuildtools/tasks/assembleSource.js`：

```javascript
module.exports = function(context, args) {
    var result = loader.load("../ca/main.js", { 
        buildConfig : context.buildConfig 
    }, "utf-8", {
        transformAsync: true  // 启用 async/await 转译
    });
    return result;
};
```

### 使用选项

```javascript
loader.load(sourcePath, parentDef, charset, {
    transformAsync: true,   // 启用转译（默认：false）
    verbose: false          // 关闭日志（可选）
});
```

## 在代码中使用 async/await

### 基本用法

```javascript
// 定义 async 函数
async function fetchUserData(userId) {
    const response = await NetworkUtils.requestApi("GET", "/user/" + userId);
    const user = await response.json();
    return user;
}

// 使用 Promise API 调用（与现有代码兼容）
fetchUserData(123).then(function(user) {
    console.log(user.name);
}).catch(function(error) {
    console.error(error);
});
```

### 错误处理

```javascript
async function riskyOperation() {
    try {
        const result = await Promise.reject("error");
        return result;
    } catch (e) {
        // 捕获异步错误
        return "default value";
    }
}
```

### 并行执行

```javascript
async function loadMultiple() {
    const [users, posts] = await Promise.all([
        fetchUsers(),
        fetchPosts()
    ]);
    return { users, posts };
}
```

### 在模块中导出

```javascript
MapScript.loadModule("MyService", {
    async fetchData(id) {
        const data = await NetworkUtils.requestApi("GET", "/data/" + id);
        return data;
    },
    
    async processItems(items) {
        const results = [];
        for (const item of items) {
            results.push(await this.processItem(item));
        }
        return results;
    }
});
```

## 限制

1. **箭头函数中的 async**：需要确保转译后的代码语法正确
2. **顶层 await**：不支持（Rhino 限制）
3. **Async Generators**：不支持 `async function*`

## 测试

### 运行单元测试

```bash
cd cabuildtools
node tests/async-transform.test.js
```

### 运行集成测试

在 Rhino 环境中加载 `ca/modules/test/AsyncAwaitTest.js` 模块：

```javascript
// 加载测试模块
MapScript.loadModule("AsyncAwaitTest");

// 运行测试
AsyncAwaitTest.runAllTests().then(function(result) {
    console.log("测试通过: " + result.allPassed);
});
```

## 性能影响

### 构建时间

- 无 async/await 的代码：几乎无影响（< 5%）
- 有 async/await 的代码：增加约 10-20%（Babel transform 开销）

### 代码体积

- 辅助函数：`asyncGeneratorStep` + `_asyncToGenerator` 约 400 字节（一次性）
- 每个 async 函数：转译后增加约 50-100 字节

### 运行时性能

- Generator + Promise 的实现比原生 async/await 慢约 10-30%
- 对于大多数 UI 操作和网络请求，性能差异可忽略

## 迁移建议

### 逐步迁移

1. **新代码**：直接使用 async/await
2. **旧代码**：保持 Promise 链式调用，按需重构

### 兼容性处理

```javascript
// 混合使用 async/await 和 Promise
function legacyApi() {
    return Promise.resolve(42);
}

async function newApi() {
    const result = await legacyApi();
    return result * 2;
}

// 暴露 Promise API 保持兼容
exports.newApi = function() {
    return newApi();
};
```

## 故障排除

### 转译失败

如果看到警告 `async/await 转译警告`，检查：
1. 代码语法是否正确
2. 是否使用了不支持的特性（如 async generators）

### 运行时错误

如果转译后的代码报错：
1. 确认 Rhino 版本 >= 1.7.15（支持 Promise 和 Generators）
2. 检查是否重复注入辅助函数

## 参考

- [Babel plugin-transform-async-to-generator](https://babeljs.io/docs/babel-plugin-transform-async-to-generator)
- [Rhino ES6 Support](https://mozilla.github.io/rhino/compat/engines.html)
