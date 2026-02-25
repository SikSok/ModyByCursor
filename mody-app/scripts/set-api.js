const fs = require('fs');
const path = require('path');
const os = require('os');

const mode = process.argv[2] || 'dev';
const port = process.env.API_PORT || 3000;

function getLocalIPv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets || {})) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

const urls = {
  dev: `http://localhost:${port}/api`,
  'dev-lan': (() => {
    const ip = getLocalIPv4();
    if (!ip) {
      console.warn('未检测到局域网 IP，请手动在 src/config/apiBaseUrl.js 中填写电脑 IP');
      return `http://localhost:${port}/api`;
    }
    return `http://${ip}:${port}/api`;
  })(),
  pre: 'http://47.110.243.97:3000/api'
};

const url = urls[mode] !== undefined ? urls[mode] : (mode.startsWith('http') ? mode : urls.dev);
const outPath = path.join(__dirname, '../src/config/apiBaseUrl.js');
const comment =
  mode === 'dev-lan'
    ? `// 真机调试：由 scripts/set-api.js dev-lan 写入，指向电脑局域网 IP\n`
    : `// 由 scripts/set-api.js 写入 (npm run ${mode})\n`;
fs.writeFileSync(outPath, `${comment}module.exports = { url: '${url}' };\n`);
console.log(`API base URL set to ${url} (mode: ${mode})`);
