#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

let cabuildPath = '';
try {
    const cmd = process.platform === 'win32'
        ? 'where cabuild 2>nul'
        : 'which cabuild 2>/dev/null || true';
    cabuildPath = execSync(cmd, { encoding: 'utf8' }).trim();
} catch (e) {
    // not found, ignore
}

// 判断是否是真正的全局残留（排除项目内 workspace 软链）
let isGlobalLegacy = false;
let legacyPath = '';
if (cabuildPath) {
    const firstPath = cabuildPath.split('\n')[0];
    const projectRoot = path.resolve(__dirname, '..');
    const resolved = path.resolve(firstPath);
    if (!resolved.startsWith(projectRoot)) {
        isGlobalLegacy = true;
        legacyPath = firstPath;
    }
}

if (isGlobalLegacy) {
    console.log('');
    console.log('============================================================');
    console.log('WARNING: A global "cabuild" command was detected:');
    console.log('  ' + legacyPath);
    console.log('');
    console.log('This command may point to an outdated globally-installed');
    console.log('version of cabuildtools. If you run "cabuild" directly, it');
    console.log('may use that old version instead of this project, causing');
    console.log('unexpected build results. This project does NOT use it.');
    console.log('');
    console.log('To remove it:');
    console.log('  npm uninstall -g cabuildtools');
    console.log('============================================================');
}

console.log('');
console.log('To build this project, use:');
console.log('  npm run build            # release');
console.log('  npm run buildSnapshot    # snapshot');
console.log('');