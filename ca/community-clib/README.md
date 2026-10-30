# 命令助手拓展包源（CA/community-clib）

给 [命令助手](https://github.com/codesenlin/CA) 用的在线拓展包源，收录社区里散落的
ID 表、翻译、命令拓展和插件包，整理成源站结构，App 里填地址就能浏览和下载。

> 这个目录跟着 CA 仓库走（canary 分支）：推上去以后由 GitHub 直接对外提供。
> 它是社区拓展包的源，和 `pages/clib/`（官方源）无关。
> 生成物（info.json / index-*.json / packs/ / verify.key）和源文件（src/）放在一起，
> 改了包之后跑一次 `node build.js` 再提交即可。

## 在命令助手里添加

设置 → 智能补全 → 拓展包源 → 右上角 ▼ →「添加拓展包源」，填：

```
https://raw.githubusercontent.com/codesenlin/CA/canary/community-clib/
```

（填 `info.json` 的完整地址也可以）

添加后就能在「在线拓展包」里看到全部包。源的公钥是 `dist/verify.key`，包都用对应的
私钥签过名，App 下载时会验签；没有官方源公钥背书的包会显示成 `[社区]`。

> 安全级别为「中」及以上时只加载签名包；本源的包都是签名的，可以正常使用。

## 目录结构

```
src/
  json/            原始 JSON 包（23 个，收录 15 个）
  lib/             原始 .lib 包（15 个，LIBRARY 格式，收录 11 个）
dist/              构建产物，GitHub 上直接提供的就是这里
  info.json        源信息（入口，indexPages/indexLibs/map/pubkey 等）
  index-0.json …   分页清单，每页最多 20 个包
  map.json         uuid → 更新信息地址（App 检测更新用）
  packs/<uuid>.lib 签名后的包（SIGNLIB01）
  packs/<uuid>.json 更新信息（uuid/version/url/source/sha1，updateurl 指向这里）
  verify.key       验签公钥（DER）
build.js           构建脚本
source-config.json 源配置（sourceId、线上地址、私钥路径）
```

## 整理规则

原始包有 38 个，同一作者的不同版本、以及「副本」备份都不该全部列出来。
规则写在 `source-config.json` 的 `curation` 里，构建时生效（不改动 `src/` 原件）：

| 规则 | 内容 | 效果 |
| --- | --- | --- |
| `excludeNameRegex` | 名字命中 `的副本` 就丢掉 | 去掉 2 个备份包 |
| `lineages` | 同一系列只留版本最高的一个 | Hiland/1.18 系列 6 个 → 只留 `Hiland拓展包6.1.10`；`execute` 两个 → 只留 `新execute拓展包`；`json文本插入` 两个 → 只留 `JSON文本插入` |
| `renames` | uuid → 显示名 | `hasitem选择题器拓展(先凑合用)` → `hasitem 选择题器拓展` 等 |

最终收录 **26 个包**，跳过 12 个（3 个格式/用途不符 + 2 个副本 + 7 个旧版本）。
构建时会打印完整的跳过原因。

## 更新流程

```bash
# 1. 把新包放进 src/json/ 或 src/lib/（LIBRARY 格式 .lib 也行，构建时会解包重签）
# 2. 重新生成 dist/
node build.js

# 3. 校验签名和 sha1（build.js 默认会顺带校验一次）
node build.js --verify

# 4. 提交
git add -A && git commit -m "add: 新包 xxx" && git push
```

`build.js` 会把 `src/` 里所有包：

1. 读出来（JSON 直接解析；`.lib` 先解 LIBRARY 头再 gunzip，插件包保持 JS 原样）
2. 用 `SIGNLIB01` 格式重新签名（私钥不在这份仓库里）
3. 计算 SHA-1 写进清单
4. 重新生成分页清单、info.json 和 verify.key

改完要重新生成并提交，App 读的是仓库里这几个生成文件。

## 签名

- 私钥默认读 `~/StudioProjects/cadroid/app/signatures/privateKey.pem`
  （也可以用环境变量 `CA_SIGN_KEY` 指定别的路径），**不会**提交进仓库
- `verify.key` 是从私钥导出的公钥（DER），App 靠它验签
- 格式：`SIGNLIB01` + RSA-SHA256 签名（256 字节）+ 8 字节时间戳 + gzip 载荷，
  与 `cabuildtools/js2signlib.js` 完全一致

## 不收录的包

| 包 | 原因 |
| --- | --- |
| `[苦力怕论坛]命令拓展 by JG 1.3.0.lib` | 文件格式损坏，既不是 LIBRARY 也不是有效 JSON |
| `命令助手快照20190226130049.lib` | 2019 年的快照安装器，不是拓展包 |
| `内测组插件.lib` | 作者内部测试插件，不对外分发 |
| 名字带「的副本」的 2 个包 | 备份文件，内容与正本重复 |
| Hiland / 1.18 系列的 5 个旧版本 | 同系列只保留最新的 `Hiland拓展包6.1.10` |
| `execute`（1.0.0） | 被同作者的 `新execute拓展包`（1.0.2）取代 |
| `json文本插入`（1.0.2） | 被同作者的 `JSON文本插入`（1.1.3）取代 |

## 说明

- 包的内容归各作者所有，这里只做收集、签名和分发；原始文件保留在 `src/` 里
- 名称/作者/版本都沿用包内元数据，没有改动
- 部分包年代较久（0.16 / 1.x 时代的 ID 表），能不能用取决于游戏版本，
  下载前看一眼包里的 `minSupportVer`
