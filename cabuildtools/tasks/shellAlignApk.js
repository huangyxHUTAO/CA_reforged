const path = require("path");
module.exports = function(context, args) {
    console.log("shellConfig:", context.shellConfig); // 调试输出
    console.log("shellPath:", context.shellConfig && context.shellConfig.shellPath);
    console.log("zipalignPath:", context.shellConfig && context.shellConfig.zipalignPath);

    // 用 zipalignPath 字段
    var zipalignPath = context.shellConfig.zipalignPath;
    var unalignedPath = path.resolve(context.shellConfig.shellPath, "./app/build/outputs/apk/release/app-release-unsigned.apk");
    var outPath = path.resolve(context.shellConfig.shellPath, "./app/build/outputs/apk/release/app-release.apk");
    return context.execute("execProcess", {
        command : zipalignPath,
        args : [
            "-f", "4",
            unalignedPath,
            outPath
        ],
        cwd : context.shellConfig.shellPath,
        stdio : "inherit",
        shell : true
    });
}