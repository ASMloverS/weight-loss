// Smoke-test the date→plan mapping logic used by index.html.
// Run: node scripts/test-mapping.cjs
'use strict';
const data = require('../plans/plan-data.json');
const TOTAL_WEEKS = data.totalWeeks;
const TOTAL_DAYS = TOTAL_WEEKS * 7;

function pad(n){ return (n<10?'0':'')+n; }
function ymdOf(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function parseYmd(s){ var p=s.split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); }
function daysBetween(a,b){ return Math.round((parseYmd(b)-parseYmd(a))/86400000); }

function planFor(date, startDate){
  var off = daysBetween(startDate, ymdOf(date)) + 1;
  if (off < 1) return { status:'before' };
  if (off > TOTAL_DAYS) return { status:'after' };
  var wi = Math.floor((off-1)/7), di = (off-1)%7;
  var w = data.weeks[wi];
  if (!w || !w.days[di]) return { status:'after' };
  return { status:'in', week:w.week, dowIdx:di, type:w.days[di].type, phase:w.phase };
}

let fails = 0;
function check(name, cond, extra) {
  console.log((cond ? '  ok  ' : ' FAIL ') + name + (extra ? '  '+extra : ''));
  if (!cond) fails++;
}

const start = '2026-06-22';
const sDate = parseYmd(start);

console.log('--- Plan window ---');
console.log('  start:', start, '(expected Monday 2026-06-22)');
console.log('  start weekday (Mon=0):', (sDate.getDay()+6)%7, '(expected 0)');
console.log('  total:', TOTAL_DAYS, 'days /', TOTAL_WEEKS, 'weeks');
console.log('  end:  ', ymdOf(new Date(sDate.getTime() + TOTAL_DAYS*86400000)));

console.log('--- Boundary mapping ---');
check('start day = week 1 dow 0 (周一)',
  planFor(parseYmd('2026-06-22'), start).week === 1 && planFor(parseYmd('2026-06-22'), start).dowIdx === 0,
  JSON.stringify(planFor(parseYmd('2026-06-22'), start)));
check('day before start = before',
  planFor(parseYmd('2026-06-21'), start).status === 'before');
check('last day of week 1 (周日 06-28) = week 1 dow 6',
  planFor(parseYmd('2026-06-28'), start).week === 1 && planFor(parseYmd('2026-06-28'), start).dowIdx === 6,
  JSON.stringify(planFor(parseYmd('2026-06-28'), start)));
check('first day of week 2 (周一 06-29) = week 2 dow 0',
  planFor(parseYmd('2026-06-29'), start).week === 2 && planFor(parseYmd('2026-06-29'), start).dowIdx === 0);
check('day 1092 (last) = week 156',
  planFor(new Date(sDate.getTime() + 1091*86400000), start).week === 156,
  JSON.stringify(planFor(new Date(sDate.getTime() + 1091*86400000), start)));
check('day 1093 = after',
  planFor(new Date(sDate.getTime() + 1092*86400000), start).status === 'after');

console.log('--- Phase boundaries (should match plan-data.json phases) ---');
const phases = data.phases;
for (const p of phases) {
  const firstDayOffset = (p.weekStart - 1) * 7; // 0-based day offset of this phase's Monday
  const firstDayDate = new Date(sDate.getTime() + firstDayOffset * 86400000);
  const r = planFor(firstDayDate, start);
  check(`phase ${p.code} starts on its week-${p.weekStart} Monday`,
    r.status === 'in' && r.week === p.weekStart && r.dowIdx === 0 && r.phase === p.code,
    `${ymdOf(firstDayDate)} → ${JSON.stringify(r)}`);
}

console.log('--- Phase boundary detection (prev Monday diff phase) ---');
// Week 3 is first P1 week. Its Monday is 14 days after start.
const w3mon = new Date(sDate.getTime() + 14*86400000);
const w3r = planFor(w3mon, start);
const w2mon = new Date(sDate.getTime() + 7*86400000);
const w2r = planFor(w2mon, start);
check('W3 Monday is P1, W2 Monday is P0 → boundary detected',
  w3r.phase === 'P1' && w2r.phase === 'P0' && w3r.phase !== w2r.phase,
  `W2:${w2r.phase} W3:${w3r.phase}`);

console.log('--- Milestone / deload integrity ---');
check('milestones count = 10', data.weeks.filter(w=>w.isMilestone).length === 10);
check('deload count = 34', data.weeks.filter(w=>w.isDeload).length === 34);

console.log('--- Today (2026-06-22) mapping ---');
const todayR = planFor(parseYmd('2026-06-22'), start);
check('today = start = week 1 周一',
  todayR.week === 1 && todayR.dowIdx === 0 && todayR.type === 'rest',
  JSON.stringify(todayR));

console.log('');
console.log(fails === 0 ? 'ALL PASS' : (fails + ' FAILURES'));
process.exit(fails === 0 ? 0 : 1);
