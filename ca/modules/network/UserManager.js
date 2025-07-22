MapScript.loadModule("UserManager", {
	apiHost : NetworkUtils.urlBase.api,
	login : function(emailOrName, password) {
		var result = NetworkUtils.requestApi("POST", this.apiHost + "/user/login", {
			name : emailOrName,
			pass : password
		});
		this.saveToken(result);
	},
	logout : function() {
		this.clearToken();
	},
	register : function(email, name, password) {
		NetworkUtils.requestApi("POST", this.apiHost + "/user/register", {
			email : email,
			name : name,
			pass : password
		});
	},
	refreshLogin : function(refreshToken) {
		var result = NetworkUtils.requestApi("GET", this.apiHost + "/user/refresh", {
			token : refreshToken
		});
		this.saveToken(result);
	},
	getUserInfo : function() {
		return NetworkUtils.requestApi("GET", this.apiHost + "/user/info", {
			token : this.accessToken
		});
	},
	getPublicUserInfo : function(id) {
		return NetworkUtils.requestApi("GET", this.apiHost + "/user/public/:id", {
			id : id
		});
	},
	authorize : function() {
		return NetworkUtils.requestApi("POST", this.apiHost + "/user/authorize", {
			token : this.accessData.refreshToken
		});
	},
	requestResetPassword : function(email, password) {
		NetworkUtils.requestApi("POST", this.apiHost + "/user/forget_password", {
			email : email,
			pass : password
		});
	},
	setPassword : function(oldPassword, newPassword) {
		NetworkUtils.requestApi("POST", this.apiHost + "/user/set_password", {
			accessToken : this.accessToken,
			oldPwd : oldPassword,
			newPwd : newPassword
		});
	},
	setUsername : function(name) {
		NetworkUtils.requestApi("POST", this.apiHost + "/user/set_username", {
			accessToken : this.accessToken,
			name : name
		});
	},
	changeEmail : function(email) {
		NetworkUtils.requestApi("POST", this.apiHost + "/user/change_email", {
			accessToken : this.accessToken,
			email : email
		});
	},
	requestRemove : function() {
		NetworkUtils.requestApi("POST", this.apiHost + "/user/request_remove", {
			accessToken : this.accessToken
		});
	},
	checkIn : function() {
		return NetworkUtils.requestApi("POST", this.apiHost + "/user/check_in", {
			token : this.accessToken
		});
	},
	addExp : function(reasons) {
		return NetworkUtils.requestApi("POST", this.apiHost + "/user/add_exp", {
			token : this.accessToken,
			reasons : Array.isArray(reasons) ? reasons.join(",") : reasons
		});
	},
	acquireAdminToken : function() {
		var result = NetworkUtils.requestApi("GET", this.apiHost + "/admin/auth", {
			token : this.accessToken
		});
		this.adminToken = result;
	},
	executeAdminAction : function(name, data) {
		return NetworkUtils.requestApi("POST", this.apiHost + "/admin/action", {
			token : this.adminToken,
			action : name
		}, data);
	},
	allocateVisitorToken : function() {
		return NetworkUtils.requestApi("POST", this.apiHost + "/visitor/allocate", {
			tag : String(AndroidBridge.getUserID())
		});
	},
	clearVisitorToken : function(token, secret) {
		NetworkUtils.requestApi("POST", this.apiHost + "/visitor/clear", {
			token : token,
			secret : secret
		});
	},
	getVisitorID : function(token) {
		return NetworkUtils.requestApi("GET", this.apiHost + "/visitor/id", {
			token : token 
		});
	},
	errorMessage : {
		"precond.user.info.token.missing" : "缺少访问令牌",
		"error.user.info.invalidToken" : "无效的访问令牌",
		"error.user.info.userNotExist" : "用户已被注销",

		"precond.user.register.email.missing" : "缺少邮箱地址",
		"precond.user.register.email.wrong" : "邮箱地址过长或格式不正确",
		"precond.user.register.name.missing" : "缺少用户名",
		"precond.user.register.name.wrong" : "用户名过短、过长或含有违规词语",
		"precond.user.register.pass.missing" : "缺少密码",
		"precond.user.register.pass.wrong" : "密码过短或过长",
		"error.user.register.emailOccupied" : "邮箱已被使用",
		"error.user.register.nameOccupied" : "用户名已被占用",
		"error.user.register.abuseEmail" : "请不要向这个邮箱发送过多邮件或发送邮件发送过于频繁",
		"error.user.register.writeError" : "写入数据库失败",
		"error.user.register.sendEmailFailed" : "发送验证邮件失败",

		// "precond.user.activate.token.missing" : "缺少token参数",
		// "error.user.activate.invalidToken" : "链接已被使用过或参数不正确",
		// "error.user.activate.emailOccupied" : "邮箱已被占用",
		// "error.user.activate.nameOccupied" : "用户名已被占用",
		// "error.user.activate.writeError" : "写入账户记录失败",

		"precond.user.login.user.missing" : "缺少用户名",
		"precond.user.login.pass.missing" : "缺少密码",
		"error.user.login.userNotExist" : "用户名或密码不正确",
		"error.user.login.wrongPassword" : "用户名或密码不正确",
		"error.user.login.writeError" : "写入数据库失败",

		"precond.user.refreshLogin.token.missing" : "缺少刷新令牌",
		"error.user.refreshLogin.writeError" : "写入数据库失败",
		"error.user.refreshLogin.invalidToken" : "刷新令牌不可用",
		"error.user.refreshLogin.writeError" : "写入数据库失败",

		"precond.user.authorize.token.missing" : "缺少刷新令牌",
		"error.user.authorize.writeError" : "写入数据库失败",
		"error.user.authorize.invalidToken" : "刷新令牌不可用",

		"precond.user.loginOAuth.token.missing" : "授权令牌不可用",
		"error.user.loginOAuth.invalidToken" : "已取得OAuth令牌或授权令牌不可用",

		"precond.user.forgetPwd.email.missing" : "缺少邮箱地址",
		"precond.user.forgetPwd.pass.missing" : "缺少密码",
		"precond.user.forgetPwd.pass.wrong" : "密码过短或过长",
		"error.user.forgetPwd.userNotExist" : "没有账户和该邮箱绑定",
		"error.user.forgetPwd.abuseEmail" : "请不要向这个邮箱发送过多邮件或发送邮件发送过于频繁",
		"error.user.forgetPwd.sendEmailFailed" : "发送重置密码邮件失败",

		// "precond.user.resetPwd.token.missing" : "缺少token参数",
		// "error.user.resetPwd.invalidToken" : "链接已被使用过或参数不正确",
		// "error.user.resetPwd.userNotExist" : "邮箱对应的账户已被注销",
		// "error.user.resetPwd.writeError" : "写入账户记录失败",

		"precond.user.setPwd.accessToken.missing" : "缺少访问令牌",
		"precond.user.setPwd.oldPassword.missing" : "缺少旧密码",
		"precond.user.setPwd.newPassword.missing" : "缺少新密码",
		"precond.user.setPwd.newPassword.wrong" : "密码过短或过长",
		"error.user.setPwd.wrongOldPassword" : "旧密码错误",
		"error.user.setPwd.writeError" : "写入账户记录失败",

		"precond.user.setName.accessToken.missing" : "缺少访问令牌",
		"precond.user.setName.name.missing" : "缺少用户名",
		"precond.user.setName.name.wrong" : "用户名过短、过长或含有违规词语",
		"error.user.setName.nameOccupied" : "用户名被占用",
		"error.user.setName.writeError" : "写入账户记录失败",

		"precond.user.changeEmail.token.missing" : "缺少访问令牌",
		"precond.user.changeEmail.email.missing" : "缺少邮箱地址",
		"precond.user.changeEmail.email.wrong" : "邮箱地址过长或格式不正确",
		"info.user.changeEmail.sameAddress" : "旧邮箱与新邮箱相同",
		"error.user.changeEmail.emailOccupied" : "该邮箱已与其他账户绑定",
		"error.user.changeEmail.sendEmailFailed" : "发送验证邮件失败",

		// "precond.user.confirmEmail.token.missing" : "缺少token参数",
		// "error.user.confirmEmail.invalidToken" : "链接已被使用过或参数不正确",
		// "error.user.confirmEmail.userNotExist" : "邮箱对应的账户已被注销",
		// "error.user.confirmEmail.emailOccupied" : "邮箱已与其他账户绑定",
		// "error.user.confirmEmail.writeError" : "写入账户记录失败",

		"precond.user.requestRemove.token.missing" : "缺少访问令牌",
		"error.user.requestRemove.sendEmailFailed" : "发送确认邮件失败",

		// "precond.user.confirmRemove.token.missing" : "缺少token参数",
		// "error.user.confirmRemove.invalidToken" : "链接已被使用过或参数不正确",
		// "error.user.confirmRemove.userNotExist" : "邮箱对应的账户已被注销",
		// "error.user.confirmRemove.writeError" : "写入账户记录失败",

		"precond.user.addExp.token.missing" : "缺少访问令牌",
		"precond.user.addExp.reason.missing" : "缺少经验来源",
		"precond.user.addExp.reason.wrong" : "不是有效的经验来源",
		"error.user.addExp.notAllowed" : "在指定时间前，经验已到达上限",
		"info.user.addExp.limitedToday" : "本日获得经验已到达上限",
		"error.user.addExp.writeError" : "写入账户记录失败",

		"precond.user.checkIn.token.missing" : "缺少访问令牌",
		"error.user.checkIn.writeError" : "写入账户记录失败",

		"precond.admin.auth.token.missing" : "缺少令牌",
		"error.admin.auth.notAdmin" : "没有权限",
		"error.admin.auth.invalidToken" : "无效的管理员令牌",
		"error.admin.action.notExists" : "管理员任务不存在",
		"error.admin.action.error" : "管理员任务执行出错",

		"precond.visitor.allocate.tag.missing" : "缺少附加数据",
		"precond.visitor.allocate.tag.wrong" : "附加数据过短或过长",
		"error.visitor.create.writeError" : "写入访客记录失败",

		"precond.visitor.remove.token.missing" : "缺少访客令牌",
		"precond.visitor.remove.secret.missing" : "缺少访客密钥",
		"error.visitor.remove.writeError" : "写入访客记录失败",

		"error.visitor.info.invalidToken" : "无效的访客令牌",
		"error.visitor.info.banned" : "您的访客账户已被封禁",

		"error.visitor.update.writeError" : "写入访客记录失败",

		"error.actor.notSupported" : "不支持的创建者类型"
	},
	loadToken : function() {
		var realThis = this, refreshToken;
		this.accessData = CA.settings.userSettings;
		if (this.accessData) {
			refreshToken = this.accessData.refreshToken;
			realThis.showRefreshLogin(refreshToken, true);
		}
	},
	saveToken : function(result) {
		this.accessToken = result.accessToken;
		result.expiredDate = Date.now() + result.expiredIn * 1000;
		this.accessData = CA.settings.userSettings = result;
		this.updateUserInfo();
	},
	clearToken : function() {
		this.accessToken = null;
		this.accessData = CA.settings.userSettings = null;
		this.userInfo = null;
	},
	updateUserInfo : function() {
		this.userInfo = this.getUserInfo();
	},
	getCachedUserInfo : function() {
		return this.userInfo;
	},
	getVisitorTokenCached : function() {
		var visitorToken = CA.settings.visitorToken;
		if (!visitorToken) {
			visitorToken = this.allocateVisitorToken();
			CA.settings.visitorToken = visitorToken;
		}
		return visitorToken;
	},
	getVisitorIDCached : function() {
		if (!this.visitorID) {
			this.visitorID = this.getVisitorID(this.getVisitorTokenCached().token);
		}
		return this.visitorID;
	},
	allocateActor : function() {
		var visitorToken;
		if (this.accessToken) {
			return {
				type : 0, // User
				token : this.accessToken
			};
		} else {
			visitorToken = this.getVisitorTokenCached();
			return {
				type : 1, // Visitor
				token : visitorToken.token
			}
		}
	},
	isMyActor : function(creatorType, creatorID) {
		if (this.accessToken && creatorType == 0) {
			if (this.userInfo.id == creatorID) return true;
		} else if (!this.accessToken && creatorType == 1) {
			if (this.getVisitorIDCached() == creatorID) return true; 
		}
		return false;
	},
	publicUserInfoCache : {},
	getPublicUserInfoCached : function(id, forceUpdate) {
		var data = this.publicUserInfoCache[id];
		if (!data || forceUpdate) {
			data = this.getPublicUserInfo(id);
		}
		return this.publicUserInfoCache[id] = data;
	},
	getMyActorName : function() {
		if (this.accessToken) {
			return this.userInfo.name;
		} else {
			return "匿名游客";
		}
	},
	getActorName : function(creatorType, creatorID) {
		var userInfo;
		if (creatorType == 0) {
			try {
				userInfo = this.getPublicUserInfoCached(creatorID);
			} catch(e) {Log.e(e)}
			if (userInfo) {
				return userInfo.name;
			} else {
				return "用户" + creatorID;
			}
		}
		return "匿名游客" + creatorID;
	},
	isAdmin : function() {
		return this.userInfo ? this.userInfo.status == 999 : false;
	},
	isOnline : function() {
		return MapScript.host == "Android" && ScriptInterface.isOnlineMode();
	},
	getLevelExp : function(level) {
		if (level > 0 && level <= 15) {
			return 2 * level + 7;
		} else if (level > 15 && level <= 30) {
			return 5 * level - 38;
		} else if (level > 30) {
			return 9 * level - 158;
		} else {
			return 10000;
		}
	},
	parseExpLevel : function(exp) {
		var lev = 1, levExp, rest = exp;
		lev = 1;
		levExp = this.getLevelExp(1);
		while (rest >= levExp) {
			rest -= levExp;
			lev++;
			levExp = this.getLevelExp(lev);
		}
		return {
			total : exp,
			level : lev,
			rest : rest,
			levelExp : levExp
		};
	},
	expQueue : new java.util.concurrent.ConcurrentLinkedQueue(),
	enqueueExp : function(reason) {
		if (this.isOnline()) {
			this.expQueue.add(reason);
		}
	},
	hasExpToSync : function() {
		return this.isOnline() && !(this.expQueue.isEmpty() && this.userInfo.checkedIn);
	},
	syncExp : function() {
		var queue = this.expQueue;
		var e, list = [], result, checkInExp = 0;
		if (!this.hasExpToSync()) return 0;
		if (!this.userInfo.checkedIn) {
			checkInExp = this.checkIn().add;
			this.userInfo.checkedIn = true;
		}
		e = queue.poll();
		while (e != null) {
			list.push(e);
			e = queue.poll();
		}
		if (list.length == 0) list = ["info"];
		result = this.addExp(list);
		this.userInfo.experience = result.experience;
		result.add += checkInExp;
		return result.add;
	},
	processUriAction : function(type, query) {
		if (type == "login") {
			this.showLogin();
		} else if (type == "info") {
			this.showUpdateInfo();
		} else if (type == "autologin") {
			this.showRefreshLogin(query.token, false);
		}
	},
	showLogin : function self(callback) { var realThis = this; G.ui(function() {try {
		var username, password, popup;
		popup = PopupPage.showDialog("usermanager.Login", L.ScrollView({
			style : "message_bg",
			child : L.LinearLayout({
				orientation : L.LinearLayout("vertical"),
				padding : [15 * G.dp, 15 * G.dp, 15 * G.dp, 5 * G.dp],
				children : [
					L.TextView({
						text : "登录",
						padding : [0, 0, 0, 10 * G.dp],
						layout : { width : -1, height : -2 },
						gravity : L.Gravity("center"),
						style : "textview_default",
						fontSize : 4
					}),
					username = L.EditText({
						hint : "邮箱或用户名",
						singleLine : true,
						padding : [0, 0, 0, 0],
						imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
						inputType : L.InputType("TYPE_CLASS_TEXT|TYPE_TEXT_VARIATION_EMAIL_ADDRESS"),
						style : "edittext_default",
						fontSize : 3,
						layout : { width : -1, height : -2 }
					}),
					password = L.EditText({
						hint : "密码",
						singleLine : true,
						padding : [0, 20 * G.dp, 0, 0],
						imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
						transformationMethod : L.asClass(L.PasswordTransformationMethod).instance,
						style : "edittext_default",
						fontSize : 3,
						layout : { width : -1, height : -2 }
					}),
					L.TextView({
						text : "登录",
						padding : [10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp],
						gravity : L.Gravity("center"),
						layout : { width : -1, height : -2 },
						style : "button_critical",
						fontSize : 3,
						onClick : function() {try {
							if (!username.length()) return Common.toast("用户名不能为空");
							if (!password.length()) return Common.toast("密码不能为空");
							Common.showProgressDialog(function(dia) {
								dia.setText("正在登录...");
								try {
									realThis.login(String(username.text), String(password.text));
								} catch(e) {
									Log.e(e);
									return Common.toast("登录失败\n" + e);
								}
								CA.trySave();
								G.ui(function() {try {
									popup.exit();
									Common.toast("登录成功");
									if (callback) callback();
								} catch(e) {erp(e)}});
							});
						} catch(e) {erp(e)}}
					}),
					L.TextView({
						text : "注册",
						padding : [10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp],
						gravity : L.Gravity("center"),
						layout : { width : -1, height : -2 },
						style : "button_critical",
						fontSize : 3,
						onClick : function() {try {
							popup.exit();
							realThis.showRegister();
						} catch(e) {erp(e)}}
					}),
					L.TextView({
						text : "忘记密码",
						padding : [10 * G.dp, 10 * G.dp, 10 * G.dp, 10 * G.dp],
						gravity : L.Gravity("center"),
						layout : { width : -1, height : -2 },
						style : "button_critical",
						fontSize : 3,
						onClick : function() {try {
							popup.exit();
							realThis.showForgetPassword();
						} catch(e) {erp(e)}}
					})
				]
			})
		}), -1, -2);
	} catch(e) {erp(e)}})},
	showRegister : function self() { var realThis = this; G.ui(function() {try {
		var email, username, password, password2, popup, emailRegex = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
		popup = PopupPage.showDialog("usermanager.Register", L.ScrollView({
			style : "message_bg",
			child : L.LinearLayout({
				orientation : L.LinearLayout("vertical"),
				padding : [15 * G.dp, 15 * G.dp, 15 * G.dp, 5 * G.dp],
				children : [
					L.TextView({
						text : "注册",
						padding : [0, 0, 0, 10 * G.dp],
						layout : { width : -1, height : -2 },
						gravity : L.Gravity("center"),
						style : "textview_default",
						fontSize : 4
					}),
					email = L.EditText({
						hint : "邮箱",
						singleLine : true,
						padding : [0, 0, 0, 0],
						imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
						inputType : L.InputType("TYPE_CLASS_TEXT|TYPE_TEXT_VARIATION_EMAIL_ADDRESS"),
						style : "edittext_default",
						fontSize : 3,
						layout : { width : -1, height : -2 }
					}),
					username = L.EditText({
						hint : "用户名",
						singleLine : true,
						padding : [0, 20 * G.dp, 0, 0],
						imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
						inputType : L.InputType("TYPE_CLASS_TEXT|TYPE_TEXT_VARIATION_EMAIL_ADDRESS"),
						style : "edittext_default",
						fontSize : 3,
						layout : { width : -1, height : -2 }
					}),
					password = L.EditText({
						hint : "密码",
						singleLine : true,
						padding : [0, 20 * G.dp, 0, 0],
						imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
						transformationMethod : L.asClass(L.PasswordTransformationMethod).instance,
						style : "edittext_default",
						fontSize : 3,
						layout : { width : -1, height : -2 }
					}),
					password2 = L.EditText({
						hint : "确认密码",
						singleLine : true,
						padding : [0, 20 * G.dp, 0, 0],
						imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
						transformationMethod : L.asClass(L.PasswordTransformationMethod).instance,
						style : "edittext_default",
						fontSize : 3,
						layout : { width : -1, height : -2 }
					}),
					L.TextView({
						text : "注册",
						padding : [10 * G.dp, 15 * G.dp, 10 * G.dp, 15 * G.dp],
						gravity : L.Gravity("center"),
						layout : { width : -1, height : -2 },
						style : "button_critical",
						fontSize : 3,
						onClick : function() {try {
							if (!email.length()) return Common.toast("邮箱地址不能为空");
							if (email.length() > 80) return Common.toast("邮箱地址过长");
							if (!emailRegex.test(email.text)) return Common.toast("邮箱地址不正确");
							if (!username.length()) return Common.toast("用户名不能为空");
							if (username.length() < 2) return Common.toast("用户名太短\n用户名长度应大于等于2字符且小于等于80字符");
							if (username.length() > 80) return Common.toast("用户名太长\n用户名长度应大于等于2字符且小于等于80字符");
							if (!password.length()) return Common.toast("密码不能为空");
							if (password.length() < 6) return Common.toast("密码太短\n密码长度应大于等于6字符且小于等于1000字符");
							if (password.length() > 1000) return Common.toast("密码太长\n密码长度应大于等于6字符且小于等于1000字符");
							if (String(password.text) != String(password2.text)) return Common.toast("两次密码输入不一致");
							Common.showProgressDialog(function(dia) {
								dia.setText("正在发送验证邮件...");
								try {
									realThis.register(String(email.text), String(username.text), String(password.text));
								} catch(e) {
									Log.e(e);
									return Common.toast("注册失败\n" + e);
								}
								G.ui(function() {try {
									popup.exit();
									Common.showTextDialog("一份用于验证的邮件正在发送至" + email.text + "\n请在1天内点击邮件内的链接来确认注册");
								} catch(e) {erp(e)}});
							});
						} catch(e) {erp(e)}}
					})
				]
			})
		}), -1, -2);
	} catch(e) {erp(e)}})},
	showRefreshLogin : function(refreshToken, silent) {
		var realThis = this;
		if (silent) {
			Threads.run(function() {
				try {
					realThis.refreshLogin(refreshToken);
					CA.trySave();
				} catch(e) {
					Log.e(e);
				}
			});
		} else {
			Common.showProgressDialog(function(dia) {
				dia.setText("正在登录...");
				try {
					realThis.refreshLogin(refreshToken);
				} catch(e) {
					Log.e(e);
					return Common.toast("登录失败\n" + e);
				}
				CA.trySave();
				Common.toast("登录成功");
			});
		}
	},
	showUpdateUserInfo : function() {
		var realThis = this;
		Common.showProgressDialog(function(dia) {
			dia.setText("正在更新用户信息...");
			try {
				realThis.updateUserInfo();
			} catch(e) {
				Log.e(e);
				return Common.toast("更新用户信息失败\n" + e);
			}
		});
	},
	showForgetPassword : function self() { var realThis = this; G.ui(function() {try {
		var email, password, password2, popup;
		popup = PopupPage.showDialog("usermanager.ForgetPassword", L.ScrollView({
			style : "message_bg",
			child : L.LinearLayout({
				orientation : L.LinearLayout("vertical"),
				padding : [15 * G.dp, 15 * G.dp, 15 * G.dp, 5 * G.dp],
				children : [
					L.TextView({
						text : "忘记密码",
						padding : [0, 0, 0, 10 * G.dp],
						layout : { width : -1, height : -2 },
						gravity : L.Gravity("center"),
						style : "textview_default",
						fontSize : 4
					}),
					email = L.EditText({
						hint : "邮箱",
						singleLine : true,
						padding : [0, 0, 0, 0],
						imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
						inputType : L.InputType("TYPE_CLASS_TEXT|TYPE_TEXT_VARIATION_EMAIL_ADDRESS"),
						style : "edittext_default",
						fontSize : 3,
						layout : { width : -1, height : -2 }
					}),
					password = L.EditText({
						hint : "密码",
						singleLine : true,
						padding : [0, 20 * G.dp, 0, 0],
						imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
						transformationMethod : L.asClass(L.PasswordTransformationMethod).instance,
						style : "edittext_default",
						fontSize : 3,
						layout : { width : -1, height : -2 }
					}),
					password2 = L.EditText({
						hint : "确认密码",
						singleLine : true,
						padding : [0, 20 * G.dp, 0, 0],
						imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
						transformationMethod : L.asClass(L.PasswordTransformationMethod).instance,
						style : "edittext_default",
						fontSize : 3,
						layout : { width : -1, height : -2 }
					}),
					L.TextView({
						text : "重置密码",
						padding : [10 * G.dp, 15 * G.dp, 10 * G.dp, 15 * G.dp],
						gravity : L.Gravity("center"),
						layout : { width : -1, height : -2 },
						style : "button_critical",
						fontSize : 3,
						onClick : function() {try {
							if (!email.length()) return Common.toast("邮箱地址不能为空");
							if (!password.length()) return Common.toast("密码不能为空");
							if (String(password.text) != String(password2.text)) return Common.toast("两次密码输入不一致");
							Common.showProgressDialog(function(dia) {
								dia.setText("正在发送重置密码邮件...");
								try {
									realThis.requestResetPassword(String(email.text), String(password.text));
								} catch(e) {
									Log.e(e);
									return Common.toast("重置密码失败\n" + e);
								}
								G.ui(function() {try {
									popup.exit();
									Common.showTextDialog("一份用于确认重置密码的邮件正在发送至" + email.text + "\n请在1天内点击邮件内的链接来确认重置密码");
								} catch(e) {erp(e)}});
							});
						} catch(e) {erp(e)}}
					})
				]
			})
		}), -1, -2);
	} catch(e) {erp(e)}})},
	showAuthorize : function(query) {
		var realThis = this;
		if (this.accessToken) {
			Common.showProgressDialog(function(dia) {
				var authToken;
				dia.setText("正在使用命令助手登录...");
				try {
					authToken = realThis.authorize();
					AndroidBridge.startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(query.redirect + "?token=" + encodeURIComponent(authToken)))
						.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
				} catch(e) {
					Log.e(e);
					return Common.toast("使用命令助手登录失败\n" + e);
				}
			});
		} else {
			this.showLogin(function() {
				realThis.showAuthorize(query);
			});
		}
	},
	showAdminAuth : function(callback) {
		var realThis = this;
		Common.showProgressDialog(function(dia) {
			dia.setText("正在以管理员权限登录..");
			try {
				realThis.acquireAdminToken();
			} catch(e) {
				Log.e(e);
				return Common.toast("使用管理员权限登录失败\n" + e);
			}
			G.ui(function() {try {
				if (callback) callback();
			} catch(e) {erp(e)}});
		});
	},
	showChangePassword : function self() { var realThis = this; G.ui(function() {try {
		var oldpwd, newpwd, newpwd2, popup;
		popup = PopupPage.showDialog("usermanager.ForgetPassword", L.ScrollView({
			style : "message_bg",
			child : L.LinearLayout({
				orientation : L.LinearLayout("vertical"),
				padding : [15 * G.dp, 15 * G.dp, 15 * G.dp, 5 * G.dp],
				children : [
					L.TextView({
						text : "更改密码",
						padding : [0, 0, 0, 10 * G.dp],
						layout : { width : -1, height : -2 },
						gravity : L.Gravity("center"),
						style : "textview_default",
						fontSize : 4
					}),
					oldpwd = L.EditText({
						hint : "旧密码",
						singleLine : true,
						padding : [0, 20 * G.dp, 0, 0],
						imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
						transformationMethod : L.asClass(L.PasswordTransformationMethod).instance,
						style : "edittext_default",
						fontSize : 3,
						layout : { width : -1, height : -2 }
					}),
					newpwd = L.EditText({
						hint : "新密码",
						singleLine : true,
						padding : [0, 20 * G.dp, 0, 0],
						imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
						transformationMethod : L.asClass(L.PasswordTransformationMethod).instance,
						style : "edittext_default",
						fontSize : 3,
						layout : { width : -1, height : -2 }
					}),
					newpwd2 = L.EditText({
						hint : "确认新密码",
						singleLine : true,
						padding : [0, 20 * G.dp, 0, 0],
						imeOptions : L.EditorInfo("IME_FLAG_NO_FULLSCREEN"),
						transformationMethod : L.asClass(L.PasswordTransformationMethod).instance,
						style : "edittext_default",
						fontSize : 3,
						layout : { width : -1, height : -2 }
					}),
					L.TextView({
						text : "设置密码",
						padding : [10 * G.dp, 15 * G.dp, 10 * G.dp, 15 * G.dp],
						gravity : L.Gravity("center"),
						layout : { width : -1, height : -2 },
						style : "button_critical",
						fontSize : 3,
						onClick : function() {try {
							if (!oldpwd.length()) return Common.toast("原密码不能为空");
							if (!newpwd.length()) return Common.toast("新密码不能为空");
							if (String(newpwd.text) != String(newpwd2.text)) return Common.toast("两次新密码输入不一致");
							Common.showProgressDialog(function(dia) {
								dia.setText("正在保存密码..");
								try {
									realThis.setPassword(String(oldpwd.text), String(newpwd.text));
								} catch(e) {
									Log.e(e);
									return Common.toast("密码保存失败\n" + e);
								}
								G.ui(function() {try {
									popup.exit();
									Common.toast("密码已保存");
								} catch(e) {erp(e)}});
							});
						} catch(e) {erp(e)}}
					})
				]
			})
		}), -1, -2);
	} catch(e) {erp(e)}})},
	showChangeName : function(callback) {
		var realThis = this;
		var userInfo = this.userInfo;
		Common.showInputDialog({
			title : "更改用户名",
			defaultValue : userInfo.name,
			callback : function(s) {
				Common.showProgressDialog(function(dia) {
					dia.setText("正在保存用户名..");
					try {
						realThis.setUsername(s);
						userInfo.name = s;
					} catch(e) {
						Log.e(e);
						return Common.toast("用户名保存失败\n" + e);
					}
					G.ui(function() {try {
						Common.toast("用户名已保存");
						if (callback) callback();
					} catch(e) {erp(e)}});
				});
			}
		});
	},
	showSyncExp : function(callback, silent) {
		var realThis = this, result;
		if (silent) {
			Threads.run(function() {
				try {
					realThis.syncExp();
					if (callback) callback();
				} catch(e) {
					Log.e(e);
				}
			});
		} else {
			Common.showProgressDialog(function(dia) {
				dia.setText("正在同步经验...");
				try {
					result = realThis.syncExp();
					if (result > 0) {
						Common.toast("同步经验成功\n已增加" + result + "点经验");
					} else {
						Common.toast("同步经验成功");
					}
					if (callback) callback();
				} catch(e) {
					Log.e(e);
					Common.toast("同步经验失败\n" + e);
				}
			});
		}
	},
	getSettingItem : function() {
		var realThis = this;
		return {
			type : "custom",
			get : function() {
				var userInfo = realThis.userInfo;
				if (userInfo) {
					this.name = userInfo.name;
					this.description = userInfo.email;
				} else {
					this.name = "未登录";
					this.description = "点击登录命令助手账号";
				}
				return "";
			},
			onclick : function(fset) {
				if (realThis.userInfo) {
					realThis.showManage(fset);
				} else {
					realThis.showLogin(fset);
				}
			}
		};
	},
	showManage : function(callback) { var realThis = this; G.ui(function() {try {
		var popup, userInfo = realThis.userInfo;
		var exp = realThis.parseExpLevel(userInfo.experience);
		var hasExpToSync = realThis.hasExpToSync();
		popup = PopupPage.showSideBar("usermanager.Manage", L.ScrollView({
			style : "message_bg",
			fillViewport : true,
			child : L.LinearLayout({
				orientation : L.LinearLayout("vertical"),
				padding : [20 * G.dp, 20 * G.dp, 20 * G.dp, 0],
				layout : { width : -1, height : -1 },
				children : [
					L.TextView({
						text : userInfo.name,
						layout : { width : -1, height : -2 },
						style : "textview_default",
						fontSize : 4
					}),
					L.TextView({
						text : userInfo.email,
						layout : { width : -1, height : -2 },
						padding : [0, 0, 0, 5 * G.dp],
						style : "textview_prompt",
						fontSize : 1
					}),
					L.LinearLayout({
						orientation : L.LinearLayout("horizontal"),
						backgroundColor : Common.theme.promptcolor,
						layout : { width : -1, height : 2 * G.dp },
						weightSum : exp.levelExp,
						child : L.View({
							backgroundColor : Common.theme.highlightcolor,
							layout : { width : 0, height : -1, weight : exp.rest }
						})
					}),
					L.LinearLayout({
						orientation : L.LinearLayout("horizontal"),
						layout : { width : -1, height : -2 },
						padding : [0, 0, 0, 5 * G.dp],
						children : [
							L.TextView({
								text : "Lv. " + exp.level,
								layout : { width : -2, height : -2, weight : 1.0 },
								style : "textview_default",
								fontSize : 1
							}),
							L.TextView({
								text : exp.rest + "/" + exp.levelExp,
								layout : { width : -2, height : -2 },
								style : "textview_default",
								fontSize : 1
							}),
						]
					}),
					L.TextView({
						text : hasExpToSync && !userInfo.checkedIn ? "签到" : "同步经验",
						padding : [0, 15 * G.dp, 0, 15 * G.dp],
						gravity : L.Gravity("left"),
						layout : { width : -1, height : -2 },
						style : hasExpToSync ? "button_critical" : "button_highlight",
						fontSize : 3,
						onClick : function() {try {
							if (realThis.isOnline()) {
								realThis.showSyncExp(callback);
							} else {
								Common.toast("同步经验成功");
							}
							popup.exit();
						} catch(e) {erp(e)}}
					}),
					L.TextView({
						text : "更改用户名",
						padding : [0, 15 * G.dp, 0, 15 * G.dp],
						gravity : L.Gravity("left"),
						layout : { width : -1, height : -2 },
						style : "button_highlight",
						fontSize : 3,
						onClick : function() {try {
							realThis.showChangeName(callback);
							popup.exit();
						} catch(e) {erp(e)}}
					}),
					L.TextView({
						text : "更改密码",
						padding : [0, 15 * G.dp, 0, 15 * G.dp],
						gravity : L.Gravity("left"),
						layout : { width : -1, height : -2 },
						style : "button_highlight",
						fontSize : 3,
						onClick : function() {try {
							realThis.showChangePassword();
							popup.exit();
						} catch(e) {erp(e)}}
					}),
					L.TextView({
						text : "注销",
						padding : [0, 15 * G.dp, 0, 15 * G.dp],
						gravity : L.Gravity("left"),
						layout : { width : -1, height : -2 },
						style : "button_highlight",
						fontSize : 3,
						onClick : function() {try {
							realThis.logout();
							if (callback) callback();
							popup.exit();
						} catch(e) {erp(e)}}
					}),
					L.TextView({
						text : "进入管理界面",
						visibility : L.View(realThis.isAdmin() ? "visible" : "gone"),
						padding : [0, 15 * G.dp, 0, 15 * G.dp],
						gravity : L.Gravity("left"),
						layout : { width : -1, height : -2 },
						style : "button_highlight",
						fontSize : 3,
						onClick : function() {try {
							realThis.showAdminAuth(function() {
								DebugUtils.showDebugDialog(realThis.getDebugInterface());
							});
							popup.exit();
						} catch(e) {erp(e)}}
					}),
					L.Space({
						layout : { width : -1, height : 0, weight : 1.0 }
					}),
					L.TextView({
						text : "关闭",
						padding : [10 * G.dp, 20 * G.dp, 10 * G.dp, 20 * G.dp],
						gravity : L.Gravity("center"),
						layout : { width : -1, height : -2 },
						style : "button_critical",
						fontSize : 3,
						onClick : function() {try {
							popup.exit();
						} catch(e) {erp(e)}}
					})
				]
			})
		}), "left", 160 * G.dp, 0.2);
		popup.enter();
	} catch(e) {erp(e)}})},
	getDebugInterface : function self() {
		if (self.cache && self.cache.accessToken == this.accessToken) return self.cache;
		var realThis = this;
		var scope = Object.create(this.internal);
		scope.list = realThis.executeAdminAction.bind(realThis, "Admin.listActions");
		scope.action = realThis.executeAdminAction.bind(realThis);
		scope.lastError = realThis.executeAdminAction.bind(realThis, "Admin.getLastError");
		return self.cache = {
			accessToken : realThis.accessToken,
			getWelcomeText : function() {
				return "欢迎使用管理员控制台 本控制台拓展了默认控制台的功能"
			},
			getGlobal : function() {
				return MapScript.global;
			},
			evalExpr : function(expr) {
				return Loader.evalSpecial(expr, "AdminDebugInterface", 0, scope, null);
			},
			onCommand : function(cmd) {
				return false;
			},
			setPrinter : function() {}
		};
	},
	onCreate : function() {
		Internal.add("UserManager", this);
	},
	initialize : function() {
		NetworkUtils.addErrorMessages(this.errorMessage);
		this.loadToken();
	}
});