function random(seed) {
	return (seed[0] = (seed[0] * 9301 + 49297) % 233280) / 233280;
}
function hash(s) {
	var i, result = 0;
	for (i = s.length - 1; i >= 0; i--) result = (result + s.charCodeAt(i)) % 233280;
	return result;
}
function wind(str, p) {
	var seed = [str.length * p], randoms = [], seq = [], j, t;
	for (i = 0; i < str.length; i++) {
		randoms[str.length - i - 1] = random(seed);
		seq[i] = str.charAt(i);
	}
	i = 0;
	while (i < str.length) {
		j = Math.floor(randoms[i] * (i + 1));
		t = seq[j];
		seq[j] = seq[i];
		seq[i] = t;
		i++;
	}
	return seq.join("");
}
function tokenize(s) {
	var i = 0, r = [], ch, ch2, fl, token;
	while (i < s.length) {
		switch (ch = s.charAt(i)) {
			case "\"":
			case "'":
			fl = 0;
			token = {
				start : i,
				type : ch,
				kind : "string"
			};
			while (++i < s.length) {
				ch2 = s.charAt(i);
				if (ch2 == "\\") {
					i++;
					continue;
				}
				if (ch2 == ch) {
					token.end = i + 1;
					r.push(token);
					break;
				}
			}
			break;
			case "/":
			token = {
				start : i,
				kind : "comment"
			};
			ch2 = s.charAt(++i);
			token.type = ch2;
			if (ch2 == "/") {
				while (++i < s.length) {
					ch2 = s.charAt(i);
					if (ch2 == "\r" || ch2 == "\n") {
						token.end = i;
						r.push(token);
						break;
					}
				}
			} else if (ch2 == "*") {
				fl = 0;
				while (++i < s.length) {
					ch2 = s.charAt(i);
					if (fl == 1 && ch2 == "/") {
						token.end = i + 1;
						r.push(token);
						break;
					}
					fl = ch2 == "*" ? 1 : 0;
				}
			} else {
				continue;
			}
		}
		i++;
	}
	return r;
}
function encryptString(str) {
	if (str.length < 3) return JSON.stringify(str);
	var seed = Math.ceil(random([hash(str)]) * 233280 / str.length);
	return "unwind(" + JSON.stringify(wind(str, seed)) + ", " + seed + ")";
}
function encrypt(source) {
	var tokens = tokenize(source).filter((e) => e.kind == "string"), i, e, result = [], lastEnd = 0;
	if (!tokens.length) return source;
	for (i = 0; i < tokens.length; i++) {
		e = tokens[i];
		result.push(
			source.slice(lastEnd, e.start),
			encryptString(JSON.parse(source.slice(e.start, e.end)))
		);
		lastEnd = e.end;
	}
	result.push(source.slice(e.end));
	return result.join("");
}
module.exports = encrypt;