[{
    question: "如何检测最近玩家是否携带了命令方块？",
    answer: "clear\\s+@p\\s+command_block\\s+-1\\s+0"
}, {
    question: "如何复制(1,3,5)-(2,4,6)区域内所有的非空气方块到(-1,8,-5)-(0,9,-4)?（请让第一个坐标的X、Y、Z分别小于等于第二个坐标的X、Y、Z）",
    answer: "clone\\s+1\\s+3\\s+5\\s+2\\s+4\\s+6\\s+-1\\s+8\\s+-5\\s+masked(\\s+(normal|force))?"
}, {
    question: "如何复制(7,17,2)-(9,18,3)区域内所有的泥土方块，使复制后(7,17,2)位置的方块被复制到当前位置？（请让第一个坐标的X、Y、Z分别小于等于第二个坐标的X、Y、Z）",
    answer: "clone\\s+7\\s+17\\s+2\\s+9\\s+18\\s+3\\s+~\\s*~\\s*~\\s+filtered\\s+(normal|force)\\s+dirt(\\s+0)?"
}, {
    question: "如何给予最近玩家无敌效果10秒且隐藏粒子？",
    answer: "effect\\s+@p\\s+resistance\\s+10\\s+([1-9]\\d+|[5-9])\\s+true"
}, {
    question: "如何给予所有玩家徒手攻击其他实体无伤的效果1分钟？",
    answer: "effect\\s+@a\\s+weakness\\s+60(\\s+[19-]\\d*(\\s+(true|false))?)?"
}, {
    question: "如何检测最近玩家手持物品是否是钓鱼竿？（钓鱼竿已被附魔为饵钓I）",
    answer: "enchant\\s+@p\\s+lure(\\s+1)?"
}, {
    question: "如何杀死所有站在灰色羊毛上的玩家？（命令执行点为玩家所在坐标）",
    answer: "execute\\s+@a\\s+~\\s*~\\s*~\\s+detect\\s+~\\s+~-1\\s+~\\s+wool\\s+7\\s+kill(\\s+(@s|@p))?"
}, {
    question: "如何将玩家A传送到玩家B前方两格？",
    answer: "execute\\s+B\\s+~\\s+~\\s+~\\s+(tp|teleport)\\s+A\\s+\\^\\s+\\^\\s+\\^2"
}, {
    question: "如何给予以(5,31,2)为中心，半径50格范围内的所有玩家“雷罚”一次？",
    answer: function(str, unwind) {
        var a = new RegExp("^execute\\s+@a\\[(.+?)\\]\\s+~\\s+~\\s+~\\s+summon\\s+minecraft:lightning_bolt(\\s+~\\s+~\\s+~)?$", "").exec(str);
        if (!a) return false;
        var i, p = parseSelector(a[1], [
            {
                type: "equalsPositiveKeys",
                keys: ["x", "y", "z", "r"]
            }, {
                type: "noNegativeKeys"
            }, {
                type: "numbericPositiveKeys",
                keys: ["x", "y", "z", "r"]
            }
        ]);
        if (!p) return false;
        var pos = p.positive;
        return pos.x == 5 && pos.y == 31 && pos.z == 2 && pos.r == 50;
    } 
}, {
    question: "如何将(1,3,5)-(2,4,6)区域内所有的石头方块替换为空气？（请让第一个坐标的X、Y、Z分别小于等于第二个坐标的X、Y、Z）",
    answer: "fill\\s+1\\s+3\\s+5\\s+2\\s+4\\s+6\\s+air\\s+0\\s+replace\\s+stone(\\s+0)?"
}, {
    question: "如何将以命令执行点为中心，清空半径为5格的立方体内的所有方块并在六面覆盖上玻璃？（请让第一个坐标的X、Y、Z分别小于等于第二个坐标的X、Y、Z）",
    answer: "fill\\s+~-5\\s+~-5\\s+~-5\\s+~5\\s+~5\\s+~5\\s+glass\\s+0\\s+hollow"
}, {
    question: "如何设置所有非生存模式玩家为生存模式？",
    answer: "gamemode\\s+(0|s|survival)\\s+@a\\[m=!(0|s|survival)\\]"
}, {
    question: "如何把以(4,5,6)为中心，边长为4的正方体内的所有玩家变成生存模式？",
    answer: function(str, unwind) {
        var a = new RegExp("^gamemode\\s+(0|s|survival)\\s+@a\\[(.+?)\\]$", "").exec(str);
        if (!a) return false;
        var i, p = parseSelector(a[2], [
            {
                type: "equalsPositiveKeys",
                keys: ["x", "y", "z", "dx", "dy", "dz"]
            }, {
                type: "noNegativeKeys"
            }, {
                type: "numbericPositiveKeys",
                keys: ["x", "y", "z", "dx", "dy", "dz"]
            }
        ]);
        if (!p) return false;
        var pos = p.positive;
        normalizeSelectorBox(pos);
        return pos.x == 2 && pos.y == 3 && pos.z == 4 && pos.dx == 4 && pos.dy == 4 && pos.dz == 4;
    }
}, {
    question: "如何防止玩家溺死？（即氧气条走完后不伤血）",
    answer: "gamerule\\s+drowningdamage\\s+false"
}, {
    question: "如何给予最近玩家一把在冒险模式下只能挖黑曜石的钻石镐？",
    answer: function(str, unwind) {
        var a = new RegExp("^give\\s+@p\\s+diamond_pickaxe\\s+1\\s+(\\d+)\\s+(.+)$", "").exec(str);
        var p = JSON.parse(a[2]);
        p = p["minecraft:can_destroy"].blocks;
        return Array.isArray(p) && p.length == 1 && p[0] == "obsidian";
    }
}, {
    question: "如果游戏内一开始有6个盔甲架，执行两次execute @e[type=armor_stand] ~ ~ ~ execute @e[type=armor_stand] ~ ~ ~ summon armor_stand后游戏内会有几个盔甲架（不考虑运行环境限制）",
    answer: function(str) {
        return Math.abs(Number(str) - 6 * Math.pow(2, 6) * Math.pow(2, 384)) < 1e+115;
    },
    answerType: "number"
}, {
    question: "如何在所有玩家耳边播放一次末影人死亡声？（每个玩家收到的音量相同）",
    answer: "execute\\s+@a\\s+~\\s+~\\s+~\\s+playsound\\s+mob.endermen.death\\s+@s(\\s+~\\s+~\\s+~(\\s+\\d+(\\s+\\d+(\\s+\\d+)?)?)?)?"
}, {
    question: "如何替换位于(51,8,-56)的箱子内的第五格物品为一个潮涌核心？",
    answer: "replaceitem\\s+block\\s+51\\s+8\\s+-56\\s+slot\\.container\\s+4\\s+conduit(\\s+1(\\s+\\d+)?)?"
}, {
    question: "如何替换最近玩家的快捷栏第一格为一块在冒险模式下只能放在草方块上的玻璃？",
    answer: function(str, unwind) {
        var a = new RegExp("^replaceitem\\s+entity\\s+@p\\s+slot.hotbar\\s+0\\s+glass\\s+1\\s+0\\s+(.+)$").exec(str);
        var p = JSON.parse(a[1]);
        p = p["minecraft:can_place_on"].blocks;
        return Array.isArray(p) && p.length == 1 && p[0] == "grass";
    }
}, {
    question: "如何用命令让半径30格内的随机一个玩家戴上钻石头盔？",
    answer: "replaceitem\\s+entity\\s+@r\\[r=30\\]\\s+slot\\.armor\\.head\\s+0\\s+diamond_helmet(\\s+\\d+(\\s+\\d+)?)?"
}, {
    question: "如何将所有玩家传送到以(17,?,5)为中心，半径为20的区域？",
    answer: "spreadplayers\\s+17\\s+5\\s+\\d+\\s+20\\s+@a"
}, {
    question: "如何让显示给所有玩家的下次标题瞬间显示，持续1s后瞬间消失？",
    answer: "title\\s+@a\\s+times\\s+0\\s+20\\s+0"
}, {
    question: "如何让所有名称为A的盔甲架不断原地旋转？",
    answer: function(str, unwind) {
        var a = new RegExp("^execute\\s+@e\\[(.+)\\]\\s+~\\s+~\\s+~\\s+tp\\s+(@s\\s+)?~\\s+~\\s+~\\s+~(-?\\d+)(\\s+~)?$", "").exec(str);
        if (!a) return false;
        var i, p = parseSelector(a[1], [
            {
                type: "equalsPositiveKeys",
                keys: ["type", "name"]
            }, {
                type: "noNegativeKeys"
            }
        ]);
        if (!p) return false;
        var pos = p.positive;
        return pos.type == "minecraft:armor_stand" && pos.name == "A";
    }
}, {
    question: "如何把以(7,8,9)为顶点，第五卦限方向里边长为6的正方体里的所有生物传送到(0,4,0)？（不懂什么叫卦限的自己百度）",
    answer: function(str, unwind) {
        var a = new RegExp("^tp\\s+@e\\[(.+?)\\]\\s+0\\s+4\\s+0$", "").exec(str);
        if (!a) return false;
        var i, p = parseSelector(a[1], [
            {
                type: "equalsPositiveKeys",
                keys: ["x", "y", "z", "dx", "dy", "dz"]
            }, {
                type: "noNegativeKeys"
            }, {
                type: "numbericPositiveKeys",
                keys: ["x", "y", "z", "dx", "dy", "dz"]
            }
        ]);
        if (!p) return false;
        var pos = p.positive;
        normalizeSelectorBox(pos);
        return pos.x == 7 && pos.y == 8 && pos.z == 3 && pos.dx == 6 && pos.dy == 6 && pos.dz == 6;
    }
}, (function() {
    var op = [{
        id: "+=",
        op: (a, b) => {a[0] = a[0] + b[0]}
    }, {
        id: "-=",
        op: (a, b) => {a[0] = a[0] - b[0]}
    }, {
        id: "*=",
        op: (a, b) => {a[0] = a[0] * b[0]}
    }, {
        id: "><",
        op: (a, b) => {
            var t = a[0];
            a[0] = b[0]; b[0] = t;
        }
    }];
    var a = [Math.floor(Math.random() * 10 + 1)],
        b = [Math.floor(Math.random() * 10 + 1)],
        c = [Math.floor(Math.random() * 10 + 1)],
        m1 = Math.floor(Math.random() * op.length),
        m2 = Math.floor(Math.random() * op.length),
        m3 = Math.floor(Math.random() * op.length);
    var question = [
        "请填写当我的世界执行完以下命令后玩家Mark的记分项a的分数",
        "/scoreboard objectives add a dummy",
        "/scoreboard objectives add b dummy",
        "/scoreboard objectives add c dummy",
        "/scoreboard players set Mark a " + a[0],
        "/scoreboard players set Mark b " + b[0],
        "/scoreboard players set Mark c " + c[0],
        "/scoreboard players operation Mark c " + op[m1].id + " Mark a",
        "/scoreboard players operation Mark b " + op[m2].id + " Mark c",
        "/scoreboard players operation Mark a " + op[m3].id + " Mark b"
    ].join("\n");
    op[m1].op(c, a);
    op[m2].op(b, c);
    op[m3].op(a, b);
    return {
        question: question,
        answer: function(str) {
            return Number(str) == a[0];
        },
        answerType: "number"
    };
})(), {
    question: "如何让记分项aaa显示在侧边栏并使分数升序排序？",
    answer: "scoreboard\\s+objectives\\s+setdisplay\\s+sidebar\\s+aaa\\s+ascending"
}, {
    question: "如何让不在线的玩家Mark的记分项mark小于等于50时执行成功，否则失败？",
    answer: "scoreboard\\s+players\\s+test\\s+Mark\\s+mark\\s+\\*\\s+50"
}, {
    question: "如何检测所有记分项mark大于等于30，但time小于等于20的玩家？（使用testfor命令）",
    answer: function(str, unwind) {
        var a = new RegExp("testfor\\s+@a\\[(.+)\\]", "").exec(str);
        if (!a) return false;
        var i, p = parseSelector(a[1], [
            {
                type: "equalsPositiveKeys",
                keys: ["scores"]
            }, {
                type: "noNegativeKeys"
            }, {
                type: "scoresKey",
                key: "scores"
            }
        ]);
        if (!p) return false;
        var sk = p.positive.scores;
        return sk.mark.type == "geq" && sk.mark.score == 30 && sk.time.type == "leq" && sk.time.score == 20;
    }
}, {
    question: "如何设置所有记分项mark不等于255的玩家的记分项mark的分数为255？",
    answer: "scoreboard\\s+players\\s+set\\s+@a\\[scores=\\{mark=!255\\}\\]\\s+mark\\s+255"
}, {
    question: "如何交换玩家A和玩家B的记分项mark的分数？",
    answer: "scoreboard\\s+players\\s+operation\\s+(A\\s+mark\\s+><\\s+B\\s+mark|B\\s+mark\\s+><\\s+A\\s+mark)"
}]