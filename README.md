# Cycling Training & Weight-Loss Plan

A personal 24–36 month road-cycling training and fat-loss roadmap. Goal: **solo 100km / 30km/h**, with body weight to 62.5kg (125 斤) in 12 ± 2 months. Static site — open the HTML in a browser.

## Baseline

| | Start | 12-mo goal | End |
|---|---|---|---|
| Weight | 88.55kg | **62.5kg** | 60–61kg |
| FTP (est.) | ~150W (1.7 W/kg) | ~195W (3.1 W/kg) | ~220W (3.6 W/kg) |
| 100km solo pace | — | 25–26km/h | **30km/h** |

Core lever: the **W/kg twin engine** (power up + weight down). The plan carries built-in resilience for aging, illness, and interruptions.

## Structure

```
cycling-weight-loss-plan.{md,html}   # main plan (overview / HR zones / diet / strength / resilience / milestones)
plans/
  index.html                         # 156-week training + diet perpetual calendar
  P0…P6/week-XXX.{html,md}           # per-week detail (156 weeks × 2)
  plan-data.{js,json}                # generated from week HTML (gitignored)
scripts/                             # build tooling (cheerio)
```

## View

Open `cycling-weight-loss-plan.html` (overview) or `plans/index.html` (calendar). The calendar aligns to today by default; change the start date to re-align the whole calendar.

## Commands

```bash
npm install          # cheerio (only dev dependency)
npm run extract      # week HTML → plans/plan-data.{js,json}
npm test             # validate week↔phase mapping, milestone/deload counts, date bounds
npm run build-index  # rebuild plans/index.html layout
npm run style        # apply shared styles
```

## Core rules

- **Slow matters most** — 80% of volume in Z2 (nose-breathing, conversational).
- **Deload every 4th week** — volume −40%, Z1–Z2 only.
- **Windows, not deadlines** — milestones are ranges; never "make up" a missed week (drop back one level per week missed).
- **Annual recalibration** at weeks 52 and 104 — retest HRmax / RHR / FTP / weight, recompute zones.

> Personal plan. Complete a medical check (incl. exercise ECG) before starting. Keep asthma medication on every ride.
