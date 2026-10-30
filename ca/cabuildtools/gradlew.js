/**
 * npm run gradlew 的入口：按参数选择 Release / debug 形态。
 * （放在 cabuildtools/ 下，和 main.js 同级）
 *
 *   npm run gradlew              # 正式版 APK（shellBuildRelease）
 *   npm run gradlew -- -debug    # 调试版 APK（shellBuildDebug）
 *
 * cadroid 的 Gradle 任务由 cabuildtools 的 shellGradle 内部调用，
 * 这个脚本只是把「形态 → 任务名」这层映射补上。
 */
const path = require("path");
const { spawnSync } = require("child_process");

const argv = process.argv.slice(2).join(" ");
const isDebug = /(^|[\s-])debug\b/i.test(argv);
const task = isDebug ? "shellBuildDebug" : "shellBuildRelease";

console.log("[gradlew] " + (isDebug ? "调试版" : "正式版") + " → " + task);

const result = spawnSync(
	process.execPath,
	[path.join(__dirname, "main.js"), task],
	{ stdio: "inherit" }
);

process.exit(result.status === null ? 1 : result.status);
