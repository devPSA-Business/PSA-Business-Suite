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
      if (content.includes('console.error(') || content.includes('console.warn(') || content.includes('console.info(') || content.includes('console.log(')) {
        
        let modified = false;
        
        // Remove catch(console.error) specific matches first
        if (content.includes('.catch(console.error)')) {
          content = content.replace(/\.catch\(console\.error\)/g, '.catch(e => logger.error("Caught error", { error: e }))');
          modified = true;
        }

        if (content.includes('console.error(')) {
          content = content.replace(/console\.error\(/g, 'logger.error(');
          modified = true;
        }
        if (content.includes('console.warn(')) {
          content = content.replace(/console\.warn\(/g, 'logger.warn(');
          modified = true;
        }
        if (content.includes('console.info(')) {
          content = content.replace(/console\.info\(/g, 'logger.info(');
          modified = true;
        }
        if (content.includes('console.log(')) {
          content = content.replace(/console\.log\(/g, 'logger.info(');
          modified = true;
        }
        
        if (modified && !content.includes("from '@/lib/logger'") && !content.includes('from "../../../lib/logger"')) {
           // count directory depth
           // const depth = fullPath.split(path.sep).length - 2; // src is 1, features is 2
           // let prefix = '../'.repeat(depth - 1);
           const m = content.match(/^(import .*?)\n/m);
           if (m) {
             content = content.replace(/^(import .*?)\n/m, `import { logger } from '@/lib/logger';\n$1\n`);
           } else {
             content = `import { logger } from '@/lib/logger';\n` + content;
           }
        }
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, '..', 'src', 'features'));
console.log('Done');
