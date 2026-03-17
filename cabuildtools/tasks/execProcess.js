const process = require("process");
const child_process = require("child_process");

module.exports = function(context, args) {
  return new Promise(function(resolve, reject) {
    const child = child_process.spawn(args.command, args.args, args);
    if (args.input) child.stdin.end(args.input);

    child.on("exit", function(code, signal) {
      if (code !== 0) {
        const err = new Error(
          `Command failed: ${args.command} ${(args.args || []).join(" ")}` +
          `\nExit code: ${code}`
        );
        err.stack = err.message + "\n" + new Error().stack.split("\n").slice(2).join("\n");
        reject(err);
      } else {
        resolve();
      }
    });

    child.on("error", reject);
  });
};