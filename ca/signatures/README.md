# signatures —— 签名与打包材料

这里的密钥**全部是 AOSP 公开测试密钥**（Android 源码树 `build/target/product/security/`
里的 `testkey`），谁都能拿到，不是机密，所以留在仓库里没有泄露风险。

用途分三类：给壳子/安装包签名、给热更新脚本做异或加密、以及历史上打包脚本的输入输出。
**现在正式打包已经由 `cabuildtools` 的 shell 任务接管**，这里的脚本只作为参考保留。

## 目录

```
keys/     同一把 testkey 的各种封装
  testkey_private.pem   私钥（PEM 格式）
  testkey.pk8           私钥（PKCS#8 DER，Android 打包常用）
  testkey.p12           私钥 + 证书（PKCS#12）
  testkey.x509.pem      证书（PEM；异或加密用的就是它的 DER）
  release.keystore      Java keystore（别名 testkey）
  release.password      keystore 密码
certs/
  release.signature     证书 DER（正式版异或密钥）
  debug.signature       内容与 release.signature 完全相同（AOSP testkey 只有一张证书）
tools/
  pack-for-cadroid.js   壳子脚本加密：main.js → gzip → 用证书 DER 异或 → script.js
                        （可传参指定输出，默认写到 cadroid 的 assets）
build/
  main.js               历史打包输入（1.3 MB，某个时间点的构建产物）
  script.js             对应的加密产物
```

## 说明

- `keys/` 和 `certs/` 里的文件都能互相验证出同一把钥匙，
  公钥 DER 的 SHA-256 是 `ef57b690165cb561…`，证书指纹是
  `A4:0D:A8:0A:59:D1:70:CA…`（AOSP testkey）。
- `build/` 里的两个文件是**历史快照**，彼此是同一批的输入/输出，但**不是当前代码的产物**，
  需要最新的就用 `tools/pack-for-cadroid.js` 重新生成。
- 壳子（cadroid）实际用的是它自己 `app/signatures/` 下的副本，那个目录在 `.gitignore` 里。
- 因为用的是公开测试密钥，签名只能证明"内容没被损坏"，**不能证明是谁签的** ——
  要防伪造得自己生成一对新密钥。
