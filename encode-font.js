// encode-font.js
const fs   = require('fs');
const path = require('path');

// Đường dẫn đến file TTF và file JS đầu ra
const ttfPath = path.resolve(__dirname, 'src/fonts/Roboto-Regular.ttf');
const outPath = path.resolve(__dirname, 'src/fonts/RobotoRegular.js');

// Đọc file, chuyển sang Base64 và ghi vào JS
const buffer = fs.readFileSync(ttfPath);
const b64    = buffer.toString('base64');
const content = `// Auto-generated at ${new Date().toISOString()}\nexport default "${b64}";\n`;
fs.writeFileSync(outPath, content);

console.log('✔ RobotoRegular.js generated, length =', b64.length);
