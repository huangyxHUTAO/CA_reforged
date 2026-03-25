/**
 * Async/Await 集成测试
 * 用于验证转译后的 async/await 代码在 Rhino 中正常运行
 */

MapScript.loadModule("AsyncAwaitTest", {
    name: "AsyncAwaitTest",
    author: "ProjectXero",
    version: [1, 0, 0],
    uuid: "test-async-await-001",

    // 测试 1: 基本 async/await
    testBasicAsync: async function() {
        const result = await Promise.resolve(42);
        return result === 42;
    },

    // 测试 2: 异步错误处理
    testAsyncError: async function() {
        try {
            await Promise.reject("test error");
            return false; // 不应该执行到这里
        } catch (e) {
            return e === "test error";
        }
    },

    // 测试 3: 链式调用
    testAsyncChain: async function() {
        const result = await Promise.resolve(1)
            .then(v => v + 1)
            .then(v => v * 2);
        return result === 4;
    },

    // 测试 4: Promise.all
    testPromiseAll: async function() {
        const [a, b, c] = await Promise.all([
            Promise.resolve(1),
            Promise.resolve(2),
            Promise.resolve(3)
        ]);
        return a === 1 && b === 2 && c === 3;
    },

    // 测试 5: 嵌套 async
    testNestedAsync: async function() {
        async function inner() {
            return await Promise.resolve("inner");
        }
        const result = await inner();
        return result === "inner";
    },

    // 运行所有测试
    runAllTests: async function() {
        const tests = [
            { name: "基本 async/await", fn: this.testBasicAsync },
            { name: "异步错误处理", fn: this.testAsyncError },
            { name: "链式调用", fn: this.testAsyncChain },
            { name: "Promise.all", fn: this.testPromiseAll },
            { name: "嵌套 async", fn: this.testNestedAsync }
        ];

        const results = [];
        for (const test of tests) {
            try {
                const passed = await test.fn.call(this);
                results.push({ name: test.name, passed: passed });
                Log.d("AsyncAwaitTest", `${test.name}: ${passed ? "通过" : "失败"}`);
            } catch (e) {
                results.push({ name: test.name, passed: false, error: e });
                Log.e("AsyncAwaitTest", `${test.name}: 错误 - ${e}`);
            }
        }

        const allPassed = results.every(r => r.passed);
        Log.i("AsyncAwaitTest", `测试完成: ${results.filter(r => r.passed).length}/${results.length} 通过`);
        
        return {
            allPassed: allPassed,
            results: results
        };
    },

    // UI 测试入口
    showTestUI: function() {
        const self = this;
        Threads.run(function() {
            const result = self.runAllTests();
            G.ui(function() {
                if (result.allPassed) {
                    Common.toast("所有 async/await 测试通过！");
                } else {
                    Common.toast("部分测试失败，请查看日志");
                }
            });
        });
    },

    onCreate: function() {
        // 模块加载时自动注册测试命令（如果有调试命令系统）
        Log.i("AsyncAwaitTest", "Async/Await 测试模块已加载");
    }
});
