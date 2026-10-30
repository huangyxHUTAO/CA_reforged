const fs = require("fs");
const os = require("os");
const path = require("path");

/**
 * shell / import 配置的解析器。
 *
 * config/shell.json、config/import.json 里只写「和机器无关的默认值 + 平台差异」，
 * 具体路径由这里补齐：
 *   - cadroid 项目：CA 仓库旁边叫 cadroid / ca 的目录（含 app/build.gradle），可用 CA_CADROID 覆盖
 *   - Android SDK：ANDROID_HOME / ANDROID_SDK_ROOT → cadroid/local.properties 的 sdk.dir → 常见安装位置
 *   - Build Tools：优先 config/shell.json 里的 buildToolVersion，否则取已安装的最高版本
 *   - JDK：JAVA_HOME → Android Studio 自带的 JBR → ~/.jdks（优先 17）
 *   - android.jar：SDK 里最新的 platforms/android-NN/android.jar
 *
 * 解析结果会被 getShellConfig / generateImport 写到 build/generated 下的 json，
 * 方便排查「这次到底用了哪个 SDK / JDK / cadroid」。
 */

function expandHome(p) {
	if (!p) return p;
	if (p === "~") return os.homedir();
	if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
	return p;
}

function hasFile(f) {
	try {
		return !!f && fs.existsSync(f);
	} catch (e) {
		return false;
	}
}

function firstExisting(list, check) {
	for (var i = 0; i < list.length; i++) {
		var p = expandHome(list[i]);
		if (hasFile(p) && (!check || check(p))) return p;
	}
	return null;
}

function hasJava(home) {
	return hasFile(path.join(home, "bin", process.platform === "win32" ? "java.exe" : "java"));
}

function looksLikeSdk(dir) {
	return hasFile(path.join(dir, "build-tools")) && hasFile(path.join(dir, "platforms"));
}

function looksLikeCadroid(dir) {
	return hasFile(path.join(dir, "app", "build.gradle")) && hasFile(path.join(dir, "app", "src", "main"));
}

/** 从 cadroid 的 local.properties 里读 sdk.dir（Android Studio 生成的那份） */
function sdkFromLocalProperties(projectDir) {
	var file = path.join(projectDir, "local.properties");
	if (!hasFile(file)) return null;
	var m = fs.readFileSync(file, "utf-8").match(/^\s*sdk\.dir\s*=\s*(.+?)\s*$/m);
	if (!m) return null;
	// properties 文件里 Windows 路径是 \\ 转义的
	return expandHome(m[1].replace(/\\\\/g, "\\"));
}

/** 各平台常见的 SDK 安装位置 */
function commonSdkPaths() {
	if (process.platform === "win32") {
		return [
			path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk"),
			path.join(os.homedir(), "AppData", "Local", "Android", "Sdk"),
			"C:\\Android\\Sdk"
		];
	}
	if (process.platform === "darwin") {
		return [
			path.join(os.homedir(), "Library", "Android", "sdk"),
			path.join(os.homedir(), "Android", "Sdk")
		];
	}
	return [
		path.join(os.homedir(), "Android", "Sdk"),
		"/usr/local/lib/android/sdk",
		"/opt/android-sdk"
	];
}

/** 各平台 Android Studio 自带的 JBR 位置 */
function studioJbrPaths() {
	if (process.platform === "win32") {
		return [
			"C:\\Program Files\\Android\\Android Studio\\jbr",
			"C:\\Program Files\\Android\\Android Studio\\jre"
		];
	}
	if (process.platform === "darwin") {
		return ["/Applications/Android Studio.app/Contents/jbr/Contents/Home"];
	}
	return [
		"/opt/android-studio/jbr",
		"/snap/android-studio/current/jbr",
		path.join(os.homedir(), "android-studio", "jbr")
	];
}

function findCadroid(root, configured) {
	return firstExisting([
		configured,
		process.env.CA_CADROID,
		path.resolve(root, "..", "cadroid"),
		path.resolve(root, "..", "ca"),
		path.resolve(root, "..", "CADroid")
	], looksLikeCadroid);
}

function findSdk(cadroid, configured) {
	var candidates = [configured, process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT];
	if (cadroid) candidates.push(sdkFromLocalProperties(cadroid));
	return firstExisting(candidates.concat(commonSdkPaths()), looksLikeSdk);
}

function compareVersion(a, b) {
	var pa = a.split("."), pb = b.split("."), i, n = Math.max(pa.length, pb.length);
	for (i = 0; i < n; i++) {
		var d = (parseInt(pa[i], 10) || 0) - (parseInt(pb[i], 10) || 0);
		if (d) return d;
	}
	return 0;
}

function findBuildTools(sdk, prefer) {
	if (!sdk) return null;
	var dir = path.join(sdk, "build-tools");
	if (!hasFile(dir)) return null;
	var signer = process.platform === "win32" ? "apksigner.bat" : "apksigner";
	var versions = fs.readdirSync(dir).filter(function(v) {
		return hasFile(path.join(dir, v, signer)) || hasFile(path.join(dir, v, "apksigner"));
	}).sort(compareVersion);
	if (!versions.length) return null;
	if (prefer && versions.indexOf(prefer) >= 0) return path.join(dir, prefer);
	return path.join(dir, versions[versions.length - 1]);
}

function findJavaHome(configured) {
	var candidates = [configured, process.env.JAVA_HOME];

	// ~/.jdks（JetBrains 下载的 JDK）：优先版本号里带 17 的
	var jdks = path.join(os.homedir(), ".jdks");
	if (hasFile(jdks)) {
		var dirs = fs.readdirSync(jdks).sort();
		candidates = candidates.concat(
			dirs.filter(function(d) { return /17/.test(d); }).map(function(d) { return path.join(jdks, d); }),
			dirs.filter(function(d) { return !/17/.test(d); }).map(function(d) { return path.join(jdks, d); })
		);
	}

	// Android Studio 自带 JBR
	candidates = candidates.concat(studioJbrPaths());

	// 常见 JDK 安装位置
	if (process.platform !== "win32") {
		var jvm = "/usr/lib/jvm";
		if (hasFile(jvm)) {
			candidates = candidates.concat(fs.readdirSync(jvm).sort().map(function(d) { return path.join(jvm, d); }));
		}
	}

	return firstExisting(candidates, hasJava);
}

function findAndroidJar(sdk, configured) {
	if (configured) {
		var p = expandHome(configured);
		return hasFile(p) ? p : null;
	}
	if (!sdk) return null;
	var dir = path.join(sdk, "platforms");
	if (!hasFile(dir)) return null;
	var platforms = fs.readdirSync(dir).filter(function(d) {
		return hasFile(path.join(dir, d, "android.jar"));
	}).sort(function(a, b) {
		return compareVersion(a.replace(/^android-/, ""), b.replace(/^android-/, ""));
	});
	if (!platforms.length) return null;
	return path.join(dir, platforms[platforms.length - 1], "android.jar");
}

function loadConfigFile(root, name) {
	return require(path.join(root, "config", name));
}

/** 解析 config/shell.json，返回可直接使用的 shellConfig */
function shell(root) {
	var raw = loadConfigFile(root, "shell.json");

	var cadroid = findCadroid(root, raw.shellPath);
	if (!cadroid) {
		throw new Error("找不到 cadroid 项目：把它放在 CA 同级目录（cadroid/ 或 ca/），或设环境变量 CA_CADROID");
	}

	var sdk = findSdk(cadroid, raw.androidSdk);
	if (!sdk) {
		throw new Error("找不到 Android SDK：设 ANDROID_HOME，或在 cadroid/local.properties 里写 sdk.dir");
	}

	var buildToolPath = findBuildTools(sdk, raw.buildToolVersion);
	var javaHome = findJavaHome(raw.javaHome);

	if (!buildToolPath) {
		console.log("提示：没找到可用的 Build Tools（zipalign / apksigner 需要），发布流程会失败：" + sdk);
	}
	if (!javaHome) {
		console.log("提示：没找到 JDK，gradlew / apksigner 需要环境里能直接用到 java（或设 JAVA_HOME）");
	}

	var config = Object.assign({}, raw);
	config.shellPath = cadroid;
	config.androidSdk = sdk;
	config.buildToolPath = buildToolPath;
	config.javaHome = javaHome;
	config.lineagePath = raw.lineagePath || null;
	config.lineageSigners = raw.lineageSigners || [];
	return config;
}

/** 解析 config/import.json，返回 generateImport 用的配置 */
function importConfig(root) {
	var raw = loadConfigFile(root, "import.json");
	var cadroid = findCadroid(root, raw.shellPath);
	var sdk = findSdk(cadroid, raw.androidSdk);
	var jar = findAndroidJar(sdk, raw.androidJarPath);
	if (!jar) {
		throw new Error("找不到 android.jar：设 ANDROID_HOME，或在 config/import.json 里写 androidJarPath");
	}
	return { androidJarPath: jar, androidSdk: sdk };
}

/** 把解析结果写成 json（构建产物，不入库） */
function writeGenerated(file, data) {
	var out = path.resolve(file);
	fs.mkdirSync(path.dirname(out), { recursive: true });
	fs.writeFileSync(out, JSON.stringify(data, null, "\t") + "\n");
	return out;
}

module.exports = {
	shell : shell,
	importConfig : importConfig,
	writeGenerated : writeGenerated
};
