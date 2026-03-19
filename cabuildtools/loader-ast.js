const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");
const stripJsonComments = require("strip-json-comments").default;

// 虚拟文件系统 - 编译时维护
const vfs = {
    cache: new Map(),      // 路径 -> AST
    stack: [],             // 调用栈，用于相对路径解析和循环依赖检测
    contexts: new Map()    // 路径 -> 文件上下文
};

// 获取当前文件路径（用于相对路径解析）
function getCurrentPath() {
    return vfs.stack.length > 0 ? vfs.stack[vfs.stack.length - 1] : null;
}

// 解析相对路径
function resolvePath(from, to) {
    if (!to) return from;
    // from 应该是绝对路径
    const baseDir = path.dirname(from);
    
    if (to.startsWith("./") || to.startsWith("../")) {
        // 相对路径：基于 from 的目录
        const resolved = path.resolve(baseDir, to);
        return resolved.replace(/\\/g, "/");
    }
    
    // 非相对路径：尝试直接解析，如果不存在则基于 from 的目录
    const directPath = path.resolve(baseDir, to);
    return directPath.replace(/\\/g, "/");
}

// 进入文件（压栈，检测循环依赖）
function enterFile(filePath) {
    const normalizedPath = path.normalize(filePath);
    if (vfs.contexts.has(normalizedPath) && vfs.contexts.get(normalizedPath).loading) {
        const chain = vfs.stack.join(" -> ") + " -> " + normalizedPath;
        throw new Error(`循环依赖 detected: ${chain}`);
    }
    vfs.stack.push(normalizedPath);
    vfs.contexts.set(normalizedPath, { loading: true, path: normalizedPath });
    return normalizedPath;
}

// 退出文件（弹栈）
function exitFile() {
    vfs.stack.pop();
}

// 跟踪所有 Loader 相关用法（用于调试和统计）
const loaderUsages = [];

// 解析 Loader.fromFile 调用中的路径参数
// 支持多种形式：
//   Loader.fromFile("path")
//   var L = Loader; L.fromFile("path")
//   Loader.fromFile.call(Loader, "path")
//   (0, Loader.fromFile)("path")
function getLoaderPath(node) {
    if (!t.isCallExpression(node)) return null;
    
    let callee = node.callee;
    let args = node.arguments;
    
    // 处理 .call() 调用：Loader.fromFile.call(Loader, "path")
    if (t.isMemberExpression(callee) && 
        t.isIdentifier(callee.property, { name: "call" })) {
        callee = callee.object;
        // 移除第一个参数（thisArg）
        args = args.slice(1);
    }
    
    // 处理逗号表达式：(0, Loader.fromFile)("path")
    if (t.isSequenceExpression(callee)) {
        callee = callee.expressions[callee.expressions.length - 1];
    }
    
    // 检查是否是 Loader.fromFile
    if (t.isMemberExpression(callee)) {
        // 检查属性名
        let methodName = null;
        if (t.isIdentifier(callee.property, { name: "fromFile" })) {
            methodName = "fromFile";
        } else if (t.isStringLiteral(callee.property) && callee.property.value === "fromFile") {
            methodName = "fromFile";
        }
        
        if (methodName && args.length > 0) {
            const arg = args[0];
            if (t.isStringLiteral(arg)) {
                return {
                    path: arg.value,
                    method: methodName,
                    node: node
                };
            }
        }
    }
    
    return null;
}

// 检测是否是 Loader 赋值语句
function isLoaderAssignment(node) {
    // var L = Loader
    // var L = Loader.fromFile
    // 等等
    if (t.isVariableDeclarator(node)) {
        const init = node.init;
        if (t.isIdentifier(init, { name: "Loader" })) {
            return { name: node.id.name, type: "Loader" };
        }
        if (t.isMemberExpression(init) && 
            t.isIdentifier(init.object, { name: "Loader" })) {
            return { name: node.id.name, type: "method", method: init.property.name };
        }
    }
    return null;
}

// 加载文件并解析为 AST
// 对于 JSON 文件，返回特殊的 AST 表示
// 当前处理的 parentDef，用于递归传递
let currentParentDef = null;

function loadFileAsAST(filePath, parentDef) {
    const realPath = fs.realpathSync(filePath);
    const ext = path.extname(realPath).toLowerCase();
    
    // 检查缓存（注意：缓存不考虑 parentDef，因为文件内容应该相同）
    if (vfs.cache.has(realPath)) {
        return vfs.cache.get(realPath);
    }
    
    enterFile(realPath);
    
    // 保存并设置当前的 parentDef
    const prevParentDef = currentParentDef;
    currentParentDef = parentDef;
    
    try {
        const source = fs.readFileSync(realPath, "utf-8");
        
        let ast;
        
        // 根据文件类型处理
        if (ext === '.json') {
            // JSON/JSONC 文件：支持注释和宽松语法
            let jsonObj;
            try {
                // 先尝试标准 JSON 解析
                jsonObj = JSON.parse(source);
            } catch (standardErr) {
                // 失败则预处理（去除注释、尾随逗号）后再解析
                try {
                    // 使用 strip-json-comments 安全去除注释
                    const cleaned = stripJsonComments(source, { whitespace: false });
                    jsonObj = JSON.parse(cleaned);
                } catch (cleanedErr) {
                    throw new Error(`Invalid JSON/JSONC: ${cleanedErr.message}`);
                }
            }
            const jsonExpr = t.valueToNode(jsonObj);
            ast = t.file(t.program([
                t.expressionStatement(jsonExpr)
            ]));
        } else {
            // JS 文件：先处理 LOADER 注释，再解析
            let processedSource = processLoaderComments(source, realPath, currentParentDef);
            ast = parser.parse(processedSource, {
                sourceType: "script",
                allowReturnOutsideFunction: true
            });
            
            // 递归处理内部的 Loader.fromFile
            processAST(ast, realPath);
        }
        
        // 记录文件信息用于报错
        vfs.contexts.get(realPath).ast = ast;
        vfs.contexts.get(realPath).source = source;
        
        vfs.cache.set(realPath, ast);
        vfs.contexts.get(realPath).loading = false;
        
        return ast;
    } catch (e) {
        // 增强错误信息
        if (e.loc) {
            e.message = `[${realPath}:${e.loc.line}:${e.loc.column}] ${e.message}`;
        } else {
            e.message = `[${realPath}] ${e.message}`;
        }
        throw e;
    } finally {
        exitFile();
        // 恢复 parentDef
        currentParentDef = prevParentDef;
    }
}

// 处理 AST，替换 Loader.fromFile 调用
function processAST(ast, currentFile) {
    // 收集 Loader 别名
    const loaderAliases = new Set(["Loader"]);
    
    const visitor = {
        // 处理变量声明，收集 Loader 别名
        VariableDeclarator(nodePath) {
            const assignment = isLoaderAssignment(nodePath.node);
            if (assignment && assignment.type === "Loader") {
                loaderAliases.add(assignment.name);
                loaderUsages.push({
                    type: "alias",
                    name: assignment.name,
                    loc: nodePath.node.loc,
                    file: currentFile
                });
            }
        },
        
        // 处理函数调用
        CallExpression(nodePath) {
            const node = nodePath.node;
            const loadInfo = getLoaderPath(node);
            
            if (!loadInfo) return;
            
            const { path: loadPath, method } = loadInfo;
            
            // 调试：打印路径解析
            // console.log(`[DEBUG] 从 "${currentFile}" 加载 "${loadPath}"`);
            
            // 计算完整路径
            const fullPath = resolvePath(currentFile, loadPath);
            
            // console.log(`[DEBUG] 解析为: "${fullPath}"`);
            
            loaderUsages.push({
                type: "load",
                path: loadPath,
                resolvedPath: fullPath,
                method,
                loc: node.loc,
                file: currentFile
            });
            
            try {
                // 递归加载，传递当前的 parentDef
                const childAST = loadFileAsAST(fullPath, currentParentDef);
                const childProgram = childAST.program;
                
                // 替换策略
                const replacement = createReplacement(childProgram, fullPath);
                nodePath.replaceWith(replacement);
                
            } catch (e) {
                console.error(`[ERROR] Loading "${loadPath}" from "${currentFile}":`, e.message);
                throw e;
            }
        }
    };
    
    traverse(ast, visitor);
}

// 创建替换节点
function createReplacement(childProgram, filePath) {
    const body = childProgram.body;
    
    // 空文件
    if (body.length === 0) {
        return t.objectExpression([]);
    }
    
    // 单个表达式语句，直接取值
    if (body.length === 1 && t.isExpressionStatement(body[0])) {
        return body[0].expression;
    }
    
    // 单个对象表达式
    if (body.length === 1 && t.isObjectExpression(body[0])) {
        return body[0];
    }
    
    // 处理 CommonJS 风格：查找 exports.xxx = ...
    const exportsProps = [];
    const otherStmts = [];
    
    for (const stmt of body) {
        // exports.foo = bar
        if (t.isExpressionStatement(stmt) &&
            t.isAssignmentExpression(stmt.expression) &&
            stmt.expression.operator === "=" &&
            t.isMemberExpression(stmt.expression.left) &&
            t.isIdentifier(stmt.expression.left.object, { name: "exports" })) {
            
            const propName = t.isIdentifier(stmt.expression.left.property) 
                ? stmt.expression.left.property.name 
                : stmt.expression.left.property.value;
            
            exportsProps.push(t.objectProperty(
                t.identifier(propName),
                stmt.expression.right
            ));
        } else {
            otherStmts.push(stmt);
        }
    }
    
    // 如果有 exports，创建对象字面量
    if (exportsProps.length > 0) {
        // 如果还有其他语句，需要 IIFE
        if (otherStmts.length > 0) {
            // 合并：先执行其他语句，然后返回 exports 对象
            const iifeBody = [
                ...otherStmts,
                t.returnStatement(t.objectExpression(exportsProps))
            ];
            return t.callExpression(
                t.functionExpression(null, [], t.blockStatement(iifeBody)),
                []
            );
        } else {
            // 只有 exports，直接返回对象
            return t.objectExpression(exportsProps);
        }
    }
    
    // 默认：包装为 IIFE
    return t.callExpression(
        t.functionExpression(
            null,
            [],
            t.blockStatement(body)
        ),
        []
    );
}

// 主加载函数
function load(sourcePath, parentDef, charset = "utf-8") {
    const realPath = fs.realpathSync(sourcePath);
    const parent = path.dirname(realPath);
    
    // 创建定义对象（保持与旧版兼容）
    const def = Object.create(parentDef || null);
    
    try {
        const ast = loadFileAsAST(realPath);
        
        // 生成代码
        const output = generate(ast, {
            sourceMaps: false,
            compact: false
        });
        
        return output.code;
    } catch (e) {
        console.error(`Failed to load ${sourcePath}:`, e.message);
        throw e;
    }
}

// 兼容性：处理 /*LOADER ... */ 注释（保持与旧版兼容）
// parentDef 包含 buildConfig 等变量
function processLoaderComments(source, filePath, parentDef) {
    const vm = require("vm");
    
    // 构建变量对象，与旧版 loader 兼容
    const variables = parentDef || {};
    
    // 用于在 replace 回调中传递修改后的 source
    let modifiedSource = source;
    
    const sandbox = {
        source: source,
        replacement: "",
        postprocessor: null,
        variables: variables,  // 注入 variables，供 BuildConfig.js 等使用
        define: function(key, value) {},
        undefine: function(key) {},
        isDefined: function(key) { return false; },
        getDef: function(key) { return undefined; },
        load: function(p) { return load(path.resolve(path.dirname(filePath), p), {}); },
        require: function(m) { return require(m); }
    };
    
    // 处理 LOADER 注释
    source = source.replace(/\/\*LOADER\s([\s\S]+?)\*\//g, function(match, code, offset) {
        sandbox.replacement = "";
        sandbox.source = modifiedSource;  // 使用当前的 modifiedSource
        try {
            vm.runInNewContext(code, sandbox, { filename: filePath });
            // 如果代码修改了 sandbox.source，更新 modifiedSource
            if (sandbox.source !== modifiedSource) {
                modifiedSource = sandbox.source;
            }
        } catch (e) {
            console.warn(`LOADER comment error in ${filePath}:`, e.message);
        }
        return sandbox.replacement;
    });
    
    // 使用可能被修改后的 source
    source = modifiedSource;
    
    if (sandbox.postprocessor) {
        source = sandbox.postprocessor(source);
    }
    
    return source;
}

// 重置 VFS（用于多次构建）
function resetVFS() {
    vfs.cache.clear();
    vfs.stack = [];
    vfs.contexts.clear();
    loaderUsages.length = 0;
}

// 获取构建统计信息
function getStats() {
    return {
        totalFiles: vfs.cache.size,
        stackDepth: vfs.stack.length,
        usages: [...loaderUsages],
        files: Array.from(vfs.cache.keys())
    };
}

// 打印依赖图（用于调试）
function printDependencyGraph() {
    console.log("=== Loader 依赖图 ===");
    const loads = loaderUsages.filter(u => u.type === "load");
    loads.forEach(u => {
        console.log(`${u.file} -> ${u.path} (${u.resolvedPath})`);
    });
    console.log(`共 ${vfs.cache.size} 个文件`);
}

// 主入口（保持 API 兼容）
module.exports = {
    load: function(sourcePath, parentDef, charset) {
        // 重置 VFS 确保干净状态
        resetVFS();
        
        // 设置初始 parentDef
        currentParentDef = parentDef;
        
        // 先处理 LOADER 注释（保持兼容）
        let source = fs.readFileSync(sourcePath, charset || "utf-8");
        source = processLoaderComments(source, sourcePath, parentDef);
        
        // 解析处理后的 source
        const ast = parser.parse(source, {
            sourceType: "script",
            allowReturnOutsideFunction: true
        });
        
        const realPath = fs.realpathSync(sourcePath);
        enterFile(realPath);
        try {
            processAST(ast, realPath);
        } finally {
            exitFile();
            currentParentDef = null;
        }
        
        // 可选：打印依赖图（调试用）
        // printDependencyGraph();
        
        const output = generate(ast, {
            sourceMaps: true,
            sourceFileName: path.basename(sourcePath)
        });
        
        return output.code;
    },
    
    // 高级 API：获取统计信息
    getStats,
    
    // 高级 API：重置状态
    reset: resetVFS,
    
    // 内部使用（测试）
    _vfs: vfs,
    _resolvePath: resolvePath
};
