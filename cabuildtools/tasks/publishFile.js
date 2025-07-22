module.exports = function(context, args) {
	console.log("Publishing " + args[1].remotePath);
	return args[0].upload(context, args[1])
		.then(() => args[0]);
}