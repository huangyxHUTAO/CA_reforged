(
	{
		UNINITIALIZED: 0,
		ONLY_COMMAND_NAME: 1,
		UNKNOWN_COMMAND: -1,
		COMMAND_WITH_PATTERN: 2,
		UNKNOWN_PATTERN: -2,

		input: [],
		output: [],
		cmdname: "",
		prompt: [],
		help: "",
		patterns: [],
		mode: 0,
		last: {},
		callDelay: function self(s) {
			if (CA.settings.iiMode != 2 && CA.settings.iiMode != 3) return;
			if (!self.pool) {
				self.pool = java.util.concurrent.Executors.newCachedThreadPool();
				self.pool.setMaximumPoolSize(1);
				self.pool.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.DiscardPolicy());
			}
			self.pool.execute(function () {
				CA.IntelliSense.proc(s);
			});
		},
		apply: function () {
			if (this.ui) this.show.apply(this);
		},
		proc: function (s) {
			try {
				if (CA.settings.iiMode != 2 && CA.settings.iiMode != 3) return;
				if (CA.Library.loadingStatus) {
					// 我这里吐槽一下ProjectXero了，你的变量名怎么起得这么奇怪
					var pp
					var c = /^(\/)?(\S*)(\s+)?(.*)/.exec(s);

					pp = new G.SpannableStringBuilder((c[1] ? "/" : "") + c[2] + " ");
					appendSSB(pp, "...", new G.ForegroundColorSpan(Common.theme.highlightcolor));
					pp.append("\n");
					appendSSB(pp, "喵呜...命令库正在努力加载中... 等等吧喵~", new G.ForegroundColorSpan(Common.theme.criticalcolor));

					// r.prompt.push(pp);
					this.input = [];
					this.output = {};
					this.cmdname = "";
					this.hasSlash = false;
					this.strParam = "";
					this.prompt = [pp];
					this.help = "命令库正在加载中……";
					this.patterns = [];
					//应用更改
					this.apply();
					return;
				}
				var r = this.procCmd(s);
				this.source = r.source;
				this.cmdname = r.cmdname;
				this.hasSlash = r.hasSlash;
				this.strParam = r.strParam;
				this.input = r.input;
				this.output = r.output;
				this.help = r.help;
				this.prompt = r.prompt;
				this.patterns = r.patterns;
				//应用更改
				this.apply();
			} catch (e) {
				erp(e, true);
				Common.showTextDialog("当前命令库解析出错。\n" + e + (e instanceof Error ? "\n堆栈：\n" + e.stack : ""));
			}
		},
		procCmd: function (s) {
			var c, ca, t, i, pp, r;

			//分析命令结构 - 拆分
			c = /^(\/)?(\S*)(\s+)?(.*)/.exec(s);
			if (!c) return; //c = [匹配文本, 是否存在/, 命令名称, 是否存在命令名称后的空格, 命令参数]

			r = {
				source: c[0],
				cmdname: c[2],
				hasSlash: Boolean(c[1]),
				strParam: c[4],
				input: [],
				output: {},
				prompt: [],
				patterns: [],
				help: null,
				canFinish: false
			};

			if (c[3]) {
				//分类 - 输入参数中
				if (c[2] in this.library.commands) {
					//分类 - 存在命令
					this.procParams(r);
				} else {
					//分类 - 不存在命令
					//提示命令未找到
					pp = new G.SpannableStringBuilder((c[1] ? "/" : "") + c[2] + " ");
					appendSSB(pp, "...", new G.ForegroundColorSpan(Common.theme.highlightcolor));
					pp.append("\n");
					appendSSB(pp, "无法在库中找到命令“" + c[2] + "”。", new G.ForegroundColorSpan(Common.theme.criticalcolor));
					r.prompt.push(pp);
					r.help = "找不到这样的命令";
					r.mode = this.UNKNOWN_COMMAND;
				}
			} else {
				//分类 - 未输入参数

				//获得可选命令
				t = this.library.command_snap;
				ca = Object.keys(t).filter(function (e, i, a) {
					return e.indexOf(c[2]) >= 0 || t[e].indexOf(c[2]) >= 0;
				}).sort();

				if (ca.length) {
					//分类 - 可选命令长度大于0

					ca.forEach(function (e, i, a) {
						pp = new G.SpannableStringBuilder(c[1] ? "/" : "");
						appendSSB(pp, e, new G.ForegroundColorSpan(Common.theme.highlightcolor));
						t = this.library.commands[e];
						while (t.alias) t = this.library.commands[t.alias];

						//存在无参数用法
						if (!t.noparams) pp.append(" ...");
						if (t.noparams && c[2] == e && t.noparams.description) { //当命令全输入且存在无参数用法时
							r.canFinish = true;
							pp.append("\n");
							appendSSB(pp, t.noparams.description, new G.ForegroundColorSpan(Common.theme.promptcolor));
						} else if ("description" in t) { //存在提示则显示提示
							pp.append("\n");
							appendSSB(pp, t.description, new G.ForegroundColorSpan(Common.theme.promptcolor));
						}
						r.prompt.push(pp);
						r.output[t.description ? e + " - " + t.description : e] = (r.hasSlash ? "/" : "") + e + (t.noparams ? "" : " ");
					}, this);

					t = this.library.commands[ca[0]];
					while (t.alias) t = this.library.commands[t.alias];
					r.help = t.help ? t.help : "该命令帮助还未上线";
					r.mode = this.ONLY_COMMAND_NAME;
				} else {
					//分类 - 可选命令长度等于0（无可选命令）
					//提示命令不存在
					pp = new G.SpannableStringBuilder(c[1] ? "/" : "");
					appendSSB(pp, c[2], new G.ForegroundColorSpan(Common.theme.highlightcolor));
					pp.append(" ...\n");
					appendSSB(pp, "无法在库中找到命令“" + c[2] + "”。", new G.ForegroundColorSpan(Common.theme.criticalcolor));
					r.prompt.push(pp);
					r.help = "命令不存在";
					r.mode = this.UNKNOWN_COMMAND;
				}

				//设置列表内容及反应
				r.input = Object.keys(r.output);
			}
			return r;
		},
		/**
		 * 逐模式、逐参数地解析命令尾部字符串，生成补全提示、错误信息及高亮文本。
		 *
		 * @param {Object} c - 当前命令上下文对象（会被本函数就地修改）
		 * @param {string} c.cmdname                - 主命令名
		 * @param {string} c.strParam               - 命令尾部待解析参数字符串
		 * @param {string} c.source                 - 用户已完整输入的整行命令（含 /）
		 * @param {boolean} c.hasSlash              - 原始输入是否以 / 开头
		 * @param {Array<string>}  c.input          - 候选提示文本（会被填充）
		 * @param {Object<string,string>} c.output  - 候选值到实际插入文本的映射（会被填充）
		 * @param {Array<SpannableStringBuilder>} c.prompt - 最终提示列表（会被填充）
		 * @param {number} c.mode                   - 解析结果状态标识（会被设置）
		 *
		 * @returns {void} 所有结果直接写回 `c`；无返回值。
		 *
		 * @description
		 * 1. 遍历 `library.commands[c.cmdname].patterns` 中的每一种用法。
		 * 2. 对每种用法，按顺序调用 `matchParam` 逐一匹配参数。
		 * 3. 根据匹配结果填充：
		 *    - `c.input` / `c.output` 用于下拉框补全；
		 *    - `c.prompt` 用于悬浮/底部提示区域；
		 *    - `c.canFinish` 表示整行命令是否已完整；
		 *    - `c.mode` 标识解析成功或失败。
		 * 4. 若所有模式均失败，则生成错误提示并压入 `c.prompt`。
		 */
		procParams: function (c) {
			var i, j, cm = this.library.commands[c.cmdname], ps, pa, ci, cp, t, f = true, k, u, ms, pp, cpl = [], nn = false, erm = [];


			//别名处理
			while (cm.alias) cm = this.library.commands[cm.alias];

			c.help = cm.help ? cm.help : "该命令帮助还未上线";
			ps = cm.patterns;
			c.canFinish = false;

			//对每一种模式进行判断
			for (i in ps) {
				var parsedParams = [];
				pa = ps[i].params;
				ci = 0;

				//重置提示
				pp = new G.SpannableStringBuilder((c.hasSlash ? "/" : "") + c.cmdname);
				cpl.length = 0;

				//逐部分匹配参数
				for (j = 0; j < pa.length; j++) {
					cp = pa[j];

					// 记录当前参数的开始位置
					var paramStart = ci;

					//匹配参数
					t = this.matchParam(cp, c.strParam.slice(ci), parsedParams);
					if (t && t.length >= 0 && ((/^\s?$/).test(c.strParam.slice(ci += t.length, ++ci)))) {
						//分类 - 匹配成功
						ci += (/^\s*/).exec(c.strParam.slice(ci))[0].length;

						var parsedParam = c.strParam.slice(paramStart, paramStart + t.length).trim();
						if (parsedParam) {
							parsedParams.push(parsedParam);
						}

						if (ci > c.strParam.length) {
							//分类 - 到达末尾
							//处理提示与输入
							u = (c.hasSlash ? "/" : "") + c.cmdname + " " + c.strParam.slice(0, ci - t.length - 1);
							if (pa[j + 1] && !pa[j + 1].optional) {
								for (k in t.output) t.output[k] = t.output[k] + " ";
							}
							if (t.length && t.canFinish && pa[j + 1]) nn = true;
							if (t.input) for (k in t.input) if (c.input.indexOf(t.input[k]) < 0) c.input.push(t.input[k]);
							if (t.output) for (k in t.output) if (!(k in c.output)) c.output[k] = u + t.output[k];
							if (t.recommend) for (k in t.recommend) if (!(k in c.output)) c.output[k] = u + t.recommend[k];
							if (t.assist) for (k in t.assist) if (!(k in c.output)) c.output[k] = c.source + t.assist[k];
							if (t.menu) for (k in t.menu) if (!(k in c.output)) c.output[k] = t.menu[k];
							if (t.canFinish && (!pa[j + 1] || pa[j + 1].optional)) c.canFinish = true;
							f = false;
							pp.append(" ");
							pp.append(this.getParamTag(cp, c.strParam.slice(ci - t.length - 1, ci), 1, t));
							for (j++; j < pa.length; j++) {
								pp.append(" ");
								pp.append(this.getParamTag(pa[j], "", 2, null));
							}
							if (t.description || cp.description || ps[i].description || cm.description) appendSSB(pp, "\n" + (t.description ? String(t.description) : cp.description ? String(cp.description) : ps[i].description ? String(ps[i].description) : String(cm.description)), new G.ForegroundColorSpan(Common.theme.promptcolor));
							//详情优先级：匹配函数动态产生 > 当前参数 > 当前用法 > 当前命令 > 不显示

							c.prompt.push(pp);
							c.patterns.push(cpl);
							break;
						} else {
							//分类 - 未到达末尾
							if (!t.canFinish) if (cp.canIgnore) {
								continue;
							} else {
								pp.append(" ");
								pp.append(this.getParamTag(cp, "", 3, t));
								for (k = j + 1; k < pa.length; k++) {
									pp.append(" ");
									pp.append(this.getParamTag(pa[k], "", 2, null));
								}
								erm.push({
									desp: "未结束的参数",
									count: j,
									pp: pp
								});
								break;
							}
							pp.append(" ");
							pp.append(this.getParamTag(cp, c.strParam.slice(ci - t.length - 1, ci - 1), 0));
							cpl.push(t);
						}
					} else {
						//分类 - 匹配失败
						if (cp.canIgnore) {
							continue;
							//忽略参数
						} else {
							pp.append(" ");
							pp.append(this.getParamTag(cp, "", 3, t));
							for (k = j + 1; k < pa.length; k++) {
								pp.append(" ");
								pp.append(this.getParamTag(pa[k], "", 2, null));
							}
							erm.push({
								desp: !t ? null : t.length >= 0 ? "字符多余：" + c.strParam.slice(ci - 1) : t.description,
								count: j,
								pp: pp
							});
							break;
							//下一个模式
						}
					}
					if (cp.repeat) {
						j--; continue;
						//重复
					}
				}
			}
			//如果未找到正确用法
			if (f) {
				c.input = [];
				erm.sort(function (a, b) {
					return b.count - a.count;
				});
				erm.forEach(function (e) {
					e.pp.append("\n");
					appendSSB(e.pp, e.desp ? e.desp : "用法不存在", new G.ForegroundColorSpan(Common.theme.criticalcolor));
					c.prompt.push(e.pp);
				});
				if (!erm.length) {
					pp = new G.SpannableStringBuilder((c.hasSlash ? "/" : "") + c.cmdname + " ");
					appendSSB(pp, "...", new G.ForegroundColorSpan(Common.theme.highlightcolor));
					pp.append("\n");
					appendSSB(pp, "无法在库中找到命令“" + c.cmdname + "”的此类用法。", new G.ForegroundColorSpan(Common.theme.criticalcolor));
					c.prompt.push(pp);
				}
			} else if (nn) {
				c.input.push("  - 下一个参数");
				c.output["  - 下一个参数"] = c.source + " ";
			}
			c.mode = f ? this.UNKNOWN_PATTERN : this.COMMAND_WITH_PATTERN;
		},

		/**
		 * 根据参数类型解析当前已输入的字符串片段，并返回智能提示结果。
		 *
		 * @param {Object} cp  参数配置对象
		 * @param {string} cp.type  参数类型（text / rawjson / nbt / json / plain / selector / uint / int / float / relative / position / custom / enum / command / subcommand / string …）
		 * @param {string} [cp.name]      参数名（plain 类型用）
		 * @param {string} [cp.prompt]    参数提示（plain 类型用）
		 * @param {Object|Array|string} [cp.list]      枚举值列表（enum 类型用）
		 * @param {string} [cp.input]     自定义正则（custom 类型用）
		 * @param {string} [cp.finish]    自定义完成正则（custom 类型用）
		 * @param {string} [cp.mainCommand] 主命令前缀（subcommand 类型用）
		 * @param {string|Object} [cp.suggestion] 额外候选值命名空间
		 * @param {string} ps  用户当前已输入的完整参数字符串
		 * @param {string} parsedParams 除了当前输入以外的命令完整参数（如["setblock","~ ~ ~","command_blcok"]）
		 * @returns {{
		 *   length: number,       // 已匹配 token 的字符长度（-1 表示非法，或未完成，此时canFinish必须为false）
		 *   canFinish: boolean,   // 当前 token 是否完整，可继续下一个参数
		 *   input?: Array<string>,// 候选提示列表
		 *   output?: Object,      // 候选值到实际值的映射
		 *   menu?: Object,        // 候选值到回调函数的映射
		 *   description?: string, // 当前 token 的错误或说明文字
		 *   tag?: string          // 简短提示标签
		 * }}
		 */
		matchParam: function (cp, ps, parsedParams) {
			var i, r, t, t2, t3, t4;
			// Common.toast(cp.type)
			switch (cp.type) {
				case "text":
				case "rawjson":
					r = {
						length: ps.length,
						canFinish: true
					};
					break;

				case "nbt":
				case "json":
					r = {
						input: ["插入JSON"],
						menu: {
							"插入JSON": function () {
								CA.IntelliSense.assistJSON(cp);
							}
						},
						length: ps.length,
						canFinish: true
					};
					break;

				case "plain":
					t = cp.name;
					if (cp.prompt) t += " - " + cp.prompt;
					r = {
						input: [t],
						output: {}
					};
					r.output[t] = cp.name;
					if (ps.startsWith(cp.name + " ") || ps == cp.name) {
						r.length = cp.name.length;
						r.canFinish = true;
					} else if (cp.name.indexOf(ps) >= 0 || cp.prompt && cp.prompt.indexOf(ps) >= 0) {
						r.length = ps.length;
						r.canFinish = false;
					} else return {
						description: "不可为" + ps
					};
					break;

				case "selector":
					r = this.procSelector(cp, ps);
					if (!r || !(r.length >= 0)) return r;
					break;

				case "uint":
					t = ps.search(" ") < 0 ? ps : ps.slice(0, ps.search(" "));
					if (!(/^\d*$/).test(t)) return {
						description: t + "不是自然数"
					};
					r = {
						length: t.length,
						canFinish: t.length > 0
					};
					break;

				case "int":
					t = ps.search(" ") < 0 ? ps : ps.slice(0, ps.search(" "));
					if (!(/^(\+|-)?\d*$/).test(t)) return {
						description: t + "不是整数"
					};
					r = {
						length: t.length,
						canFinish: t.length && !isNaN(t)
					};
					break;

				case "float":
					t = ps.search(" ") < 0 ? ps : ps.slice(0, ps.search(" "));
					if (!(t2 = (/^(\+|-)?(\d*\.)?(\d)*$/).exec(t))) return {
						description: t + "不是数值"
					};
					r = {
						length: t.length,
						canFinish: t.length && t2[3]
					};
					break;

				case "relative":
					// 解析第一个参数（以空格分隔）
					t = ps.search(" ") < 0 ? ps : ps.slice(0, ps.search(" "));
					// 匹配相对坐标格式：~ 或 ~数字 或 数字
					t2 = (/^(~)?((\+|-)?(\d*\.)?\d*)$/).exec(t);
					if (!t2) {
						return { description: t + "不是数值" }; // 如果不符合格式，返回错误描述
					}

					// Common.toast(JSON.stringify(t2));
					r = {
						length: t.length, // 输入的长度
						input: [], // 输入的补全建议
						assist: {}, // 补全建议的详细信息
						canFinish: true // 是否可以结束输入
					};
					// 如果没有输入~，提供补全建议
					if (ps.indexOf('~') === -1 && ps.length == 0) {
						r.input = ["~ - 相对标识符"];
						r.assist = { "~ - 相对标识符": "~" };
					}
					break;

				case "position":
					r = this.procPosition(cp, ps);
					if (!r || !(r.length >= 0)) return r;
					break;

				case "custom":
					t = new RegExp(cp.input, "").exec(ps);
					if (!t) return {
						description: t + "不满足指定的条件"
					};
					r = {
						length: t[0].length,
						canFinish: new RegExp(cp.finish, "").test(ps)
					};
					break;

				case "enum":
					// Common.toast(JSON.stringify(cp))
					if (!(t = cp.list instanceof Object ? cp.list : this.library.enums[cp.list])) throw "无法找到指定枚举类型";
					r = {
						output: {},
						canFinish: false,
						length: -1
					};
					if (Array.isArray(t)) { //这个懒得用matchString了
						r.input = t.filter(function (e, i, a) {
							if (ps.startsWith(e + " ") || ps == e) {
								r.length = Math.max(r.length, e.length);
								r.canFinish = true;
							} else if (e.startsWith(ps)) {
								r.length = Math.max(r.length, ps.length);;
							} else return false;
							r.output[e] = e;
							return true;
						});
						r.input.sort();
					} else {
						t2 = [];
						r.input = [];
						Object.keys(t).forEach(function (e, i, a) {
							if (ps.startsWith(e + " ") || ps == e) {
								r.length = Math.max(r.length, e.length);
								r.canFinish = true;
							} else if (e.indexOf(ps) >= 0 || t[e].indexOf(ps) >= 0) {
								r.length = Math.max(r.length, ps.length);
							} else return;
							if (t[e]) {
								r.output[e + " - " + t[e]] = e;
								r.input.push(e + " - " + t[e]);
							} else {
								r.output[e] = e;
								t2.push(e);
							}
						});
						r.input.sort(); t2.sort(); r.input = r.input.concat(t2);
					}
					if (r.length < 0) {
						r.description = ps + "不是有效的元素";
					}
					break;

				case "command":
					t = this.procCmd(ps);
					if (!t) return {
						description: "不是合法的命令格式"
					};
					t2 = t.prompt[0];
					t3 = t2.toString().indexOf("\n");
					r = {
						length: t.mode < 0 ? -1 : t.source.length,
						input: t.input,
						output: {},
						menu: {},
						canFinish: t.canFinish,
						description: String(t2.subSequence(t3 + 1, t2.length())),
						tag: t2.subSequence(0, t3)
					}
					for (i in t.output) {
						if (t.output[i] instanceof Function) {
							r.menu[i] = t.output[i];
						} else {
							r.output[i] = t.output[i];
						}
					}
					break;

				case "subcommand":
					// 辅助函数：移除主命令前缀，便于显示子命令内容
					function removeCmdPrefix(obj, prefix) {
						if (!obj || typeof obj !== 'object') return obj;
						// 处理 output 映射
						if (obj.output && typeof obj.output === 'object') {
							Object.keys(obj.output).forEach(function (k) {
								var v = obj.output[k];
								if (typeof v === 'string' && v.indexOf(prefix) === 0) {
									obj.output[k] = v.slice(prefix.length);
								}
							});
						}
						// 处理 prompt 列表
						if (Array.isArray(obj.prompt)) {
							obj.prompt = obj.prompt.map(function (v) {
								if (v && typeof v.toString === 'function' && v.toString().indexOf(prefix) === 0) {
									if (typeof v.subSequence === 'function') {
										return v.subSequence(prefix.length, v.length());
									} else {
										return v.toString().slice(prefix.length);
									}
								}
								return v;
							});
						}
						return obj;
					}

					var mainCmd = cp.mainCommand;
					if (typeof mainCmd !== 'string') {
						return { description: "主命令未定义或格式错误" };
					}

					// 处理主命令 + 子命令参数，移除主命令前缀
					t = removeCmdPrefix(this.procCmd(mainCmd + ' ' + ps), mainCmd + ' ');
					if (!t || !Array.isArray(t.prompt) || !t.prompt[0]) {
						return { description: "不是合法的命令格式" };
					}

					t2 = t.prompt[0];
					t3 = (t2 && typeof t2.toString === 'function') ? t2.toString().indexOf("\n") : -1;

					r = {
						length: t.mode < 0 ? -1 : (t.source && t.source.length) || 0,
						input: Array.isArray(t.input) ? t.input : [],
						output: {},
						menu: {},
						canFinish: !!t.canFinish,
						description: (t3 >= 0 && t2 && typeof t2.subSequence === 'function')
							? String(t2.subSequence(t3 + 1, t2.length()))
							: (typeof t2 === 'string' ? t2 : ""),
						tag: (t3 >= 0 && t2 && typeof t2.subSequence === 'function')
							? t2.subSequence(0, t3)
							: (typeof t2 === 'string' ? t2.split('\n')[0] : "")
					};

					// 拷贝 output 和 menu
					if (t.output && typeof t.output === 'object') {
						Object.keys(t.output).forEach(function (i) {
							if (typeof t.output[i] === 'function') {
								r.menu[i] = t.output[i];
							} else {
								r.output[i] = t.output[i];
							}
						});
					}
					break;

				case "string":
					// 把被双引号包围的片段先抓出来
					const quotedMatches = ps.match(/"[^"]*"/g) || [];

					// 把这些片段先用占位符替换掉，防止后面被 split 拆开
					let tmp = ps;
					const placeholders = [];
					quotedMatches.forEach((m, i) => {
						const ph = `__QUOTED_${i}__`;
						placeholders.push(ph);
						tmp = tmp.replace(m, ph);
					});

					// 对剩余部分按空格分割、过滤空串
					const restParts = tmp.split(" ").filter(Boolean);

					// 把占位符还原成原来的带引号片段
					const finalParts = restParts.map(part => {
						const idx = placeholders.indexOf(part);
						return idx >= 0 ? quotedMatches[idx] : part;
					});

					// 取第一个
					t = finalParts[0] || "";

					r = {
						length: t.length,
						canFinish: t.length > 0
					};
					break;

				case "status":
					// 不得不说，我现在就像projectXero一样写旧版选择器逻辑，终有一日我会因此后悔（就跟旧版选择器一样）
					let recommend = {}
					let recommend_enums = {}
					r = {
						canFinish: false,
						length: ps.length,
						recommend: {},
						input: []
					}
					if (ps.length == 0) {
						recommend["[...] - 插入状态"] = ps + "[";
					} else if (ps.length > 0) {
						var selResult = this.parseSelectorPath(ps);
						let context = parsedParams[parsedParams.length - 1]
						let input = selResult.currentInput || "";
						let schema = this.getSchemaByContext(context, "block")
						let pathArr = selResult.stack ? selResult.stack.slice() : [];  // 补全路径
						let keys = selResult.keys
						if (selResult.state == "wait_key") {
							recommend_enums = this.getSelectorParamCompletions(input, ps, this.removeKeysFromSchema(schema,keys), "=")
						} else if (selResult.state == "wait_value") {
							// 补全操作
							if (input.length >= 1) {
								recommend[", - 下一个参数"] = ps + ",";
								recommend["] - 结束参数"] = ps + "]";
							}

							if (pathArr[pathArr.length - 2] && schema && schema[pathArr[pathArr.length - 2]]) {
								let param = this.matchParam(schema[pathArr[pathArr.length - 2]], input, []) // 先什么都不传吧，这里应该用不到 （我感觉我会后悔）
								var rec = param.output || param.recommend || {};
								var bb = ps.slice(0, ps.lastIndexOf('=') + 1);   // key= 前缀
								for (var k in rec) {
									if (rec.hasOwnProperty(k)) {
										recommend_enums[k] = bb + rec[k];
									}
								}
							}

						}
					}
					for (var key in recommend_enums) {
						if (recommend_enums.hasOwnProperty(key)) {
							// 如果 recommend 中已经存在该键，则更新其值
							recommend[key] = recommend_enums[key];
						}
					}
					r.recommend = recommend
					r.input = Object.keys(recommend)
					break;

				default:
					t = ps.search(" ") < 0 ? ps : ps.slice(0, ps.search(" "));
					r = {
						length: t.length,
						canFinish: true
					};
			}
			if (!cp.suggestion) return r;
			t = cp.suggestion instanceof Object ? cp.suggestion : this.library.enums[cp.suggestion];
			t2 = ps.slice(0, r.length);
			this.matchString(t2, t, r);
			return r;
		},
		getParamTag: function (cp, ms, mt, md) { //匹配模式，匹配字符串，匹配类型（已输入、输入中、未输入、出错），matchParam返回的匹配数据
			var z = cp.name, t, t2;
			if (mt == 1 || mt == 3) {
				switch (cp.type) {
					case "int":
						z += ":整数";
						break;

					case "uint":
						z += ":正整数";
						break;

					case "float":
					case "relative":
						z += ":数值";
						break;

					case "nbt":
						z += ":数据标签";
						break;

					case "rawjson":
						z += ":文本JSON";
						break;

					case "json":
						z += ":JSON";
						break;

					case "selector":
						z += ":实体";
						break;

					case "enum":
						z += ":列表";
						break;

					case "plain":
						break;

					case "custom":
						if (cp.vtype) z += ":" + cp.vtype;
						break;

					case "position":
						if (mt == 3) {
							z += ":x y z";
							break;
						}
						t2 = md.uv ? ["左", "上", "前"] : ["x", "y", "z"];
						t = (/(\S*)\s*(\S*)\s*(\S*)/).exec(ms);
						if (t[1]) t2[0] = t[1];
						if (t[2]) t2[1] = t[2];
						if (t[3]) t2[2] = t[3];
						z += ":" + t2.join(" ");
						break;

					case "command":
						if (md) {
							return md.tag;
						}
						z += ":命令";
						break;

					case "subcommand":
						if (md) {
							return md.tag;
						}
						z += ":命令";
						break;

					case "status":
						z += "状态"
						break;

					case "text":
					default:
						z += ":文本";
						break;
				}
			}
			if (cp.type != "plain" && !cp.optional && !cp.canIgnore && !cp.chainOptional) z = "<" + z + ">";
			if (cp.optional || cp.canIgnore || cp.chainOptional) z = "[" + z + "]";
			if (cp.type == "custom") {
				if (cp.prefix) z = cp.prefix + z;
				if (cp.suffix) z = z + cp.suffix;
			}
			if (cp.repeat && mt == 1) z = z + " ...";
			z = new G.SpannableString(z);
			if (mt == 2) {
				z.setSpan(new G.ForegroundColorSpan(Common.theme.promptcolor), 0, z.length(), z.SPAN_INCLUSIVE_EXCLUSIVE);
			} else if (mt == 1) {
				z.setSpan(new G.ForegroundColorSpan(Common.theme.highlightcolor), 0, z.length(), z.SPAN_INCLUSIVE_EXCLUSIVE);
			} else if (mt == 3) {
				z.setSpan(new G.ForegroundColorSpan(Common.theme.criticalcolor), 0, z.length(), z.SPAN_INCLUSIVE_EXCLUSIVE);
			}
			return z;
		},
		procSelector: function (cp, ps) {
			/** 选择器
			 * 使用正则表达式对字符串 `ps` 进行匹配，提取以可选的 '@' 开头，后跟 'p'、'e'、'a'、'r'、's' 中的一个字母，
			 * 可选地跟一个 '['，然后是一串非空白和非 ']' 字符，再可选一个 ']'，最后可选一个空白字符的结构。
			 *
			 */

			// this.library.enums 是 ID枚举 
			// 	{
			// 		"block": {
			// 			"minecraft:stone": "石头",
			// 		}
			//  }
			//
			// this.library.selectors 是 命令列表
			// 	{
			// 	  	"x": {
			//  		"type": "relative",
			//     		"name": "x坐标"
			// 		}
			// 	}
			// 假设 result 是 parseSelectorPath 返回的对象，caseStr 是原始输入

			//再测试一些东西
			// var test = ""
			var selectorParam = ps.replace(/^@[pareas]/, "");
			var selResult = this.parseSelectorPath(selectorParam);
			var debug = selResult && selResult.debug ? selResult.debug : {};
			var pathArr = selResult.stack ? selResult.stack.slice() : [];  // 补全路径
			var pathStr = Array.isArray(pathArr) ? pathArr.join(' -> ') : "";
			// var msg = "【调试信息】\n";
			// msg += "原始输入: " + selectorParam + "\n";
			// msg += "左大括号 { :" + debug.leftBrace + "  右大括号 } :" + debug.rightBrace + "\n";
			// msg += "左中括号 [ :" + debug.leftBracket + "  右中括号 ] :" + debug.rightBracket + "\n";
			// msg += "剩余未配对栈: " + (selResult.stack ? selResult.stack.join('') : "") + "\n";
			// msg += "是否在引号内: " + debug.inQuote + "\n";
			// msg += "等待的内容：" + selResult.currentInput + "\n"
			// if (debug.selectorEnd !== undefined) {
			// 	msg += "补全路径数组: " + JSON.stringify(pathArr) + "\n";
			// 	msg += "补全路径: " + pathStr + "\n";
			// 	msg += "选择器长度: " + debug.selectorEnd + "(" + ps.length + ")" + "\n";
			// 	msg += "选择器内容: " + ps.slice(0, debug.selectorEnd) + "\n";
			// 	msg += "剩余内容: " + ps.slice(debug.selectorEnd) + "\n";
			// }
			// msg += "-----------------------------";
			// Common.toast(msg+JSON.stringify(cp));
			recommend = {};
			canFinish = false;
			let selectorEnd = 0;

			if (debug.selectorEnd != -1) {
				selectorEnd = debug.selectorEnd + 2;
			} else {
				selectorEnd = ps.length;
			}
			var needSelectorParam = false;
			// 判断是否为完整选择器或玩家名
			if (/^@[a-zA-Z]\[/.test(ps)) {
				//加个这个匹配来跳过后面的else-if
				canFinish = false;
				needSelectorParam = true;
				if (debug.selectorEnd != -1) {
					canFinish = true;
				}
			} else if (/^@[a-zA-Z] +/.test(ps)) {
				canFinish = true;
				selectorEnd = 2;
			} else if (/^@[a-zA-Z]$/.test(ps)) {
				canFinish = true;
				recommend["[...] - 插入参数"] = ps + "[";
			} else if (/^(?:[^\s"]+|"[^"]*") /.test(ps) || (ps.length > 0 && !/^@[a-zA-Z] +/.test(ps))) {
				// 取第一个参数（玩家名）的长度作为selectorEnd
				var firstArgMatch = /^([^\s"]+|"[^"]*")/.exec(ps);
				if (firstArgMatch) {
					selectorEnd = firstArgMatch[0].length;
					// test = firstArgMatch[0] 
					canFinish = true;
				} else {
					selectorEnd = ps.length;
					canFinish = false;
					if (/^"/.test(ps)) {
						recommend['" - 结束双引号'] = ps + '" ';
					}
				}
			}
			// if (canFinish == false) {
			// 	Common.toast("补全路径:" + pathStr);
			// }
			if (selectorEnd == 0) {
				// 开始编辑则输出选择器变量
				recommend["@a - 选择所有玩家"] = "@a";
				recommend["@p - 选择距离最近的玩家"] = "@p";
				recommend["@r - 选择随机玩家"] = "@r";
				recommend["@e - 选择所有实体"] = "@e";
				recommend["@s - 选择命令执行者"] = "@s";
			}

			// 选择器补全部分（终于进入主题来了）
			let recommend_enums = {}
			if (needSelectorParam) {
				let input = selResult.currentInput || "";
				// 检查并移除 pathArr 中的 "[...]"
				let filteredPathArr = pathArr.filter(item => item !== "[...]");

				if (filteredPathArr[filteredPathArr.length - 1] === "{...}") {
					// 此时层级为进入选择器
					if (input.length > 0) recommend["= - 输入参数"] = ps + "=";

					if (filteredPathArr.length == 1) {
						recommend_enums = this.getSelectorParamCompletions(input, ps, this.library.selectors, "=");
					} else if (filteredPathArr.length == 2) {
						if (filteredPathArr[filteredPathArr.length - 2] && this.library.selectors[filteredPathArr[filteredPathArr.length - 2]]) {
							let selectors = this.library.selectors[filteredPathArr[filteredPathArr.length - 2]];
							if (selectors["fields"]) {
								recommend_enums = this.getSelectorParamCompletions(input, ps, selectors["fields"], "=");
							}
						}
					}
				} else if (pathArr[pathArr.length - 1] === "...") {
					if (input.length > 0) {
						recommend[", - 下一个参数"] = ps + ","
						// if (pathArr.length == 2) recommend["] - 结束选择器"] = ps + "]"
						// else if (pathArr) recommend["] - 结束数组"] = ps + "]"
						// if (input.slice(-1) != "]" && input.slice(-1) != "}" && pathArr.length > 1) recommend["} - 结束键值"] = ps + "}"
						// if (input.slice(-1) == "}" && pathArr.includes("[...]")) recommend["] - 结束数组"] = ps + "]"
						// var selectorParam = ps.replace(/^@[pareas]/, "");
						let openBrackets = debug.remainingStack
						// Common.toast(JSON.stringify(openBrackets))
						if (openBrackets.slice(-1) == "{") {
							recommend["} - 结束键值"] = ps + "}";
						} else if (
							openBrackets.length > 1 &&
							openBrackets.slice(-1) == "["
						) {
							recommend["] - 结束数组"] = ps + "]";
						} else if (
							openBrackets.length == 1 &&
							openBrackets.slice(-1) == "["
						) {
							recommend["] - 结束选择器"] = ps + "]";
						}

					}
					let suggestion = undefined
					let selectors = getFieldByPath(this.library.selectors, pathArr.slice(0, -1))
					if (selectors) {
						// 控制反选
						if (input.length == 0) {
							if (selectors["hasInverted"] && selectors["hasInverted"] === true) {
								recommend["! - 反向选择"] = ps + "!"
							}
						}
						if (selectors["type"]) {
							let type = selectors["type"]
							if (type.indexOf("object") !== -1) {
								recommend["{...} - 开始键值"] = ps + "{"
							}
							if (type.indexOf("array") !== -1) {
								recommend["[...] - 开始数组"] = ps + "["
							}
						}
						if (selectors["list"]) {
							suggestion = selectors["list"];
						} else if (selectors["suggestion"]) {
							suggestion = selectors["suggestion"];
						}

						if (this.library.enums[suggestion]) {
							var selectors = this.library.enums[suggestion];
							var processedInput = input;

							// 检查输入是否以 "!" 开头
							if (/^\!/.test(input)) {
								processedInput = input.replace(/^\!/, "");
							}

							// 调用 getSelectorParamCompletions 方法
							recommend_enums = this.getSelectorParamCompletions(processedInput, ps, selectors, "", true);// 有人想要按照字母排序
						}
					}
				} else if (pathArr[pathArr.length - 1] === "[...]") {
					recommend["{...} - 开始键值"] = ps + "{"
				}
			}

			for (var key in recommend_enums) {
				if (recommend_enums.hasOwnProperty(key)) {
					// 如果 recommend 中已经存在该键，则更新其值
					recommend[key] = recommend_enums[key];
				}
			}
			t = {
				"length": selectorEnd,
				"recommend": recommend, // 命令对应的补全，替换选择器文本（推荐使用）
				"assist": {}, // 命令对应的补全，增加的文本
				"menu": {},   // 命令对应的补全，替换整个文本框
				"output": {}, // 结束的参数，选择后自动到下一个参数（与length有关）

				"input": Object.keys(recommend), // 显示使用的，最后定向到上面的键
				"canFinish": canFinish // 选择器是否结束
			}

			// Common.toast(msg + JSON.stringify(t));
			return t;
			function getFieldByPath(schema, path) {
				// 如果路径为空，返回null
				if (path.length === 0) return null;

				// 获取当前路径的第一部分
				var currentKey = path[0];

				// 如果当前键是"[...]"，跳过当前层级
				if (currentKey === "[...]" && path.length > 1) {
					// 递归查找下一层路径
					return getFieldByPath(schema, path.slice(1));
				}

				// 如果当前键不存在于schema中，返回null
				if (!schema[currentKey]) {
					// 这里应该提醒个不存在
					return null;
				}

				// 如果路径只有一部分，直接返回当前字段
				if (path.length === 1) return schema[currentKey];

				// 如果路径有多部分，递归查找
				var nextSchema = schema[currentKey].fields || {};
				return getFieldByPath(nextSchema, path.slice(1));
			}
		},

		procPosition: function (cp, ps) {
			var l = ps.split(/\s+/), f = true, uv = false, i, n = Math.min(l.length, 3), t, pp, t2, t3;
			for (i = 0; i < n; i++) {
				if (i == 0 && l[0].startsWith("^") && CA.hasFeature("enableLocalCoord")) uv = true;
				if (!(t = (uv ? /^(?:(\^)((\+|-)?(\d*\.)?\d*))?$/ : /^(~)?((\+|-)?(\d*\.)?(\d)*)$/).exec(l[i]))) return {
					description: l[i] + "不是合法的坐标值"
				};
				if ((!t[1] || t[2]) && !(/^(\+|-)?(\d*\.)?\d+$/).test(t[2])) if (i == n - 1) {
					f = false;
				} else return {
					description: l[i] + "不是合法的坐标值"
				};
			}
			t = {
				length: n == 3 && l[2].length > 0 ? (/^\S+\s+\S+\s+\S+/).exec(ps)[0].length : ps.length,
				input: [],
				assist: {},
				canFinish: f && n == 3,
				uv: uv
			}
			if (l[n - 1].length > 0) {
				if (n < 3) {
					t.input.push("  - 空格");
					t.assist["  - 空格"] = " ";
				}
			} else {
				if (!uv) {
					t.input.push("~ - 相对坐标");
					t.assist["~ - 相对坐标"] = "~";
				}
				if ((ps.length == 0 || uv) && CA.hasFeature("enableLocalCoord")) {
					t.input.push("^ - 局部坐标(^左 ^上 ^前)");
					t.assist["^ - 局部坐标(^左 ^上 ^前)"] = "^";
				}
			}
			if (MCAdapter.available()) {
				t.output = {};
				pp = MCAdapter.getInfo("playerposition").slice();
				if (pp && pp[1] != 0) {
					pp[1] -= 1.619999885559082;
					t2 = pp.join(" ");
					t.output[t2 + " - 玩家实际坐标"] = t2;
					t2 = [Math.floor(pp[0]), Math.floor(pp[1]), Math.floor(pp[2])].join(" ");
					t.output[t2 + " - 玩家脚部方块坐标"] = t2;
					t2 = [Math.floor(pp[0]), Math.floor(pp[1] + 1), Math.floor(pp[2])].join(" ");
					t.output[t2 + " - 玩家头部方块坐标"] = t2;
					t2 = [Math.floor(pp[0]), Math.floor(pp[1] - 1), Math.floor(pp[2])].join(" ");
					t.output[t2 + " - 玩家脚下方块坐标"] = t2;
					pp = MCAdapter.getInfo("pointedblockpos");
					if (pp && pp[1] >= 0) {
						t2 = pp.join(" ");
						t.output[t2 + " - 玩家指向方块坐标"] = t2;
					}
				}
				t.input = t.input.concat(Object.keys(t.output));
			} //else MCAdapter.applySense(t);
			return t;
		},
		/**
		 * 通用字符串补全匹配工具。
		 *
		 * 用于根据用户输入的前缀（ps）在候选项（a）中筛选匹配项，并生成补全建议。
		 * 支持数组和对象两种候选项结构：
		 * - 如果 a 为数组，则只匹配包含 ps 的元素。
		 * - 如果 a 为对象，则优先匹配 key 或 value 包含 ps 的项，key 和 value 都存在时显示为 "key - value"。
		 * 匹配结果会合并到 r.input（建议列表）和 r.output（建议映射）中，便于后续 UI 展示和补全插入。
		 *
		 * @param {string} ps - 用户输入的前缀，用于过滤候选项。
		 * @param {Array|string|Object} a - 候选项，可以是字符串数组或对象（key-value）。
		 * @param {Object} r - 结果对象，包含 input（建议列表）和 output（建议映射），会被本函数修改和返回。
		 * @returns {Object} 返回 r，包含 input（建议列表）和 output（建议映射）。
		 */
		matchString: function (ps, a, r) {
			var t, t2, t3;
			if (!(r instanceof Object)) r = {};
			if (!Array.isArray(r.input)) r.input = [];
			if (!(r.output instanceof Object)) r.output = {};
			if (Array.isArray(a)) {
				t = [];
				a.forEach(function (e) {
					if (e.indexOf(ps) < 0) return;
					r.output[e] = e;
					if (r.input.indexOf(e) < 0) t.push(e);
				});
				t.sort();
				r.input = r.input.concat(t);
			} else {
				t = []; t2 = [];
				Object.keys(a).forEach(function (e) {
					if (e.indexOf(ps) < 0 && a[e].indexOf(ps) < 0) return;
					if (a[e]) {
						t3 = e + " - " + a[e];
						r.output[t3] = e;
						if (r.input.indexOf(t3) < 0) t.push(t3);
					} else {
						r.output[e] = e;
						if (r.input.indexOf(e) < 0) t2.push(e);
					}
				});
				t.sort(); t2.sort();
				r.input = r.input.concat(t, t2);
			}
			return r;
		},
		assistJSON: function (param) {
			CA.Assist.editParamJSON({
				param: param
			}, function (text) {
				CA.cmd.getText().append(text);
			});
		},
		showHelp: function () {
			var pp = new G.SpannableStringBuilder();
			this.source = "/help";
			this.cmdname = "help";
			this.hasSlash = true;
			this.strParam = "";
			this.output = {
				"设置": function () {
					CA.showSettings();
				},
				"关于命令助手...": function () {
					if (CA.settings.splitScreenMode) return;
					CA.showAssist.linear.setTranslationX(CA.showAssist.tx = -CA.showAssist.screenWidth);
					CA.showAssist.hCheck();
					if (CA.settings.noAnimation) return;
					var animation = new G.TranslateAnimation(G.Animation.ABSOLUTE, CA.showAssist.screenWidth, G.Animation.ABSOLUTE, 0, G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 0);
					animation.setDuration(200);
					CA.showAssist.linear.startAnimation(animation);
				},
				"查看中文Wiki": function () {
					try {
						AndroidBridge.startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://zh.minecraft.wiki/%E5%91%BD%E4%BB%A4"))
							.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
					} catch (e) {
						Common.showWebViewDialog({
							url: "https://zh.minecraft.wiki/%E5%91%BD%E4%BB%A4"
						});
					}
				},
				// "加入我们...": function () {
				// 	try {
				// 		AndroidBridge.startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(""))
				// 			.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
				// 	} catch (e) {
				// 		Common.toast("QQ群号已复制至剪贴板");
				// 		Common.setClipboardText("207913610");
				// 	}
				// },
				"意见反馈": function () {
					// GiteeFeedback.showFeedbacks();
					Common.toast("请联系南鸢晨星");
				}
			};
			this.input = Object.keys(this.output);
			pp.append("命令助手 - 设置 & 关于\n");
			appendSSB(pp, "（这个命令的用途是显示帮助，不过你有这个JS就不需要帮助了吧）", new G.ForegroundColorSpan(Common.theme.promptcolor));
			this.prompt = [pp];
			this.help = "https://github.com/huangyxHUTAO/CA_reforged";
			this.patterns = [];
			return this.apply();
		},
		show: function self() {
			G.ui(function () {
				try {
					if (CA.IntelliSense.ui) return;
					if (!self.prompt) {
						self.adptcon = null;
						self.apply = function (z) {
							G.ui(function () {
								try {
									self.prompt.setText(z.prompt[0] || "");
									try {
										new java.net.URL(z.help);
										CA.showAssist.postHelp(0, z.help);
									} catch (e) {
										CA.showAssist.postHelp(1, z.help || "暂时没有帮助，以后会加上的啦");
									}
									if (self.adptcon) {
										self.adptcon.setArray(z.input);
									} else {
										var a = new SimpleListAdapter(z.input.slice(), self.vmaker, self.vbinder, null, true);
										self.adptcon = SimpleListAdapter.getController(a);
										self.list.setAdapter(a);
									}
								} catch (e) { erp(e) }
							})
						}
						// self.vmaker = function (holder) {
						// 	var view = new G.TextView(ctx);
						// 	view.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						// 	Common.applyStyle(view, "textview_default", 3);
						// 	return view;
						// }
						self.vmaker = function (holder) {
							var view = new G.TextView(ctx);
							view.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
							Common.applyStyle(view, "textview_default", 3);
							view.setTypeface(iconFont); // ✅ 设置字体
							// Common.toast("字体被渲染")
							return view;
						}
						self.vbinder = function (holder, s, i, a) {
							if (self.keep) {
								holder.self.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
							} else {
								holder.self.setPadding(15 * G.dp, 2 * G.dp, 15 * G.dp, 2 * G.dp);
							}
							holder.self.setText(s);
						}
						self.prompt = new G.TextView(ctx);
						self.prompt.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
						self.prompt.setPadding(20 * G.dp, 10 * G.dp, 20 * G.dp, 10 * G.dp);
						self.prompt.setTypeface(G.Typeface.MONOSPACE || G.Typeface.DEFAULT);
						self.prompt.setLineSpacing(10, 1);
						Common.applyStyle(self.prompt, "textview_default", 2);
						self.list = new G.ListView(ctx);
						self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({
							onItemClick: function (parent, view, pos, id) {
								try {
									if (pos == 0) {
										CA.IntelliSense.showMoreUsage();
										return;
									}
									var a = CA.IntelliSense.output[CA.IntelliSense.input[pos - parent.getHeaderViewsCount()]];
									if (a instanceof Function) {
										a();
									} else if (a) {
										CA.cmd.setText(String(a));
										CA.showGen.activate(false);
									}
								} catch (e) { erp(e) }
							}
						}));
						self.list.setOnItemLongClickListener(new G.AdapterView.OnItemLongClickListener({
							onItemLongClick: function (parent, view, pos, id) {
								try {
									if (pos == 0) {
										CA.IntelliSense.showMoreUsage();
										return true;
									}
									var a = CA.IntelliSense.output[CA.IntelliSense.input[pos - parent.getHeaderViewsCount()]];
									if (a && !(a instanceof Function)) {
										var rect, metrics = Common.getMetrics();
										if (self.lastToast) self.lastToast.cancel();
										self.lastToast = G.Toast.makeText(ctx, String(a), 0);
										view.getGlobalVisibleRect(rect = new G.Rect());
										self.lastToast.setGravity(G.Gravity.CENTER, rect.centerX() - metrics[0] / 2, rect.centerY() - metrics[1] / 2);
										self.lastToast.show();
									}
									return true;
								} catch (e) { return erp(e), true }
							}
						}));
						self.list.addOnLayoutChangeListener(new G.View.OnLayoutChangeListener({
							onLayoutChange: function (v, l, t, r, b, ol, ot, or, ob) {
								try {
									var t = (b - t > Common.theme.textsize[3] * G.sp * 8) || CA.settings.keepWhenIME;
									if (self.keep == t) return;
									self.keep = t;
									if (t) {
										self.prompt.setPadding(20 * G.dp, 10 * G.dp, 20 * G.dp, 10 * G.dp);
									} else {
										self.prompt.setPadding(20 * G.dp, 2 * G.dp, 20 * G.dp, 2 * G.dp);
									}
									v.post(function () { CA.IntelliSense.apply() });
								} catch (e) { erp(e) }
							}
						}));
						self.list.addHeaderView(self.prompt);
						self.list.setLayoutParams(new G.FrameLayout.LayoutParams(-1, -1));
						if (G.style == "Material") { //Fixed：Android 5.0以下FastScroller会尝试将RhinoListAdapter强转为BaseAdapter
							self.list.setFastScrollEnabled(true);
							self.list.setFastScrollAlwaysVisible(false);
						}
						CA.showAssist.initContent(self.list);
						PWM.registerResetFlag(CA.IntelliSense, "ui");
						PWM.registerResetFlag(self, "prompt");
					}
					CA.showAssist.con.addView(CA.IntelliSense.ui = self.list);
				} catch (e) { erp(e) }
			})
		},
		hide: function () {
			G.ui(function () {
				try {
					if (!CA.IntelliSense.ui) return;
					CA.showAssist.con.removeView(CA.IntelliSense.ui);
					CA.IntelliSense.ui = null;
				} catch (e) { erp(e) }
			})
		},
		showMoreUsage: function () {
			var pp = new G.SpannableStringBuilder(), i, l = CA.IntelliSense.prompt.length;
			pp.append(this.prompt[0]);
			for (i = 1; i < l; i++) {
				pp.append("\n\n");
				pp.append(this.prompt[i]);
			}
			Common.showTextDialog(pp);
		},

		// === 选择器补全链分析相关 ===
		isSelectorComplete: function (inputStr) {
			var stack = []; // 用于跟踪未闭合的括号
			var inQuote = false; // 标记是否在引号内
			var leftBrace = 0, rightBrace = 0; // 统计大括号数量
			var leftBracket = 0, rightBracket = 0; // 统计中括号数量
			var selectorEnd = -1; // 完整选择器的结束位置

			// 遍历输入字符串的每个字符
			for (var i = 0; i < inputStr.length; i++) {
				var c = inputStr[i];

				// 处理引号（字符串内的内容忽略括号匹配）
				if (c === '"') inQuote = !inQuote;
				if (inQuote) continue;

				// 处理开括号
				if (c === '{') {
					stack.push(c);
					leftBrace++;
				}
				if (c === '[') {
					stack.push(c);
					leftBracket++;
				}

				// 处理闭括号
				if (c === '}') {
					rightBrace++;
					// 如果栈顶是匹配的开括号，则弹出
					if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
				}
				if (c === ']') {
					rightBracket++;
					if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
					// 如果栈已清空且不在引号内，记录选择器结束位置
					if (stack.length === 0 && !inQuote) {
						selectorEnd = i + 1;
						break;
					}
				}
			}

			// 返回检查结果
			return {
				// 有效的选择器：栈清空、引号关闭、括号匹配
				isValid: stack.length === 0 && !inQuote &&
					leftBrace === rightBrace &&
					leftBracket === rightBracket,
				// 调试信息
				debugInfo: {
					leftBrace: leftBrace,
					rightBrace: rightBrace,
					leftBracket: leftBracket,
					rightBracket: rightBracket,
					remainingStack: stack.slice(), // 未闭合的括号栈
					inQuote: inQuote, // 是否在引号内
					selectorEnd: selectorEnd // 选择器结束位置
				}
			};
		},

		/**
		 * 解析选择器路径，确定当前状态和补全路径
		 * @param {string} inputStr - 要解析的选择器字符串
		 * @returns {Object} 包含状态、补全路径、当前输入和调试信息的对象
		 */
		parseSelectorPath: function (inputStr) {
			// 首先检查选择器是否完整
			var selectorCompleteResult = this.isSelectorComplete(inputStr);

			// 如果选择器完整，直接返回完成状态
			if (selectorCompleteResult.isValid) {
				return {
					stack: [],
					state: 'complete',
					debug: selectorCompleteResult.debugInfo,
					currentInput: '',
					keys: []
				};
			}

			/**
			 * 按逗号分割字符串，但忽略嵌套结构内的逗号
			 * @param {string} str - 要分割的字符串
			 * @returns {Array} 分割后的段数组
			 */
			function _splitByComma(str) {
				var segments = [];
				var braceCount = 0, bracketCount = 0; // 跟踪括号嵌套深度
				var inQuote = false; // 是否在引号内
				var lastSplit = 0; // 上次分割的位置

				// 遍历字符串
				for (var i = 0; i < str.length; i++) {
					var char = str[i];

					// 处理引号
					if (char === '"') inQuote = !inQuote;
					if (inQuote) continue;

					// 更新括号计数
					if (char === '{') braceCount++;
					else if (char === '}') braceCount--;
					if (char === '[') bracketCount++;
					else if (char === ']') bracketCount--;

					// 在顶层（不在嵌套结构内）遇到逗号时分割
					if (char === ',' && braceCount === 0 && bracketCount === 0) {
						segments.push(str.substring(lastSplit, i));
						lastSplit = i + 1; // 更新分割位置
					}
				}

				// 添加最后一段
				segments.push(str.substring(lastSplit));
				return segments;
			}

			/**
			 * 查找顶层的等号（忽略嵌套结构内的等号）
			 * @param {string} str - 要搜索的字符串
			 * @returns {number} 等号的位置索引，未找到返回-1
			 */
			function _findTopLevelEqual(str) {
				var braceCount = 0, bracketCount = 0; // 括号嵌套深度
				var inQuote = false; // 是否在引号内

				// 遍历字符串
				for (var j = 0; j < str.length; j++) {
					var c = str[j];

					// 处理引号
					if (c === '"') inQuote = !inQuote;
					if (inQuote) continue;

					// 更新括号计数
					if (c === '{') braceCount++;
					else if (c === '}') braceCount--;
					if (c === '[') bracketCount++;
					else if (c === ']') bracketCount--;

					// 在顶层找到等号
					if (c === '=' && braceCount === 0 && bracketCount === 0)
						return j;
				}

				return -1; // 未找到
			}

			/**
			 * 递归解析选择器字符串的核心函数
			 * @param {string} currentStr - 当前要解析的字符串
			 * @param {Array} parentStack - 父级解析栈
			 * @returns {Object} 包含状态、栈和当前输入的对象
			 */
			function _recursiveParse(currentStr, parentStack, keys) {
				if (keys == undefined) {
					keys = []
				}
				currentStr = currentStr.trim();
				var stack = parentStack.slice(); // 复制父级栈

				// === 处理数组开头 '[' ===
				if (currentStr.startsWith('[')) {
					// 判断是否是顶层数组
					var isTopLevel = parentStack.length === 0;
					// 推入对应的占位符（顶层为{...}，嵌套为[...]）
					stack.push(isTopLevel ? '{...}' : '[...]');

					// 提取数组内容（去掉开头的'['）
					var innerContent = currentStr.slice(1);
					// 按逗号分割数组元素
					var items = _splitByComma(innerContent);
					items.forEach(item => {
						let key = item.substring(0, _findTopLevelEqual(item)).trim();
						keys.push(key)
					})

					// 获取最后一个元素（当前活跃部分）
					var activeItem = items[items.length - 1].trim();

					// 如果最后一个元素为空
					if (activeItem === '') {
						if (stack[stack.length - 1] === '{...}') {
							// 对象上下文：等待键
							return { stack: stack, state: 'wait_key', currentInput: '', keys: keys };
						} else {
							// 数组上下文：等待数组元素
							return { stack: stack, state: 'wait_value_array', currentInput: '', keys: keys };
						}
					}

					// 递归解析活跃元素
					return _recursiveParse(activeItem, stack, keys);
				}

				// === 处理对象开头 '{' ===
				if (currentStr.startsWith('{')) {
					// 推入对象占位符
					stack.push('{...}');

					// 提取对象内容（去掉开头的'{'）
					var innerContent = currentStr.slice(1);
					// 按逗号分割键值对
					var pairs = _splitByComma(innerContent);
					// 获取最后一个键值对
					var activeItem = pairs[pairs.length - 1].trim();

					// 如果最后一个键值对为空
					if (activeItem === '') {
						// 等待键
						return { stack: stack, state: 'wait_key', currentInput: '', keys: keys };
					}

					// 递归解析活跃元素
					return _recursiveParse(activeItem, stack, keys);
				}

				// === 处理键值对 ===
				// 查找顶层的等号（键值对分隔符）
				var equalIndex = _findTopLevelEqual(currentStr);
				var key, value, currentInput;

				// 如果找到等号
				if (equalIndex !== -1) {
					// 分割键和值
					key = currentStr.substring(0, equalIndex).trim();
					value = currentStr.substring(equalIndex + 1).trim();
					currentInput = value;

					// 如果栈顶是对象占位符，替换为实际键名
					if (stack.length > 0 && stack[stack.length - 1] === '{...}') {
						stack.pop();
					}
					stack.push(key);

					// 如果值是嵌套结构（数组或对象）
					if (value.startsWith('[') || value.startsWith('{')) {
						// 递归解析嵌套值
						return _recursiveParse(value, stack, keys);
					} else {
						// 等待值输入
						stack.push('...');
						return {
							stack: stack,
							state: 'wait_value',
							currentInput: currentInput,
							keys: keys
						};
					}
				}
				// === 处理没有等号的字符串 ===
				else {
					// 如果是空字符串
					if (currentStr === '') {
						if (stack.length > 0 && stack[stack.length - 1] === '[...]') {
							// 在数组中等待元素
							return {
								stack: stack,
								state: 'wait_value_array',
								currentInput: '',
								keys: keys
							};
						} else {
							// 等待键
							return {
								stack: stack,
								state: 'wait_key',
								currentInput: '',
								keys: keys
							};
						}
					}

					// 如果在对象上下文中
					if (stack.length > 0 && stack[stack.length - 1] === '{...}') {
						// 等待键（用户正在输入键名）
						return {
							stack: stack,
							state: 'wait_key',
							currentInput: currentStr,
							keys: keys
						};
					}

					// 默认情况：等待值
					return {
						stack: stack,
						state: 'wait_value',
						currentInput: currentStr,
						keys: keys
					};
				}
			}

			// 开始递归解析
			var result = _recursiveParse(inputStr.trim(), []);
			// 添加调试信息
			result.debug = selectorCompleteResult.debugInfo;
			return result;
		},

		/**
		 * 为选择器参数生成补全建议列表。
		 *
		 * @param {string} input - 用户输入，用于过滤补全项。如果提供，则只包含 displayText 包含该输入的补全项。
		 * @param {string} base - 每个补全建议前缀的基础字符串。
		 * @param {Object.<string, {name: string} | string>} selectors - 选择器对象，key 为参数名，value 为包含 name 属性的对象或字符串。
		 * @returns {Object.<string, string>} 返回一个对象，key 为显示文本（格式为 "key - selectorName"），value 为对应的补全字符串。
		 */
		/**
		 * 为选择器参数生成补全建议列表。
		 *
		 * @param {string} input - 用户输入，用于过滤补全项。如果提供，则只包含 displayText 包含该输入的补全项。
		 * @param {string} base - 每个补全建议前缀的基础字符串。
		 * @param {Object.<string, {name: string} | string>} selectors - 选择器对象，key 为参数名，value 为包含 name 属性的对象或字符串。
		 * @param {string} addtext - 补全建议的后缀字符串，通常为 "=", 但是默认为"", 用于构建完整的补全字符串。
		 * @param {boolean} sort - 是否对补全建议列表进行排序。
		 * @returns {Object.<string, string>} 返回一个对象，key 为显示文本（格式为 "key - selectorName"），value 为对应的补全字符串。
		 */
		getSelectorParamCompletions: function (input, base, selectors, addtext, sort) {
			// Common.toast(`getSelectorParamCompletions(\n${JSON.stringify(input).slice(0, 10)}, \n${JSON.stringify(base).slice(0, 10)}, \n${JSON.stringify(selectors).slice(0, 10)}, \n${JSON.stringify(addtext).slice(0, 10)}\n)`)
			var completions = {};
			var sortedKeys = Object.keys(selectors);
			addtext = addtext || ""; // addtext 默认为空字符串
			sortedKeys.forEach(function (key) {
				var displayText;
				if (typeof selectors[key] === 'object' && selectors[key].name) {
					// 如果值是一个对象并且有 name 属性
					displayText = key + ' - ' + selectors[key].name;
				} else {
					// 如果值是一个字符串
					displayText = key + ' - ' + selectors[key];
				}
				if (input && displayText.indexOf(input) < 0) return;
				var newBase = base;
				if (input && newBase.endsWith(input)) {
					newBase = newBase.slice(0, -input.length);
				}
				completions[displayText] = newBase + key + addtext;
			});

			// 如果需要排序，根据 displayText 排序
			if (sort) {
				var sortedCompletions = {};
				Object.keys(completions).sort().forEach(function (key) {
					sortedCompletions[key] = completions[key];
				});
				return sortedCompletions;
			}

			return completions;
		},
		getSchemaByContext: function (contextValue, type) {
			const blockStates = this &&
				this.library &&
				this.library.states &&
				this.library.states[type] || [];

			for (var i = 0; i < blockStates.length; i++) {
				var item = blockStates[i];
				var ctx = item.context;
				if (Array.isArray(ctx)) {
					for (var j = 0; j < ctx.length; j++) {
						if (ctx[j] === contextValue) {
							return item.schema || null;
						}
					}
				}
			}
			return null;
		},
		removeKeysFromSchema: function (schema, keys) {
			// 创建 schema 的副本
			var result = JSON.parse(JSON.stringify(schema));

			keys.forEach(function (key) {
				if (result.hasOwnProperty(key)) {
					delete result[key];
				}
			});

			return result;
		}
	}
)
