import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const packageName = 'adm-zip';
try {
  require.resolve(packageName);
} catch (e) {
  console.log(`Installing ${packageName}...`);
  execSync(`npm install --no-save ${packageName}`, { stdio: 'inherit' });
}

const AdmZip = require('adm-zip');

async function createBackup() {
  const zip = new AdmZip();
  const rootDir = process.cwd();

  const ignoreList = [
    'node_modules',
    '.git',
    'dist',
    '.firebase',
    'PSA_Audit_Fixes.zip',
    'PSA_Business_Suite_Backup.zip'
  ];

  function addFolderToZip(folderPath: string, zipPath: string) {
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      if (ignoreList.includes(file)) continue;

      const fullPath = path.join(folderPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        addFolderToZip(fullPath, path.join(zipPath, file));
      } else {
        const content = fs.readFileSync(fullPath);
        zip.addFile(path.join(zipPath, file), content);
      }
    }
  }

  console.log('Creating backup ZIP archive...');
  addFolderToZip(rootDir, '');
  
  const zipName = 'PSA_Business_Suite_Backup.zip';
  zip.writeZip(path.join(rootDir, zipName));
  console.log(`Backup successfully created at: ${zipName}`);
}

createBackup();
