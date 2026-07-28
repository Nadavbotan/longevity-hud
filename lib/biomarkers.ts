import type {
  Biomarker,
  MarkerStatus,
  MarkerDirection,
  ReferenceRange,
} from "@/lib/types";

/**
 * Classify a raw value against its reference range into optimal / watch / out.
 * Pure function so it stays unit-testable; the same logic is mirrored in
 * lib/biomarkers.check.mjs.
 *
 * - lower:  good at or below optimalHigh; "watch" within 15% above; else "out".
 * - higher: good at or above optimalLow;  "watch" within 15% below; else "out".
 * - band:   good inside [optimalLow, optimalHigh]; "watch" within 10% of the
 *           nearest edge; else "out".
 */
export function classify(
  value: number,
  range: Pick<ReferenceRange, "direction" | "optimalLow" | "optimalHigh">,
): MarkerStatus {
  const { direction, optimalLow, optimalHigh } = range;

  if (direction === "lower") {
    if (optimalHigh === undefined) return "watch";
    if (value <= optimalHigh) return "optimal";
    if (value <= optimalHigh * 1.15) return "watch";
    return "out";
  }

  if (direction === "higher") {
    if (optimalLow === undefined) return "watch";
    if (value >= optimalLow) return "optimal";
    if (value >= optimalLow * 0.85) return "watch";
    return "out";
  }

  // band
  if (optimalLow === undefined || optimalHigh === undefined) return "watch";
  if (value >= optimalLow && value <= optimalHigh) return "optimal";
  const lowEdge = optimalLow * 0.9;
  const highEdge = optimalHigh * 1.1;
  if (value >= lowEdge && value <= highEdge) return "watch";
  return "out";
}

/** Build a status-tagged Biomarker from a raw value + its reference range. */
export function toBiomarker(
  key: string,
  value: number,
  date: string,
  range: ReferenceRange,
): Biomarker {
  return {
    key,
    name: range.name,
    value,
    unit: range.unit,
    date,
    optimalLow: range.optimalLow,
    optimalHigh: range.optimalHigh,
    status: classify(value, range),
  };
}

/** Map status to a 0-100 sub-score used by the Horsemen scoring engine. */
export function statusScore(status: MarkerStatus): number {
  return status === "optimal" ? 100 : status === "watch" ? 60 : 20;
}

export function rangeByKey(
  ranges: ReferenceRange[],
): Record<string, ReferenceRange> {
  return Object.fromEntries(ranges.map((r) => [r.key, r]));
}

export type { MarkerDirection };
