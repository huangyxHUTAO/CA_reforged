MapScript.loadModule("IssueService", {
	name : "IssueService",
	author : "ProjectXero",
	version : [1, 0, 0],
	uuid : "1c1426ac-b4c2-4738-9b1b-da6860962674",
	apiHost : NetworkUtils.urlBase.api,
	wsHost : NetworkUtils.urlBase.ws,
	perPage : 10,
	createIssue : function(title, content) {
		return NetworkUtils.requestApi("POST", this.apiHost + "/issue", this.fillCreator({
			title : title,
			content : content
		}));
	},
	getIssue : function(token) {
		return NetworkUtils.requestApi("GET", this.apiHost + "/issue/:token", {
			token : token
		});
	},
	batchGetIssue : function(tokens) {
		return NetworkUtils.requestApi("GET", this.apiHost + "/issue/get", {
			tokens : tokens.join("|")
		});
	},
	listIssues : function(type, state, start, limit) {
		return NetworkUtils.requestApi("GET", this.apiHost + "/issue/list", this.fillCreator({
			type : type,
			state : state,
			start : start,
			limit : limit
		}));
	},
	setContent : function(token, title, content) {
		NetworkUtils.requestApi("PATCH", this.apiHost + "/issue/:token/content", {
			token : token
		}, this.fillCreator({
			title : title,
			content : content
		}));
	},
	setState : function(token, state) {
		NetworkUtils.requestApi("PATCH", this.apiHost + "/issue/:token/state", {
			token : token
		}, this.fillCreator({
			state : state
		}));
	},
	listComments : function(token, start, limit, sort, direction) {
		return NetworkUtils.requestApi("GET", this.apiHost + "/issue/:token/comment", {
			token : token
		}, {
			start : start,
			limit : limit,
			sort : sort,
			dir : direction
		});
	},
	addComment : function(token, content) {
		return NetworkUtils.requestApi("POST", this.apiHost + "/issue/:token/comment", {
			token : token
		}, this.fillCreator({
			content : content
		}));
	},
	fillCreator : function(obj) {
		var actor = this.internal.UserManager.allocateActor();
		obj.creator_type = actor.type;
		obj.token = actor.token;
		return obj;
	},
	// listenIssue : function(id, f) {
	// 	if (!this.listenConn) {
	// 		this.startListenConn();
	// 	}
	// 	this.listenConn.listen(id, f);
	// },
	// unlistenIssue : function(id, f) {
	// 	if (!this.listenConn) {
	// 		return;
	// 	}
	// 	this.listenConn.unlisten(id, f);
	// },
	// startListenConn : function() {
	// 	var listenConn;
	// 	if (this.listenConn) {
	// 		return;
	// 	}
	// 	listenConn = this.listenConn = NetworkUtils.connectWSEvent(this.wsHost + "/issue/update", {
	// 		onOpen : function() {
	// 			listenConn.pendingIssues
	// 		}
	// 	});
	// 	listenConn.requestListen = function(id) {
	// 		listenConn.sendCommand("listen-" + id, "register", { tokens : [ id ] });
	// 	};
	// 	listenConn.requestBatchListen = function(ids) {
	// 		listenConn.sendCommand("listen-" + ids.join("-"), "register", { tokens : ids });
	// 	};
	// 	listenConn.requestUnlisten = function(id) {
	// 		listenConn.sendCommand("listen-" + id, "unregister", { tokens : [ id ] });
	// 	};
	// 	listenConn.requestBatchUnlisten = function(ids) {
	// 		listenConn.sendCommand("listen-" + ids.join("-"), "unregister", { tokens : ids });
	// 	};
	// 	listenConn.pendingIssues = [];
	// 	listenConn.listeners = {};
	// 	listenConn.listen = function(id, f) {
	// 		if (id in listenConn.listeners) {
	// 			listenConn.listeners[id].push(f);
	// 		} else {
	// 			listenConn.listeners[id] = [f];
	// 			if (listenConn.available) {
	// 				listenConn.requestListen(id);
	// 			} else {
	// 				listenConn.pendingIssues.push(id);
	// 			}
	// 		}
	// 	};
	// 	listenConn.unlisten = function(id, f) {
	// 		var i, a;
	// 		if (id in listenConn.listeners) {
	// 			a = listenConn.listeners[id];
	// 			i = a.indexOf(f);
	// 			if (i >= 0) {
	// 				a.splice(i);
	// 			}
	// 			if (!a.length) {
	// 				delete listenConn.listeners[id];
	// 				if (listenConn.available) {
	// 					listenConn.requestUnlisten(id);
	// 				} else {
	// 					i = listenConn.pendingIssues.indexOf(id);
	// 					if (i >= 0) {
	// 						listenConn.pendingIssues.splice(i);
	// 					}
	// 				}
	// 			}
	// 		}
	// 	};
	// },
	// closeListenConn : function() {
	// 	if (!this.listenConn) {
	// 		return;
	// 	}
	// 	this.listenConn.close();
	// },
	errorMessage : {
		"precond.issue.list.type.missing" : "缺少话题类型",
		"precond.issue.list.state.missing" : "缺少话题状态",
		"precond.issue.list.start.invalid" : "缺少话题起始索引",
		"precond.issue.list.limit.invalid" : "缺少话题最大数目",
		
		"precond.issue.batchGet.tokens.missing" : "缺少话题令牌列表",
		
		"error.issue.info.invalidToken" : "无效的话题令牌",
		
		"precond.issue.create.title.missing" : "缺少话题标题",
		"precond.issue.create.title.wrong" : "话题标题过短、过长或含有违规词语",
		"precond.issue.create.content.wrong" : "话题内容过长或含有违规词语",
		"precond.issue.create.creatorToken.missing" : "缺少话题创建者令牌",
		"error.issue.create.writeError" : "写入话题失败",
		
		"precond.issue.setContent.token.missing" : "缺少话题令牌",
		"precond.issue.setContent.title.missing" : "缺少话题标题",
		"precond.issue.setContent.title.wrong" : "话题标题过短、过长或含有违规词语",
		"precond.issue.setContent.content.wrong" : "话题内容过长或含有违规词语",
		"precond.issue.setContent.creatorToken.missing" : "缺少话题创建者令牌",
		"error.issue.setContent.denied" : "您不是话题的创建者，无法修改话题内容",
		"error.issue.setContent.cannotSet" : "当前话题状态不允许您修改话题内容",
		"error.issue.setContent.writeError" : "写入话题失败",
		
		"precond.issue.setState.token.missing" : "缺少话题令牌",
		"precond.issue.setState.state.missing" : "缺少话题状态",
		"precond.issue.setState.creatorToken.missing" : "缺少话题创建者令牌",
		"error.issue.setState.denied" : "您不是话题的创建者，无法修改话题状态",
		"error.issue.setState.cannotSet" : "当前话题状态不允许您将话题状态修改为此状态",
		"error.issue.setState.writeError" : "写入话题失败",
		
		"precond.issue.getComments.start.invalid" : "缺少消息起始索引",
		"precond.issue.getComments.limit.invalid" : "缺少消息最大数目",
		
		"precond.issue.addComment.content.missing" : "缺少消息内容",
		"precond.issue.addComment.content.wrong" : "消息内容过长或含有违规词语",
		"precond.issue.addComment.creatorToken.missing" : "缺少消息创建者令牌",
		"error.issue.addComment.cannotAdd" : "当前话题状态不允许您发送消息",
		"error.issue.addComment.writeError" : "写入消息记录失败",
		
		"error.issue.removeComment.writeError" : "删除消息记录失败",
		
		"error.issue.archiveIssue.cannotSet" : "无法将此话题设为归档状态",
		"error.issue.archiveIssue.writeError" : "写入话题失败",
		
		"error.issue.banIssue.cannotSet" : "无法将此话题设为屏蔽状态",
		"error.issue.banIssue.writeError" : "写入话题失败",
		
		"error.issue.normalizeIssue.cannotSet" : "无法将此话题设为正常状态",
		"error.issue.normalizeIssue.writeError" : "写入话题失败",
		
		"error.issue.removeIssue.writeError" : "删除话题失败",
		
		"error.issue.updateListener.register.invalidData" : "无效的订阅请求",
		"error.issue.updateListener.register.tooMuchListener" : "订阅监听器过多",
		"error.issue.updateListener.unregister.invalidData" : "无效的取消订阅请求",
	},

	showIssues : function self(callback) {var realThis = this; G.ui(function() {try {
		if (!self.popup) {
			self.contextMenu = [{
				text : "刷新",
				onclick : function(v, tag) {
					self.reload();
				}
			}, {
				text : "仅显示未解决",
				hidden : function() {
					return self.issueState == "open";
				},
				onclick : function(v, tag) {
					self.issueState = "open";
					self.reload();
				}
			}, {
				text : "显示所有",
				hidden : function() {
					return self.issueState == "all";
				},
				onclick : function(v, tag) {
					self.issueState = "all";
					self.reload();
				}
			}, {
				text : "查看常见问题解答(FAQ)",
				onclick : function(v, tag) {
					AndroidBridge.startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://ca.projectxero.top/blog/faq/"))
						.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
				}
			}, {
				text : "查看反馈说明",
				onclick : function(v, tag) {
					realThis.showIssueAgreement();
				}
			}];
			self.addIssue = function() {
				realThis.showEditIssue("issue", {
					newIssue : true,
					title : "",
					content : ""
				}, function callback(newIssue) {
					var progress = Common.showProgressDialog();
					progress.setText("正在创建……");
					progress.async(function() {
						try {
							realThis.createIssue(newIssue.title, newIssue.content);
						} catch(e) {
							Log.e(e);
							realThis.showEditIssue("issue", newIssue, callback);
							return Common.toast("保存话题失败\n" + e);
						}
						G.ui(function() {try {
							self.reload();
						} catch(e) {erp(e)}});
					});
				});
			}
			self.issueState = "open";
			self.reload = function() {
				self.lastIssuesLen = self.issues.length;
				self.issues.length = 0;
				self.adpt.reset(false, true);
				self.arrayAdpt.notifyChange();
			}
			self.appendPage = function(limit) {
				var issues;
				try {
					if (realThis.privilegedMode) {
						issues = realThis.internal.UserManager.executeAdminAction("Issue.listIssues", {
							start : self.issues.length,
							limit : limit,
							type : "issue",
							state : self.issueState
						});
					} else {
						issues = realThis.listIssues("issue", self.issueState, self.issues.length, limit);
					}
				} catch(e) {
					Log.e(e);
					return Common.toast("数据加载失败\n" + e);
				}
				return issues;
			}
			self.refreshIssue = function(pos) {
				var progress = Common.showProgressDialog();
				progress.setText("正在刷新列表……");
				progress.async(function() {
					var oldIssue = self.issues[pos], newIssue;
					try {
						newIssue = realThis.getIssue(oldIssue.token); // getIssue不会返回token
						newIssue.token = oldIssue.token;
						self.issues[pos] = newIssue;
					} catch(e) {
						Log.e(e);
						return Common.toast("刷新列表失败\n" + e);
					}
					G.ui(function() {try {
						self.arrayAdpt.notifyChange();
					} catch(e) {erp(e)}});
				});
			}
			self.vmaker = function(holder) {
				var layout = new G.LinearLayout(ctx),
					text1 = holder.text1 = new G.TextView(ctx),
					text2 = holder.text2 = new G.TextView(ctx);
				layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				layout.setOrientation(G.LinearLayout.VERTICAL);
				layout.setPadding(15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp);
				text1.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
				text1.setEllipsize(G.TextUtils.TruncateAt.END);
				text1.setSingleLine(true);
				layout.addView(text1);
				text2.setPadding(0, 5 * G.dp, 0, 0);
				text2.setLayoutParams(new G.LinearLayout.LayoutParams(-1, -2));
				Common.applyStyle(text2, "textview_prompt", 1);
				layout.addView(text2);
				return layout;
			}
			self.vbinder = function(holder, e, i, a) {
				if (e.state == "issue_open" || e.state == "issue_progressing") {
					holder.text1.setText((e.state == "issue_open" ? "[待处理] " : "") + e.title);
					Common.applyStyle(holder.text1, "item_default", 3);
				} else {
					holder.text1.setText((e.state == "issue_rejected" ? "[已拒绝] " : "[已解决] ") + e.title);
					Common.applyStyle(holder.text1, "item_disabled", 3);
				}
				holder.text2.setText("最近更新于 " + Updater.toChineseDate(Date.parse(e.update_time)));
			}
			self.arrayAdpt = SimpleListAdapter.getController(new SimpleListAdapter(self.issues = [], self.vmaker, self.vbinder));
			self.popup = new PopupPage(L.LinearLayout({
				orientation : L.LinearLayout("vertical"),
				padding : [15 * G.dp, 15 * G.dp, 15 * G.dp, 0],
				style : "message_bg",
				children : [
					L.LinearLayout({
						orientation : L.LinearLayout("horizontal"),
						padding : [0, 0, 0, 10 * G.dp],
						layout : { width : -1, height : -2 },
						style : "message_bg",
						children : [
							L.TextView({
								text : "意见与反馈",
								gravity : L.Gravity("left|center"),
								padding : [10 * G.dp, 0, 10 * G.dp, 0],
								style : "textview_default",
								fontSize : 4,
								layout : { width : 0, height : -1, weight : 1.0 }
							}),
							L.TextView({
								text : "▼",
								gravity : L.Gravity("left|center"),
								padding : [10 * G.dp, 0, 10 * G.dp, 0],
								style : "button_highlight",
								fontSize : 3,
								layout : { width : -2, height : -1 }
							})
						],
						onClick : function() {try {
							Common.showOperateDialog(self.contextMenu);
						} catch(e) {erp(e)}}
					}),
					self.list = L.ListView({
						layout : { width : -1, height : 0, weight : 1.0 },
						_adapter : (self.adpt = MoreListAdapter.getController(new MoreListAdapter(self.arrayAdpt.self, self.loader = {
							loadingView : L.TextView({
								text : "加载中",
								gravity : L.Gravity("center"),
								padding : [0, 15 * G.dp, 0, 15 * G.dp],
								focusable : true,
								style : "item_disabled",
								fontSize : 3,
								layoutParams : new G.AbsListView.LayoutParams(-1, -2)
							}),
							load : function(callback, session) {
								var limit;
								if (self.lastIssuesLen > self.issues.length) {
									limit = self.lastIssuesLen - self.issues.length;
								} else {
									limit = realThis.perPage;
								}
								Threads.run(function() {try {
									var result = self.appendPage(limit);
									G.ui(function() {try {
										if (self.loader.latestSession != session) {
											return;
										}
										if (result) {
											Array.prototype.push.apply(self.issues, result);
											callback(result.length < limit, true);
										} else {
											callback(true, true);
										}
										self.arrayAdpt.notifyChange();
									} catch(e) {erp(e)}});
								} catch(e) {erp(e)}});
							},
							autoload : true
						}))).self,
						onItemClick : function(parent, view, pos, id) {try {
							var issue;
							if (pos == 0) {
								self.addIssue();
								return;
							}
							pos -= 1; // HeaderView的个数
							issue = self.issues[pos];
							if (issue) {
								realThis.showIssueDetail(issue, function() {
									self.refreshIssue(pos);
								});
							}
						} catch(e) {erp(e)}},
						_newIssueView : L.TextView({
							gravity : L.Gravity("center"),
							text : "+ 创建反馈",
							padding : [15 * G.dp, 15 * G.dp, 15 * G.dp, 15 * G.dp],
							layout : { width : -1, height : -2 },
							style : "item_default",
							fontSize : 3
						}),
						inflate : function(listView) {
							listView.addHeaderView(this._newIssueView);
							listView.adapter = this._adapter;
						}
					}),
					L.TextView({
						text : "关闭",
						padding : [10 * G.dp, 20 * G.dp, 10 * G.dp, 20 * G.dp],
						gravity : L.Gravity("center"),
						layout : { width : -1, height : -2 },
						style : "button_critical",
						fontSize : 3,
						onClick : function() {try {
							self.popup.exit();
						} catch(e) {erp(e)}}
					})
				]
			}), "issue.Issues");
			self.popup.on("exit", function() {
				if (self.callback) self.callback();
			});

			PWM.registerResetFlag(self, "popup");
		}
		self.callback = callback;
		self.popup.enter();
		self.reload();
	} catch(e) {erp(e)}})},
	showIssueDetail : function self(issue, callback) {var realThis = this; G.ui(function() {try {
		if (!self.popup) {
			self.contextMenu = [{
				text : "刷新",
				onclick : function() {
					self.reloadIssue();
				}
			}, {
				text : "编辑话题",
				hidden : function() {
					return !self.contentModifiable;
				},
				onclick : function() {
					var issue = self.issue;
					realThis.showEditIssue("issue", {
						title : issue.title,
						content : issue.content
					}, function(newIssue) {
						var progress = Common.showProgressDialog();
						progress.setText("正在加载……");
						progress.async(function() {
							try {
								realThis.setContent(issue.token, newIssue.title, newIssue.content);
							} catch(e) {
								Log.e(e);
								return Common.toast("保存话题失败\n" + e);
							}
							G.ui(function() {try {
								self.reloadIssue();
							} catch(e) {erp(e)}});
						});
					});
				}
			}, {
				text : "标记为已解决",
				hidden : function() {
					var state = self.issue.state;
					return !realThis.privilegedMode && state != "issue_open" && state != "issue_progressing";
				},
				onclick : function() {
					self.setState("issue_closed");
				}
			}, {
				text : "标记为未解决",
				hidden : function() {
					var state = self.issue.state;
					return !realThis.privilegedMode && state != "issue_closed";
				},
				onclick : function() {
					self.setState("issue_open");
				}
			}, {
				text : "标记为处理中",
				hidden : function() {
					return !realThis.privilegedMode;
				},
				onclick : function() {
					self.setState("issue_progressing");
				}
			}, {
				text : "标记为已拒绝",
				hidden : function() {
					return !realThis.privilegedMode;
				},
				onclick : function() {
					self.setState("issue_rejected");
				}
			}, {
				text : "查看详情",
				onclick : function() {
					var progress = Common.showProgressDialog();
					progress.setText("正在加载……");
					progress.async(function() {
						var issue, creatorName;
						try {
							issue = realThis.getIssue(self.issue.token);
							creatorName = realThis.internal.UserManager.getActorName(issue.creator_type, issue.creator_id);
						} catch(e) {
							Log.e(e);
							return Common.toast("加载失败\n" + e);
						}
						Common.showTextDialog([
							"ID: " + issue.id,
							"创建者: " + creatorName,
							"创建时间: " + Updater.toChineseDate(Date.parse(issue.create_time)),
							"更新时间: " + Updater.toChineseDate(Date.parse(issue.update_time)),
							"状态: " + (self.issueStateTranslation[issue.state] || issue.state)
						].join("\n"));
					});
				}
			}];
			self.statePermissions = {
				modifyContent: [
					"issue_open",
					"discuss_open",
					"discuss_blocked"
				],
				modifyComment: [
					"issue_open",
					"issue_progressing",
					"discuss_open"
				]
			};
			self.issueStateTranslation = {
				removed : "被移除",
				unspecified : "未指定",
				
				issue_open : "待处理",
				issue_progressing : "正在处理",
				issue_closed : "已解决",
				issue_rejected : "被拒绝",
				issue_archived : "被归档"
			};
			self.addComment = function(text, callback) {
				var progress = Common.showProgressDialog();
				progress.setText("正在发送……");
				progress.async(function() {
					var commentId;
					try {
						commentId = realThis.addComment(self.issue.token, text);
					} catch(e) {
						Log.e(e);
						return Common.toast("发送失败\n" + e);
					}
					self.checkUpdate();
					callback();
				});
			}
			self.setState = function(state) {
				var progress = Common.showProgressDialog();
				progress.setText("正在标记……");
				progress.async(function() {
					try {
						if (realThis.privilegedMode) {
							realThis.internal.UserManager.executeAdminAction("Issue.setState", {
								token : self.issue.token,
								state : state
							});
						} else {
							realThis.setState(self.issue.token, state);
						}
					} catch(e) {
						Log.e(e);
						return Common.toast("标记失败\n" + e);
					}
					self.checkUpdate();
				});
			}
			self.checkUpdate = function() {
				var oldIssue, newIssue, change;
				oldIssue = self.issue;
				newIssue = realThis.getIssue(oldIssue.token); // getIssue不会返回token
				newIssue.token = oldIssue.token;
				if (newIssue.update_time == self.issue.update_time) return false;
				self.issue = newIssue;
				if (newIssue.id == oldIssue.id &&
					newIssue.title == oldIssue.title &&
					newIssue.content == oldIssue.content &&
					newIssue.create_time == oldIssue.create_time &&
					newIssue.state == oldIssue.state &&
					newIssue.start_comment == oldIssue.start_comment) {
					change = "newComment";
				} else {
					change = "reload";
				}
				G.ui(function() {try {
					if (change == "reload") {
						self.reloadIssue();
					} else if (change == "newComment") {
						if (self.loader.finished) {
							self.adpt.reset(false, false);
						}
					}
				} catch(e) {erp(e)}});
				return true;
			}
			self.reloadIssue = function() {
				var progress = Common.showProgressDialog();
				progress.setText("正在加载……");
				progress.async(function() {
					var token = self.issue.token;
					try {
						self.issue = realThis.getIssue(token); // getIssue不会返回token
						self.issue.token = token;
					} catch(e) {
						Log.e(e);
						return Common.toast("获取话题失败\n" + e);
					}
					G.ui(function() {try {
						self.reload();
					} catch(e) {erp(e)}});
				});
			}
			self.reload = function() {
				self.lastCommentsLen = self.comments.length;
				self.myActorName = realThis.internal.UserManager.getMyActorName();
				self.startComment = self.issue.start_comment;
				self.contentModifiable = self.statePermissions.modifyContent.indexOf(self.issue.state) >= 0;
				self.commentModifiable = self.statePermissions.modifyComment.indexOf(self.issue.state) >= 0;
				self.comments.length = 1;
				self.comments[0] = {
					titleItem : true,
					title : "主题",
					content : self.issue.title,
					create_time : self.issue.create_time
				};
				if (self.issue.content) {
					self.comments.push({
						titleItem : true,
						title : "内容",
						content : self.issue.content,
						create_time : self.issue.create_time
					});
				}
				self.title.setText(self.issue.title);
				self.talk.setVisibility(self.commentModifiable ? G.View.VISIBLE : G.View.GONE);
				self.adpt.reset(self.startComment == 0, true);
				self.arrayAdpt.notifyChange();
			}
			self.appendPage = function(start, limit) {
				var comments;
				try {
					comments = realThis.listComments(self.issue.token, start, limit, "forward", "asc");
					comments.forEach(function(e) {
						e.fromThis = realThis.internal.UserManager.isMyActor(e.creator_type, e.creator_id);
						if (!e.fromThis) {
							e.creator_name = realThis.internal.UserManager.getActorName(e.creator_type, e.creator_id);
						}
					});
				} catch(e) {
					Log.e(e);
					return Common.toast("数据加载失败\n" + e);					
				}
				return comments;
			}
			self.vmaker = function(holder) {
				var layout = holder.linear = new G.LinearLayout(ctx),
					text1 = holder.text1 = new G.TextView(ctx),
					text2 = holder.text2 = new G.TextView(ctx);
				layout.setLayoutParams(new G.AbsListView.LayoutParams(-1, -2));
				layout.setOrientation(G.LinearLayout.VERTICAL);
				layout.setPadding(20 * G.dp, 15 * G.dp, 20 * G.dp, 15 * G.dp);
				text1.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2));
				text1.setEllipsize(G.TextUtils.TruncateAt.END);
				text1.setSingleLine(true);
				Common.applyStyle(text1, "textview_prompt", 1);
				layout.addView(text1);
				text2.setPadding(0, 5 * G.dp, 0, 0);
				text2.setLayoutParams(new G.LinearLayout.LayoutParams(-2, -2));
				Common.applyStyle(text2, "item_default", 3);
				layout.addView(text2);
				return layout;
			}
			self.vbinder = function(holder, e, i, a) {
				if (e.titleItem) {
					holder.linear.setGravity(G.Gravity.LEFT);
					holder.text1.setText(e.title);
				} else if (e.fromThis) {
					holder.linear.setGravity(G.Gravity.RIGHT);
					holder.text1.setText(self.myActorName);
				} else {
					holder.linear.setGravity(G.Gravity.LEFT);
					holder.text1.setText(e.creator_name);
				}
				holder.text2.setText(e.content);
			}
			self.arrayAdpt = SimpleListAdapter.getController(new SimpleListAdapter(self.comments = [], self.vmaker, self.vbinder));

			self.popup = new PopupPage(L.LinearLayout({
				orientation : L.LinearLayout("vertical"),
				padding : [0, 15 * G.dp, 0, 0],
				style : "message_bg",
				children : [
					L.LinearLayout({
						orientation : L.LinearLayout("horizontal"),
						padding : [15 * G.dp, 0, 15 * G.dp, 10 * G.dp],
						gravity : L.Gravity("center"),
						onClick : function() {try {
							Common.showOperateDialog(self.contextMenu);
						} catch(e) {erp(e)}},
						children : [
							L.TextView({
								text : "< 返回",
								padding : [10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp],
								layoutWidth : -2, layoutHeight : -2,
								style : "button_critical",
								fontSize : 2,
								onClick : function() {try {
									self.popup.exit();
								} catch(e) {erp(e)}}
							}),
							self.title = L.TextView({
								singleLine : true,
								ellipsize : G.TextUtils.TruncateAt.END,
								gravity : L.Gravity("left|center"),
								padding : [10 * G.dp, 0, 10 * G.dp, 0],
								style : "textview_default",
								fontSize : 4,
								layout : { width : 0, height : -2, weight : 1.0 },
							}),
							L.TextView({
								text : "▼",
								padding : [10 * G.dp, 0, 10 * G.dp, 0],
								gravity : L.Gravity("center"),
								style : "button_highlight",
								fontSize : 3,
								layout : { width : -2, height : -2 },
							})
						]
					}),
					self.list = L.ListView({
						dividerHeight : 0,
						layout : { width : -1, height : 0, weight : 1.0 },
						adapter : (self.adpt = MoreListAdapter.getController(new MoreListAdapter(self.arrayAdpt.self, self.loader = {
							loadingView : L.TextView({
								text : "加载中",
								gravity : L.Gravity("center"),
								padding : [0, 15 * G.dp, 0, 15 * G.dp],
								focusable : true,
								style : "item_disabled",
								fontSize : 3,
								layoutParams : new G.AbsListView.LayoutParams(-1, -2)
							}),
							load : function(callback, session) {
								var limit;
								if (self.lastCommentsLen > self.comments.length) {
									limit = self.lastCommentsLen - self.comments.length;
								} else {
									limit = realThis.perPage;
								}
								Threads.run(function() {try {
									var result = self.appendPage(self.startComment, limit);
									G.ui(function() {try {
										var latestId;
										if (self.loader.latestSession != session) {
											return;
										}
										if (result) {
											Array.prototype.push.apply(self.comments, result);
											callback(result.length < limit, true);
											if (result.length > 0) {
												latestId = result[result.length - 1].id;
												self.startComment = latestId + 1;
											}
										} else {
											callback(true, true);
										}
										self.arrayAdpt.notifyChange();
									} catch(e) {erp(e)}});
								} catch(e) {erp(e)}});
							},
							autoload : true
						}))).self,
						onItemClick : function(parent, view, pos, id) {try {
							// do nothing
						} catch(e) {erp(e)}}
					}),
					self.talk = L.LinearLayout({
						layout : { width : -1, height : -2 },
						orientation : L.LinearLayout("horizontal"),
						style : "bar_float",
						children : [
							self.talkbox = L.EditText({
								layout : { width : 0, height : -2, weight : 1.0 },
								padding : [10 * G.dp, 10 * G.dp, 0, 10 * G.dp],
								imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
								style : "edittext_default",
								fontSize : 3
							}),
							L.TextView({
								layout : { width : -2, height : -1 },
								gravity : L.Gravity("center"),
								text : "发送",
								padding : [10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp],
								style : "button_reactive_auto",
								fontSize : 3,
								onClick : function() {try {
									var s = String(self.talkbox.text);
									if (!s) return Common.toast("内容不可为空！");
									self.addComment(s, function() {
										G.ui(function() {try {
											self.talkbox.text = "";
										} catch(e) {erp(e)}});
									});
								} catch(e) {erp(e)}}
							})
						]
					})
				]
			}), "feedback.IssueDetail");
			self.popup.on("exit", function() {
				if (self.callback) self.callback();
			});

			PWM.registerResetFlag(self, "popup");
		}
		self.issue = issue;
		self.callback = callback;
		self.popup.enter();
		self.reload();
	} catch(e) {erp(e)}})},
	showIssueDetailByToken : function(token, callback) {
		var realThis = this;
		var progress = Common.showProgressDialog();
		progress.setText("正在加载……");
		progress.async(function() {
			var issue;
			try {
				issue = realThis.getIssue(token); // getIssue不会返回token
				issue.token = token;
			} catch(e) {
				Log.e(e);
				return Common.toast("获取话题失败\n" + e);
			}
			G.ui(function() {try {
				realThis.showIssueDetail(issue, callback);
			} catch(e) {erp(e)}});
		});
	},
	showEditIssue : function self(type, o, callback, onDismiss) {G.ui(function() {try {
		var title, body, popup;
		popup = PopupPage.showDialog("issue.EditIssueContent", L.ScrollView({
			style : "message_bg",
			child : L.LinearLayout({
				orientation : L.LinearLayout("vertical"),
				padding : [15 * G.dp, 15 * G.dp, 15 * G.dp, 0],
				children : [
					L.TextView({
						text : (o.newIssue ? "新建" : "编辑") + (type == "discuss" ? "讨论" : "反馈") + "话题",
						padding : [0, 0, 0, 10 * G.dp],
						layout : { width : -1, height : -2 },
						style : "textview_default",
						fontSize : 4
					}),
					title = L.EditText({
						text : o.title,
						hint : type == "discuss" ? "讨论标题" : "在此处用一句话描述反馈的问题或建议",
						singleLine : true,
						padding : [0, 0, 0, 0],
						imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
						style : "edittext_default",
						fontSize : 3,
						layout : { width : -1, height : -2 }
					}),
					content = L.EditText({
						text : o.content,
						hint : type == "discuss" ? "讨论内容" : "在这里补充说明发生问题时的现象、复现步骤与报错信息。如果是建议，请在这里说明提出建议的原因",
						padding : [0, 20 * G.dp, 0, 0],
						imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
						style : "edittext_default",
						fontSize : 2,
						layout : { width : -1, height : -2 }
					}),
					L.TextView({
						text : "确定",
						padding : [10 * G.dp, 20 * G.dp, 10 * G.dp, 20 * G.dp],
						gravity : L.Gravity("center"),
						layout : { width : -1, height : -2 },
						style : "button_critical",
						fontSize : 3,
						onClick : function() {try {
							o.title = String(title.text);
							o.content = String(content.text);
							if (!o.title) return Common.toast("标题不能为空！");
							if (callback) callback(o);
							popup.exit();
						} catch(e) {erp(e)}}
					})
				]
			})
		}), -1, -2);
		if (onDismiss) popup.on("exit", onDismiss);
	} catch(e) {erp(e)}})},
	showIssueAgreement : function(callback) {
		Common.showConfirmDialog({
			title : "反馈使用说明", 
			description : ISegment.rawJson({
				extra : [
					"请务必看完本说明！\n",
					"\n1. 在反馈之前，请先查看常见问题解答(在意见与反馈列表界面点击右上角三角显示的菜单内)。如果常见问题解答能解决你的问题，请不要重复反馈。",
					"\n2. 您如果重复反馈或反馈与命令助手本身无关的内容，这条反馈会被标注为“已拒绝”。如果最近您提出的被拒绝反馈数量超过两个，您会被暂时禁止反馈一段时间。",
					"\n3. 在自己的反馈下多次发送重复或无关反馈的内容会让这条反馈被标注为“已拒绝”。",
					"\n4. 请将您想反馈的内容表达尽可能具体。过于简单的反馈很可能会被标注为“已拒绝”。",
					"\n5. 您的未处理的反馈随时都可能收到回复，推荐一天检查一次反馈。被标注为“已解决”或“已拒绝”的反馈不能被回复。",
					"\n6. 未注册用户时，您的反馈会以匿名游客名义创建。注册用户后您无法查看以匿名游客名义创建的反馈。",
					"\n7. 如果您有很难用文字解释或者涉及隐私的反馈，建议私聊作者反馈：QQ:2687587184 电子邮箱:projectxero@163.com。",
					"\n\n您随时都可以在最近反馈界面点击右上角三角显示的菜单内再次查看本说明"
				],
				color : "textcolor"
			}),
			buttons : [
				"我了解了"
			],
			callback : function(id) {
				CA.settings.readFeedbackAgreement = true;
				if (callback) callback();
			}
		});
	},
	showIssuesWithAgreement : function() {
		var realThis = this;
		if (CA.settings.readFeedbackAgreement) {
			if (realThis.internal.UserManager.isAdmin()) {
				this.showIssuesPrivileged();
			} else {
				this.showIssues();
			}
		} else {
			this.showIssueAgreement(function() {
				realThis.showIssuesWithAgreement();
			});
		}
	},
	showIssuesPrivileged : function() {
		var realThis = this;
		this.privilegedMode = true;
		this.internal.UserManager.showAdminAuth(function() {
			realThis.showIssues(function() {
				realThis.privilegedMode = false;
			});
		});
	},
	onCreate : function() {
		Internal.add("IssueService", this);
		NetworkUtils.addErrorMessages(this.errorMessage);
	}
});