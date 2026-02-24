import fs from 'fs';
import path from 'path';

function walk(dir) {
  let r = [];
  fs.readdirSync(dir).forEach(f => {
    f = path.join(dir, f);
    if (fs.statSync(f).isDirectory()) r = r.concat(walk(f));
    else if (f.endsWith('.ts')) r.push(f);
  });
  return r;
}

const files = walk('./api');
let changedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  let newContent = content.replace(/from\s+['"](\.[^'"]+)['"]/g, (match, p1) => {
    if (p1.endsWith('.js')) return match;

    const currentDir = path.dirname(file);
    const resolvedDirect = path.join(currentDir, p1 + '.ts');
    const resolvedIndex = path.join(currentDir, p1, 'index.ts');

    if (fs.existsSync(resolvedDirect)) {
      return `from '${p1}.js'`;
    } else if (fs.existsSync(resolvedIndex)) {
      return `from '${p1}/index.js'`;
    } else {
      console.log('  UNRESOLVED:', p1, 'in', file);
      return match;
    }
  });

  newContent = newContent.replace(/import\(\s*['"](\.[^'"]+)['"]\s*\)/g, (match, p1) => {
    if (p1.endsWith('.js')) return match;

    const currentDir = path.dirname(file);
    const resolvedDirect = path.join(currentDir, p1 + '.ts');
    const resolvedIndex = path.join(currentDir, p1, 'index.ts');

    if (fs.existsSync(resolvedDirect)) {
      return `import('${p1}.js')`;
    } else if (fs.existsSync(resolvedIndex)) {
      return `import('${p1}/index.js')`;
    } else {
      console.log('  UNRESOLVED DYNAMIC:', p1, 'in', file);
      return match;
    }
  });

  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log('Fixed:', file);
    changedCount++;
  }
}

console.log(`Total files fixed: ${changedCount}`);
