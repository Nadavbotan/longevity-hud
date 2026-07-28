import { toBiomarker, rangeByKey } from "@/lib/biomarkers";
import type {
  Biomarker,
  BloodPanel,
  MarkerHistory,
  ReferenceRange,
} from "@/lib/types";

/** One marker as extracted from a document, before canonicalization. */
export interface ExtractedMarker {
  name: string;
  value: number;
  unit?: string;
  date?: string;
}

export interface AssembleResult {
  panel: BloodPanel;
  unmatched: { name: string; value: number }[];
}

/**
 * Common aliases per canonical key (English + Hebrew). Matching also uses the
 * canonical key and the reference-range display name, so this only needs the
 * variants those two would miss.
 */
const ALIASES: Record<string, string[]> = {
  apob: ["apo b", "apolipoprotein b", "אפו b", "אפוליפופרוטאין b"],
  lpa: ["lp(a)", "lipoprotein a", "lipoprotein(a)", "ליפופרוטאין a"],
  ldl: ["ldl-c", "ldl cholesterol", "ldl כולסטרול", "כולסטרול ldl", "כולסטרול נמוך"],
  hdl: ["hdl-c", "hdl cholesterol", "כולסטרול hdl", "כולסטרול גבוה"],
  triglycerides: ["trigs", "tg", "טריגליצרידים"],
  fasting_glucose: ["glucose", "glucose fasting", "fasting glucose", "גלוקוז", "סוכר", "סוכר בצום", "גלוקוז בצום"],
  fasting_insulin: ["insulin", "אינסולין", "אינסולין בצום"],
  hba1c: ["a1c", "hb a1c", "hemoglobin a1c", "glycated hemoglobin", "המוגלובין מסוכרר", "המוגלובין a1c"],
  hscrp: ["hs-crp", "hs crp", "crp", "c-reactive protein", "high sensitivity crp", "crp רגיש"],
  homocysteine: ["הומוציסטאין"],
  vitamin_d: ["vit d", "25-oh vitamin d", "25 oh vitamin d", "25-hydroxyvitamin d", "ויטמין d", "ויטמין די"],
  alt: ["sgpt", "alanine aminotransferase", "alanine transaminase", "gpt"],
  uric_acid: ["urate", "חומצה אורית"],
  omega3_index: ["omega 3 index", "omega3 index", "אומגה 3", "מדד אומגה 3"],
  bmi: ["body mass index", "מדד bmi"],
  body_fat_pct: ["body fat", "total region %fat", "אחוז שומן", "שומן גוף"],
  visceral_fat: ["visceral fat", "vat", "שומן visceral", "שומן קרבי"],
  grip_strength: ["grip strength", "כח אחיזה", "hand grip"],
  systolic_bp: ["systolic", "systolic bp", "לחץ דם סיסטולי", "לחץ דם"],
  diastolic_bp: ["diastolic", "diastolic bp", "לחץ דם דיאסטולי"],
  sleep_ahi: ["ahi", "pahi", "apnea", "sleep ahi", "apnea index"],
  liver_att: ["liver attenuation", "attenuation", "att", "ניחות כבד"],
  liver_sound_speed: ["speed of sound", "liver sound speed", "מהירות קול"],
  liver_viscosity: ["liver viscosity", "viscosity", "צמיגות כבד"],
  liver_stiffness: ["liver stiffness", "liver elasticity", "hepatic stiffness", "גמישות כבד", "elastography"],
  ecg_hr: ["ecg heart rate", "ecg hr", "heart rate average"],
  ecg_rmssd: ["ecg rmssd", "rmssd hrv", "rmssd"],
  bone_spine_t_score: ["spine t-score", "t-score", "bone density", "צפיפות עצם"],
};

/** Lowercase, strip Hebrew niqqud, normalize separators and whitespace. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u0591-\u05bd\u05bf-\u05c7]/g, "")
    .replace(/[,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function candidatesFor(r: ReferenceRange): string[] {
  return [
    r.key.replace(/_/g, " "),
    r.name,
    ...(ALIASES[r.key] ?? []),
  ].map(normalize);
}

/**
 * Map a raw marker name to a canonical reference-range key, or null if unknown.
 * Exact normalized match first, then a substring fallback for noisy lab labels.
 * ponytail: substring scan is O(markers * ranges) and first-match-wins; fine for
 * around 15 ranges, revisit if the range table grows large.
 */
export function matchKey(rawName: string, ranges: ReferenceRange[]): string | null {
  const norm = normalize(rawName);
  if (!norm) return null;

  for (const r of ranges) {
    for (const c of candidatesFor(r)) {
      if (c && norm === c) return r.key;
    }
  }

  for (const r of ranges) {
    for (const c of candidatesFor(r)) {
      if (c.length >= 3 && (norm.includes(c) || c.includes(norm))) return r.key;
    }
  }

  return null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Most frequent marker date, else the supplied fallback. */
function pickPanelDate(markers: Biomarker[], fallback: string): string {
  const counts = new Map<string, number>();
  for (const m of markers) counts.set(m.date, (counts.get(m.date) ?? 0) + 1);
  let best = fallback;
  let bestN = 0;
  for (const [d, n] of counts) {
    if (n > bestN) {
      best = d;
      bestN = n;
    }
  }
  return best;
}

/**
 * Turn extracted markers into a status-tagged BloodPanel. Unknown names are
 * collected (never silently dropped) so the caller can report them. Markers are
 * deduped by canonical key within a single panel (first reading wins).
 */
export function assembleBloodPanel(
  extracted: ExtractedMarker[],
  ranges: ReferenceRange[],
  source: string,
  fallbackDate: string,
): AssembleResult {
  const rmap = rangeByKey(ranges);
  const markers: Biomarker[] = [];
  const unmatched: { name: string; value: number }[] = [];
  const seen = new Set<string>();

  for (const e of extracted) {
    if (typeof e.value !== "number" || Number.isNaN(e.value)) continue;
    const key = matchKey(e.name, ranges);
    if (!key || !rmap[key]) {
      unmatched.push({ name: e.name, value: e.value });
      continue;
    }
    if (seen.has(key)) continue;
    const date = e.date && ISO_DATE.test(e.date) ? e.date : fallbackDate;
    markers.push(toBiomarker(key, e.value, date, rmap[key]));
    seen.add(key);
  }

  const panelDate = pickPanelDate(markers, fallbackDate);
  return {
    panel: { id: `panel-${panelDate}`, date: panelDate, source, markers },
    unmatched,
  };
}

/**
 * Merge a panel's markers into the per-marker history view. History stays
 * ascending by date and is deduped by date (a later parse of the same draw date
 * overwrites the earlier value).
 */
export function mergeMarkerHistory(
  existing: MarkerHistory[],
  panel: BloodPanel,
): MarkerHistory[] {
  const byKey = new Map<string, MarkerHistory>(
    existing.map((h) => [
      h.key,
      { key: h.key, name: h.name, unit: h.unit, history: [...h.history] },
    ]),
  );

  for (const m of panel.markers) {
    const h =
      byKey.get(m.key) ?? { key: m.key, name: m.name, unit: m.unit, history: [] };
    const idx = h.history.findIndex((p) => p.date === m.date);
    if (idx >= 0) h.history[idx] = { date: m.date, value: m.value };
    else h.history.push({ date: m.date, value: m.value });
    h.history.sort((a, b) => a.date.localeCompare(b.date));
    h.name = m.name;
    h.unit = m.unit;
    byKey.set(m.key, h);
  }

  return [...byKey.values()];
}
