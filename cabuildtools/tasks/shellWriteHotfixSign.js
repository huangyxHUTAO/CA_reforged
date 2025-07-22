// 跳过热更签名，直接返回成功
module.exports = function(context, args) {
    return Promise.resolve(args ? args[0] : undefined);
}