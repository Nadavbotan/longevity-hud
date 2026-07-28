import fs from "node:fs";
import path from "node:path";
import type {
  Biomarker,
  BloodPanel,
  MarkerHistory,
  ReferenceRange,
  GarminDaily,
  Activity,
  DecathlonTask,
  DietEntry,
  Profile,
} from "@/lib/types";

const DATA = path.join(process.cwd(), "data");

function readJson<T>(rel: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, rel), "utf-8")) as T;
  } catch {
    return fallback;
  }
}

/** Read every *.json file in a data subdirectory, flattening arrays. */
function readJsonDir<T>(rel: string): T[] {
  const dir = path.join(DATA, rel);
  let files: string[];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const out: T[] = [];
  for (const f of files) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
      if (Array.isArray(parsed)) out.push(...(parsed as T[]));
      else out.push(parsed as T);
    } catch {
      // skip malformed file; never crash the whole build on one bad doc
    }
  }
  return out;
}

const byDateDesc = <T extends { date: string }>(a: T, b: T) =>
  b.date.localeCompare(a.date);

export function getReferenceRanges(): ReferenceRange[] {
  return readJson<ReferenceRange[]>("reference-ranges.json", []);
}

export function getProfile(): Profile | null {
  return readJson<Profile | null>("profile.json", null);
}

export function getGarminDaily(): GarminDaily[] {
  return readJsonDir<GarminDaily>("garmin/daily").sort(byDateDesc);
}

export function getLatestRecovery(): GarminDaily | null {
  return getGarminDaily()[0] ?? null;
}

export function getActivities(): Activity[] {
  return readJsonDir<Activity>("garmin/activities").sort(byDateDesc);
}

export function getPanels(): BloodPanel[] {
  return readJsonDir<BloodPanel>("biomarkers/panels").sort(byDateDesc);
}

/** Latest reading per marker key across all panels, status already tagged. */
export function getLatestBiomarkers(): Biomarker[] {
  const latest = new Map<string, Biomarker>();
  for (const panel of getPanels()) {
    for (const m of panel.markers) {
      const prev = latest.get(m.key);
      if (!prev || m.date > prev.date) latest.set(m.key, m);
    }
  }
  return [...latest.values()];
}

/** Per-marker history for trend sparklines (markers.json, else derived). */
export function getMarkerHistory(): MarkerHistory[] {
  const fromFile = readJson<MarkerHistory[]>("biomarkers/markers.json", []);
  if (fromFile.length > 0) return fromFile;

  const byKey = new Map<string, MarkerHistory>();
  for (const panel of [...getPanels()].reverse()) {
    for (const m of panel.markers) {
      const h = byKey.get(m.key) ?? { key: m.key, name: m.name, unit: m.unit, history: [] };
      h.history.push({ date: m.date, value: m.value });
      byKey.set(m.key, h);
    }
  }
  return [...byKey.values()];
}

export function getGoals(): DecathlonTask[] {
  return readJson<DecathlonTask[]>("goals.json", []);
}

export function getDiet(): DietEntry[] {
  return readJson<DietEntry[]>("diet.json", []).sort(byDateDesc);
}
