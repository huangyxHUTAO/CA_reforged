/**
 * Async/Await Transform 测试套件
 * 运行: node tests/async-transform.test.js
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const loader = require("../loader-ast");
const parser = require("@babel/parser");

// 测试辅助函数
function createTestFile(name, content) {
    const filePath = path.join(__dirname, name);
    fs.writeFileSync(filePath, content);
    return filePath;
}

function cleanupTestFiles(files) {
    files.forEach(f => {
        try { fs.unlinkSync(f); } catch(e) {}
    });
}

// 测试套件
const tests = {
    // 测试 1: 基本 async/await 转译
    testBasicAsyncTransform() {
        console.log("测试 1: 基本 async/await 转译...");
        loader.reset();
        
        const main = createTestFile("test_async_basic.js", `
            async function fetchData() {
                const result = await Promise.resolve(42);
                return result;
            }
            exports.fetchData = fetchData;
        `);
        
        try {
            // 显式开启 async transform
            const result = loader.load(main, {}, "utf-8", { transformAsync: true });
            
            // 验证转译结果包含 _asyncToGenerator
            assert(result.includes("_asyncToGenerator"), "应该包含 _asyncToGenerator 辅助函数");
            assert(result.includes("function*"), "应该包含 generator 函数");
            
            // 验证语法正确
            parser.parse(result, { sourceType: "script" });
            
            console.log("  ✓ 通过");
        } finally {
            cleanupTestFiles([main]);
        }
    },

    // 测试 2: 嵌套 async 函数
    testNestedAsync() {
        console.log("测试 2: 嵌套 async 函数...");
        loader.reset();
        
        const main = createTestFile("test_async_nested.js", `
            async function outer() {
                async function inner() {
                    return await 1;
                }
                return await inner();
            }
            exports.outer = outer;
        `);
        
        try {
            const result = loader.load(main, {}, "utf-8", { transformAsync: true });
            
            assert(result.includes("_asyncToGenerator"), "应该包含 _asyncToGenerator");
            
            // 验证语法正确
            parser.parse(result, { sourceType: "script" });
            
            console.log("  ✓ 通过");
        } finally {
            cleanupTestFiles([main]);
        }
    },

    // 测试 3: async 函数中的 try/catch
    testAsyncTryCatch() {
        console.log("测试 3: async 函数中的 try/catch...");
        loader.reset();
        
        const main = createTestFile("test_async_trycatch.js", `
            async function risky() {
                try {
                    return await Promise.reject("error");
                } catch (e) {
                    return "caught";
                }
            }
            exports.risky = risky;
        `);
        
        try {
            const result = loader.load(main, {}, "utf-8", { transformAsync: true });
            
            assert(result.includes("_asyncToGenerator"), "应该包含 _asyncToGenerator");
            
            // 验证语法正确
            parser.parse(result, { sourceType: "script" });
            
            console.log("  ✓ 通过");
        } finally {
            cleanupTestFiles([main]);
        }
    },

    // 测试 4: 默认情况下不启用 transform
    testNoTransformByDefault() {
        console.log("测试 4: 默认情况下不启用 transform...");
        loader.reset();
        
        const main = createTestFile("test_no_transform.js", `
            async function test() {
                return await 1;
            }
        `);
        
        try {
            // 不传递 transformAsync 选项（默认关闭）
            const result = loader.load(main, {}, "utf-8", {});
            
            // 默认情况下应该保留原始 async/await 语法
            //（或者如果代码中有 async，解析器会报错）
            // 注意：Rhino 1.7.15.1 不支持 async，但 parser 可以解析
            assert(result.includes("async function") || result.includes("await"), 
                "默认情况下应保留 async/await 语法");
            
            console.log("  ✓ 通过");
        } finally {
            cleanupTestFiles([main]);
        }
    },

    // 测试 5: 与 Loader.fromFile 结合
    testAsyncWithLoader() {
        console.log("测试 5: async/await 与 Loader.fromFile 结合...");
        loader.reset();
        
        const main = createTestFile("test_async_loader_main.js", `
            var utils = Loader.fromFile("./test_async_loader_module.js");
            async function main() {
                return await utils.getData();
            }
            exports.main = main;
        `);
        const module = createTestFile("test_async_loader_module.js", `
            exports.getData = async function() {
                return await Promise.resolve(42);
            };
        `);
        
        try {
            const result = loader.load(main, {}, "utf-8", { transformAsync: true });
            
            // 验证转译成功
            assert(result.includes("_asyncToGenerator"), "应该包含 _asyncToGenerator");
            
            // 验证模块被内联
            assert(result.includes("getData"), "应该内联模块内容");
            
            // 验证语法正确
            parser.parse(result, { sourceType: "script" });
            
            console.log("  ✓ 通过");
        } finally {
            cleanupTestFiles([main, module]);
        }
    },

    // 测试 6: Promise.all 与 async/await
    testPromiseAllAsync() {
        console.log("测试 6: Promise.all 与 async/await...");
        loader.reset();
        
        const main = createTestFile("test_async_promiseall.js", `
            async function parallel() {
                const [a, b] = await Promise.all([
                    Promise.resolve(1),
                    Promise.resolve(2)
                ]);
                return a + b;
            }
            exports.parallel = parallel;
        `);
        
        try {
            const result = loader.load(main, {}, "utf-8", { transformAsync: true });
            
            assert(result.includes("_asyncToGenerator"), "应该包含 _asyncToGenerator");
            
            // 验证语法正确
            parser.parse(result, { sourceType: "script" });
            
            console.log("  ✓ 通过");
        } finally {
            cleanupTestFiles([main]);
        }
    }
};

// 运行测试
console.log("=".repeat(50));
console.log("Async/Await Transform 测试套件");
console.log("=".repeat(50));
console.log();

let passed = 0;
let failed = 0;

for (const [name, testFn] of Object.entries(tests)) {
    try {
        testFn();
        passed++;
    } catch (e) {
        console.log(`  ✗ 失败: ${e.message}`);
        console.log(`    ${e.stack}`);
        failed++;
    }
}

console.log();
console.log("=".repeat(50));
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
console.log("=".repeat(50));

process.exit(failed > 0 ? 1 : 0);
