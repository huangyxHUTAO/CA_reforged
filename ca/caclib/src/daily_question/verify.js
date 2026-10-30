(function() {/*LOADER
postprocessor = require("./encrypt.js");
*/
function random(seed) {
	return (seed[0] = (seed[0] * 9301 + 49297) % 233280) / 233280;
}
function unwind(str, p) {
	var seed = [str.length * p], seq = [], j, t;p
	for (i = 0; i < str.length; i++) seq[i] = str.charAt(i);
	while (i > 0) {
		j = Math.floor(random(seed) * i--);
		t = seq[j];
		seq[j] = seq[i];
		seq[i] = t;
	}
	return seq.join("");
}
var Filter = {
	allOf : function(r, param) {
		param.filters.forEach(function(e) {
			if (!Filter[e.type](r, e)) throw "Denied by " + e.type;
		});
	},
	someOf : function(r, param) {
		var count = 0;
		param.filters.forEach(function(e) {
			if (Filter[e.type](r, e)) count++;
		});
		return count > 0;
	},
	noneOf : function(r, param) {
		param.filters.forEach(function(e) {
			if (Filter[e.type](r, e)) throw "Denied by " + e.type;
		});
	},
	noPositiveKeys : function(r, param) {
		return Object.keys(r.positive).length == 0;
	},
	containsPositiveKeys : function(r, param) {
		var a = Object.keys(r.positive), i;
		for (i in param.keys) if (a.indexOf(param.keys[i]) < 0) return false;
		return true;
	},
	allOfPositiveKeys : function(r, param) {
		var a = Object.keys(r.positive), i;
		for (i in a) if (param.keys.indexOf(a[i]) < 0) return false;
		return true;
	},
	equalsPositiveKeys : function(r, param) {
		var a = Object.keys(r.positive), i;
		for (i in a) if (param.keys.indexOf(a[i]) < 0) return false;
		return a.length == param.keys.length;
	},
	noNegativeKeys : function(r, param) {
		return r.negative.length == 0;
	},
	containsNegativeKeys : function(r, param) {
		var a = r.negative, i, keys = {};
		for (i in a) {
			if (param.keys.indexOf(a[i].key) >= 0) {
				keys[a[i].key] = 1;
			}
		}
		return param.keys.length == Object.keys(keys).length;
	},
	allOfNegativeKeys : function(r, param) {
		var a = r.negative, i;
		for (i in a) if (param.keys.indexOf(a[i].key) < 0) return false;
		return true;
	},
	equalsNegativeKeys : function(r, param) {
		var a = r.negative, i, keys = {};
		for (i in a) {
			if (param.keys.indexOf(a[i].key) >= 0) {
				keys[a[i].key] = 1;
			} else {
				return false;
			}
		}
		return param.keys.length == Object.keys(keys).length;
	},
	numbericPositiveKeys : function(r, param) {
		var a = Object.keys(r.positive), i;
		for (i in a) {
			if (param.keys.indexOf(a[i]) >= 0) {
				r.positive[a[i]] = Number(r.positive[a[i]]);
				if (isNaN(r.positive[a[i]])) return false;
			}
		}
		return true;
	},
	numbericNegativeKeys : function(r, param) {
		var a = r.negative, i;
		for (i in a) {
			if (param.keys.indexOf(a[i].key) >= 0) {
				a[i].value = Number(a[i].value);
				if (isNaN(a[i].value)) return false;
			}
		}
		return true;
	},
	scoresKey : function(ks, param) {
		var a = ks.positive[param.key], r = {};
		if (!a.startsWith("{") || !a.endsWith("}")) return false;
		a = a.slice(1, -1).split(",");
		a.forEach(function(e) {
			var i = e.indexOf("=");
			if (i < 0) throw "Cannot find equals sign";
			var a = e.slice(0, i), b = e.slice(i + 1), c;
			if (b.startsWith("!")) {
				r[a] = {
					type : "neq",
					score : Number(b.slice(1))
				}
			} else {
				i = b.indexOf("..");
				if (i < 0) {
					r[a] = {
						type : "equ",
						score : Number(b)
					}
				} else {
					c = b.slice(i + 2);
					b = b.slice(0, i);
					if (b.length == 0) {
						r[a] = {
							type : "leq",
							score : Number(c)
						}
					} else if (c.length == 0) {
						r[a] = {
							type : "geq",
							score : Number(b)
						}
					} else {
						r[a] = {
							type : "in",
							scoreMin : Number(b),
							scoreMax : Number(c)
						}
						if (isNaN(r[a].scoreMin) || isNaN(r[a].scoreMax)) throw "Not a number";
						return;
					}
				}
			}
			if (isNaN(r[a].score)) throw "Not a number";
		});
		ks.positive[param.key] = r;
		return true;
	}
};
var parseSelector = function(s, filters) {
	var positive = {}, negative = [], r;
	try {
		splitSelector(s).forEach(function(e) {
			var i = e.indexOf("=");
			if (i < 0) throw "Cannot find equals sign";
			var a = e.slice(0, i), b = e.slice(i + 1);
			if (b.startsWith("!")) {
				negative.push({key: a, value: b.slice(1)});
			} else {
				positive[a] = b;
			}
		});
		r = {positive: positive, negative: negative};
		if (filters) {
			Filter.allOf(r, {
				filters : filters
			});
		}
		return r;
	} catch(e) {}
	return null;
}
var normalizeSelectorBox = function(pos) {
	if (pos.dx < 0) {
		pos.dx = -pos.dx; pos.x -= pos.dx;
	}
	if (pos.dy < 0) {
		pos.dy = -pos.dy; pos.y -= pos.dy;
	}
	if (pos.dz < 0) {
		pos.dz = -pos.dz; pos.z -= pos.dz;
	}
}
var splitSelector = function(s) {
	var arr = [], i, j, k;
	i = 0;
	while (i < s.length) {
		j = s.indexOf(",", i);
		if (j < 0) break;
		k = s.indexOf("{", i);
		if (k >= i && k < j) {
			k = s.indexOf("}", k);
			if (k < 0) break;
			j = s.indexOf(",", k + 1);
			if (j < 0) break;
		}
		arr.push(s.slice(i, j));
		i = j + 1;
	}
	arr.push(s.slice(i));
	return arr;
}
var questions = Loader.fromFile("./questions.js");
var i = questions.length, j, t, seed = [questions.length];
while (i > 0) {
	j = Math.floor(random(seed) * i--);
	t = questions[j];
	questions[j] = questions[i];
	questions[i] = t;
}
var current = {};
return {
	setDate : function(date) {
		var i, seed;
		current.date = date;
		seed = [Math.floor(Math.abs((current.date + 39600000) / 86400000))];
		for (i = questions.length - 1; i >= 0; i--) random(seed);
		current.base = seed[0];
		return this;
	},
	requestQuestion : function() {
		current.random = random([current.base]);
		return current.question = questions[Math.floor((current.date + 39600000) / 86400000) % questions.length];
	},
	requestVerification : function() {
		var rnd = random([current.base]);
		current.random = 207.913610;
		return current.question = {
			question: "请问今天的代码是？",
			answer: function(s) {
				return parseInt(s) == Math.floor(rnd * 1000000);
			},
			answerType: "number",
			verification : true
		};
	},
	checkAnswer : function(answer) {
		var cur = current.question, t;
		if (answer.startsWith("/")) answer = answer.slice(1);
		if (cur.answer instanceof Function) {
			if (cur.answer(answer, unwind)) return Math.floor(current.random * 1000000);
		} else {
			if (t = new RegExp(cur.wp ? unwind(cur.answer, cur.wp) : cur.answer, "").exec(answer)) {
				if (t[0].length == answer.length) return Math.floor(current.random * 1000000);
			}
		}
	},
	getNextUpdateTime : function() {
		return new Date(Math.ceil((current.date + 39600000) / 86400000) * 86400000 - 39600000);
	},
	getCount : function() {
		return questions.length;
	},
	getLastUpdateAt : function() {
		return "2019年2月5日";
	}
};
})()