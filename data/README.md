# Sample data in this repository

Everything under `data/` except `reference-ranges.json` is **synthetic demo content** so you can run the app without cloning private health records.

| File / folder | Contents |
|---------------|----------|
| `profile.json` | Fictional demographics |
| `goals.json` | Example Centenarian Decathlon tasks |
| `diet.json` | Two placeholder meals |
| `garmin/daily/` | 14 days of invented recovery metrics |
| `garmin/activities/` | Five invented workouts with Zone 2 minutes |
| `biomarkers/panels/2026-01-15.json` | Demo lab panel (generated via `ingest-markers`) |
| `biomarkers/markers.json` | History derived from that panel |
| `documents/demo-lab.extracted.json` | Example input for `npm run ingest-markers` |

When you fork for yourself:

1. Remove or overwrite these files with your real JSON (or start empty and use Garmin sync + ingest).
2. Keep `reference-ranges.json` and adjust markers to match your clinician's targets.
3. Never commit raw PDFs to a **public** repo; use a **private** repository for production.
