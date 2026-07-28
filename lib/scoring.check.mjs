import assert from "node:assert/strict";

// COPY of the pure scoring logic from lib/scoring.ts (the deterministic parts).
function statusScore(s) {
  return s === "optimal" ? 100 : s === "watch" ? 60 : 20;
}
function bandFor(score) {
  if (score >= 80) return "good";
  if (score >= 55) return "watch";
  return "risk";
}
const ORDER = ["cardiovascular", "metabolic", "neurodegenerative", "cancer"];

function scoreHorsemen(markers, ranges) {
  const horsemenForMarker = new Map(ranges.map((r) => [r.key, r.horsemen]));
  const latestByKey = new Map();
  for (const m of markers) {
    const prev = latestByKey.get(m.key);
    if (!prev || m.date > prev.date) latestByKey.set(m.key, m);
  }
  return ORDER.map((key) => {
    const contributing = [];
    let sum = 0;
    for (const m of latestByKey.values()) {
      if ((horsemenForMarker.get(m.key) || []).includes(key)) {
        contributing.push(m.key);
        sum += statusScore(m.status);
      }
    }
    const score = contributing.length > 0 ? Math.round(sum / contributing.length) : 55;
    return { key, score, band: bandFor(score), contributingMarkers: contributing };
  });
}
function compositeScore(h) {
  if (h.length === 0) return 50;
  return Math.round(h.reduce((s, x) => s + x.score, 0) / h.length);
}
function buildNudge(horsemen, recovery, weekZone2) {
  if (recovery && recovery.sleepScore !== undefined && recovery.sleepScore < 70) return "sleep";
  if (weekZone2 < 150) return "zone2";
  const worst = [...horsemen].sort((a, b) => a.score - b.score)[0];
  if (worst && worst.band === "risk") return "marker";
  return "ontrack";
}

const ranges = [
  { key: "apob", horsemen: ["cardiovascular"] },
  { key: "ldl", horsemen: ["cardiovascular"] },
  { key: "fasting_insulin", horsemen: ["metabolic"] },
];

// All optimal -> 100, good band.
{
  const markers = [
    { key: "apob", status: "optimal", date: "2026-01-01" },
    { key: "fasting_insulin", status: "optimal", date: "2026-01-01" },
  ];
  const h = scoreHorsemen(markers, ranges);
  const cv = h.find((x) => x.key === "cardiovascular");
  assert.equal(cv.score, 100);
  assert.equal(cv.band, "good");
  assert.equal(compositeScore(h), 78); // 100,100,55,55 -> 77.5 -> 78
}

// Horseman with no markers defaults to 55 -> neutral "watch", never red/green.
{
  const h = scoreHorsemen([], ranges);
  assert.equal(h.find((x) => x.key === "cancer").score, 55);
  assert.equal(h.find((x) => x.key === "cancer").band, "watch");
}

// Latest reading wins when a marker has history.
{
  const markers = [
    { key: "apob", status: "out", date: "2025-01-01" },
    { key: "apob", status: "optimal", date: "2026-01-01" },
  ];
  const cv = scoreHorsemen(markers, ranges).find((x) => x.key === "cardiovascular");
  assert.equal(cv.score, 100, "should use the newer optimal reading");
}

// Nudge priority: recovery beats everything.
assert.equal(buildNudge([], { sleepScore: 55 }, 0), "sleep");
assert.equal(buildNudge([], { sleepScore: 90 }, 30), "zone2");
assert.equal(
  buildNudge([{ score: 20, band: "risk" }], { sleepScore: 90 }, 200),
  "marker",
);
assert.equal(buildNudge([{ score: 90, band: "good" }], { sleepScore: 90 }, 200), "ontrack");

// weeklyZone2: date-string window, timezone-stable.
function weeklyZone2(activities, now) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return activities
    .filter((a) => a.date >= cutoffStr)
    .reduce((s, a) => s + (a.zone2Min ?? 0), 0);
}
{
  const now = new Date("2026-06-25T00:00:00Z");
  const acts = [
    { date: "2026-06-24", zone2Min: 35 }, // in window
    { date: "2026-06-18", zone2Min: 30 }, // exactly 7 days back -> included
    { date: "2026-06-17", zone2Min: 99 }, // older -> excluded
    { date: "2026-06-22", zone2Min: 0 },
  ];
  assert.equal(weeklyZone2(acts, now), 65);
}

console.log("scoring logic ok");
