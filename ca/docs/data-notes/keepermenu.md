# data/keepermenu.json 说明

通知栏快捷菜单的默认动作列表（用户没自定义过时用它初始化）。

结构：{ "default": [ { "action": "..." }, ... ] }
- action 的值是脚本里的动作标识：
    - `ca.switchIconVisibility` —— 切换悬浮图标显示
    - `ca.exit` —— 退出命令助手

注意：外层包成 { "default": ... } 是为了以后能加更多菜单组，
代码里用 .default 取默认那组。
