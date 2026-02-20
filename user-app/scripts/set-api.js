const fs = require('fs');
const path = require('path');
const os = require('os');

const mode = process.argv[2] || 'dev';
const serverPort = process.env.API_PORT || '3000';

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

const urls = {
  dev: `http://${getLocalIP()}:${serverPort}/api`,
  usb: `http://localhost:${serverPort}/api`,
  pre: 'http://47.110.243.97:3000/api'
};
const url = urls[mode] || urls.dev;
const outPath = path.join(__dirname, '../src/config/apiBaseUrl.js');
fs.writeFileSync(outPath, `// 由 scripts/set-api.js 写入 (npm run ${mode})\nmodule.exports = { url: '${url}' };\n`);
console.log(`API base URL set to ${url} (mode: ${mode})`);
