function parseNative(data) {
	try {
		return JSON.parse(data);
	} catch(e) {
		return data;
	}
}
function readConfig(content) {
	var i, a = content.split(/\r\n|\r|\n/), result = {};
	var lastData = [], spacePos, multiline = "";
	for (i = 0; i < a.length; i++) {
		if (a[i].startsWith("@")) {
			if (multiline && a[i] == "@end " + multiline) {
				result[multiline] = parseNative(lastData.join("\n"));
			} else {
				spacePos = a[i].indexOf(" ");
				if (spacePos >= 0) {
					result[a[i].slice(1, spacePos)] = parseNative(a[i].slice(spacePos + 1));
				} else {
					multiline = a[i].slice(1);
				}
			}
		} else if (multiline) {
			lastData.push(a[i]);
		}
	}
	return result;
}
module.exports = readConfig;