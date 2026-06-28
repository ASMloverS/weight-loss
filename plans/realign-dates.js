// Re-align a static week page's baked-in dates to the user's chosen plan start.
// Reads start from ?start= -> localStorage.planStart -> none (no-op).
// Mirrors the date conventions used by index.html.
(function(){
  'use strict';
  var START_KEY = 'planStart';
  function pad(n){ return (n<10?'0':'')+n; }
  function ymd(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function md(d){ return pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function parseYmd(s){ var p=s.split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); }
  var DAY = 86400000;

  function readStart(){
    var u = new URLSearchParams(location.search).get('start');
    if (u && /^\d{4}-\d{2}-\d{2}$/.test(u)) return u;
    var ls = null;
    try { ls = localStorage.getItem(START_KEY); } catch(e){}
    if (ls && /^\d{4}-\d{2}-\d{2}$/.test(ls)) return ls;
    return null;
  }

  var newStart = readStart();

  // Preserve ?start= on every link back to the calendar index.
  if (newStart){
    var links = document.querySelectorAll('a[href*="index.html"]');
    for (var h=0; h<links.length; h++){
      var href = links[h].getAttribute('href');
      if (/[?&]start=/.test(href)) continue;
      var sep = href.indexOf('?') === -1 ? '?' : '&';
      links[h].setAttribute('href', href + sep + 'start=' + encodeURIComponent(newStart));
    }
  }

  if (!newStart) return;

  // Baked-in week range lives in the hero eyebrow: "P0 准备期 · 2026-06-22 ~ 2026-06-28 · 常规训练周"
  var eb = document.querySelector('.hero .eyebrow');
  if (!eb) return;
  var m = eb.textContent.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) return;
  var ns = parseYmd(newStart);
  var delta = Math.round((ns - parseYmd(m[1]))/DAY);
  if (delta === 0) return;

  // Eyebrow range
  var newEnd = new Date(ns.getTime() + 6*DAY);
  eb.textContent = eb.textContent.replace(
    /\d{4}-\d{2}-\d{2}\s*~\s*\d{4}-\d{2}-\d{2}/,
    ymd(ns) + ' ~ ' + ymd(newEnd)
  );

  // Per-day dates (Mon=0..Sun=6). Cards and diet cards are both 7, ordered Mon..Sun.
  var cards  = document.querySelectorAll('.grid > .card');
  var dcards = document.querySelectorAll('.dgrid > .dcard');
  for (var i=0; i<7; i++){
    var d = new Date(ns.getTime() + i*DAY);
    if (cards[i]){
      var dateEl = cards[i].querySelector('.date');
      var numEl  = cards[i].querySelector('.num');
      if (dateEl) dateEl.textContent = md(d);
      if (numEl)  numEl.textContent  = String(d.getDate());
    }
    if (dcards[i]){
      var small = dcards[i].querySelector('.dday small');
      if (small) small.textContent = md(d);
    }
  }
})();
