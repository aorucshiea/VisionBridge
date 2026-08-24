const fs = require('fs');
const path = require('path');

const platforms = ['win-unpacked', 'linux-unpacked'];
const keepLocales = ['en-US.pak', 'zh-CN.pak', 'zh-TW.pak'];

function cleanLocales(dir) {
  const localesPath = path.join(dir, 'locales');
  if (!fs.existsSync(localesPath)) return;
  fs.readdirSync(localesPath).forEach(locale => {
    if (!keepLocales.includes(locale)) {
      fs.unlinkSync(path.join(localesPath, locale));
    }
  });
}

function cleanLicense(dir) {
  const file = path.join(dir, 'LICENSES.chromium.html');
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

platforms.forEach(p => {
  const distPath = path.join(__dirname, `../dist/${p}`);
  if (fs.existsSync(distPath)) {
    cleanLocales(distPath);
    cleanLicense(distPath);
  }
});

console.log('Build optimization complete.');
