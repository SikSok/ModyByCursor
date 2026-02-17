const fs = require('fs');
const path = require('path');
const mode = process.argv[2] || 'dev';
const urls = {
  dev: 'http://localhost:3000/api',
  pre: 'http://47.110.243.97:3000/api'
};
const url = urls[mode] || urls.dev;
const outPath = path.join(__dirname, '../src/config/apiBaseUrl.js');
fs.writeFileSync(outPath, `// 由 scripts/set-api.js 写入 (npm run ${mode})\nmodule.exports = { url: '${url}' };\n`);
console.log(`API base URL set to ${url} (mode: ${mode})`);
