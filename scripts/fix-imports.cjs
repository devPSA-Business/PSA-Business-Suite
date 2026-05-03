const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes("@/lib/logger")) {
        content = content.replace(/@\/lib\/logger/g, "@lib/logger");
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir(path.join(__dirname, '..', 'src', 'features'));
