# data/theme.json 说明

主题列表。每个键是主题 ID（Common.themelist 的 key），值是配色表。

字段含义（从原 builtinData.js 的行内注释搬来）：
  - `nameKey` —— 主题名称的多语言 key，加载时用 Intl.get() 解析成 name
  - `bgcolor` —— 主界面背景色
  - `float_bgcolor` —— 浮动栏（滑动时与屏幕保持静止的栏）背景色
  - `message_bgcolor` —— 浮动界面背景色
  - `textcolor` —— 普通文本颜色
  - `promptcolor` —— 提示文本颜色
  - `highlightcolor` —— 高亮文本颜色
  - `criticalcolor` —— 警示文本颜色
  - `go_bgcolor` —— GO 按钮（主要动作按钮）背景色
  - `go_textcolor` —— GO 按钮文本颜色
  - `go_touchbgcolor` —— GO 按钮按下时背景色
  - `go_touchtextcolor` —— GO 按钮按下时文本颜色

## 注意

  - light 主题只给了 name，其余颜色由 Common.loadTheme 里的默认值兜底
  - 颜色必须是 #RRGGBB 形式，loadTheme 会解析成 ARGB int
  - 新增主题时，除了这里加一项，还要在 docs/data-notes 里补一句用途说明
