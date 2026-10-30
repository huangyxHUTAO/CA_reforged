#!/usr/bin/env node
/**
 * caaccel（加速库）的构建 / 测试 / 基准脚本。
 *
 *   node ./caaccel/cli.js build          # 构建 build/caaccel.jar
 *   node ./caaccel/cli.js test           # 跑 caaccel/test 下的单测
 *   node ./caaccel/cli.js bench          # matchString 的 Java vs Rhino 基准
 *
 * 原来对应 caaccel/build.sh、test.sh、bench.sh 三个 shell 脚本，项目是 Node，
 * 统一成这一个入口，也方便挂 npm 脚本。
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = __dirname;
const BUILD = path.join(ROOT, "build");

/** 删目录/文件（兼容没有 fs.rmSync 的旧 Node） */
function rm(target) {
	if (fs.rmSync) return fs.rmSync(target, { recursive : true, force : true });
	if (!fs.existsSync(target)) return;
	if (fs.statSync(target).isDirectory()) fs.rmdirSync(target, { recursive : true });
	else fs.unlinkSync(target);
}

function log(msg) {
	console.log("[caaccel] " + msg);
}

function fail(msg) {
	console.error("[caaccel] 失败：" + msg);
	process.exit(1);
}

/** 找 JDK：优先 JAVA_HOME/bin，其次 PATH */
function findJdk() {
	const home = process.env.JAVA_HOME;
	if (home) {
		const bin = path.join(home, "bin");
		const javac = path.join(bin, process.platform === "win32" ? "javac.exe" : "javac");
		if (fs.existsSync(javac)) {
			return {
				javac : javac,
				jar : path.join(bin, process.platform === "win32" ? "jar.exe" : "jar"),
				java : path.join(bin, process.platform === "win32" ? "java.exe" : "java")
			};
		}
	}
	return { javac : "javac", jar : "jar", java : "java" };
}

/** 执行命令，失败直接退出（和 shell 里 set -e 一致） */
function run(command, args, options) {
	log("$ " + path.basename(command) + " " + args.join(" "));
	const result = spawnSync(command, args, Object.assign({ stdio : "inherit", cwd : ROOT }, options));
	if (result.error) fail(result.error.message);
	if (result.status !== 0) fail(path.basename(command) + " 退出码 " + result.status);
}

/** 收集所有 .java 源文件 */
function listJava(dir) {
	if (!fs.existsSync(dir)) return [];
	// fs.globSync 是 Node 22 起的内置实现，省掉手写递归
	return fs.globSync("**/*.java", { cwd : dir })
		.map(function(rel) {
			return path.join(dir, rel);
		})
		.sort();
}

/** 构建 caaccel.jar：纯 javac + jar，不依赖 Gradle/Android */
function build(quiet) {
	const jdk = findJdk();
	const classes = path.join(BUILD, "classes");
	const outJar = path.join(BUILD, "caaccel.jar");

	rm(classes);
	rm(outJar);
	fs.mkdirSync(classes, { recursive : true });

	const sources = listJava(path.join(ROOT, "src"));
	if (!sources.length) fail("src/ 下没有找到 .java 文件");
	const listFile = path.join(BUILD, "sources.txt");
	fs.writeFileSync(listFile, sources.join("\n") + "\n");

	if (!quiet) log("编译 " + sources.length + " 个源文件");
	run(jdk.javac, ["-source", "8", "-target", "8", "-encoding", "UTF-8", "-d", classes, "@" + listFile],
		quiet ? { stdio : "ignore" } : undefined);
	run(jdk.jar, ["cf", outJar, "-C", classes, "."], quiet ? { stdio : "ignore" } : undefined);
	if (!quiet) log("built: " + outJar + " (" + fs.statSync(outJar).size + " 字节)");
	return { jdk, outJar };
}

/** 在 Gradle 缓存里找 rhino-runtime jar（找不到就用 test/ 下自带的） */
function findRhino() {
	const target = "rhino-runtime-1.7.15.1.jar";
	const gradleCaches = path.join(process.env.HOME || process.env.USERPROFILE || "", ".gradle", "caches");
	const found = [];
	(function walk(dir, depth) {
		if (found.length || depth > 8 || !fs.existsSync(dir)) return;
		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes : true });
		} catch (e) {
			return;
		}
		entries.forEach(function(entry) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(full, depth + 1);
			else if (entry.name === target) found.push(full);
		});
	})(gradleCaches, 0);
	if (found.length) return found[0];

	const candidates = [path.join(ROOT, "test", "rhino-runtime.jar"), path.join(ROOT, "test", target)];
	for (let i = 0; i < candidates.length; i++) {
		if (fs.existsSync(candidates[i])) return candidates[i];
	}
	fail("找不到 rhino-runtime jar：先跑一次 cadroid 的构建（会下载到 Gradle 缓存），或放一份到 caaccel/test/rhino-runtime.jar");
}

/** 跑单测 */
function test() {
	const { jdk, outJar } = build(true);
	const classes = path.join(BUILD, "test-classes");
	rm(classes);
	fs.mkdirSync(classes, { recursive : true });

	const sources = listJava(path.join(ROOT, "test"));
	if (!sources.length) fail("test/ 下没有找到 .java 文件");
	const listFile = path.join(BUILD, "test-sources.txt");
	fs.writeFileSync(listFile, sources.join("\n") + "\n");
	run(jdk.javac, ["-encoding", "UTF-8", "-cp", outJar, "-d", classes, "@" + listFile]);
	run(jdk.java, ["-cp", outJar + path.delimiter + classes, "AccelTest"]);
}

/** 跑基准 */
function bench() {
	const rhino = findRhino();
	const { jdk, outJar } = build(true);
	const classes = path.join(BUILD, "bench-classes");
	rm(classes);
	fs.mkdirSync(classes, { recursive : true });

	const cp = [outJar, rhino].join(path.delimiter);
	run(jdk.javac, ["-encoding", "UTF-8", "-cp", cp, "-d", classes, path.join(ROOT, "bench", "BenchMatchString.java")]);
	run(jdk.java, ["-cp", cp + path.delimiter + classes, "BenchMatchString"]);
}

const command = process.argv[2] || "build";
try {
	if (command === "build") {
		build(false);
	} else if (command === "test") {
		test();
	} else if (command === "bench") {
		bench();
	} else if (command === "-h" || command === "--help" || command === "help") {
		console.log([
			"用法：node ./caaccel/cli.js <命令>",
			"",
			"  build   构建 build/caaccel.jar（纯 javac + jar）",
			"  test    跑 caaccel/test 下的单测",
			"  bench   matchString 的 Java vs Rhino 基准（需要 rhino-runtime jar）",
			"",
			"JDK 优先用 $JAVA_HOME/bin，没有就用 PATH 里的 javac/jar/java。"
		].join("\n"));
	} else {
		fail("未知命令：" + command);
	}
} catch (e) {
	fail(e && e.message ? e.message : String(e));
}
