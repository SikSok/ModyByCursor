/**
 * 生成带内嵌 Data URI 二维码的 SVG，便于本地直接预览
 * 运行: node scripts/embed-qr-svg.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');

function fetchAsDataUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const base64 = buf.toString('base64');
        const mime = (res.headers['content-type'] || 'image/png').split(';')[0].trim();
        resolve(`data:${mime};base64,${base64}`);
      });
    }).on('error', reject);
  });
}

function buildSvgAndroid(dataUri) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 320 320" width="320" height="320">
  <defs>
    <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.12"/>
    </filter>
    <clipPath id="rounded">
      <rect width="280" height="280" x="20" y="20" rx="16" ry="16"/>
    </clipPath>
  </defs>
  <rect width="320" height="320" fill="#f8fafc" rx="20" ry="20"/>
  <g filter="url(#shadow)" clip-path="url(#rounded)">
    <rect x="20" y="20" width="280" height="280" fill="#fff"/>
    <image x="20" y="20" width="280" height="280" preserveAspectRatio="xMidYMid meet" href="${dataUri}"/>
  </g>
  <rect x="20" y="20" width="280" height="280" fill="none" stroke="#e2e8f0" stroke-width="1" rx="16" ry="16"/>
</svg>
`;
}

function buildSvgIos(dataUri) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 320 320" width="320" height="320">
  <defs>
    <filter id="shadow-ios" x="-4%" y="-4%" width="108%" height="108%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.12"/>
    </filter>
    <clipPath id="rounded-ios">
      <rect width="280" height="280" x="20" y="20" rx="20" ry="20"/>
    </clipPath>
  </defs>
  <rect width="320" height="320" fill="#fafbfc" rx="24" ry="24"/>
  <g filter="url(#shadow-ios)" clip-path="url(#rounded-ios)">
    <rect x="20" y="20" width="280" height="280" fill="#fff"/>
    <image x="20" y="20" width="280" height="280" preserveAspectRatio="xMidYMid meet" href="${dataUri}"/>
  </g>
  <rect x="20" y="20" width="280" height="280" fill="none" stroke="#e2e8f0" stroke-width="1" rx="20" ry="20"/>
</svg>
`;
}

async function main() {
  const androidUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=280&data=' + encodeURIComponent('http://47.110.243.97/downloads/mody-android.apk') + '&margin=10';
  const iosUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=280&data=' + encodeURIComponent('http://47.110.243.97/') + '&margin=10';

  console.log('Fetching Android QR image...');
  const androidDataUri = await fetchAsDataUrl(androidUrl);
  console.log('Fetching iOS QR image...');
  const iosDataUri = await fetchAsDataUrl(iosUrl);

  fs.writeFileSync(path.join(ASSETS, 'qr-android.svg'), buildSvgAndroid(androidDataUri), 'utf8');
  fs.writeFileSync(path.join(ASSETS, 'qr-ios.svg'), buildSvgIos(iosDataUri), 'utf8');
  console.log('Done. assets/qr-android.svg and assets/qr-ios.svg updated with embedded QR images.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
