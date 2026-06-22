'use strict';
// Apply the "Natural Vitality" redesign to every plans/P*/week-XXX.html.
// Idempotent: detects already-restyled files by presence of `.hero` and skips.
// Run: node scripts/apply-style.cjs
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');
const PLANS = path.join(ROOT, 'plans');
const STYLE_FILE = path.join(__dirname, 'week-style.css');

const NEW_STYLE = fs.readFileSync(STYLE_FILE, 'utf8').trim();

// Parse "周一" + small "06-22" into structured cday markup.
// Goal: <div class="cday"><span class="num">22</span><span class="nm">周一</span><span class="date">06-22</span></div>
function rebuildCday($cday) {
  const html = $cday.html(); // e.g. "周一<small>06-22</small>"
  const $small = $cday.find('small');
  const dateStr = $small.text().trim(); // "06-22"
  const dayNum = dateStr.split('-')[1]; // "22"
  const weekday = $cday.contents().not('small').text().trim(); // "周一"
  $cday.empty();
  $cday.append(`<span class="num">${dayNum}</span>`);
  $cday.append(`<span class="nm">${weekday}</span>`);
  $cday.append(`<span class="date">${dateStr}</span>`);
}

function iconForCardClass(cls) {
  if (cls.includes('rest')) return '🛌';
  if (cls.includes('strength')) return '💪';
  if (cls.includes('recovery')) return '🔄';
  if (cls.includes('long')) return '🎯';
  return '🚴'; // ride / default
}

function transformFile(absPath) {
  const src = fs.readFileSync(absPath, 'utf8');
  if (src.includes('class="hero"') && src.includes('class="topnav"')) {
    return { skipped: true };
  }
  const $ = cheerio.load(src, { decodeEntities: false });

  // 1. Replace <style> block content
  $('style').first().html('\n' + NEW_STYLE + '\n');

  // 2. Pull nav out of header, rebuild as topnav pills (insert AFTER header)
  const $header = $('header').first();
  const $oldNav = $header.find('.nav').first();
  const $topnav = $('<nav class="topnav"></nav>');
  $oldNav.children().each((_, child) => {
    const $c = $(child);
    const tag = child.tagName;
    const text = $c.text().trim();
    const href = $c.attr('href');
    if (tag === 'a' && href && href.includes('index.html')) {
      $topnav.append(`<a class="pill home" href="${href}">🏠 返回日历</a>`);
    } else if (tag === 'a' && href) {
      const cls = /第\s*\d+\s*周\s*→/.test(text) ? 'pill next' : 'pill';
      $topnav.append(`<a class="${cls}" href="${href}">${text}</a>`);
    } else {
      // muted span (prev/edge)
      $topnav.append(`<span class="pill muted">${text}</span>`);
    }
  });
  $oldNav.remove();
  $header.after($topnav);

  // 3. Wrap header content (eyebrow, h1, focus, targets, banners) in a hero
  const $wrap = $header.find('.wrap').first();
  const $hero = $('<section class="hero"></section>');
  const heroChildren = $wrap.children('p.eyebrow, h1, p.focus, .targets, .banner');
  if (heroChildren.length) {
    $hero.append(heroChildren.clone());
    heroChildren.remove();
    $wrap.append($hero);
  }

  // 3b. Reformat targets: wrap label text in <small>
  $hero.find('.targets .t').each((_, t) => {
    const $t = $(t);
    const $b = $t.find('b').first();
    if (!$b.length) return;
    // Text nodes before <b> = label
    let label = '';
    $t[0].childNodes.forEach((node) => {
      if (node === $b[0]) return;
      if (node.type === 'text') label += node.data;
    });
    label = label.trim();
    // Remove all non-<b> children
    $t.contents().each((_, node) => {
      if (node !== $b[0]) $(node).remove();
    });
    $t.prepend(`<small>${label}</small>`);
  });

  // 4. Cards: rebuild cday + add icon (cbadge already follows cday, cicon slots between)
  $('.grid > .card').each((_, card) => {
    const $c = $(card);
    const cls = $c.attr('class') || '';
    const $cday = $c.find('.cday').first();
    if ($cday.length) {
      rebuildCday($cday);
      $cday.after(`<div class="cicon">${iconForCardClass(cls)}</div>`);
    }
  });

  // 5. Diet chips: add class to meal-label spans
  $('.dgrid .dmeal').each((_, meal) => {
    const $m = $(meal);
    const $span = $m.children('span').first();
    const txt = $span.text().trim();
    if (['早', '午', '加', '晚'].includes(txt)) {
      $span.addClass(`dchip ${txt}`);
    }
  });

  // 6. Notes: add icons to list items (CSS-driven ::before handles per-index)
  // No HTML change needed.

  // 7. Footer: give it some flair matching new design
  $('footer').first().addClass('ftr');

  return { html: $.html() };
}

function main() {
  const files = [];
  for (const dir of fs.readdirSync(PLANS, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const sub = path.join(PLANS, dir.name);
    for (const f of fs.readdirSync(sub)) {
      if (/^week-\d{3}\.html$/.test(f)) files.push({ abs: path.join(sub, f), rel: `${dir.name}/${f}` });
    }
  }
  files.sort((a, b) => a.rel.localeCompare(b.rel));

  let modified = 0, skipped = 0, errored = 0;
  for (const f of files) {
    try {
      const res = transformFile(f.abs);
      if (res.skipped) { skipped++; continue; }
      fs.writeFileSync(f.abs, res.html, 'utf8');
      modified++;
    } catch (e) {
      console.error('  ERR', f.rel, e.message);
      errored++;
    }
  }
  console.log(`Done. Modified ${modified}, skipped ${skipped} (already styled), errored ${errored}, total ${files.length}`);
}

module.exports = { transformFile, iconForCardClass };

if (require.main === module) main();
