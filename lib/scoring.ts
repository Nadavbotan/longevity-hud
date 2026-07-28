import type {
  Biomarker,
  ReferenceRange,
  GarminDaily,
  Activity,
  HorsemanKey,
  HorsemanStatus,
  LongevityStatus,
} from "@/lib/types";
import { statusScore } from "@/lib/biomarkers";

const HORSEMAN_LABELS: Record<HorsemanKey, string> = {
  cardiovascular: "Cardiovascular",
  cancer: "Cancer",
  neurodegenerative: "Neurodegenerative",
  metabolic: "Metabolic",
};

const HORSEMAN_ORDER: HorsemanKey[] = [
  "cardiovascular",
  "metabolic",
  "neurodegenerative",
  "cancer",
];

/** Weekly Zone 2 target (minutes) - Attia's rough floor. */
export const ZONE2_WEEKLY_TARGET = 150;

export function bandFor(score: number): "good" | "watch" | "risk" {
  if (score >= 80) return "good";
  if (score >= 55) return "watch";
  return "risk";
}

/**
 * Score each Horseman as the mean sub-score of its contributing markers.
 * A Horseman with no data scores 55 (lands in the neutral "watch" band, never
 * a green-light it cannot justify nor a misleading red). Pure + mirrored in
 * lib/scoring.check.mjs.
 */
export function scoreHorsemen(
  markers: Biomarker[],
  ranges: ReferenceRange[],
): HorsemanStatus[] {
  const horsemenForMarker = new Map(ranges.map((r) => [r.key, r.horsemen]));
  const latestByKey = new Map<string, Biomarker>();
  for (const m of markers) {
    const prev = latestByKey.get(m.key);
    if (!prev || m.date > prev.date) latestByKey.set(m.key, m);
  }

  return HORSEMAN_ORDER.map((key) => {
    const contributing: string[] = [];
    let sum = 0;
    for (const m of latestByKey.values()) {
      if (horsemenForMarker.get(m.key)?.includes(key)) {
        contributing.push(m.key);
        sum += statusScore(m.status);
      }
    }
    const score = contributing.length > 0 ? Math.round(sum / contributing.length) : 55;
    return {
      key,
      label: HORSEMAN_LABELS[key],
      score,
      band: bandFor(score),
      contributingMarkers: contributing,
    };
  });
}

export function compositeScore(horsemen: HorsemanStatus[]): number {
  if (horsemen.length === 0) return 50;
  const sum = horsemen.reduce((s, h) => s + h.score, 0);
  return Math.round(sum / horsemen.length);
}

/**
 * Sum Zone 2 minutes over the trailing 7 days. Compares date-only strings
 * (YYYY-MM-DD sorts chronologically), so it is immune to the timezone skew
 * you get mixing local-time Dates with UTC-midnight-parsed ISO dates.
 */
export function weeklyZone2(activities: Activity[], now: Date = new Date()): number {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return activities
    .filter((a) => a.date >= cutoffStr)
    .reduce((s, a) => s + (a.zone2Min ?? 0), 0);
}

/**
 * The single most useful thing to do today. Priority: protect today's
 * recovery first, then this week's aerobic base, then the worst biomarker,
 * else affirm the routine.
 */
export function buildNudge(
  horsemen: HorsemanStatus[],
  recovery: GarminDaily | null,
  weekZone2: number,
): string {
  if (recovery && recovery.sleepScore !== undefined && recovery.sleepScore < 70) {
    return "Recovery is low today. Treat sleep as the priority tonight - protect a full wind-down and a consistent bedtime.";
  }
  if (weekZone2 < ZONE2_WEEKLY_TARGET) {
    const left = ZONE2_WEEKLY_TARGET - weekZone2;
    return `You're ${left} Zone 2 minutes short of this week's aerobic target. Fit in a steady ${Math.min(left, 45)}-minute Zone 2 session.`;
  }
  const worst = [...horsemen].sort((a, b) => a.score - b.score)[0];
  if (worst && worst.band === "risk") {
    return `${worst.label} is your weakest track right now. Review its markers in Vitals and pick one lever to move this month.`;
  }
  return "On track. Hold your Zone 2 base and strength cadence, and keep sleep consistent.";
}

export function computeStatus(
  markers: Biomarker[],
  ranges: ReferenceRange[],
  recovery: GarminDaily | null,
  activities: Activity[],
): LongevityStatus {
  const horsemen = scoreHorsemen(markers, ranges);
  const score = compositeScore(horsemen);
  const weekZone2 = weeklyZone2(activities);
  return {
    score,
    band: bandFor(score),
    horsemen,
    nudge: buildNudge(horsemen, recovery, weekZone2),
  };
}

export { HORSEMAN_LABELS, HORSEMAN_ORDER };
