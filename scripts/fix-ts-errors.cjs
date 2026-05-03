const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{ts,tsx}');

let changedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const initialContent = content;

  // Replace logger.error(..., err) with logger.error(..., { error: err instanceof Error ? err.message : String(err) })
  // Regex to match logger.error('something', err) and we need to capture `err` or `e`.
  content = content.replace(/logger\.error\(([^,]+),\s*err\)/g, "logger.error($1, { error: err instanceof Error ? err.message : String(err) })");
  content = content.replace(/logger\.error\(([^,]+),\s*e\)/g, "logger.error($1, { error: e instanceof Error ? e.message : String(e) })");
  content = content.replace(/logger\.error\(([^,]+),\s*\(?e instanceof Error \? e\.message : String\(e\)\)?\)/g, "logger.error($1, { error: e instanceof Error ? e.message : String(e) })");

  // addToast replacing addToast(err, 'error') -> addToast(err instanceof Error ? err.message : String(err), 'error')
  content = content.replace(/addToast\(err,\s*'error'\)/g, "addToast(err instanceof Error ? err.message : String(err), 'error')");
  content = content.replace(/addToast\(e,\s*'error'\)/g, "addToast(e instanceof Error ? e.message : String(e), 'error')");
  
  if (content !== initialContent) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log(`Fixed: ${file}`);
  }
}
console.log(`Changed ${changedFiles} files`);
