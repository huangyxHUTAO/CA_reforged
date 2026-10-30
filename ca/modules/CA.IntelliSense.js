({
	UNINITIALIZED : 0,
	ONLY_COMMAND_NAME : 1,
	UNKNOWN_COMMAND : -1,
	COMMAND_WITH_PATTERN : 2,
	UNKNOWN_PATTERN : -2,

	commandText: null,
	input : [],
	output : [],
	cmdname : "",
	prompt : [],
	help : "",
	patterns : [],
	mode : 0,
	last : {},
	// jsonPro 参数的 JSON Language Service 实例缓存（按 schema 名）
	jsonLanguageServices : {},
	callDelay : function self(s) {
		if (CA.settings.iiMode != 2 && CA.settings.iiMode != 3) return;
		if (!self.pool) {
			self.pool = java.util.concurrent.Executors.newCachedThreadPool();
			self.pool.setMaximumPoolSize(1);
			self.pool.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.DiscardPolicy());
		}
		self.pool.execute(function() {
			CA.IntelliSense.proc(s);
		});
	},
	apply : function() {
		if (this.ui) this.show.apply(this);
	},
	proc : function(s) {try {
		if (CA.settings.iiMode != 2 && CA.settings.iiMode != 3 || CA.Library.loadingStatus) return;
		if (this.commandText == s) return;
		this.commandText = s;
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
	} catch(e) {
		erp(e, true);
		Common.showTextDialog("当前命令库解析出错。\n" + e + (e instanceof Error ? "\n堆栈：\n" + e.stack : ""));
	}},
	procCmd : function(s) {
		var c, ca, t, i, pp, r;

		//分析命令结构 - 拆分
		c = /^(\/)?(\S*)(\s+)?(.*)/.exec(s);
		if (!c) return; //c = [匹配文本, 是否存在/, 命令名称, 是否存在命令名称后的空格, 命令参数]

		r = {
			source : c[0],
			cmdname : c[2],
			hasSlash : Boolean(c[1]),
			strParam : c[4],
			input : [],
			output : {},
			prompt : [],
			patterns : [],
			help : null,
			canFinish : false
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
			ca = Object.keys(t).filter(function(e, i, a) {
				return e.indexOf(c[2]) >= 0 || t[e].indexOf(c[2]) >= 0;
			}).sort();

			if (ca.length) {
				//分类 - 可选命令长度大于0

				ca.forEach(function(e, i, a) {
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
					r.output[t.description ? e + " - "  + t.description : e] = (r.hasSlash ? "/" : "") + e + (t.noparams ?  "" : " ");
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
	procParams : function(c) {
		var i, j, cm = this.library.commands[c.cmdname], ps, pa, ci, cp, t, f = true, k, u, ms, pp, cpl = [], nn = false, erm = [],
			parsedParams = [], paramStart;

		//别名处理
		while (cm.alias) cm = this.library.commands[cm.alias];

		c.help = cm.help ? cm.help : "该命令帮助还未上线";
		ps = cm.patterns;
		c.canFinish = false;

		//对每一种模式进行判断
		for (i in ps) {
			pa = ps[i].params;
			ci = 0;
			parsedParams = [];

			//重置提示
			pp = new G.SpannableStringBuilder((c.hasSlash ? "/" : "") + c.cmdname);
			cpl.length = 0;

			//逐部分匹配参数
			for (j = 0; j < pa.length; j++) {
				cp = pa[j];

				//匹配参数
				paramStart = ci;
				t = this.matchParam(cp, c.strParam.slice(ci), parsedParams);

				if (t && t.length >= 0 && ((/^\s?$/).test(c.strParam.slice(ci += t.length, ++ci)))) {
					//分类 - 匹配成功
					ci += (/^\s*/).exec(c.strParam.slice(ci))[0].length;
					//记下这个参数的值，给后续参数当上下文（方块状态要靠方块 id 找 schema）
					t2 = c.strParam.slice(paramStart, paramStart + t.length).trim();
					if (t2) parsedParams.push(t2);

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
								desp : "未结束的参数",
								count : j,
								pp : pp
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
							desp : !t ? null : t.length >= 0 ? "字符多余：" + c.strParam.slice(ci - 1) : t.description,
							count : j,
							pp : pp
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
			erm.sort(function(a, b) {
				return b.count - a.count;
			});
			erm.forEach(function(e) {
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
	matchParam : function(cp, ps, parsedParams) {
		var i, r, t, t2, t3, t4;
		switch (cp.type) {
			case "text":
			case "rawjson":
			r = {
				length : ps.length,
				canFinish : true
			};
			break;

			case "nbt":
			case "json":
			r = {
				input : ["插入JSON"],
				menu : {
					"插入JSON" : function() {
						CA.IntelliSense.assistJSON(cp);
					}
				},
				length : ps.length,
				canFinish : true
			};
			break;

			case "jsonPro":
				var schema = this.library.jsonSchema[cp.schema];
				if (!schema) {
					r = {
						length: ps.length,
						canFinish: false,
						description: "找不到Schema: " + cp.schema
					};
					break;
				}

				// 获取或创建缓存的 Language Service
				var ls = this.jsonLanguageServices[cp.schema];
				if (!ls) {
					ls = JSONLanguageService.getLanguageService({
						schemaRequestService: function (uri) { return null; }
					});
					ls.configure({
						schemas: [{
							uri: 'ca://' + cp.schema + '.json',
							fileMatch: ['ca://json.json'],
							schema: schema
						}]
					});
					this.jsonLanguageServices[cp.schema] = ls;
				}

				// 计算光标位置
				var cursorOffset = cp._cursorOffset !== undefined ? cp._cursorOffset : ps.length;
				if (cursorOffset < 0) cursorOffset = 0;
				if (cursorOffset > ps.length) cursorOffset = ps.length;

				// 创建 TextDocument 并获取补全
				var doc = JSONLanguageService.TextDocument.create('ca://json.json', 'json', 1, ps);
				var jsonDoc = ls.parseJSONDocument(doc);
				var completions = null;
				try {
					var completionResult = ls.doComplete(doc, { line: 0, character: cursorOffset }, jsonDoc);
					completions = completionResult && completionResult.value ? completionResult.value : completionResult;
				} catch (e) {
					Log.e('doComplete 错误: ' + e);
				}

				// 如果光标在 score.name 字段，添加选择器补全
				var selectorNode = null;
				if (jsonDoc.root && cursorOffset >= 0 && cursorOffset <= ps.length) {
					selectorNode = JSONLanguageService.findNodeAtOffset(jsonDoc.root, cursorOffset, true);
				}
				if (selectorNode && selectorNode.parent && selectorNode.parent.type === 'property' && selectorNode.parent.keyNode && selectorNode.parent.keyNode.value === 'name') {
					var prop = selectorNode.parent;
					var scoreObj = prop.parent;
					if (scoreObj && scoreObj.type === 'object' && scoreObj.parent && scoreObj.parent.type === 'property' && scoreObj.parent.keyNode && scoreObj.parent.keyNode.value === 'score') {
						var valueNode = prop.valueNode || selectorNode;
						var valueStart = valueNode.offset;
						var valueEnd = valueNode.offset + valueNode.length;
						var nameValue = ps.substring(valueStart, valueEnd);
						if (nameValue.length >= 2 && nameValue[0] === '"' && nameValue[nameValue.length - 1] === '"') {
							nameValue = nameValue.substring(1, nameValue.length - 1);
						}
						var selResult = this.procSelector({}, nameValue);
						if (selResult && selResult.recommend) {
							if (!completions) completions = { items: [] };
							if (!completions.items) completions.items = [];
							for (var selKey in selResult.recommend) {
								var selVal = selResult.recommend[selKey];
								var escapedVal = selVal.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
								var newText = '"' + escapedVal + '"';
								var selCursor = valueStart + 1 + escapedVal.length;
								if (escapedVal.indexOf('=') >= 0) {
									selCursor = valueStart + 1 + escapedVal.indexOf('=') + 1;
								}
								completions.items.push({
									label: selKey,
									insertText: newText,
									textEdit: {
										range: { start: { line: 0, character: valueStart }, end: { line: 0, character: valueEnd } },
										newText: newText
									},
									_selectorCursor: selCursor
								});
							}
						}
					}
				}

				// 通用 ca:parser 处理：根据 Schema 自定义属性调用项目解析器
				try {
					var matchingSchemas = jsonDoc.getMatchingSchemas(schema, cursorOffset);
					var parserType = null;
					var parserNode = null;
					for (var mi = 0; mi < matchingSchemas.length; mi++) {
						var ms = matchingSchemas[mi];
						if (ms.schema && ms.schema['ca:parser']) {
							parserType = ms.schema['ca:parser'];
							parserNode = ms.node;
							break;
						}
					}
					if (parserType) {
						var parserItems = this.getParserCompletions(parserType, ps, cursorOffset, parserNode);
						if (parserItems && parserItems.length > 0) {
							if (!completions) completions = { items: [] };
							if (!completions.items) completions.items = [];
							for (var pi = 0; pi < parserItems.length; pi++) {
								completions.items.push(parserItems[pi]);
							}
						}
					}
				} catch (e) {
					// 解析器补全失败不影响主流程
				}

				// 转换结果
				r = {
					length: ps.length,
					canFinish: false,
					input: [],
					output: {},
					prompt: []
				};
				var completionLabels = [];

				if (completions && completions.items) {
					completions.items.forEach(function (item) {
						var label = item.label;
						var newText = item.insertText || label;
						var start = cursorOffset;
						var end = cursorOffset;

						if (item.textEdit) {
							newText = item.textEdit.newText;
							start = item.textEdit.range.start.character;
							end = item.textEdit.range.end.character;
						}

						// 计算光标位置（基于 Snippet 占位符 $1）
						var snippetText = item.textEdit ? item.textEdit.newText : item.insertText;
						var cursorInParam = start;
						if (item._selectorCursor !== undefined) {
							cursorInParam = item._selectorCursor;
						} else if (snippetText && snippetText.indexOf('$1') >= 0) {
							cursorInParam = start + snippetText.indexOf('$1');
						} else {
							cursorInParam = start + newText.length;
						}

						// 去掉 Snippet 占位符 
						newText = newText.replace(/\$\d+/g, '');

						// 记录是否是对象/数组插入（必须在逗号补全之前记录）
						var isObjectOrArray = newText.length > 0 && (newText[0] === '{' || newText[0] === '[');

						// 计算替换后的完整参数
						// 自动补全逗号（当插入对象/数组且前面是 } 或 ] 时）
						if (isObjectOrArray && start > 0) {
							var prevChar = ps[start - 1];
							if (prevChar === "}" || prevChar === "]") {
								newText = "," + newText;
								cursorInParam++;
							}
						}

						var replacedParam = ps.substring(0, start) + newText + ps.substring(end);

						// 获取字段说明（来自 Schema 的 description）
						var displayLabel = label;
						var desc = item.detail;

						// 补全项 detail 中文映射（detail 才是 "New object"/"New array"）
						if (desc === 'New object') desc = '新建对象';
						else if (desc === 'New array') desc = '新建数组';
						if (!desc && item.documentation) {
							if (typeof item.documentation === 'string') {
								desc = item.documentation;
							} else if (item.documentation.value) {
								desc = item.documentation.value;
							}
						}
						if (desc) {
							displayLabel = label + " - " + desc.split('\n')[0];
						}

						// 模拟检测：插入后在光标位置是否还有补全选项
						// 如果插入的是对象/数组，但光标位置不合法，则过滤掉
						var isValidCompletion = true;
						if (isObjectOrArray) {
							var simDoc = JSONLanguageService.TextDocument.create('ca://json.json', 'json', 1, replacedParam);
							var simJsonDoc = ls.parseJSONDocument(simDoc);
							// 如果光标在根节点范围外部，说明这个位置不合法
							if (simJsonDoc.root && cursorInParam > simJsonDoc.root.offset + simJsonDoc.root.length) {
								isValidCompletion = false;
							} else {
								var simResult = ls.doComplete(simDoc, { line: 0, character: cursorInParam }, simJsonDoc);
								var simCompletions = simResult && simResult.value ? simResult.value : simResult;
								if (!simCompletions || !simCompletions.items || simCompletions.items.length === 0) {
									isValidCompletion = false;
								}
							}
						}

						if (isValidCompletion) {
							completionLabels.push(displayLabel);
							r.output[displayLabel] = {
								text: replacedParam,
								cursor: cursorInParam
							};
						}
					});
				}

				// 引号/括号扫描 + 闭合检测 + 字段导航（合并为一次扫描）
				var unclosed = [];
				var stringPositions = [];
				var navLabels = [];
				var inQuote = false, escapeNext = false;
				for (var idx = 0; idx < ps.length; idx++) {
					var ch = ps[idx];
					if (escapeNext) { escapeNext = false; continue; }
					if (ch === '\\') { escapeNext = true; continue; }
					if (ch === '"') {
						if (!inQuote) {
							inQuote = true;
							unclosed.push('quote');
							stringPositions.push(idx + 1); // 字符串内容起始位置（引号后）
						} else {
							inQuote = false;
							unclosed.pop();
						}
						continue;
					}
					if (!inQuote) {
						if (ch === '{') unclosed.push('brace');
						else if (ch === '}') {
							for (var j = unclosed.length - 1; j >= 0; j--) {
								if (unclosed[j] === 'brace') { unclosed.splice(j, 1); break; }
							}
						}
						else if (ch === '[') unclosed.push('bracket');
						else if (ch === ']') {
							for (var j = unclosed.length - 1; j >= 0; j--) {
								if (unclosed[j] === 'bracket') { unclosed.splice(j, 1); break; }
							}
						}
					}
				}

				// 闭合提示（一次只闭合最内层的一个）
				var closeLabels = [];
				var lastUnclosed = unclosed.length > 0 ? unclosed[unclosed.length - 1] : null;
				if (lastUnclosed === 'quote') {
					closeLabels.push('" - 闭合引号');
					r.output['" - 闭合引号'] = { text: ps + '"', cursor: ps.length + 1 };
				} else if (lastUnclosed === 'brace') {
					closeLabels.push('} - 闭合对象');
					r.output['} - 闭合对象'] = { text: ps + '}', cursor: ps.length + 1 };
				} else if (lastUnclosed === 'bracket') {
					closeLabels.push('] - 闭合数组');
					r.output['] - 闭合数组'] = { text: ps + ']', cursor: ps.length + 1 };
				}
				if (stringPositions.length > 0) {
					var prevPos = -1, nextPos = -1;
					for (var si = 0; si < stringPositions.length; si++) {
						if (stringPositions[si] < cursorOffset) prevPos = stringPositions[si];
						if (stringPositions[si] > cursorOffset && nextPos < 0) nextPos = stringPositions[si];
					}
					// 边界回退（循环）
					if (prevPos < 0) prevPos = stringPositions[stringPositions.length - 1];
					if (nextPos < 0) nextPos = stringPositions[0];

					navLabels.push('◀ 上一个字段');
					r.output['◀ 上一个字段'] = { text: ps, cursor: prevPos };
					navLabels.push('▶ 下一个字段');
					r.output['▶ 下一个字段'] = { text: ps, cursor: nextPos };
				}

				// JSON 报错检测
				var errorLabel = null;
				var allErrors = [];
				// 语法错误（jsonc-parser）
				if (jsonDoc.errors && jsonDoc.errors.length > 0) {
					jsonDoc.errors.forEach(function(err) {
						var errMsg = "JSON语法错误";
						switch (err.error) {
							case 1: errMsg = "非法符号"; break;
							case 3: errMsg = "缺少属性名"; break;
							case 4: errMsg = "缺少值"; break;
							case 5: errMsg = "缺少冒号"; break;
							case 6: errMsg = "缺少逗号"; break;
							case 7: errMsg = "缺少右大括号"; break;
							case 8: errMsg = "缺少右中括号"; break;
							case 12: errMsg = "字符串未闭合"; break;
						}
						allErrors.push({ offset: err.offset, message: errMsg });
					});
				}
				// Schema 验证错误
				var validationResult = ls.doValidation(doc, jsonDoc);
				var diagnostics = validationResult && validationResult.value ? validationResult.value : validationResult;
				if (diagnostics && diagnostics.length > 0) {
					diagnostics.forEach(function(d) {
						if (d.severity === 1) { // Error
							var errMsg = d.message;
							// 这里的错误信息比较长且不友好，做个映射转换一下
							switch (errMsg) {
								case 'Expected a JSON object, array or literal.': errMsg = '需要 对象、数组、字面量'; break;
								case 'End of file expected.': errMsg = '需要文件结束符'; break;
								case 'Value expected': errMsg = '需要值'; break;
								case 'Property expected': errMsg = '需要属性名'; break;
								case 'Expected comma': errMsg = '需要 ,'; break;
								case 'Expected comma or closing bracket': errMsg = '需要 , 或 ]'; break;
								case 'Expected comma or closing brace': errMsg = '需要 , 或 }'; break;
								case 'Colon expected': errMsg = '需要 :'; break;
								case 'Trailing comma': errMsg = '多余的 ,'; break;
								case 'Property keys must be doublequoted': errMsg = '属性名必须用" "包裹'; break;
								case 'Invalid number format.': errMsg = '数字格式无效'; break;
								case 'Invalid unicode sequence in string.': errMsg = '字符串中的 Unicode 序列无效'; break;
								case 'Invalid escape character in string.': errMsg = '字符串中的转义字符无效'; break;
								case 'Unexpected end of string.': errMsg = '字符串未闭合'; break;
								case 'Unexpected end of comment.': errMsg = '注释未闭合'; break;
								case 'Unexpected end of number.': errMsg = '数字未结束'; break;
								case 'Invalid characters in string. Control characters must be escaped.': errMsg = '字符串中包含非法字符'; break;
								case 'Duplicate object key': errMsg = '重复的对象键'; break;
							}
							allErrors.push({ offset: d.range.start.character, message: errMsg });
						}
					});
				}
				var errorNavLabel = null;
				if (allErrors.length > 0) {
					allErrors.sort(function(a, b) { return a.offset - b.offset; });
					var firstError = allErrors[0];
					var pp = new G.SpannableStringBuilder();
					appendSSB(pp, "JSON错误：" + firstError.message + " (位置: " + firstError.offset + ")", new G.ForegroundColorSpan(Common.theme.criticalcolor));
					r.prompt.push(pp);
					errorNavLabel = '跳到报错位置';
					r.output[errorNavLabel] = { text: ps, cursor: firstError.offset };
				}

				// 组装列表顺序：导航 → 补全 → 闭合 → 报错跳转
				r.input = navLabels.concat(completionLabels, closeLabels);
				if (errorNavLabel) r.input.push(errorNavLabel);

				// CA 的 output 约定是「字符串」：proc 里会做 u + output[k]。
				// 社区版这里给的是 { text, cursor } 对象，直接拼会变成 "[object Object]"，
				// 所以统一降级成字符串（光标只能落在末尾，暂时放弃精确跳转）。
				Object.keys(r.output).forEach(function(k) {
					var v = r.output[k];
					if (v && typeof v === "object" && typeof v.text === "string") {
						r.output[k] = v.text;
					}
				});
				break;


			case "status":
			// 方块状态补全（param 形如 {"type":"status","subject":"block"}）
			// 输入形如 [facing_direction=1, ...]，必须以 [ 开头且不跨空格
			var recommend = {}, recommendEnums = {}, selResult, contextValue, curInput, stateSchema, pathArr, selKeys,
				subParam, subRec, prefix, rk, ek;
			r = {
				length : ps.length,
				canFinish : false,
				recommend : {},
				input : []
			};
			if (ps.charAt(0) !== "[") {
				// 没在写方块状态
				r.length = 0;
				r.canFinish = true;
				break;
			}
			selResult = this.parseSelectorPath(ps);
			if (selResult.state == "complete") {
				r.length = selResult.debug.selectorEnd;
				r.canFinish = true;
				return r;
			}
			// 上下文取上一个参数的原始值（比如 setblock 的方块 id）
			contextValue = (parsedParams && parsedParams.length) ? parsedParams[parsedParams.length - 1] : "";
			curInput = selResult.currentInput || "";
			stateSchema = this.getSchemaByContext(contextValue, cp.subject);
			if (!stateSchema) {
				stateSchema = {};
				r.description = "无法找到该命令的状态参数信息";
			}
			pathArr = selResult.stack ? selResult.stack.slice() : [];
			selKeys = selResult.keys;
			if (selResult.state == "wait_key") {
				recommendEnums = this.getSelectorParamCompletions(curInput, ps, this.removeKeysFromSchema(stateSchema, selKeys), "=");
			} else if (selResult.state == "wait_value") {
				if (curInput.length >= 1) {
					recommend[", - 下一个参数"] = ps + ",";
					recommend["] - 结束参数"] = ps + "] ";
				}
				if (pathArr[pathArr.length - 2] && stateSchema[pathArr[pathArr.length - 2]]) {
					subParam = this.matchParam(stateSchema[pathArr[pathArr.length - 2]], curInput, []);
					subRec = (subParam && (subParam.output || subParam.recommend)) || {};
					prefix = ps.slice(0, ps.lastIndexOf("=") + 1);
					for (rk in subRec) {
						if (subRec.hasOwnProperty(rk)) recommendEnums[rk] = prefix + subRec[rk];
					}
				}
			}
			for (ek in recommendEnums) {
				if (recommendEnums.hasOwnProperty(ek)) recommend[ek] = recommendEnums[ek];
			}
			r.recommend = recommend;
			r.input = Object.keys(recommend);
			break;

			case "plain":
			t = cp.name;
			if (cp.prompt) t += " - " + cp.prompt;
			r = {
				input : [t],
				output : {}
			};
			r.output[t] = cp.name;
			if (ps.startsWith(cp.name + " ") || ps == cp.name) {
				r.length = cp.name.length;
				r.canFinish = true;
			} else if (cp.name.indexOf(ps) >= 0 || cp.prompt && cp.prompt.indexOf(ps) >= 0) {
				r.length = ps.length;
				r.canFinish = false;
			} else return {
				description : "不可为" + ps
			};
			break;

			case "selector":
			r = this.procSelector(cp, ps);
			if (!r || !(r.length >= 0)) return r;
			break;

			case "uint":
			t = ps.search(" ") < 0 ? ps : ps.slice(0, ps.search(" "));
			if (!(/^\d*$/).test(t)) return {
				description : t + "不是自然数"
			};
			r = {
				length : t.length,
				canFinish : t.length > 0
			};
			break;

			case "int":
			t = ps.search(" ") < 0 ? ps : ps.slice(0, ps.search(" "));
			if (!(/^(\+|-)?\d*$/).test(t)) return {
				description : t + "不是整数"
			};
			r = {
				length : t.length,
				canFinish : t.length && !isNaN(t)
			};
			break;

			case "float":
			t = ps.search(" ") < 0 ? ps : ps.slice(0, ps.search(" "));
			if (!(t2 = (/^(\+|-)?(\d*\.)?(\d)*$/).exec(t))) return {
				description : t + "不是数值"
			};
			r = {
				length : t.length,
				canFinish : t.length && t2[3]
			};
			break;

			case "relative":
			t = ps.search(" ") < 0 ? ps : ps.slice(0, ps.search(" "));
			if (!(t2 = (/^(~)?((\+|-)?(\d*\.)?(\d)*)$/).exec(t))) return {
				description : t + "不是数值"
			};
			r = {
				length : t.length,
				input : ["~ - 相对标识符"],
				assist : {
					"~ - 相对标识符" : "~"
				},
				canFinish : t2[5] || t2[1] && !t2[2].length
			};
			break;

			case "position":
			r = this.procPosition(cp, ps);
			if (!r || !(r.length >= 0)) return r;
			break;

			case "custom":
			t = new RegExp(cp.input, "").exec(ps);
			if (!t) return {
				description : t + "不满足指定的条件"
			};
			r = {
				length : t[0].length,
				canFinish : new RegExp(cp.finish, "").test(ps)
			};
			break;

			case "enum":
			if (!(t = cp.list instanceof Object ? cp.list : this.library.enums[cp.list])) {
				throw new Error("无法找到指定枚举类型");
			}
			r = {
				output : {},
				canFinish : false,
				length : -1
			};
			if (Array.isArray(t)) { //这个懒得用matchString了
				r.input = t.filter(function(e, i, a) {
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
				// 分类放到 Accel.classify：Java 里一次算完，JS 侧只做位测试，
				// 不再对每个候选做两次字符串查找（没有 jar 时走等价 JS 实现）
				var __keys = Object.keys(t), __descs = [], __i, __e, __d, __flags, __f;
				for (__i = 0; __i < __keys.length; __i++) __descs.push(t[__keys[__i]]);
				__flags = Accel.classify(__keys, __descs, ps);
				for (__i = 0; __i < __keys.length; __i++) {
					__f = __flags[__i];
					if (__f === 0) continue;
					__e = __keys[__i];
					if (__f === 1) {
						r.length = Math.max(r.length, __e.length);
						r.canFinish = true;
					} else {
						r.length = Math.max(r.length, ps.length);
					}
					__d = t[__e];
					if (__d) {
						r.output[__e + " - " + __d] = __e;
						r.input.push(__e + " - " + __d);
					} else {
						r.output[__e] = __e;
						t2.push(__e);
					}
				}
				r.input.sort(); t2.sort(); r.input = r.input.concat(t2);
			}
			if (r.length < 0) {
				r.description = ps + "不是有效的元素";
			}
			break;

			case "command":
			t = this.procCmd(ps);
			if (!t) return {
				description : "不是合法的命令格式"
			};
			t2 = t.prompt[0];
			t3 = t2.toString().indexOf("\n");
			r = {
				length : t.mode < 0 ? -1 : t.source.length,
				input : t.input,
				output : {},
				menu : {},
				canFinish : t.canFinish,
				description : String(t2.subSequence(t3 + 1, t2.length())),
				tag : t2.subSequence(0, t3)
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
			t = {
				source : cp.mainCommand + " " + ps,
				cmdname : cp.mainCommand,
				hasSlash: false,
				strParam : ps,
				input : [],
				output : {},
				prompt : [],
				patterns : [],
				help : null,
				canFinish : false
			};
			this.procParams(t);
			t2 = t.prompt[0];
			t3 = t2.toString().indexOf("\n");
			r = {
				length : t.mode < 0 ? -1 : ps.length,
				input : t.input,
				output : {},
				menu : {},
				canFinish : t.canFinish,
				description : String(t2.subSequence(t3 + 1, t2.length())),
				tag : t2.subSequence(t.cmdname.length + 1, t3)
			}
			for (i in t.output) {
				if (t.output[i] instanceof Function) {
					r.menu[i] = t.output[i];
				} else {
					r.output[i] = t.output[i].slice(t.cmdname.length + 1);
				}
			}
			break;

			case "string":
			t = ps.search(" ") < 0 ? ps : ps.slice(0, ps.search(" "));
			r = {
				length : t.length,
				canFinish : t.length > 0
			};
			break;

			default:
			t = ps.search(" ") < 0 ? ps : ps.slice(0, ps.search(" "));
			r = {
				length : t.length,
				canFinish : true
			};
		}
		if (!cp.suggestion) return r;
		t = cp.suggestion instanceof Object ? cp.suggestion : this.library.enums[cp.suggestion];
		t2 = ps.slice(0, r.length);
		this.matchString(t2, t, r);
		return r;
	},
	getParamTag : function(cp, ms, mt, md) { //匹配模式，匹配字符串，匹配类型（已输入、输入中、未输入、出错），matchParam返回的匹配数据
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
				z += ":子命令";
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
	procSelector : function(cp, ps) {
		var c = (/^@(p|e|a|r|s|)(\[)?([^\s\]]*)(\])?(\s)?/).exec(ps), ml, t, i, pl, ms, rx, ls, cp2, mr, bb, sk = false;
		//[全文, 选择器类型, "[", 修饰符, "]", 后置空格]
		if (!c) {
			//正在输入@ / 输入的是玩家名
			t = {
				length : (ms = ps.search(" ") < 0 ? ps : ps.slice(0, ps.search(" "))).length,
				recommend : {},
				canFinish : ps.length > 0
			};
			if (!(/^[^@\^~]*$/).test(ms) || ms.length && !isNaN(ms)) return {
				description : ms + "不是合法的玩家名或选择器"
			};
			if (cp.target == "entity" || cp.target == "player") {
				t.recommend["@a - 选择所有玩家"] = "@a";
				t.recommend["@p - 选择距离最近的玩家"] = "@p";
				t.recommend["@r - 选择随机玩家"] = "@r";
			}
			if (cp.target == "entity" || cp.target == "nonplayer") t.recommend["@e - 选择所有实体"] = "@e";
			if (cp.target != "nonselector") t.recommend["@s - 选择命令执行者"] = "@s";
			t.input = Object.keys(t.recommend);
			if (MCAdapter.available()) {
				t.output = {};
				pl = MCAdapter.getInfo("playernames");
				if (pl) {
					for (i in pl) if (String(pl[i]).startsWith(ms)) t.output[pl[i]] = String(pl[i]);
					t.input = t.input.concat(Object.keys(t.output));
				}
			} else MCAdapter.applySense(t);
		} else if (c[1].length < 1) {
			//正在输入p/e/a/r
			t = {
				length : 1,
				recommend : {
					"@a - 选择所有玩家" : "@a",
					"@p - 选择距离最近的玩家" : "@p",
					"@r - 选择随机玩家" : "@r",
					"@s - 选择命令执行者" : "@s"
				},
				canFinish : false
			};
			if (cp.target == "entity") t.recommend["@e - 选择所有实体"] = "@e";
			t.input = Object.keys(t.recommend);
		} else if (c[1].length == 1 && !c[2]) {
			//正在输入[ / 结束
			t = {
				length : 2,
				assist : {
					"[...] - 插入参数" : "["
				},
				input : ["[...] - 插入参数"],
				canFinish : true
			};
		} else if(c[2] && !c[4] && !c[5]) {
			//正在输入修饰符
			t = {
				length : 3 + c[3].length,
				recommend : {},
				output : {},
				menu : {},
				input : [],
				canFinish : false
			};
			ml = c[3].split(",");
			pl = {};
			ls = ml.pop();
			bb = ps.slice(0, ps.length - ls.length);
			if (ml.length < 4 && ml.length > 0) {
				sk = true;
				rx = /^(\+|-)?(\d*\.)?\d+$/;
				for (i in ml) { //特殊情况
					sk = sk && rx.test(ml[i]);
				}
			}
			if (!sk) rx = /^([^\=]+)(\=)(.*)$/;
			for (i in ml) { //检验之前的参数，此处需更新
				if (!(ms = rx.exec(ml[i]))) return {
					description : ml[i] + "不是合法的选择器参数对"
				};
				if (sk) continue;
				if (!(cp2 = this.library.selectors[ms[1]])) continue;
				if (cp2.hasInverted && ms[3].search(/^!/) == 0) {
					ms[3] = ms[3].slice(1);
				} else pl[ms[1]] = true;
				mr = this.matchParam(cp2, ms[3] + " ");
				if (!mr || !(mr.length >= 0)) {
					return {
						description : mr ? mr.description : ml[i] + "不是合法的选择器参数对"
					};
				} else if (mr.length < ms[3].length || !mr.canFinish) return {
					description : "未结束的选择器参数：" + ms[3]
				};
			}
			rx = sk ? /^(\+|-)?(\d*\.)?\d*$/ : /^([^\=]*)(\=)?(.*)$/;
			if (!(ms = rx.exec(ls))) return {
				description : ls + "不是合法的选择器参数对"
			};
			if (sk) { // 特殊处理
				t.recommend[", - 下一个参数"] = bb + ls + ",";
				t.output["] - 结束参数"] = bb + ls + "]";
				t.input.push(", - 下一个参数", "] - 结束参数");
				return t;
			}
			if (ms[2]) { // 输入修饰符内容
				if (!ms[1]) return {
					description : ls + "缺少等号"
				};
				bb += ms[1] + ms[2];
				if (cp2 = this.library.selectors[ms[1]]) {
					if (cp2.hasInverted) {
						if (ms[3].startsWith("!")) {
							ms[3] = ms[3].slice(1);
							bb += "!";
						} else {
							if (!ms[3]) {
								t.recommend["! - 反向选择"] = bb + "!";
								t.input.push("! - 反向选择");
							}
						}
					}
					mr = this.matchParam(cp2, ms[3]);
					if (!mr || mr.length < ms[3].length) return {
						description : mr ? mr.description : ls + "不是合法的选择器参数对"
					};
					if (mr.canFinish) {
						t.recommend[", - 下一个参数"] = bb + ms[3] + ",";
						t.output["] - 结束参数"] = bb + ms[3] + "]";
						t.input.push(", - 下一个参数", "] - 结束参数");
					}
					for (i in mr.assist) if (!(i in t.recommend)) t.recommend[i] = ps + mr.assist[i];
					for (i in mr.recommend) if (!(i in t.recommend)) t.recommend[i] = bb + mr.recommend[i];
					for (i in mr.output) if (!(i in t.recommend)) t.recommend[i] = bb + mr.output[i];
					for (i in mr.menu) if (!(i in t.menu)) t.menu[i] = mr.menu[i];
					for (i in mr.input) if (t.input.indexOf(mr.input[i]) < 0) t.input.push(mr.input[i]);
				} else {
					t.recommend[", - 下一个参数"] = bb + ms[3] + ",";
					t.output["] - 结束参数"] = bb + ms[3] + "]";
					t.input.push(", - 下一个参数", "] - 结束参数");
				}
			} else { //输入修饰符名称
				if (ms[1]) {
					t.recommend["= - 输入参数"] = bb + ms[1] + "=";
					t.input.push("= - 输入参数");
				}
				Object.keys(this.library.selectors).forEach(function(e, i, a) {
					if (!e.startsWith(ms[1])) return;
					if (pl[e]) return;
					t.recommend[e + " - " + this.library.selectors[e].name] = bb + e + "=";
					t.input.push(e + " - " + this.library.selectors[e].name);
				}, this);
			}
		} else if (c[4]) {
			//输入完毕
			t = {
				length : (ms = ps.search(" ") < 0 ? ps : ps.slice(0, ps.search(" "))).length,
				canFinish : true
			};
		} else return {
			description : c[0] + "不是合法的选择器"
		};
		return t;
	},
	procPosition : function(cp, ps) {
		var l = ps.split(/\s+/), f = true, uv = false, i, n = Math.min(l.length, 3), t, pp, t2, t3;
		for (i = 0; i < n; i++) {
			if (i == 0 && l[0].startsWith("^") && CA.hasFeature("enableLocalCoord")) uv = true;
			if (!(t = (uv ? /^(?:(\^)((\+|-)?(\d*\.)?\d*))?$/ : /^(~)?((\+|-)?(\d*\.)?\d*)$/).exec(l[i]))) return {
				description : l[i] + "不是合法的坐标值"
			};
			if ((!t[1] || t[2]) && !(/^(\+|-)?(\d*\.)?\d+$/).test(t[2])) if (i == n - 1) {
				f = false;
			} else return {
				description : l[i] + "不是合法的坐标值"
			};
		}
		t = {
			length : n == 3 && l[2].length > 0 ? (/^\S+\s+\S+\s+\S+/).exec(ps)[0].length : ps.length,
			input : [],
			assist : {},
			canFinish : f && n == 3,
			uv : uv
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
		} else MCAdapter.applySense(t);
		return t;
	},
	matchString : function(ps, a, r) {
		// 匹配实现在 modules/Accel.js：有 jar 走 Java，没有走那里的等价 JS 实现
		return Accel.matchString(ps, a, r);
	},
	assistJSON : function(param) {
		CA.Assist.editParamJSON({
			param : param
		}, function(text) {
			CA.cmd.getText().append(text);
		});
	},
	showHelp : function() {
		var pp = new G.SpannableStringBuilder();
		this.source = "/help";
		this.cmdname = "help";
		this.hasSlash = true;
		this.strParam = "";
		this.output = {
			"设置" : function() {
				CA.showSettings();
			},
			"关于命令助手..." : function() {
				if (CA.settings.splitScreenMode) return;
				CA.showAssist.linear.setTranslationX(CA.showAssist.tx = -CA.showAssist.screenWidth);
				CA.showAssist.hCheck();
				if (CA.settings.noAnimation) return;
				var animation = new G.TranslateAnimation(G.Animation.ABSOLUTE, CA.showAssist.screenWidth, G.Animation.ABSOLUTE, 0, G.Animation.RELATIVE_TO_SELF, 0, G.Animation.RELATIVE_TO_SELF, 0);
				animation.setDuration(200);
				CA.showAssist.linear.startAnimation(animation);
			},
			"查看中文Wiki" : function() {
				try {
					AndroidBridge.startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://minecraft-zh.gamepedia.com/%E5%91%BD%E4%BB%A4"))
						.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
				} catch(e) {
					Common.showWebViewDialog({
						url : "https://minecraft-zh.gamepedia.com/%E5%91%BD%E4%BB%A4"
					});
				}
			},
			"意见反馈" : function() {
				GiteeFeedback.showFeedbacks();
			}
		};
		this.input = Object.keys(this.output);
		pp.append("命令助手 - 设置 & 关于\n");
		appendSSB(pp, "（这个命令的用途是显示帮助，不过你有这个工具就不需要帮助了吧）", new G.ForegroundColorSpan(Common.theme.promptcolor));
		this.prompt = [pp];
		this.help = "https://ca.projectxero.top/blog/about/";
		this.patterns = [];
		return this.apply();
	},
	show : function self() {G.ui(function() {try {
		if (CA.IntelliSense.ui) return;
		if (!self.prompt) {
			self.adptcon = null;
			self.apply = function(z) {G.ui(function() {try {
				self.prompt.setText(z.prompt[0] || "");
				try {
					new java.net.URL(z.help);
					CA.showAssist.postHelp(0, z.help);
				} catch(e) {
					CA.showAssist.postHelp(1, z.help || "暂时没有帮助，以后会加上的啦");
				}
				if (self.adptcon) {
					self.adptcon.setArray(z.input);
				} else {
					var a = new SimpleListAdapter(z.input.slice(), self.vmaker, self.vbinder, null, true);
					self.adptcon = SimpleListAdapter.getController(a);
					self.list.setAdapter(a);
				}
			} catch(e) {erp(e)}})}
			self.vmaker = function(holder) {
				var view = new G.TextView(ctx);
				view.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				Common.applyStyle(view, "textview_default", 3);
				return view;
			}
			self.vbinder = function(holder, s, i, a) {
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
			self.list.setOnItemClickListener(new G.AdapterView.OnItemClickListener({onItemClick : function(parent, view, pos, id) {try {
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
			} catch(e) {erp(e)}}}));
			self.list.setOnItemLongClickListener(new G.AdapterView.OnItemLongClickListener({onItemLongClick : function(parent, view, pos, id) {try {
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
			} catch(e) {return erp(e), true}}}));
			self.list.addOnLayoutChangeListener(new G.View.OnLayoutChangeListener({onLayoutChange : function(v, l, t, r, b, ol, ot, or, ob) {try {
				var t = (b - t > Common.theme.textsize[3] * G.sp * 8) || CA.settings.keepWhenIME;
				if (self.keep == t) return;
				self.keep = t;
				if (t) {
					self.prompt.setPadding(20 * G.dp, 10 * G.dp, 20 * G.dp, 10 * G.dp);
				} else {
					self.prompt.setPadding(20 * G.dp, 2 * G.dp, 20 * G.dp, 2 * G.dp);
				}
				v.post(function() {CA.IntelliSense.apply()});
			} catch(e) {erp(e)}}}));
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
	} catch(e) {erp(e)}})},
	hide : function() {G.ui(function() {try {
		if (!CA.IntelliSense.ui) return;
		CA.showAssist.con.removeView(CA.IntelliSense.ui);
		CA.IntelliSense.ui = null;
	} catch(e) {erp(e)}})},
	showMoreUsage : function() {
		var pp = new G.SpannableStringBuilder(), i, l = CA.IntelliSense.prompt.length;
		pp.append(this.prompt[0]);
		for (i = 1; i < l; i++) {
			pp.append("\n\n");
			pp.append(this.prompt[i]);
		}
		Common.showTextDialog(pp);
	},

	getParserCompletions: function(parserType, ps, cursorOffset, node) {
		var valueStart, valueEnd, value;
		if (node && (node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'null')) {
			valueStart = node.offset;
			valueEnd = node.offset + node.length;
			value = ps.substring(valueStart, valueEnd);
			if (node.type === 'string' && value.length >= 2 && value[0] === '"' && value[value.length - 1] === '"') {
				value = value.substring(1, value.length - 1);
			}
		} else {
			valueStart = cursorOffset;
			valueEnd = cursorOffset;
			value = '';
		}

		var result = [];
		var self = this;

		function addEnumItems(enumName) {
			var enumData = self.library.enums[enumName];
			if (!enumData) return;
			for (var id in enumData) {
				if (!enumData.hasOwnProperty(id)) continue;
				var displayName = enumData[id];
				var newText = '"' + id + '"';
				result.push({
					label: id + ' - ' + displayName,
					insertText: newText,
					textEdit: {
						range: { start: { line: 0, character: valueStart }, end: { line: 0, character: valueEnd } },
						newText: newText
					}
				});
			}
		}

		if (parserType === 'selector') {
			var selResult = this.procSelector({}, value);
			if (selResult && selResult.recommend) {
				for (var selKey in selResult.recommend) {
					if (!selResult.recommend.hasOwnProperty(selKey)) continue;
					var selVal = selResult.recommend[selKey];
					var escapedVal = selVal.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
					var newText = '"' + escapedVal + '"';
					var selCursor = valueStart + 1 + escapedVal.length;
					if (escapedVal.indexOf('=') >= 0) {
						selCursor = valueStart + 1 + escapedVal.indexOf('=') + 1;
					}
					result.push({
						label: selKey,
						insertText: newText,
						textEdit: {
							range: { start: { line: 0, character: valueStart }, end: { line: 0, character: valueEnd } },
							newText: newText
						},
						_selectorCursor: selCursor
					});
				}
			}
		} else if (parserType.indexOf('enum:') === 0) {
			addEnumItems(parserType.substring(5));
		} else if (this.library.enums[parserType]) {
			addEnumItems(parserType);
		}

		return result;
	},

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
		if (!schema || typeof schema !== 'object') return {};

		var result = {};                // 浅拷贝
		for (var k in schema) {
			if (schema.hasOwnProperty(k) && keys.indexOf(k) === -1) {
				result[k] = schema[k];
			}
		}
		return result;
	}
})
