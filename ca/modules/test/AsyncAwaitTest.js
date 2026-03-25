/**
 * Async/Await 集成测试
 * 用于验证转译后的 async/await 代码在 Rhino 中正常运行
 * 注意：使用 ES5 语法编写，避免箭头函数、解构赋值、模板字符串、嵌套async
 */

MapScript.loadModule("AsyncAwaitTest", {
    name: "AsyncAwaitTest",
    author: "ProjectXero",
    version: [1, 0, 0],
    uuid: "test-async-await-001",

    // 测试 1: 基本 async/await
    testBasicAsync: async function() {
        var result = await Promise.resolve(42);
        return result === 42;
    },

    // 测试 2: 异步错误处理
    testAsyncError: async function() {
        try {
            await Promise.reject("test error");
            return false;
        } catch (e) {
            return e === "test error";
        }
    },

    // 测试 3: 链式调用
    testAsyncChain: async function() {
        var result = await Promise.resolve(1)
            .then(function(v) { return v + 1; })
            .then(function(v) { return v * 2; });
        return result === 4;
    },

    // 测试 4: Promise.all
    testPromiseAll: async function() {
        var arr = await Promise.all([
            Promise.resolve(1),
            Promise.resolve(2),
            Promise.resolve(3)
        ]);
        return arr[0] === 1 && arr[1] === 2 && arr[2] === 3;
    },

    // 运行所有测试
    runAllTests: async function() {
        var results = [];
        var passed;
        
        try {
            passed = await this.testBasicAsync();
            results.push({ name: "基本 async/await", passed: passed });
            Log.d("AsyncAwaitTest", "基本 async/await: " + (passed ? "通过" : "失败"));
        } catch (e) {
            results.push({ name: "基本 async/await", passed: false, error: e });
            Log.e("AsyncAwaitTest", "基本 async/await: 错误 - " + e);
        }
        
        try {
            passed = await this.testAsyncError();
            results.push({ name: "异步错误处理", passed: passed });
            Log.d("AsyncAwaitTest", "异步错误处理: " + (passed ? "通过" : "失败"));
        } catch (e) {
            results.push({ name: "异步错误处理", passed: false, error: e });
            Log.e("AsyncAwaitTest", "异步错误处理: 错误 - " + e);
        }
        
        try {
            passed = await this.testAsyncChain();
            results.push({ name: "链式调用", passed: passed });
            Log.d("AsyncAwaitTest", "链式调用: " + (passed ? "通过" : "失败"));
        } catch (e) {
            results.push({ name: "链式调用", passed: false, error: e });
            Log.e("AsyncAwaitTest", "链式调用: 错误 - " + e);
        }
        
        try {
            passed = await this.testPromiseAll();
            results.push({ name: "Promise.all", passed: passed });
            Log.d("AsyncAwaitTest", "Promise.all: " + (passed ? "通过" : "失败"));
        } catch (e) {
            results.push({ name: "Promise.all", passed: false, error: e });
            Log.e("AsyncAwaitTest", "Promise.all: 错误 - " + e);
        }

        var passedCount = 0;
        for (var i = 0; i < results.length; i++) {
            if (results[i].passed) passedCount++;
        }
        
        Log.i("AsyncAwaitTest", "测试完成: " + passedCount + "/" + results.length + " 通过");
        
        return {
            allPassed: passedCount === results.length,
            results: results
        };
    },

    onCreate: function() {
        Log.i("AsyncAwaitTest", "Async/Await 测试模块已加载");
    }
});
