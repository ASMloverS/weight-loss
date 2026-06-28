'use strict';
// Idempotently inject <script src="../realign-dates.js"> into every
// plans/P*/week-XXX.html so static week pages re-align to the chosen start.
// Run: node scripts/inject-realign.cjs  (safe to re-run)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLANS = path.join(ROOT, 'plans');
const MARKER = 'realign-dates.js';
const TAG = '<script src="../realign-dates.js"></script>';

function main() {
  const files = [];
  for (const dir of fs.readdirSync(PLANS, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const sub = path.join(PLANS, dir.name);
    for (const f of fs.readdirSync(sub)) {
      if (/^week-\d{3}\.html$/.test(f)) files.push(path.join(sub, f));
    }
  }
  files.sort();
  let inj = 0, skip = 0;
  for (const abs of files) {
    const src = fs.readFileSync(abs, 'utf8');
    if (src.includes(MARKER)) { skip++; continue; }
    const out = src.includes('</body>')
      ? src.replace('</body>', TAG + '\n</body>')
      : src + '\n' + TAG;
    fs.writeFileSync(abs, out, 'utf8');
    inj++;
  }
  console.log(`Injected ${inj}, skipped ${skip} (already injected), total ${files.length}`);
}

main();
