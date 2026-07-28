import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BloodPanel, MarkerHistory, ReferenceRange } from "@/lib/types";
import {
  assembleBloodPanel,
  mergeMarkerHistory,
  type ExtractedMarker,
} from "@/scripts/parse-lib";

// Deterministic ingestion step. The reading of a blood-test PDF/photo is done
// by the AI assistant in Cursor / Claude Code (which has repo access); it writes
// the extracted markers to a JSON file, then runs this script. This script does
// only the reliable, testable part: canonicalize names, tag status against the
// Attia ranges, and merge into the panel + history files. No network, no API key.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const PANELS_DIR = path.join(DATA, "biomarkers", "panels");
const MARKERS_PATH = path.join(DATA, "biomarkers", "markers.json");
const RANGES_PATH = path.join(DATA, "reference-ranges.json");

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

interface ExtractedInput {
  source?: string;
  date?: string;
  markers: ExtractedMarker[];
}

/** Accept either a bare markers array or { source?, date?, markers }. */
function normalizeInput(parsed: unknown): ExtractedInput {
  if (Array.isArray(parsed)) return { markers: parsed as ExtractedMarker[] };
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as ExtractedInput).markers)) {
    return parsed as ExtractedInput;
  }
  throw new Error('Input must be a markers array or an object { markers: [...] }');
}

function parseArgs(argv: string[]): { file: string; source?: string; date?: string } {
  const out: { file?: string; source?: string; date?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--source") out.source = argv[++i];
    else if (argv[i] === "--date") out.date = argv[++i];
    else if (!out.file) out.file = argv[i];
  }
  if (!out.file) {
    throw new Error(
      "Usage: npx tsx scripts/ingest-markers.ts <extracted.json> [--source <name>] [--date YYYY-MM-DD]",
    );
  }
  return out as { file: string; source?: string; date?: string };
}

function writePanel(panel: BloodPanel): string {
  fs.mkdirSync(PANELS_DIR, { recursive: true });
  const out = path.join(PANELS_DIR, `${panel.date}.json`);
  fs.writeFileSync(out, JSON.stringify(panel, null, 2) + "\n", "utf-8");
  return out;
}

function writeMarkers(panel: BloodPanel): void {
  const existing = readJson<MarkerHistory[]>(MARKERS_PATH, []);
  const merged = mergeMarkerHistory(existing, panel);
  merged.sort((a, b) => a.key.localeCompare(b.key));
  fs.writeFileSync(MARKERS_PATH, JSON.stringify(merged, null, 2) + "\n", "utf-8");
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function main(): void {
  const { file, source, date } = parseArgs(process.argv.slice(2));

  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) {
    console.error(`[ERROR] File not found: ${absolute}`);
    process.exit(1);
  }

  const input = normalizeInput(JSON.parse(fs.readFileSync(absolute, "utf-8")));

  const ranges = readJson<ReferenceRange[]>(RANGES_PATH, []);
  if (ranges.length === 0) {
    console.error("[ERROR] reference-ranges.json is empty or missing");
    process.exit(1);
  }

  const fallbackDate =
    date && ISO_DATE.test(date)
      ? date
      : input.date && ISO_DATE.test(input.date)
        ? input.date
        : new Date().toISOString().slice(0, 10);
  const src = source ?? input.source ?? path.basename(absolute);

  const { panel, unmatched } = assembleBloodPanel(input.markers, ranges, src, fallbackDate);

  if (panel.markers.length === 0) {
    console.error("[ERROR] No markers matched a known reference range. Nothing written.");
    if (unmatched.length > 0) {
      console.error(`  unmatched: ${unmatched.map((u) => u.name).join(", ")}`);
    }
    process.exit(1);
  }

  const panelPath = writePanel(panel);
  writeMarkers(panel);

  console.log(`[OK] panel date ${panel.date}, ${panel.markers.length} marker(s) matched`);
  console.log(`  wrote ${path.relative(ROOT, panelPath)} and ${path.relative(ROOT, MARKERS_PATH)}`);
  if (unmatched.length > 0) {
    console.log(`  skipped ${unmatched.length} unmatched: ${unmatched.map((u) => u.name).join(", ")}`);
    console.log("  (add aliases in scripts/parse-lib.ts or a range in data/reference-ranges.json to capture these)");
  }
}

main();
