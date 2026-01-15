const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../dist/win-unpacked');

// 删除不需要的语言包，只保留中文和英文
const localesPath = path.join(distPath, 'locales');
if (fs.existsSync(localesPath)) {
  const locales = fs.readdirSync(localesPath);
  const keepLocales = ['en-US.pak', 'zh-CN.pak', 'zh-TW.pak'];
  
  locales.forEach(locale => {
    if (!keepLocales.includes(locale)) {
      fs.unlinkSync(path.join(localesPath, locale));
      console.log(`Deleted locale: ${locale}`);
    }
  });
}

// 删除许可证文件（可选，可以保留）
const licenseFiles = [
  'LICENSES.chromium.html',
];

licenseFiles.forEach(file => {
  const filePath = path.join(distPath, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Deleted license file: ${file}`);
  }
});

console.log('✅ Optimization complete!');