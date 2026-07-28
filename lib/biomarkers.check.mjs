import assert from "node:assert/strict";

// COPY of the pure classify logic from lib/biomarkers.ts. Kept identical in
// behavior; runs with plain `node` (no TS).
function classify(value, range) {
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
  if (optimalLow === undefined || optimalHigh === undefined) return "watch";
  if (value >= optimalLow && value <= optimalHigh) return "optimal";
  if (value >= optimalLow * 0.9 && value <= optimalHigh * 1.1) return "watch";
  return "out";
}

// lower: ApoB target 60
assert.equal(classify(55, { direction: "lower", optimalHigh: 60 }), "optimal");
assert.equal(classify(66, { direction: "lower", optimalHigh: 60 }), "watch"); // <= 69
assert.equal(classify(90, { direction: "lower", optimalHigh: 60 }), "out");

// higher: HDL target 50
assert.equal(classify(60, { direction: "higher", optimalLow: 50 }), "optimal");
assert.equal(classify(45, { direction: "higher", optimalLow: 50 }), "watch"); // >= 42.5
assert.equal(classify(30, { direction: "higher", optimalLow: 50 }), "out");

// band: fasting glucose 70-90
assert.equal(classify(85, { direction: "band", optimalLow: 70, optimalHigh: 90 }), "optimal");
assert.equal(classify(95, { direction: "band", optimalLow: 70, optimalHigh: 90 }), "watch"); // <= 99
assert.equal(classify(110, { direction: "band", optimalLow: 70, optimalHigh: 90 }), "out");
assert.equal(classify(64, { direction: "band", optimalLow: 70, optimalHigh: 90 }), "watch"); // >= 63

// missing bound -> watch (never silently "optimal")
assert.equal(classify(10, { direction: "lower" }), "watch");

console.log("biomarkers logic ok");
