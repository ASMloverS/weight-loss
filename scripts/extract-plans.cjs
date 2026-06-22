'use strict';
// Extract per-day training + diet data from each plans/P*/week-XXX.html
// and emit plans/plan-data.json. Run: npm run extract
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');
const PLANS_DIR = path.join(ROOT, 'plans');
const OUT_JSON = path.join(PLANS_DIR, 'plan-data.json');
const OUT_JS = path.join(PLANS_DIR, 'plan-data.js');

function findWeekFiles() {
  const out = [];
  for (const dir of fs.readdirSync(PLANS_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const sub = path.join(PLANS_DIR, dir.name);
    for (const f of fs.readdirSync(sub)) {
      const m = f.match(/^week-(\d{3})\.html$/);
      if (!m) continue;
      out.push({ week: Number(m[1]), dir: dir.name, file: `${dir.name}/${f}`, abs: path.join(sub, f) });
    }
  }
  out.sort((a, b) => a.week - b.week);
  return out;
}

// "第 N 周 · P0 准备期 · 训练 + 饮食日历" -> { code: 'P0', name: '准备期', fullName: 'P0 准备期' }
function parsePhase(title) {
  const m = title.match(/·\s*(P\d+)\s+(\S+)\s*·/);
  if (m) return { code: m[1], name: m[2], fullName: `${m[1]} ${m[2]}` };
  return { code: '', name: '', fullName: '' };
}

function textOf($, el) {
  return $(el).text().replace(/\s+/g, ' ').trim();
}

function clean(s) {
  return (s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseWeek(entry) {
  const html = fs.readFileSync(entry.abs, 'utf8');
  const $ = cheerio.load(html);
  const title = textOf($, 'title');
  const phase = parsePhase(title);

  const isMilestone = $('.banner.ms').length > 0;
  const isDeload = $('.banner.deload').length > 0;

  // Training cards (exactly 7 expected)
  const cards = $('.grid > .card').toArray();
  const days = cards.map((card) => {
    const $c = $(card);
    const cls = $c.attr('class') || '';
    const type = ['long', 'ride', 'strength', 'recovery', 'rest'].find((t) => cls.includes(t)) || 'rest';
    const badge = clean($c.find('.cbadge').text());
    const ctitle = clean($c.find('.ctitle').text());
    const cmeta = clean($c.find('.cmeta').text());
    const cdesc = clean($c.find('.cdesc').text());
    return { type, badge, title: ctitle, meta: cmeta, desc: cdesc };
  });

  // Diet cards (exactly 7 expected)
  const dcards = $('.dgrid > .dcard').toArray();
  const diets = dcards.map((dc) => {
    const $d = $(dc);
    const meals = {};
    $d.find('.dmeal').each((_, m) => {
      const $m = $(m);
      const label = clean($m.find('span').first().text());
      const content = clean($m.clone().children('span').first().remove().end().text());
      if (label) meals[label] = content;
    });
    const note = clean($d.find('.dnote').text());
    return { meals, note };
  });

  // Stitch days + diets
  const daysFull = days.map((d, i) => ({ ...d, diet: diets[i] || { meals: {}, note: '' } }));

  return {
    week: entry.week,
    phase: phase.code,
    phaseName: phase.fullName,
    file: entry.file,
    isMilestone,
    isDeload,
    days: daysFull,
  };
}

function computePhases(weeks) {
  const map = new Map();
  for (const w of weeks) {
    if (!map.has(w.phase)) map.set(w.phase, { code: w.phase, name: w.phaseName, weekStart: w.week, weekEnd: w.week });
    const p = map.get(w.phase);
    p.weekStart = Math.min(p.weekStart, w.week);
    p.weekEnd = Math.max(p.weekEnd, w.week);
  }
  return [...map.values()];
}

function main() {
  const files = findWeekFiles();
  if (files.length !== 156) {
    console.error(`Expected 156 week files, found ${files.length}`);
    process.exit(1);
  }
  const weeks = files.map(parseWeek);
  const phases = computePhases(weeks);

  const out = { generatedAt: new Date().toISOString(), totalWeeks: weeks.length, phases, weeks };
  const jsonStr = JSON.stringify(out, null, 2);
  fs.writeFileSync(OUT_JSON, jsonStr, 'utf8');
  // Browser-loadable wrapper (works under file://)
  fs.writeFileSync(OUT_JS, `window.PLAN_DATA = ${JSON.stringify(out)};\n`, 'utf8');

  // Report
  const dayCount = weeks.reduce((a, w) => a + w.days.length, 0);
  const dietCount = weeks.reduce((a, w) => a + w.days.filter((d) => d.diet && Object.keys(d.diet.meals).length).length, 0);
  const msCount = weeks.filter((w) => w.isMilestone).length;
  const dlCount = weeks.filter((w) => w.isDeload).length;
  const gaps = weeks.filter((w) => w.days.length !== 7).map((w) => `W${w.week}=${w.days.length}d`);

  console.log(`OK  weeks=${weeks.length}  days=${dayCount}  withDiet=${dietCount}`);
  console.log(`    milestones=${msCount}  deloads=${dlCount}  phases=${phases.length}`);
  console.log(`    phase ranges: ${phases.map((p) => `${p.code}(${p.name}):${p.weekStart}-${p.weekEnd}`).join('  ')}`);
  if (gaps.length) console.log(`    WARN non-7-day weeks: ${gaps.join(' ')}`);
  console.log(`    wrote ${path.relative(ROOT, OUT_JSON)}  (${(fs.statSync(OUT_JSON).size / 1024).toFixed(1)} KB)`);
  console.log(`    wrote ${path.relative(ROOT, OUT_JS)}  (${(fs.statSync(OUT_JS).size / 1024).toFixed(1)} KB)`);
}

main();
