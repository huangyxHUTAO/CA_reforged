# data/idlibs/basicedu.json 说明

面向命令初学者的入门教程，只有 tutorials 条目，**默认启用**。

命令库名：基本命令教程
作者：ProjectXero
UUID：8a4cc227-66f4-455c-9be4-7f988f408696
版本：1.0.0
描述：该教程为命令初学者提供了入门级别的教程。

## 字段说明

  - `$schema` —— 命令库格式定义，线上地址 `https://ca.projectxero.top/clib/schema_v1.json`
  - `name` —— 命令库显示名
  - `author` —— 作者
  - `description` —— 一句话说明这个库包含什么、什么时候该启用
  - `uuid` —— 全局唯一标识，版本更新/去重都靠它，不要改
  - `version` —— 版本号数组 [major, minor, patch, build]（当前 3 项）
  - `require` —— 依赖的其他命令库 uuid 列表，加载前会先加载它们（当前 0 项）
  - `tutorials` —— 教程条目（只有教程类命令库才有）（当前 2 项）

## 修改方式

  1. 改这个文件确认字段含义
  2. 改 data/idlibs/basicedu.json 里对应的值
  3. uuid 不要改：改了会被当成另一个库
