// Longevity data model. Mirrors the Outlive framework (PLAN.md §3, §5).
// JSON files in data/ are the single source of truth; these types are the
// contract every page, script, and the scoring engine read against.

export type MarkerStatus = "optimal" | "watch" | "out";

/** The four chronic-disease tracks from Outlive. */
export type HorsemanKey = "cardiovascular" | "cancer" | "neurodegenerative" | "metabolic";

/** Which way is "good" for a biomarker relative to its optimal band. */
export type MarkerDirection = "lower" | "higher" | "band";

/**
 * A single biomarker reading parsed from a blood panel. `optimalLow`/
 * `optimalHigh` come from reference-ranges.json (Attia-preferred ranges, not
 * just lab "normal"). `status` is derived by lib/biomarkers.ts.
 */
export interface Biomarker {
  key: string;        // canonical key, e.g. "apob", "fasting_insulin"
  name: string;       // display name, e.g. "ApoB"
  value: number;
  unit: string;
  date: string;       // ISO date of the draw (YYYY-MM-DD)
  optimalLow?: number;
  optimalHigh?: number;
  status: MarkerStatus;
}

/** One blood draw: all markers extracted from a single panel/document. */
export interface BloodPanel {
  id: string;
  date: string;
  source: string;     // lab name or document filename
  markers: Biomarker[];
}

/**
 * The derived "latest value + history" view per marker, written to
 * data/biomarkers/markers.json by the parse pipeline.
 */
export interface MarkerHistory {
  key: string;
  name: string;
  unit: string;
  history: { date: string; value: number }[]; // ascending by date
}

/** A reference range definition (config, not data) per canonical marker. */
export interface ReferenceRange {
  key: string;
  name: string;
  unit: string;
  direction: MarkerDirection;
  optimalLow?: number;
  optimalHigh?: number;
  horsemen: HorsemanKey[]; // which tracks this marker contributes to
}

/** Garmin daily recovery/health summary (one file per day). */
export interface GarminDaily {
  date: string;
  restingHR?: number;
  hrv?: number;          // overnight HRV (ms)
  sleepScore?: number;   // 0-100
  sleepHours?: number;
  stress?: number;       // 0-100
  bodyBattery?: number;  // 0-100
  steps?: number;
}

/** A single workout/activity (one file per day, may contain several). */
export interface Activity {
  date: string;
  type: string;
  durationMin: number;
  zone2Min?: number;
  avgHR?: number;
  vo2max?: number;
}

/**
 * Centenarian Decathlon task: a concrete physical thing to do late in life,
 * back-calculated to a current required capacity. (PLAN.md §3.)
 */
export interface DecathlonTask {
  id: string;
  description: string;
  requiredCapacity: string; // e.g. "deadlift 50kg x5"
  currentCapacity: string;
  progress: number;         // 0-100
  status: "on-track" | "behind" | "achieved";
  addedAt: string;
}

/** A light diet log entry (secondary by design, PLAN.md §4). */
export interface DietEntry {
  id: string;
  date: string;
  meal: string;
  proteinG?: number;
  calories?: number;
  note?: string;
  addedAt: string;
}

/** User profile / baselines used for context and scoring. */
export interface Profile {
  name: string;
  sex: "male" | "female";
  birthYear: number;
  familyHistory: string[];
}

/** Derived status for one Horseman, shown as a ring on the HUD. */
export interface HorsemanStatus {
  key: HorsemanKey;
  label: string;
  score: number;                 // 0-100, higher = better
  band: "good" | "watch" | "risk";
  contributingMarkers: string[]; // marker keys feeding this score
}

/** The composite longevity status shown as the central arc reactor. */
export interface LongevityStatus {
  score: number;       // 0-100 composite
  band: "good" | "watch" | "risk";
  horsemen: HorsemanStatus[];
  nudge: string;       // the single most useful thing to do today
}
