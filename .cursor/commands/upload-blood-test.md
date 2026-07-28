# Upload blood test

Use this when the user gives you a blood-test PDF, a lab report, or a photo of one and wants it added to the Longevity dashboard. You (the AI assistant) read the document and extract the markers; a deterministic script does the canonicalization, status tagging, and history merge. No API key, no external service.

## Steps

1. **Read the document.** Open the PDF or image the user provided (it usually lives under `data/documents/`). Read every measured marker. The report may be in Hebrew or English and the layout varies between labs.

2. **Extract markers to a JSON file.** Write a file like `data/documents/<name>.extracted.json` in this shape:

   ```json
   {
     "source": "Lab name or original filename",
     "date": "YYYY-MM-DD",
     "markers": [
       { "name": "ApoB", "value": 78, "unit": "mg/dL", "date": "YYYY-MM-DD" },
       { "name": "גלוקוז בצום", "value": 88, "unit": "mg/dL" }
     ]
   }
   ```

   Rules:
   - Keep the marker name exactly as printed (original language is fine - the matcher knows English and Hebrew aliases).
   - `value` is the numeric result only (no units, no reference range, no commas).
   - Only include markers with a numeric result. Skip qualitative or missing values.
   - Do not invent markers, units, or dates. Omit `unit`/`date` if unsure; the panel date falls back to the file-level `date` then today.

3. **Run the ingest script.** It matches each name to a canonical marker, tags status against the Attia ranges in `data/reference-ranges.json`, writes `data/biomarkers/panels/<date>.json`, and updates `data/biomarkers/markers.json`:

   ```bash
   npx tsx scripts/ingest-markers.ts data/documents/<name>.extracted.json
   ```

4. **Report the result.** Tell the user how many markers matched and list any that were skipped as unmatched. If markers were skipped that should be tracked, add an alias in `scripts/parse-lib.ts` or a new range in `data/reference-ranges.json`, then re-run.

5. **Publish (optional).** If the user wants it live, commit and push the changed `data/biomarkers/**` files. Vercel redeploys automatically and the Vitals tab plus the Four Horsemen rings update on the next deploy.

## Notes

- The raw document under `data/documents/` is gitignored and never served by the site; only the extracted JSON is committed.
- The status math (optimal / watch / out) is owned by `lib/biomarkers.ts` - do not classify by hand, let the script do it so it stays consistent with the rest of the app.
