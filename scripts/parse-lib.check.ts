import assert from "node:assert/strict";
import { matchKey, mergeMarkerHistory, assembleBloodPanel } from "@/scripts/parse-lib";
import type { BloodPanel, MarkerHistory, ReferenceRange } from "@/lib/types";
import ranges from "@/data/reference-ranges.json";

const R = ranges as ReferenceRange[];

// (a) name -> canonical key matching.
// alias: a printed lab label that is not the canonical name.
assert.equal(matchKey("Apolipoprotein B", R), "apob");
assert.equal(matchKey("LDL Cholesterol", R), "ldl");
// case-insensitive English.
assert.equal(matchKey("hba1c", R), "hba1c");
assert.equal(matchKey("HBA1C", R), "hba1c");
// Hebrew label.
assert.equal(matchKey("ויטמין D", R), "vitamin_d");
assert.equal(matchKey("המוגלובין מסוכרר", R), "hba1c");
// unknown marker -> null (never silently mapped).
assert.equal(matchKey("Bilirubin Total", R), null);

// assembleBloodPanel tags status via lib/biomarkers and skips unknowns.
const assembled = assembleBloodPanel(
  [
    { name: "Apolipoprotein B", value: 78, unit: "mg/dL", date: "2026-05-12" },
    { name: "Bilirubin", value: 0.8, unit: "mg/dL" },
  ],
  R,
  "test.pdf",
  "2026-05-12",
);
assert.equal(assembled.panel.markers.length, 1);
assert.equal(assembled.panel.markers[0].key, "apob");
assert.equal(assembled.panel.markers[0].status, "out"); // 78 > 60 * 1.15
assert.equal(assembled.unmatched.length, 1);
assert.equal(assembled.panel.date, "2026-05-12");

// (b) markers.json merge keeps history ascending and dedups same-date.
const existing: MarkerHistory[] = [
  {
    key: "apob",
    name: "ApoB",
    unit: "mg/dL",
    history: [{ date: "2025-11-10", value: 92 }],
  },
];

// out-of-order incoming panel date, plus a same-date overwrite.
const panelA: BloodPanel = {
  id: "p-a",
  date: "2026-05-12",
  source: "a",
  markers: [{ key: "apob", name: "ApoB", value: 78, unit: "mg/dL", date: "2026-05-12", status: "out" }],
};
const panelB: BloodPanel = {
  id: "p-b",
  date: "2025-08-01",
  source: "b",
  markers: [{ key: "apob", name: "ApoB", value: 88, unit: "mg/dL", date: "2025-08-01", status: "out" }],
};
const panelDup: BloodPanel = {
  id: "p-dup",
  date: "2026-05-12",
  source: "dup",
  markers: [{ key: "apob", name: "ApoB", value: 70, unit: "mg/dL", date: "2026-05-12", status: "out" }],
};

let merged = mergeMarkerHistory(existing, panelA);
merged = mergeMarkerHistory(merged, panelB);
merged = mergeMarkerHistory(merged, panelDup);

const apob = merged.find((h) => h.key === "apob");
assert.ok(apob);
const dates = apob.history.map((p) => p.date);
assert.deepEqual(dates, ["2025-08-01", "2025-11-10", "2026-05-12"]); // ascending, deduped
const dup = apob.history.find((p) => p.date === "2026-05-12");
assert.equal(dup?.value, 70); // same-date overwrite kept the latest value

console.log("parse-lib logic ok");
