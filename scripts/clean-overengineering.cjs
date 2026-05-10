const fs = require('fs');

const filesToDelete = [
  '.github/workflows/audit-verification.yml',
  '.github/workflows/auto-lint-fix.yml',
  '.github/workflows/auto-merge.yml',
  '.github/workflows/coverage-report.yml',
  '.github/workflows/pr-labeler.yml',
  '.github/workflows/release.yml',
  '.github/workflows/security-audit.yml',
  '.github/workflows/stale.yml',
  '.github/labeler.yml',
  '.github/PULL_REQUEST_TEMPLATE.md',
  'SECURITY.md',
  'deny_rules.rules'
];

filesToDelete.forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`Deleted: ${file}`);
  }
});

const dirsToDelete = [
  '.github/ISSUE_TEMPLATE',
  'docs/release',
  'docs/runbook',
  'docs/security'
];

dirsToDelete.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`Deleted dir: ${dir}`);
  }
});
