# 分支约定

> 四条分支都是我们的修改线：`canary → dev → beta → main`，从最活跃到最稳定。
> `main` 同时是默认分支，原作者官方版的内容也以它为准。
> 推错分支会让线上的版本倒退，所以约定写在这里。

## 一、四条线的定位

| 分支 | 定位 | 说明 | 能不能推 |
|---|---|---|---|
| `canary` | 前沿版 | 最新改动先落这里，可能不稳定 | 可以推 |
| `dev` | 开发主线 | 日常提交都在这条线上 | 可以推 |
| `beta` | 测试版 | 面向测试渠道 | 可以推 |
| `main` | 稳定线 / 默认分支 | 对外稳定版本；官方版内容也以它为准 | 发布时更新 |

改动从 `canary` 开始，验证没问题后往 `dev`、`beta`、`main` 逐级推。
小改动可以只在 `dev` 上做，需要发版时再往两边推。

> 四个分支指向同一个提交是**正常状态**，不是失误：
> 说明这条改动已经同步到所有渠道。

## 二、日常流程

```bash
# 1. 在 dev（或 canary）上提交
git add -A && git commit -m "..."

# 2. 按需同步到其它线（都是快进，不会冲突）
git push origin dev:dev
git push origin dev:canary dev:beta      # 测试渠道跟上
git push origin dev:main                 # 稳定线：发版时才推
```

## 三、同步原作者官方版的更新

官方版的内容以 `main` 为准。上游有更新时，把它合进我们的线，不要反过来：

```bash
git fetch origin

git log --oneline dev..origin/main     # 官方有哪些新提交
git log --oneline origin/main..dev     # 我们比官方多了什么

git merge origin/main                  # 在 dev 上合并官方改动
git push origin dev:dev dev:canary dev:beta
```

合并可能出现冲突——我们改过的地方（`modules/CA.js`、`modules/CA.Library.js`）
官方也在维护。冲突时**保留双方意图**，不要图省事直接 `--ours`。

> 本地 `origin/main` 这个引用可能不是最新的（历史上 fork 的 main 被推过旧内容），
> 操作前先 `git fetch origin` 确认。

## 四、如果某条线分叉了

历史上有过这种情况：`beta` 上有些提交 `dev` 里没有（比如一份只发在 beta 的文档），
这时推 `dev` 会是非快进。

**优先合并，不要强推**：

```bash
git tag backup-beta-$(date +%Y%m%d) origin/beta   # 先留个标记
git merge origin/beta                              # 合进 dev
git push origin dev:dev dev:canary dev:beta
```

强推（`--force-with-lease`）会从远程抹掉那些提交，只在**确认内容已经没用**时才用，
而且要先打 tag。

## 五、当前状态（2026-10-28）

```
main      云端为原作者官方版（本地 origin/main 引用可能是旧的，先 fetch）
canary    最近一次推送 a6e9afd
dev       本地领先 origin/dev 一批未推送的提交
beta      最近一次推送 a60d3e5
```

本地只保留了 `dev` 一个分支（整理时删掉了已经并入 `dev` 的备份分支和标签），
其它三条推的时候用 `dev:<分支名>` 的形式即可。

## 六、相关仓库

`cadroid`（Android 外壳）是独立仓库，分支只有 `main`：

```bash
git push origin master:main
```

它的 `master` 跟踪的是 `origin/main`（远程没有 `master` 分支）。
