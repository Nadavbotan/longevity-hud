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
git clone https://github.com/Nadavbotan/longevity-hud.git
cd longevity-hud
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
4. **Deploy to Vercel** and set environment variables (see [Environment variables](#environment-variables)).
5. **Set up Garmin daily sync** (optional but recommended): follow [Garmin Connect daily sync](#garmin-connect-daily-sync) end to end.

---

## Garmin Connect daily sync

This is how activity, sleep, HRV, and recovery land in `data/garmin/` **every day without your laptop**. Garmin has no free personal API; the project uses [python-garminconnect](https://github.com/cyberjunky/python-garminconnect) with a **one-time browser/MFA login** on your machine, then a **saved OAuth token** that GitHub Actions reuses.

### What runs automatically

| When | What |
|------|------|
| **05:10 UTC daily** | Workflow [`.github/workflows/sync-garmin.yml`](./.github/workflows/sync-garmin.yml) runs on GitHub's servers |
| Each run | `scripts/sync-garmin.py` pulls **yesterday's** daily summary + activities (complete day in most timezones) |
| After sync | Action commits changes under `data/garmin/` and pushes to your repo |
| After push | Vercel rebuilds the site (if connected); HUD / Train tab show new JSON on next deploy |

You can also trigger a run manually: **Actions → Sync Garmin → Run workflow**.

### Before you start

- Use a **private** GitHub repo for your real data (not this public demo repo).
- **Python 3.11+** on your Mac or PC (3.12 matches the Action).
- The same **Garmin Connect email/password** as the phone app (MFA may be required once).
- **GitHub Actions enabled** on the repo (Settings → Actions → General → allow actions).

Garmin passwords never go into GitHub. Only an OAuth token file (base64) is stored as the `GARMIN_TOKEN` secret.

---

### Step 1 - Install Python dependencies (local, one time)

From the repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r scripts/requirements.txt
```

---

### Step 2 - One-time Garmin login (local)

This opens the normal Garmin OAuth flow and saves tokens to `~/.garminconnect/garmin_tokens.json`.

```bash
python scripts/garmin-login.py
```

- Enter your Garmin Connect email and password when prompted.
- If Garmin asks for a code, use the **email link** or **authenticator app** code (the script explains which).
- If you get **429 / rate limit**, wait 30-60 minutes and retry.
- If SSL errors appear, try without VPN.

Success message points you to the token file path. You should not need to log in again for daily sync until the token expires (often **about a year**).

---

### Step 3 - Test sync locally (recommended)

Confirm data lands in JSON before relying on GitHub Actions:

```bash
python scripts/sync-garmin.py
```

By default this syncs **yesterday**. For a specific day:

```bash
python scripts/sync-garmin.py --date 2026-01-15
```

Check:

- `data/garmin/daily/<date>.json` - resting HR, HRV, sleep, steps, stress, body battery (when Garmin exposes them)
- `data/garmin/activities/<date>.json` - workouts, Zone 2 minutes, VO2 max when present

Optional offline check (no Garmin account needed):

```bash
python3 scripts/sync_garmin_check.py
```

Commit and push these files if you want them in the repo before enabling automation.

---

### Step 4 - Create the `GARMIN_TOKEN` GitHub secret

Export the token file as a **single base64 line** (this is what the Action decodes):

```bash
python scripts/garmin-token-export.py
```

Copy the entire output line (no spaces or newlines in the middle).

In GitHub:

1. Open your **private** repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `GARMIN_TOKEN`
4. Value: paste the base64 string from the export command
5. Save

On macOS you can pipe to the clipboard: `python scripts/garmin-token-export.py | pbcopy`

**Do not commit** `~/.garminconnect/` or paste the token into the repo. It is gitignored via `.garminconnect/` in `.gitignore`.

---

### Step 5 - Run the workflow once manually

1. Repo → **Actions** → **Sync Garmin**
2. **Run workflow** → Run on `main` (or your default branch)

Open the run log. You want:

- "Sync yesterday's Garmin data" completes without auth errors
- "Commit changed data only" either commits new JSON or prints "No Garmin data changes"

If the job fails on **push**, ensure Actions can write to the repo (the workflow sets `permissions: contents: write`; default `GITHUB_TOKEN` is usually enough for private repos).

---

### Step 6 - Confirm the dashboard updated

1. On GitHub, check the latest commit on `main` (message like `Sync Garmin data YYYY-MM-DD`).
2. In Vercel, wait for the deploy triggered by that push (or redeploy manually).
3. Open the site → **Train** tab and home recovery widgets; dates should match synced days.

---

### Local sync only (no GitHub Actions)

If you prefer syncing from your own machine instead of the cloud cron:

```bash
source .venv/bin/activate
python scripts/sync-garmin.py
git add data/garmin && git commit -m "Sync Garmin data" && git push
```

Use your OS scheduler (cron, launchd, Task Scheduler) to run that daily. The GitHub Action path is recommended so you do not need an always-on computer.

---

### Garmin troubleshooting

| Symptom | What to try |
|---------|-------------|
| Login fails in Action but works locally | Token expired or corrupted. Re-run `garmin-login.py`, re-export, update `GARMIN_TOKEN`. |
| Action auth errors from datacenter IP | Refresh token locally; avoid re-login loops in CI. Re-mint token on a home network. |
| Empty files / "no data for date" | Watch did not sync that day to Garmin Connect yet, or date is today (use yesterday). |
| Missing HRV / VO2 on dashboard | Device/model may not expose metric to Connect; see Train tab gaps vs Garmin app. |
| Token export says file not found | Run `garmin-login.py` first; check `~/.garminconnect/garmin_tokens.json` exists. |

Custom token directory (advanced): set env `GARMINTOKENS` to a folder path for both login and sync scripts.

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

**Garmin (GitHub Actions only):** repository secret `GARMIN_TOKEN` - see [Garmin Connect daily sync](#garmin-connect-daily-sync). No Garmin variables are required for the Next.js app itself.

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

Garmin Python scripts: documented in [Garmin Connect daily sync](#garmin-connect-daily-sync) (`garmin-login.py`, `garmin-token-export.py`, `sync-garmin.py`).

---

## License

MIT - see [LICENSE](./LICENSE).

---

## Disclaimer

This is a personal tracking tool, not medical advice. Ranges and scores are for motivation and trend visibility; work with qualified clinicians for diagnosis and treatment.
