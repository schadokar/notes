#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const DEFAULT = 'intermediate';

function walk(dir) {
  return readdirSync(dir).flatMap(f => {
    const full = path.join(dir, f);
    return statSync(full).isDirectory() ? walk(full) : full;
  });
}

function normalizeDifficulty(value) {
  const v = value.trim().toLowerCase().replace(/['"]/g, '');
  if (LEVELS.includes(v)) return v;
  const match = LEVELS.find(l => v.includes(l));
  return match ?? DEFAULT;
}

const files = walk('src/content/docs').filter(f => f.endsWith('.md'));

let fixed = 0;
for (const file of files) {
  const content = readFileSync(file, 'utf8');

  if (content.startsWith('---')) {
    const end = content.indexOf('---', 3);
    const frontmatter = content.slice(3, end);
    const body = content.slice(end + 3);

    const hasTitle = /^title:/m.test(frontmatter);
    const diffMatch = frontmatter.match(/^difficulty:\s*(.*)$/m);

    let newFrontmatter = frontmatter;
    let changed = false;

    if (!hasTitle) {
      newFrontmatter = `\ntitle: ${toTitle(file)}` + newFrontmatter;
      changed = true;
    }

    if (!diffMatch) {
      newFrontmatter = newFrontmatter.replace(/\n?$/, `\ndifficulty: ${DEFAULT}\n`);
      changed = true;
    } else {
      const normalized = normalizeDifficulty(diffMatch[1]);
      if (normalized !== diffMatch[1].trim().replace(/['"]/g, '')) {
        newFrontmatter = newFrontmatter.replace(
          /^difficulty:.*$/m,
          `difficulty: ${normalized}`
        );
        changed = true;
      }
    }

    if (!changed) continue;
    writeFileSync(file, `---${newFrontmatter}---${body}`);
  } else {
    writeFileSync(
      file,
      `---\ntitle: ${toTitle(file)}\ndifficulty: ${DEFAULT}\n---\n\n${content}`
    );
  }

  console.log(`fixed: ${file}`);
  fixed++;
}

console.log(`\ndone: ${fixed} file(s) updated`);

function toTitle(file) {
  return path.basename(file, '.md')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
