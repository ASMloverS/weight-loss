'use strict';
// Inject a floating "back to calendar" button into every plans/P*/week-XXX.html.
// Idempotent: skips files that already have the button. Run: node scripts/add-back-button.cjs
const fs = require('fs');
const path = require('path');

const PLANS = path.resolve(__dirname, '..', 'plans');

const CSS = `.back-cal{position:fixed;right:18px;bottom:18px;z-index:999;background:var(--green);color:#fff;text-decoration:none;padding:10px 16px;border-radius:24px;font-size:13px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.18);transition:transform .12s,background .12s;letter-spacing:.02em}
.back-cal:hover{background:var(--green-d);transform:translateY(-1px)}
@media(max-width:480px){.back-cal{right:12px;bottom:12px;padding:9px 14px;font-size:12px}}`;

const BTN = `\n<a class="back-cal" href="../index.html" title="返回日历总览">← 返回日历</a>\n</body>`;

const files = [];
for (const dir of fs.readdirSync(PLANS, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const sub = path.join(PLANS, dir.name);
  for (const f of fs.readdirSync(sub)) {
    if (/^week-\d{3}\.html$/.test(f)) files.push(path.join(sub, f));
  }
}
files.sort();

let modified = 0, skipped = 0, errored = 0;
for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  if (src.includes('class="back-cal"')) { skipped++; continue; }
  if (!src.includes('</style>') || !src.includes('</body>')) {
    console.error('  SKIP (missing </style> or </body>):', path.relative(PLANS, f));
    errored++;
    continue;
  }
  src = src.replace('</style>', CSS + '\n</style>');
  src = src.replace('</body>', BTN);
  fs.writeFileSync(f, src, 'utf8');
  modified++;
}
console.log(`Done. Modified ${modified}, skipped ${skipped} (already had button), errored ${errored}, total ${files.length}`);
