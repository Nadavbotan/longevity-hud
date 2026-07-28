# Longevity

A self-hosted personal health dashboard inspired by Peter Attia's [*Outlive*](https://peterattiamd.com/outlive/) framework. One screen answers: **am I on track for a long, healthy life, and what is the single most useful thing to do today?**

Built with **Next.js 16** (App Router), **React 19**, **Tailwind CSS v4**, and **framer-motion**. Dark "HUD" UI with rings, gauges, and sparklines (no charting library). Designed to deploy on **Vercel** behind **HTTP Basic Auth**, with health data stored as **flat JSON in the repo** and updated by automation.

> **Privacy model:** This app is meant for *your* data in *your* private GitHub repo. The copy in this public repository ships **synthetic demo data only**. Never commit real labs, documents, or live Garmin exports to a public repo.

---

## What you get

| Area | What it does |
|------|----------------|
| **Home HUD** | Composite longevity score, Four Horsemen risk rings, recovery snapshot, one daily nudge |
| **Vitals** | Biomarkers vs Attia-preferred ranges (`data/reference-ranges.json`), status dots, trends |
| **Train** | Zone 2 vs weekly target, VO2 max, resting HR / HRV, recent sessions |
| **Goals** | Centenarian Decathlon-style capacity targets with progress rings |
| **Diet** | Lightweight food log (secondary by design) |

### The Outlive model (in code)

- **Four Horsemen:** cardiovascular, cancer, neurodegenerative, metabolic - scored from biomarkers and habits, not only lab "normal" ranges.
- **Pillars:** exercise (Zone 2, VO2 max, strength, stability), sleep, nutrition, emotional health.
- **Reference ranges:** editable config in `data/reference-ranges.json` (Attia-oriented defaults).

---

## Architecture (30-second version)

```
Browser  -->  Next.js (read JSON at build time)  -->  data/*.json
                    ^
                    |  three write paths (all commit JSON, redeploy on push)
                    |
    1. GitHub Action: scripts/sync-garmin.py  -->  data/garmin/
    2. AI-assisted ingest: scripts/ingest-markers.ts  -->  data/biomarkers/
    3. POST /api/add (bearer token)  -->  goals, diet via GitHub API
```

- **Single source of truth:** `data/` (see [Data layout](#data-layout)).
- **No database:** `lib/data.ts` reads JSON from disk at build time; after a push, Vercel rebuilds (typically ~30s).
- **Production gate:** `proxy.ts` enforces Basic Auth when `HUB_PASSWORD` is set; if unset in production, the site returns **503** (fail closed).

Full design notes: [PLAN.md](./PLAN.md).

---

## Quick start (local)

**Requirements:** Node.js 20+, npm.

```bash
git clone https://github.com/Nadavbotan/longevity.git
cd longevity
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no env vars, the app is **open** (no password) and the write API is disabled - fine for exploring the demo.

**Verify the codebase:**

```bash
npm run lint
npm run check    # scoring, biomarkers, GitHub helper self-checks
npm run build
```

---

## Fork it for real use (recommended path)

1. **Create a new private GitHub repository** (do not use this public repo for personal health data).
2. Push this codebase there (or fork and make the fork private).
3. **Replace demo data** under `data/` with your own, or delete demo files and let Garmin sync / ingest fill them in.
4. **Deploy to Vercel** and set environment variables (see below).
5. **Enable Garmin sync** (optional): mint OAuth token locally, store as `GARMIN_TOKEN` repo secret, enable the workflow in `.github/workflows/sync-garmin.yml`.

---

## Data layout

```
data/
  profile.json                    Age, sex, family history flags
  reference-ranges.json           Attia-oriented optimal ranges (you can edit)
  goals.json                      Centenarian Decathlon tasks
  diet.json                       Meal log (append-only)
  garmin/daily/<YYYY-MM-DD>.json  Sleep, HRV, RHR, steps, stress, body battery
  garmin/activities/<date>.json   Workouts (Zone 2 minutes, VO2 max when present)
  biomarkers/panels/<date>.json   One blood draw per file
  biomarkers/markers.json         Latest value + history per marker
  documents/                      Raw PDFs/images (gitignored); never served by Next.js
lib/
  types.ts        Data model contract
  data.ts         Build-time readers
  biomarkers.ts   Classify values vs reference ranges
  scoring.ts      Four Horsemen, composite score, daily nudge
  github.ts         Commit-append helper for /api/add
scripts/
  sync-garmin.py              Daily Garmin pull (Python + garminconnect)
  garmin-login.py             One-time OAuth login
  garmin-token-export.py      Export token for GARMIN_TOKEN secret
  ingest-markers.ts           Deterministic biomarker merge (after AI extraction)
  parse-lib.ts                Lab name matching (EN + HE aliases)
```

Demo fixtures are documented in [data/README.md](./data/README.md).

---

## Environment variables

Copy [`.env.example`](./.env.example) to `.env.local` for local overrides.

| Variable | Required | Purpose |
|----------|----------|---------|
| `HUB_USER` | No | Basic Auth username (default: `admin`) |
| `HUB_PASSWORD` | **Yes in production** | Basic Auth password; if missing in prod, site returns 503 |
| `HUB_WRITE_TOKEN` | For writes | Bearer secret for `POST /api/add` |
| `GITHUB_TOKEN` | For writes | PAT with **Contents: Read and write** on your repo |
| `GITHUB_REPO` | For writes | `owner/repo` |
| `GITHUB_BRANCH` | No | Default `main` |

**GitHub Actions (Garmin):** repository secret `GARMIN_TOKEN` = base64 of `~/.garminconnect/garmin_tokens.json` after running `python scripts/garmin-login.py` and `python scripts/garmin-token-export.py` locally.

Blood-test parsing is **manual and AI-assisted** (Cursor / Claude Code): drop a file in `data/documents/`, extract markers to `*.extracted.json`, run `npm run ingest-markers -- data/documents/your-file.extracted.json`. No Anthropic API key in CI. See [`.cursor/commands/upload-blood-test.md`](./.cursor/commands/upload-blood-test.md).

---

## API: append goals or diet entries

`POST /api/add` with header `Authorization: Bearer <HUB_WRITE_TOKEN>`.

Example body:

```json
{
  "type": "diet",
  "entry": {
    "date": "2026-01-16",
    "meal": "Example meal",
    "proteinG": 30,
    "calories": 500
  }
}
```

The route commits to GitHub via the PAT; Vercel redeploys on push.

---

## Security notes

- Treat this as **sensitive medical data**: use a **private repo**, strong `HUB_PASSWORD`, and rotate `HUB_WRITE_TOKEN` / `GITHUB_TOKEN` if leaked.
- Raw uploads in `data/documents/` are **gitignored** and not bundled into the static site; only extracted JSON under `data/biomarkers/` is used by the app.
- `/api/add` is intentionally **outside** Basic Auth; it relies on the bearer token only (for mobile shortcuts and automation).

---

## Scripts reference

| npm script | Action |
|------------|--------|
| `dev` | Next.js dev server |
| `build` | Production build |
| `lint` | ESLint |
| `check` | Pure-logic self-checks (run in CI or before deploy) |
| `ingest-markers` | Merge extracted lab JSON into panels + history |

Garmin (Python): `pip install -r scripts/requirements.txt`, then `python scripts/sync-garmin.py`.

---

## License

MIT - see [LICENSE](./LICENSE).

---

## Disclaimer

This is a personal tracking tool, not medical advice. Ranges and scores are for motivation and trend visibility; work with qualified clinicians for diagnosis and treatment.
