/**
 * AST Loader 测试套件
 * 运行: node tests/loader-ast.test.js
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
    // 测试 1: 基本加载
    testBasicLoad() {
        console.log("测试 1: 基本加载...");
        loader.reset();
        
        const main = createTestFile("test_basic.js", `
            var result = Loader.fromFile("./test_module.js");
            console.log(result.name);
        `);
        const module = createTestFile("test_module.js", `({ name: "hello" })`);
        
        try {
            const result = loader.load(main, {});
            assert(result.includes('"hello"'), "应该内联模块内容");
            assert(!result.includes("Loader.fromFile"), "不应该保留 Loader.fromFile 调用");
            console.log("  ✓ 通过");
        } finally {
            cleanupTestFiles([main, module]);
        }
    },

    // 测试 2: 别名支持
    testAlias() {
        console.log("测试 2: 别名赋值...");
        loader.reset();
        
        const main = createTestFile("test_alias.js", `
            var L = Loader;
            var result = L.fromFile("./test_mod.js");
        `);
        const module = createTestFile("test_mod.js", `({ type: "alias" })`);
        
        try {
            const result = loader.load(main, {});
            assert(result.includes('"alias"'), "应该识别别名调用");
            console.log("  ✓ 通过");
        } finally {
            cleanupTestFiles([main, module]);
        }
    },

    // 测试 3: 相对路径解析
    testRelativePath() {
        console.log("测试 3: 相对路径...");
        loader.reset();
        
        const main = createTestFile("test_relative.js", `
            var a = Loader.fromFile("./mod_a.js");
        `);
        const modA = createTestFile("mod_a.js", `
            var b = Loader.fromFile("./mod_b.js");
            exports.a = 1;
            exports.b = b;
        `);
        const modB = createTestFile("mod_b.js", `({ value: 2 })`);
        
        try {
            const result = loader.load(main, {});
            // 检查是否内联了 mod_b.js 的内容 (value: 2)
            assert(result.includes('value:') && result.includes('2'), 
                "应该解析嵌套相对路径");
            console.log("  ✓ 通过");
        } finally {
            cleanupTestFiles([main, modA, modB]);
        }
    },

    // 测试 4: JSONC 支持
    testJsonc() {
        console.log("测试 4: JSONC (带注释的 JSON)...");
        loader.reset();
        
        const main = createTestFile("test_jsonc_main.js", `
            var config = Loader.fromFile("./config.json");
        `);
        const jsonFile = createTestFile("config.json", `{
            // 这是注释
            "name": "test",
            /* 多行
               注释 */
            "value": 123
        }`);
        
        try {
            const result = loader.load(main, {});
            // valueToNode 生成的属性名可能不加引号
            assert(result.includes('name:') && result.includes('"test"'), "应该解析 JSONC name");
            assert(result.includes('value:') && result.includes('123'), "应该保留 JSON 数据 value");
            console.log("  ✓ 通过");
        } finally {
            cleanupTestFiles([main, jsonFile]);
        }
    },

    // 测试 5: 循环依赖检测
    testCircularDependency() {
        console.log("测试 5: 循环依赖检测...");
        loader.reset();
        
        const main = createTestFile("test_circular_main.js", `
            var a = Loader.fromFile("./circular_a.js");
        `);
        const modA = createTestFile("circular_a.js", `
            var b = Loader.fromFile("./circular_b.js");
        `);
        const modB = createTestFile("circular_b.js", `
            var a = Loader.fromFile("./circular_a.js");
        `);
        
        try {
            try {
                loader.load(main, {});
                assert(false, "应该检测到循环依赖");
            } catch (e) {
                assert(e.message.includes("循环依赖"), "错误信息应该包含'循环依赖'");
                console.log("  ✓ 通过 (正确检测到循环依赖)");
            }
        } finally {
            cleanupTestFiles([main, modA, modB]);
        }
    },

    // 测试 6: 语法验证
    testSyntax() {
        console.log("测试 6: 生成代码语法验证...");
        loader.reset();
        
        const main = createTestFile("test_syntax.js", `
            var a = Loader.fromFile("./mod_syntax.js");
            function test() { return a; }
        `);
        const module = createTestFile("mod_syntax.js", `({ data: [1, 2, 3] })`);
        
        try {
            const result = loader.load(main, {});
            // 验证生成的代码可以正常解析
            parser.parse(result, { sourceType: "script" });
            console.log("  ✓ 通过 (生成的代码语法正确)");
        } finally {
            cleanupTestFiles([main, module]);
        }
    },

    // 测试 7: 完整项目编译
    testFullProject() {
        console.log("测试 7: 完整项目编译...");
        loader.reset();
        
        const mainPath = path.join(__dirname, "../../ca/main.js");
        
        try {
            const result = loader.load(mainPath, {});
            
            // 验证基本指标
            assert(result.length > 1000000, "生成的代码应该大于 1MB");
            
            // 验证语法
            parser.parse(result, { sourceType: "script" });
            
            const stats = loader.getStats();
            console.log(`  ✓ 通过 (编译了 ${stats.totalFiles} 个文件)`);
        } catch (e) {
            console.log("  ✗ 失败:", e.message);
            throw e;
        }
    }
};

// 运行测试
console.log("=".repeat(50));
console.log("AST Loader 测试套件");
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
        failed++;
    }
}

console.log();
console.log("=".repeat(50));
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
console.log("=".repeat(50));

process.exit(failed > 0 ? 1 : 0);
