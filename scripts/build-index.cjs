'use strict';
// One-shot rewrite of plans/index.html into the new perpetual-calendar layout.
// Preserves the old <main> (phase grid) verbatim as the "阶段总览" tab.
// Run: node scripts/build-index.cjs
const fs = require('fs');
const path = require('path');

const INDEX = path.resolve(__dirname, '..', 'plans', 'index.html');
const src = fs.readFileSync(INDEX, 'utf8');

// Extract the phase-overview HTML. Works both on the original index.html
// (single <main class="wrap">...</main>) and on already-rewritten versions
// (<main class="wrap" id="view-phase" hidden>...</main>). Idempotent.
let phaseHTML = null;
const mNew = src.match(/<main class="wrap" id="view-phase"[^>]*>([\s\S]*?)<\/main>/);
if (mNew) {
  phaseHTML = mNew[1].trim();
} else {
  const mOld = src.match(/<main class="wrap">([\s\S]*?)<\/main>/);
  if (mOld) phaseHTML = mOld[1].trim();
}
if (!phaseHTML) {
  console.error('Could not find phase-overview <main> in', INDEX);
  process.exit(1);
}

const NEW = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>训练 + 饮食万年历 · 156 周</title>
<style>
:root{--ink:#1a1d1f;--paper:#faf9f5;--panel:#fff;--line:#e4e1d8;--muted:#6b7280;--green:#0b6e4f;--green-d:#074d37;--green-s:#e6f2ec;--amber:#b7791f;--amber-s:#fbf0dc;--terra:#b8431f;--terra-s:#fbece5;--blue:#5b9bd5}
@media(prefers-color-scheme:dark){:root{--ink:#e8e6df;--paper:#16181a;--panel:#1e2123;--line:#2e3236;--muted:#9ca3af;--green:#3dd28a;--green-d:#7eecb0;--green-s:#13251e;--amber:#e0b252;--amber-s:#241d10;--terra:#e87a52;--terra-s:#2a1812}}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--paper);color:var(--ink);line-height:1.55;font-size:15px}
.wrap{max-width:1200px;margin:0 auto;padding:0 20px}
header{padding:24px 0 14px;border-bottom:1px solid var(--line)}
.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 4px}
h1{font-size:25px;margin:0 0 6px}
.focus{color:var(--muted);margin:0 0 12px;font-size:14px;display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.focus input[type=date]{font:inherit;font-size:14px;padding:3px 6px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink)}
.focus label{display:inline-flex;align-items:center;gap:5px;cursor:pointer;user-select:none}
.focus input[type=checkbox]{width:16px;height:16px;accent-color:var(--green)}
.tabs{display:flex;gap:4px;margin-bottom:-1px}
.tab{appearance:none;border:1px solid var(--line);border-bottom:none;background:transparent;color:var(--muted);font:inherit;font-size:14px;padding:8px 18px;border-radius:8px 8px 0 0;cursor:pointer}
.tab:hover{color:var(--ink)}
.tab.active{background:var(--panel);color:var(--green-d);font-weight:600;border-bottom:1px solid var(--panel)}

/* Month view */
.month-nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:18px 0 10px}
.month-nav button{appearance:none;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:inherit;font-size:14px;padding:6px 12px;border-radius:7px;cursor:pointer}
.month-nav button:hover{border-color:var(--green);background:var(--green-s)}
#month-label{font-size:18px;font-weight:700;color:var(--green-d);min-width:130px;text-align:center}
#goto-today{margin-left:auto;color:var(--green-d);border-color:var(--green-s)!important}
.info-line{font-size:12px;color:var(--muted);width:100%;margin-top:2px}
.month-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding-bottom:8px;border-top:1px solid var(--line)}
.dow{font-size:11px;color:var(--muted);text-align:center;padding:8px 0 4px;font-weight:600;letter-spacing:.08em}
.cell{background:var(--panel);border:1px solid var(--line);border-radius:7px;padding:6px 7px;min-height:96px;position:relative;display:flex;flex-direction:column;gap:3px;overflow:hidden}
.cell.out-month{opacity:.38}
.cell.out-range{background:transparent;border-style:dashed;min-height:60px}
.cell.in-plan{cursor:pointer;transition:border-color .12s,transform .06s}
.cell.in-plan:hover{border-color:var(--green);transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,.06)}
.cell.in-plan.t-rest{border-left:4px solid var(--muted)}
.cell.in-plan.t-long{border-left:4px solid var(--green)}
.cell.in-plan.t-ride{border-left:4px solid var(--green-d)}
.cell.in-plan.t-strength{border-left:4px solid var(--amber)}
.cell.in-plan.t-recovery{border-left:4px solid var(--blue)}
.cell.ms{border-top:3px solid var(--terra);background:linear-gradient(180deg,var(--terra-s),var(--panel) 40%)}
.cell.dl{background:var(--amber-s)}
.cell.dl:hover{background:var(--amber-s)}
.cell.today{outline:2.5px solid var(--green);outline-offset:-2px;z-index:1}
.cell-top{display:flex;justify-content:space-between;align-items:flex-start;gap:4px}
.dn{font-size:14px;font-weight:700;color:var(--ink)}
.cell.out-month .dn{color:var(--muted);font-weight:400}
.markers{font-size:10px;color:var(--muted);text-align:right;line-height:1.3}
.markers .phase-tag{display:inline-block;background:var(--green-d);color:#fff;padding:1px 6px;border-radius:4px;font-weight:600;font-size:9.5px;margin-bottom:2px;letter-spacing:.02em}
.cell.ms .markers{color:var(--terra)}
.train{font-size:11.5px;line-height:1.35}
.train-title{font-weight:700;color:var(--ink)}
.train-meta{color:var(--muted);font-size:10.5px}
.cell.out-range .markers{color:var(--muted);font-size:10px;font-style:italic}
.diet{margin-top:auto;padding-top:4px;border-top:1px dashed var(--line);font-size:10px;line-height:1.35}
.diet-row{margin:2px 0;color:var(--ink);opacity:.9}
.diet-tag{display:inline-block;min-width:14px;text-align:center;background:var(--green-s);color:var(--green-d);border-radius:3px;font-weight:700;padding:0 3px;margin-right:4px;font-size:9px}
.cell.dl .diet-tag{background:transparent;color:var(--amber)}
.legend{font-size:12px;color:var(--muted);margin:10px 0 30px;line-height:1.8}
.legend span{display:inline-block;margin-right:14px}
.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:middle}

/* Phase overview (preserved) */
.psec{padding:18px 0;border-bottom:1px solid var(--line)}
.psec h2{font-size:18px;margin:0} .psec h2 small{color:var(--muted);font-weight:400;font-size:13px}
.pfocus{color:var(--muted);font-size:13px;margin:4px 0 10px}
.wgrid{display:grid;grid-template-columns:repeat(13,1fr);gap:5px}
@media(max-width:900px){.wgrid{grid-template-columns:repeat(8,1fr)}}
@media(max-width:520px){.wgrid{grid-template-columns:repeat(5,1fr)}}
.wk{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px 4px;text-align:center;text-decoration:none;color:var(--ink);font-size:11px}
.wk:hover{border-color:var(--green);background:var(--green-s)}
.wk .wn{display:block;font-weight:700;color:var(--green-d)}
.wk .wd{display:block;color:var(--muted);font-size:10px;margin-top:1px}
.wk.ms{background:var(--terra-s);border-color:var(--terra)} .wk.ms .wn{color:var(--terra)}
.wk.dl{opacity:.62} .wk.dl .wn{color:var(--amber)}
.notes{padding:12px 0 40px}
.notes h2{font-size:17px;margin:0 0 8px}
.notes ul{padding-left:18px;margin:0}
.notes li{margin:5px 0;font-size:14px}
footer{padding:18px 0 36px;border-top:1px solid var(--line);display:flex;justify-content:space-between;font-size:13px;gap:10px;flex-wrap:wrap}
footer a{color:var(--green);text-decoration:none}
.err{padding:14px;color:var(--terra);font-size:14px}
</style>
</head>
<body>
<header><div class="wrap">
  <p class="eyebrow">公路车训练 + 饮食万年历 · 全 36 个月窗口</p>
  <h1>156 周日历总览</h1>
  <p class="focus">
    <span>起始日:<input type="date" id="start-date"></span>
    <label><input type="checkbox" id="show-diet"> 显示饮食</label>
    <span id="status-text" style="color:var(--green-d)"></span>
  </p>
  <div class="tabs">
    <button class="tab active" data-view="cal" type="button">日历视图</button>
    <button class="tab" data-view="phase" type="button">阶段总览</button>
  </div>
</div></header>

<main class="wrap" id="view-cal">
  <div class="month-nav">
    <button id="prev-month" type="button" aria-label="上一月">◀</button>
    <span id="month-label">—</span>
    <button id="next-month" type="button" aria-label="下一月">▶</button>
    <button id="goto-today" type="button">回到今天</button>
    <span class="info-line" id="info-line"></span>
  </div>
  <div class="month-grid" id="month-grid"></div>
  <p class="legend">
    <span><i style="background:var(--green)"></i>长距离</span>
    <span><i style="background:var(--green-d)"></i>骑行</span>
    <span><i style="background:var(--amber)"></i>力量</span>
    <span><i style="background:var(--blue)"></i>恢复</span>
    <span><i style="background:var(--muted)"></i>休息</span>
    <span style="color:var(--terra)">🏆 里程碑周</span>
    <span style="color:var(--amber)">▣ 减量周</span>
    <span style="color:var(--green)">○ 今天</span>
  </p>
</main>

<main class="wrap" id="view-phase" hidden>
${phaseHTML}
</main>

<footer class="wrap">
  <span style="color:var(--muted)">点击日历日期格跳转到该周详情;改起始日会让整个日历重新对齐。</span>
  <a href="../cycling-weight-loss-plan.html">查看完整计划文档 →</a>
</footer>

<script src="plan-data.js"></script>
<script>
(function(){
  var data = window.PLAN_DATA;
  if (!data) {
    document.getElementById('month-grid').innerHTML = '<div class="err">无法加载 plan-data.js。请先运行 npm run extract。</div>';
    return;
  }
  var TOTAL_WEEKS = data.totalWeeks;
  var TOTAL_DAYS = TOTAL_WEEKS * 7;
  var START_KEY = 'planStart';

  function pad(n){ return (n<10?'0':'')+n; }
  function ymdOf(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function parseYmd(s){ var p=s.split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); }
  function daysBetween(a,b){ return Math.round((parseYmd(b)-parseYmd(a))/86400000); }

  function todayStr(){ return ymdOf(new Date()); }
  function readStart(){
    var u = new URLSearchParams(location.search).get('start');
    if (u && /^\\d{4}-\\d{2}-\\d{2}$/.test(u)) return u;
    var ls = null;
    try { ls = localStorage.getItem(START_KEY); } catch(e){}
    if (ls && /^\\d{4}-\\d{2}-\\d{2}$/.test(ls)) return ls;
    return todayStr();
  }

  var startDate = readStart();
  var today = new Date();
  var viewY = today.getFullYear(), viewM = today.getMonth();
  var showDiet = false;

  // Map a Date to its plan cell.
  function planFor(date){
    var off = daysBetween(startDate, ymdOf(date)) + 1;
    if (off < 1) return { status:'before' };
    if (off > TOTAL_DAYS) return { status:'after' };
    var wi = Math.floor((off-1)/7), di = (off-1)%7;
    var w = data.weeks[wi];
    if (!w || !w.days[di]) return { status:'after' };
    return { status:'in', week:w, dowIdx:di, day:w.days[di], offset:off };
  }

  function el(tag, cls, txt){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function renderMonth(y, m){
    var grid = document.getElementById('month-grid');
    grid.innerHTML = '';
    var HEAD = ['周一','周二','周三','周四','周五','周六','周日'];
    for (var h=0; h<7; h++) grid.appendChild(el('div','dow', HEAD[h]));

    var firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // Mon=0..Sun=6
    var origin = new Date(y, m, 1 - firstDow);
    var todayS = todayStr();

    for (var i=0; i<42; i++){
      var d = new Date(origin);
      d.setDate(origin.getDate() + i);
      var inMonth = (d.getMonth() === m);
      var dateS = ymdOf(d);
      var plan = planFor(d);

      var cell = el('div', 'cell');
      if (!inMonth) cell.classList.add('out-month');
      if (plan.status === 'before' || plan.status === 'after') {
        cell.classList.add('out-range', plan.status);
      } else {
        cell.classList.add('in-plan', 't-'+plan.day.type);
        if (plan.week.isMilestone) cell.classList.add('ms');
        if (plan.week.isDeload) cell.classList.add('dl');
        cell.dataset.file = plan.week.file;
        (function(f){ cell.addEventListener('click', function(){ location.href = f; }); })(plan.week.file);
      }
      if (dateS === todayS) cell.classList.add('today');

      // Top row: date number + markers
      var top = el('div','cell-top');
      top.appendChild(el('span','dn', d.getDate()));
      var markers = el('div','markers');
      if (plan.status === 'in') {
        if (plan.week.isMilestone) markers.appendChild(el('span','', '🏆 '));
        // Phase boundary: dowIdx===0 (Monday) and this Monday's phase != previous Monday's phase
        if (plan.dowIdx === 0) {
          var prevMon = new Date(d); prevMon.setDate(d.getDate() - 7);
          var pp = planFor(prevMon);
          var prevPhase = (pp.status === 'in') ? pp.week.phase : null;
          if (plan.week.phase !== prevPhase) {
            var tag = el('span','phase-tag', plan.week.phaseName);
            markers.appendChild(tag);
            markers.appendChild(document.createElement('br'));
          }
        }
        markers.appendChild(el('span','', 'W' + plan.week.week));
      } else if (plan.status === 'before') {
        markers.appendChild(el('span','', '未开始'));
      } else {
        markers.appendChild(el('span','', '已结束'));
      }
      top.appendChild(markers);
      cell.appendChild(top);

      // Training summary
      if (plan.status === 'in') {
        var tr = el('div','train');
        tr.appendChild(el('div','train-title', plan.day.title));
        if (plan.day.meta && plan.day.meta !== '—' && plan.day.meta !== '') {
          tr.appendChild(el('div','train-meta', plan.day.meta));
        }
        cell.appendChild(tr);
        if (showDiet && plan.day.diet && plan.day.diet.meals) {
          var dk = ['早','午','加','晚'];
          var dt = el('div','diet');
          for (var k=0; k<dk.length; k++) {
            var v = plan.day.diet.meals[dk[k]];
            if (!v) continue;
            var row = el('div','diet-row');
            row.appendChild(el('span','diet-tag', dk[k]));
            row.appendChild(document.createTextNode(v));
            dt.appendChild(row);
          }
          if (dt.childNodes.length) cell.appendChild(dt);
        }
      }
      grid.appendChild(cell);
    }

    document.getElementById('month-label').textContent = y + '年' + (m+1) + '月';
    // Info line
    var sDate = parseYmd(startDate);
    var eDate = new Date(sDate.getTime() + TOTAL_DAYS * 86400000);
    document.getElementById('info-line').textContent =
      '计划窗口 ' + startDate + ' → ' + ymdOf(eDate) + '  ·  共 ' + TOTAL_WEEKS + ' 周 / ' + TOTAL_DAYS + ' 天  ·  今天 ' + todayS;
  }

  function shiftMonth(delta){
    viewM += delta;
    while (viewM < 0) { viewM += 12; viewY--; }
    while (viewM > 11) { viewM -= 12; viewY++; }
    renderMonth(viewY, viewM);
  }

  function gotoToday(){
    var d = new Date();
    viewY = d.getFullYear(); viewM = d.getMonth();
    renderMonth(viewY, viewM);
    setTimeout(function(){
      var t = document.querySelector('.cell.today');
      if (t) t.scrollIntoView({block:'center', behavior:'smooth'});
    }, 50);
  }

  function setView(v){
    document.getElementById('view-cal').hidden = (v !== 'cal');
    document.getElementById('view-phase').hidden = (v !== 'phase');
    var tabs = document.querySelectorAll('.tab');
    for (var i=0; i<tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].dataset.view === v);
    if (v === 'cal') {
      // re-scroll to today when returning
      setTimeout(function(){
        var t = document.querySelector('.cell.today');
        if (t) t.scrollIntoView({block:'center'});
      }, 30);
    }
  }

  // Wire up
  document.getElementById('prev-month').addEventListener('click', function(){ shiftMonth(-1); });
  document.getElementById('next-month').addEventListener('click', function(){ shiftMonth(1); });
  document.getElementById('goto-today').addEventListener('click', gotoToday);
  var tabs = document.querySelectorAll('.tab');
  for (var i=0; i<tabs.length; i++) {
    (function(t){ t.addEventListener('click', function(){ setView(t.dataset.view); }); })(tabs[i]);
  }

  var startInput = document.getElementById('start-date');
  startInput.value = startDate;
  startInput.addEventListener('change', function(){
    var v = startInput.value;
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(v)) return;
    startDate = v;
    try { localStorage.setItem(START_KEY, v); } catch(e){}
    var statusEl = document.getElementById('status-text');
    statusEl.textContent = '已保存,日历已重新对齐';
    setTimeout(function(){ statusEl.textContent=''; }, 2200);
    // Jump view to start month so user sees the new alignment
    var sd = parseYmd(v);
    viewY = sd.getFullYear(); viewM = sd.getMonth();
    renderMonth(viewY, viewM);
  });

  var dietToggle = document.getElementById('show-diet');
  dietToggle.addEventListener('change', function(){
    showDiet = dietToggle.checked;
    renderMonth(viewY, viewM);
  });

  // Initial render: today's month
  renderMonth(viewY, viewM);
  setTimeout(function(){
    var t = document.querySelector('.cell.today');
    if (t) t.scrollIntoView({block:'center'});
  }, 100);
})();
</script>
</body>
</html>
`;

fs.writeFileSync(INDEX, NEW, 'utf8');
console.log('Rewrote', path.relative(path.resolve(__dirname,'..'), INDEX), '(', NEW.length, 'bytes )');
console.log('Preserved phase HTML length:', phaseHTML.length, 'chars');
