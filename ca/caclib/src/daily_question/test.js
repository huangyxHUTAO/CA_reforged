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
function unwind(str, p) {
	var seed = [str.length * p], seq = [], j, t;p
	for (i = 0; i < str.length; i++) seq[i] = str.charAt(i);
	while (i > 0) {
		j = Math.floor(random(seed) * i--);
		t = seq[j];
		if (t == undefined) console.log(i, seed);
		seq[j] = seq[i];
		seq[i] = t;
	}
	return seq.join("");
}
function randomstr(base, length) {
	var i, r = [];
	for (i = 0; i < length; i++) {
		r.push(base.charAt(Math.floor(Math.random() * base.length)));
	}
	return r.join("");
}
function main() {
	var i, j, a, b, c, seed;
	for (i = 1; i < 600; i++) {
		for (j = 0; j < 1000; j++) {
			a = randomstr("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`~!@#$%^&*()_+-=|\\[{]};:'\",<.>/?", i);
			seed = Math.floor(random([hash(a)]) * 233280 / a.length);
			b = wind(a, seed);
			c = unwind(b, seed);
			if (a != c) {
				console.log("Test failed. len=" + i + ",seed=" + seed + ",a=" + a);
				return;
			}
		}
		console.log("Test #" + i + " completed.");
	}
}
main();