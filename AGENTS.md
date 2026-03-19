# 命令助手构建工具 - 技术文档

## 架构概述

`cabuildtools/` 是一套基于 Node.js 的构建系统，用于编译命令助手项目。

## 核心组件

### 1. AST Loader (`loader-ast.js`)

替代旧版正则表达式的模块加载器，使用 Babel 解析器进行 AST 处理。

**特点：**
- 使用 `@babel/parser` 解析 JavaScript AST
- 使用 `@babel/traverse` 遍历和修改 AST
- 使用 `@babel/generator` 生成最终代码
- 支持 `strip-json-comments` 处理带注释的 JSON (JSONC)

**LOADER 注释指令：**
```javascript
/*LOADER fromFile("path/to/file")*/
/*LOADER require("module")*/
/*LOADER TestOnly()*/  // 仅测试环境包含
```

**作用域处理：**
- `createReplacement()` 直接返回语句数组，不使用 IIFE 包裹
- 确保 BuildConfig 等全局变量在正确作用域内

### 2. 构建任务系统 (`tasks/`)

任务采用管道模式链式执行：
```javascript
context.execute("taskA")
    .then(context.task("taskB"))
    .then(context.pipe("taskC"))
```

**主要任务：**
- `buildDebug` / `buildRelease` - 主构建流程
- `assembleSource` - 使用 AST Loader 编译源代码
- `compressSource` - 代码压缩
- `writeDebug` / `writeRelease` - 输出构建产物

### 3. 配置文件

- `configs/*.json` - 构建配置（支持 JSONC 格式）
- 使用 `loadJsonC()` 加载带注释的 JSON 文件

## 开发注意事项

### AST Loader 调试

启用详细日志输出：
```javascript
loader.load(sourcePath, parentDef, charset, { verbose: true });
```

### Android 11+ 存储适配

- `FileLogger.js` 使用应用私有目录避免权限问题
- 路径：`ctx.getExternalFilesDir(null)`

### 循环依赖检测

AST Loader 内置循环依赖检测，防止 `fromFile()` 导致的死循环。
