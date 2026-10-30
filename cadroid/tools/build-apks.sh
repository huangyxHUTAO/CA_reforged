#!/bin/sh
# 从 AAB 生成 .apks（分体包）
#
# 用途：按设备 ABI 拆分，安装时只下需要的分体。
# 实测收益很小（见 docs/apk-build.md），主要是给 Google Play 分发用的。
#
# 前置：tools/bundletool.jar（不入库，按需下载）
#   curl -L -o tools/bundletool.jar \
#     https://github.com/google/bundletool/releases/download/1.18.3/bundletool-all-1.18.3.jar
#
# 用法：JAVA_HOME=/path/to/jdk ./tools/build-apks.sh
set -e
cd "$(dirname "$0")/.."

if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
    echo "需要设置 JAVA_HOME" >&2
    exit 1
fi
if [ ! -f tools/bundletool.jar ]; then
    echo "缺少 tools/bundletool.jar，下载命令见本脚本头部注释" >&2
    exit 1
fi

SIG=app/signatures
PASS=$(cat "$SIG/release.password" 2>/dev/null || echo android123)

echo "==> bundleRelease"
./gradlew :app:bundleRelease --console=plain -q

mkdir -p build/dist
echo "==> build-apks"
"$JAVA_HOME/bin/java" -jar tools/bundletool.jar build-apks \
    --bundle=app/build/outputs/bundle/release/app-release.aab \
    --output=build/dist/命令助手.apks \
    --ks="$SIG/release.keystore" --ks-key-alias=testkey \
    --ks-pass="pass:$PASS" --key-pass="pass:$PASS" \
    --overwrite

echo "==> 完成：build/dist/命令助手.apks"
"$JAVA_HOME/bin/java" -jar tools/bundletool.jar get-size total \
    --apks=build/dist/命令助手.apks --dimensions=ABI
