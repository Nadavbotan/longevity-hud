# Longevity Project - Build Plan

> Personal health and longevity tracker, inspired by Peter Attia's *Outlive*.
> Iron Man / HUD aesthetic. JSON-in-git, serverless deploy, minimal moving parts.
> Core principle: **automate ingestion wherever possible.** Manual entry is the exception.

Last updated: 2026-06-25

---

## 1. The idea in one paragraph

A dashboard that answers one question every morning: *"Am I on track to live a long, healthy life - and what's the single most useful thing I can do today?"* It pulls activity, sleep, and recovery from Garmin (optional daily sync), supports blood-test uploads parsed into structured biomarkers, scores health against the *Outlive* framework (the Four Horsemen + pillars), tracks Centenarian Decathlon-style goals, and keeps diet as a light secondary view. The UI is a dark HUD: glowing rings and gauges, readable at a glance on a phone.

---

## 2. Architecture pattern (JSON hub)

This project follows the same shape as other "personal data hub" apps:

| Pattern | Longevity implementation |
|---|---|
| Next.js 16 + React 19 + TS + Tailwind v4 | Same stack |
| JSON data store in `data/` | Same |
| `scripts/` ingestion (Garmin sync, biomarker ingest) | Python + tsx |
| `.cursor/commands/` workflows | Blood-test upload command |
| Build-time data read via `lib/data.ts` | Same |
| Mobile-first, bottom nav, dark theme | HUD restyle |

What's specific to longevity: Garmin sync, document parsing, and the Attia reference-range + Four Horsemen scoring engine.

---

## 3. The Outlive framework (what we actually track)

Attia's model gives us the information architecture. We don't invent categories - we mirror the book.

### The Four Horsemen (top-level risk view)
The dashboard's headline is a risk readout across the four chronic diseases that kill most people:
1. **Cardiovascular / ASCVD** - driven by ApoB, Lp(a), LDL-C, blood pressure
2. **Cancer** - screening cadence, inflammatory markers, family history flags
3. **Neurodegenerative** - sleep quality, metabolic health, ApoE context, exercise
4. **Metabolic dysfunction** - the foundation: fasting glucose, fasting insulin, HbA1c, triglycerides, visceral fat / waist

Each Horseman gets a status ring (green / amber / red) on the home HUD, derived from the relevant biomarkers and habits.

### The pillars (the levers I control)
- **Exercise** - the most powerful longevity drug. Sub-tracked as Attia frames it:
  - Stability (foundation)
  - Strength (grip strength, load)
  - Aerobic efficiency - **Zone 2** minutes/week
  - Anaerobic peak - **VO2 max**
- **Nutrition** - the light secondary view (diet logging)
- **Sleep** - duration, consistency, HRV, resting HR
- **Emotional health** - lightweight check-in (mood/stress, mostly from Garmin stress + manual note)

### The Centenarian Decathlon (goals view)
Attia's signature idea: define the 10 physical things I want to do at the end of life (carry a grandchild up stairs, hike, lift a suitcase overhead), then back-calculate the fitness needed now. This becomes the **Goals** page - concrete, physical, motivating, and it makes every workout meaningful.

---

## 4. App structure (pages)

Mobile-first, bottom-nav, HUD-styled. Five tabs, mirroring money-tracking's five-tab pattern.

| Tab | Icon idea | What it shows |
|---|---|---|
| **HUD** (home) | arc-reactor ring | The headline: a central "longevity status" composite, the Four Horsemen rings, today's recovery (HRV / sleep / readiness from Garmin), and **one actionable nudge for today**. |
| **Vitals** | heart-pulse | Biomarkers from blood tests. Each marker as a row with current value, Attia's optimal range (not just lab "normal"), trend sparkline, and a status dot. |
| **Train** | activity | Exercise pillars. Zone 2 minutes this week, VO2 max trend, strength log, stability. Pulled from Garmin. |
| **Goals** | target | Centenarian Decathlon + active health goals with progress rings. |
| **Diet** | utensils (smaller emphasis) | Light food log - meals, protein, calories. Secondary by design. |

A floating "+" or upload affordance handles document upload (blood test / doctor summary) and manual entries.

---

## 5. Data model

JSON files in `data/`, synced to `app/public/data/`. Proposed shape:

```
data/
  garmin/
    daily/2026-06-24.json        # steps, RHR, HRV, sleep, stress, body battery
    activities/2026-06-24.json   # workouts, zone 2 mins, VO2 max snapshot
  biomarkers/
    panels/2026-05-12.json       # one file per blood draw, all markers
    markers.json                 # latest value + history per marker (derived)
  documents/
    2026-05-12-blood-panel.pdf   # raw uploaded source (gitignored if private)
    2026-05-12-blood-panel.json  # extracted structured data
  diet/
    2026-06-24.json              # meals for the day
  goals.json                     # decathlon tasks + health goals
  reference-ranges.json          # Attia-preferred ranges per marker (config)
  profile.json                   # age, sex, family history, baselines
```

Key types (extend as in money-tracking's `types.ts`):
- `Biomarker { key, name, value, unit, date, optimalLow, optimalHigh, status }`
- `BloodPanel { date, source, markers: Biomarker[] }`
- `GarminDaily { date, restingHR, hrv, sleepScore, sleepHours, stress, bodyBattery, steps }`
- `Activity { date, type, durationMin, zone2Min, avgHR, vo2max }`
- `DecathlonTask { id, description, requiredCapacity, currentCapacity, status }`
- `HorsemanStatus { key, label, score, contributingMarkers[] }`

---

## 6. Garmin integration (the "automatic sync" piece) - RECOMMENDED PATH

There is **no free official Garmin personal API** (the Garmin Health API is a B2B partner program). The proven route for personal use:

### Recommended: `python-garminconnect` + `garth`
- Python wrapper that logs into Garmin Connect using the same OAuth flow as the official app, via the `garth` auth library.
- **Tokens persist for about a year** and are saved to `~/.garminconnect`, so it authenticates once and then runs headless - no repeated logins, no password in the daily flow.
- Exposes everything we need: daily summaries, sleep, **HRV**, stress, body battery, resting HR, activities, **VO2 max**, training readiness, and historical/date-range queries.
- Sources: [python-garminconnect](https://github.com/cyberjunky/python-garminconnect), [garminconnect on PyPI](https://pypi.org/project/garminconnect/)

### How auto-sync works (zero daily effort, NO computer needed) - DECIDED
Runs entirely server-side on **GitHub Actions**, exactly like money-tracking's existing `update-stocks.yml` cron Action. No laptop ever involved in the daily flow.

1. **One-time setup (from any machine):** run `garth` auth once to mint a Garmin OAuth token (valid roughly a year). Paste it into a **GitHub Actions secret** (`GARMIN_TOKEN`).
2. **Daily GitHub Action (cron):** checks out the repo, loads the token from the secret, runs `scripts/sync-garmin.py` to pull yesterday's daily summary + activities, writes JSON into `data/garmin/`, commits, and pushes.
3. **Vercel auto-redeploys on push** (it watches the repo) - the phone shows fresh data with zero action from me.

> The Garmin credential is never stored on my machine - only an OAuth token in an encrypted GitHub secret. **Caveat:** the token needs re-minting roughly once a year when it expires; and Garmin occasionally challenges logins from datacenter IPs, so the script must *refresh* the stored token rather than fresh-login (avoids the challenge almost always). The only thing ever needing a real computer is that ≈yearly token mint.

### Fallback / alternative
- **Health Auto Export (iOS)** -> Apple Health -> REST endpoint as JSON. Works well *if* the watch's data is in Apple Health, but Garmin does **not** push overnight HRV to Apple Health natively, and it needs a bridge (RunGap/FitnessSyncer). More moving parts, weaker on exactly the recovery metrics Attia cares about. Keep as backup, not primary. ([Health Auto Export](https://www.healthyapps.dev/apps/health-auto-export/))
- **Manual upload** - always available as a last resort, but explicitly the exception.

**Decision: go with `python-garminconnect` + a scheduled launchd job.** This is the only option that delivers true hands-off sync of the recovery/VO2 data the *Outlive* model depends on.

---

## 7. Blood test & document analysis (the "upload and it just works" piece)

Goal: drop in a blood-test PDF or a photo of a doctor's summary, and it gets read, structured, trended, and scored - no manual transcription.

### Flow (manual, AI-assisted) - DECIDED (2026-06-25)
No API key and no cloud service. The reading is done by the AI assistant in **Cursor / Claude Code**, which already has access to the repo.

1. **Add** a PDF / image to `data/documents/` - from a laptop, or via the GitHub mobile app / web UI.
2. **Ask Cursor / Claude Code to add it** (the `upload-blood-test` command in `.cursor/commands/`). The assistant reads the document (Hebrew or English, any layout), extracts every marker as `{ name, value, unit, date }`, and writes them to a small JSON.
3. It then runs `scripts/ingest-markers.ts`, which canonicalizes each marker name, tags status via `lib/biomarkers.ts`, writes `data/biomarkers/panels/<date>.json`, and merges `markers.json` (latest + history per marker), deduped by date.
4. The **reference-range engine** compares each marker against `reference-ranges.json` - *Attia's preferred optimal ranges*, not just the lab's "normal" (e.g. ApoB target well below standard lab cutoffs). Status dot: optimal / watch / out-of-range.
5. Commit + push. Vercel redeploys; new markers flow into the Vitals tab and update the relevant Horseman's score.

### Why this way
Blood panels come in wildly different lab formats (Hebrew and English, different layouts). The AI assistant handles that variability far better than regex, and doing it interactively inside the repo means no API key, no per-document cost, and a human in the loop to sanity-check the extraction before it is committed. The deterministic part (name matching, status, history merge) stays in tested code so the numbers are always consistent.

---

## 8. Privacy and hosting

Health data is sensitive. **Use a private GitHub repository** for anything real. The public template repo ships synthetic demo data only.

**Recommended production setup: private repo -> Vercel -> HTTP Basic Auth gate.**

- **One private GitHub repo** holds application code and JSON data (simplest ops: sync scripts commit directly to the same repo).
- **Deploy to Vercel** (or similar). HTTPS URL for phone access; rebuild on every data push.
- **Password gate** (`proxy.ts`): set `HUB_PASSWORD` in production. Without it, production returns **503** (fail closed).
- **Raw medical documents** live in `data/documents/`. They are gitignored by default and **never served** by Next.js. Only extracted JSON under `data/biomarkers/` powers the dashboard.
- **Garmin OAuth token** lives outside the repo (gitignored locally; `GARMIN_TOKEN` secret in GitHub Actions).

Daily flow: GitHub Actions Garmin sync (optional) -> commit -> Vercel redeploy. Blood tests: AI-assisted extraction locally, then `ingest-markers.ts`. Manual goals/diet: `POST /api/add` with a bearer token.

**Trust note:** JSON (and any documents you choose to commit) reside on GitHub and your hoster. That is acceptable for many self-trackers if the repo is private and the site is gated; it is **not** appropriate for a public repo with real panels.

---

## 9. The HUD look (Iron Man / JARVIS aesthetic)

From the inspiration images: deep black/navy backgrounds, glowing **cyan/teal** primary accent, thin glowing borders, **circular gauges and arc-reactor rings**, HUD-panel framing, subtle grid lines, monospace/technical numerals for data.

Design tokens (Tailwind v4, extend `globals.css`):
- Background: near-black `#04060a` to `#0a0f1a`
- Primary accent: cyan `#22d3ee` / `#06b6d4` with glow (box-shadow / drop-shadow)
- Secondary: a warning amber and a danger red-orange (the repulsor red) for status
- Rings: SVG circular progress (arc-reactor style) for the composite score and Horsemen - reuse recharts `RadialBar` or hand-rolled SVG
- Typography: keep Rubik for labels; use a tabular/technical font for big numbers
- Motion: subtle pulse/glow on the central ring, restrained - clean over flashy

The brief is "Iron Man cool **but** clean and instantly understandable." So: dark HUD framing and glow, but generous spacing, one clear headline number, and no more than 3-4 elements competing on the home screen.

---

## 10. Build phases

**Phase 0 - Scaffold (½ day)**
Copy the money-tracking app skeleton (Next.js, Tailwind, recharts, lucide, lib/data pattern). Strip finance content. Set up `data/` dirs and `types.ts`. Apply HUD theme tokens.

**Phase 1 - Garmin auto-sync (1 day)**
`scripts/sync-garmin.py`, one-time `garth` auth, launchd job, JSON landing in `data/garmin/`. Build the **Train** tab + the recovery card on the HUD off real data.

**Phase 2 - Blood test ingestion (1 day)**
`scripts/parse-document.ts` (Claude extraction), `reference-ranges.json` seeded with Attia's ranges, the **Vitals** tab. Test with one real panel.

**Phase 3 - The HUD home + Four Horsemen scoring (1 day)**
Composite longevity ring, four Horsemen rings, the daily nudge logic. This is where it earns the "Iron Man" feel.

**Phase 4 - Goals (Centenarian Decathlon) + Diet (½ day each)**
Goals page with progress rings; light diet log.

**Phase 5 - Polish + automation glue**
`.claude/commands/` for `sync-garmin`, `upload-test`; PROJECT_STATE.md; backup rule. Make sure the morning routine is genuinely zero-effort.

---

## 11. Implementation decisions (defaults in this repo)

1. **Garmin sync:** `python-garminconnect` + GitHub Actions cron; token in `GARMIN_TOKEN` secret (re-mint roughly yearly).
2. **Hosting:** Vercel + Basic Auth; private repo for real data.
3. **Scripting:** Python for Garmin; TypeScript for biomarker ingest and the Next.js app.
4. **Diet:** lightweight log (protein + calories), not a full nutrition database.

---

## 12. Customize for your stack

- Seed `reference-ranges.json` with the markers your clinician tracks.
- Use a recent blood panel PDF to validate the ingest command and aliases in `scripts/parse-lib.ts`.
- Confirm your Garmin device exposes VO2 max, overnight HRV, body battery, and training readiness if you rely on those cards.
- Optional: push the daily nudge elsewhere (Telegram, email) via your own automation calling the same JSON read path.

---

## Sources
- [python-garminconnect (GitHub)](https://github.com/cyberjunky/python-garminconnect)
- [garminconnect (PyPI)](https://pypi.org/project/garminconnect/)
- [Health Auto Export](https://www.healthyapps.dev/apps/health-auto-export/) / [REST API docs](https://help.healthyapps.dev/en/health-auto-export/automations/rest-api/)
