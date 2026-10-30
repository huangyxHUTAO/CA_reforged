MapScript.loadModule("JSONHelper", {
    Context: function(str, onToken, options) {
        this.p = 0;
        this.s = str;
        this.onToken = onToken || (() => void 0);
        this.eof = () => this.p >= this.s.length;
        this.rest = () => this.s.slice(this.p);
        this.peek = (n) => {
            if (this.eof()) this.reportError("Unexpected EOF");
            return n ? this.s.slice(this.p, this.p + n) : this.s.charAt(this.p);
        };
        this.expect = (ch) => {
            if (this.peek() == ch) {
                this.p++;
                return ch;
            } else {
                this.reportError("Expected " + ch);
            }
        }
        this.consume = (n) => {
            if (n) this.p += n - 1;
            if (this.eof()) this.reportError("Unexpected EOF");
            this.p++;
            return n ? this.s.slice(this.p - n, this.p) : this.s.charAt(this.p - 1);
        }
        this.token = (type, f) => {
            const start = this.p;
            const value = f();
            this.onToken(start, this.p, type, value);
            return value;
        }
        this.reportError = (msg) => {
            const err = new Error(msg);
            err.position = this.p;
            throw err;
        };
        Object.assign(this, options);
    },
    JSON: {},
    JSONC: {
        allowComments: true
    },
    JSON5: {
        allowComments: true,
        allowTrailingComma: true,
        allowSingleQuote: true,
        allowLatinEscape: true,
        allowEscapeAny: true,
        allowIdentiferAsName: true,
        whitespaces: " \t\r\n",
        identifierRegExp: /^[^\s"'\\:]+/
    },
    scan(str, onToken, options) {
        let cx = new this.Context(str, onToken, options);
        const ret = this.scanNext(cx);
        this.skipWhitespace(cx);
        if (!cx.eof()) {
            cx.reportError("Unexpected JSON end");
        }
        return ret;
    },
    scanNext(cx) {
        this.skipWhitespace(cx);
        const ch = cx.peek();
        if (ch == "{") {
            return this.scanObject(cx);
        }
        if (ch == "[") {
            return this.scanArray(cx);
        }
        if (ch == "\"" || ch == "'") {
            return cx.token("literal", () => this.scanString(cx));
        }
        if (ch == "-" || ch == "+" || ch >= "0" && ch <= "9" || ch == "N") {
            return cx.token("literal", () => this.scanNumber(cx));
        }
        return cx.token("literal", () => this.scanLiteral(cx));
    },
    scanObject(cx) {
        cx.token("objectBegin", () => cx.expect("{"));
        let expectComma = false, afterComma = false;
        const object = {};
        this.skipWhitespace(cx);
        let name, value;
        for (;;) {
            if (cx.peek() == "}") {
                if (afterComma && !cx.allowTrailingComma) {
                    cx.reportError("Trailing comma not allowed");
                }
                cx.token("objectEnd", () => cx.consume());
                break;
            }
            if (expectComma) {
                cx.token("objectSeparator", () => cx.expect(","));
                this.skipWhitespace(cx);
                expectComma = false;
                afterComma = true;
                continue;
            }
            name = cx.token("propertyName", () => this.scanIdentifier(cx));
            this.skipWhitespace(cx);
            cx.token("propertySeparator", () => cx.expect(":"));
            value = this.scanNext(cx);
            object[name] = value;
            this.skipWhitespace(cx);
            expectComma = true;
            afterComma = false;
        }
        return object;
    },
    scanArray(cx) {
        cx.token("arrayBegin", () => cx.expect("["));
        let expectComma = false, afterComma = false;
        const array = [];
        this.skipWhitespace(cx);
        let value;
        for (;;) {
            if (cx.peek() == "]") {
                if (afterComma && !cx.allowTrailingComma) {
                    cx.reportError("Trailing comma not allowed");
                }
                cx.token("arrayEnd", () => cx.consume());
                break;
            }
            if (expectComma) {
                cx.token("arraySeparator", () => cx.expect(","));
                this.skipWhitespace(cx);
                expectComma = false;
                afterComma = true;
                continue;
            }
            value = this.scanNext(cx);
            array.push(value);
            this.skipWhitespace(cx);
            expectComma = true;
            afterComma = false;
        }
        return array;
    },
    Literals: {
        "true": true,
        "false": false,
        "null": null
    },
    scanLiteral(cx) {
        let key;
        const literals = cx.literals || this.Literals;
        for (key in literals) {
            if (cx.peek(key.length) == key) {
                cx.consume(key.length);
                return literals[key];
            }
        }
        cx.reportError("Unknown literal");
    },
    scanIdentifier(cx) {
        if (cx.identifierRegExp) {
            const match = cx.rest().match(cx.identifierRegExp);
            if (match) {
                cx.consume(match[0].length);
                return match[0];
            }
        }
        return this.scanString(cx);
    },
    StringEscapes: {
        "\"": "\"",
        "\\": "\\",
        "/": "/",
        "b": "\b",
        "f": "\f",
        "n": "\n",
        "r": "\r",
        "t": "\t" 
    },
    scanString(cx) {
        let quote;
        if (cx.allowSingleQuote && cx.peek() == "'") {
            quote = cx.consume();
        } else {
            quote = cx.expect("\"");
        }
        const escapeMap = cx.escapes || this.StringEscapes;
        const characters = [];
        let ch, esc, hex;
        for (;;) {
            ch = cx.peek();
            if (ch == quote) {
                cx.consume();
                break;
            }
            if (ch == "\\") {
                cx.consume();
                esc = cx.peek();
                if (esc == "u") {
                    cx.consume();
                    hex = cx.peek(4);
                    if (hex.match(/[0-9a-fA-F]{4}/)) {
                        cx.consume(4);
                        characters.push(String.fromCharCode(parseInt(hex, 16)));
                    } else {
                        cx.reportError("Illegal unicode codepoint");
                    }
                } else if (cx.allowLatinEscape && esc == "x") {
                    cx.consume();
                    hex = cx.peek(2);
                    if (hex.match(/[0-9a-fA-F]{2}/)) {
                        cx.consume(2);
                        characters.push(String.fromCharCode(parseInt(hex, 16)));
                    } else {
                        cx.reportError("Illegal latin codepoint");
                    }
                } else if (esc in escapeMap) {
                    cx.consume();
                    characters.push(escapeMap[esc]);
                } else if (cx.allowSingleQuote && esc == "'") {
                    cx.consume();
                    characters.push("'");
                } else {
                    if (cx.allowEscapeAny) {
                        characters.push(ch);
                    } else {
                        cx.reportError("Illegal string escape \\" + esc);
                    }
                }
            } else if (ch.charCodeAt(0) >= 0x20) {
                cx.consume();
                characters.push(ch);
            } else {
                cx.reportError("Illegal string character " + ch);
            }
        }
        return characters.join("");
    },
    NumberRegExp: /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/,
    scanNumber(cx) {
        const numberRegExp = cx.numberRegExp || this.NumberRegExp;
        const match = cx.rest().match(numberRegExp);
        if (match) {
            cx.consume(match[0].length);
            return Number(match[0]);
        } else {
            cx.reportError("Illegal number format");
        }
    },
    Whitespaces: " \t\r\n",
    skipWhitespace(cx) {
        const whitespaces = cx.whitespaces || this.Whitespaces;
        let ch, ch2;
        while (!cx.eof()) {
            ch2 = cx.peek(2);
            if (cx.allowComments) {
                let commentContent = [];
                if (ch2 == "//") {
                    cx.token("lineComment", () => {
                        cx.consume(2);
                        for (;;) {
                            if (cx.eof()) break;
                            ch = cx.peek();
                            if (ch == "\r" || ch == "\n") break;
                            commentContent.push(ch);
                            cx.consume(1);
                        }
                        return commentContent.join("");
                    });
                    continue;
                }
                if (ch2 == "/*") {
                    cx.token("blockComment", () => {
                        cx.consume(2);
                        for (;;) {
                            if (cx.eof()) break;
                            ch2 = cx.peek(2);
                            if (ch2 == "*/") {
                                cx.consume(2);
                                break;
                            };
                            commentContent.push(ch2.charAt(0));
                            cx.consume(1);
                        }
                        return commentContent.join("");
                    });
                    continue;
                }
            }
            ch = ch2.charAt(0);
            if (whitespaces.indexOf(ch) >= 0) {
                cx.consume();
                continue;
            }
            break;
        }
    }
});