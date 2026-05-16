import fs from 'fs';
import path from 'path';

const DOCS = [
  { name: 'AGENTS.md', maxLines: 150 },
  { name: 'CONTEXT.md', maxLines: 200 },
  { name: 'SCOPE.md', maxLines: 100 },
  { name: 'INTERFACES.md', maxLines: 150 },
];

function verifyContextDocs() {
  console.log('🤖 Starting AI Context Verification...\n');
  let hasErrors = false;

  for (const doc of DOCS) {
    const filePath = path.join(process.cwd(), doc.name);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ [ERROR] Missing required file: ${doc.name}`);
      hasErrors = true;
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').length;

    if (lines > doc.maxLines) {
      console.error(`❌ [ERROR] ${doc.name} exceeds max lines (${lines}/${doc.maxLines})`);
      hasErrors = true;
    } else {
      console.log(`✅ [OK] ${doc.name} (${lines}/${doc.maxLines} lines)`);
    }
  }

  if (hasErrors) {
    console.error('\n🚨 Verification failed! Please fix the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All AI Context documents passed verification.');
    process.exit(0);
  }
}

verifyContextDocs();
