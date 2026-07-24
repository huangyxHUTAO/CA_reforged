const process = require("process");
const { execFile } = require("child_process");

module.exports = function(context, opts) {
  return new Promise(function(resolve, reject) {
    const spawnArgs = Array.isArray(opts.args) ? opts.args : [];
    const spawnOpts = { cwd: opts.cwd, env: opts.env, shell: false };
    execFile(opts.command, spawnArgs, spawnOpts, function(err, stdout, stderr) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};