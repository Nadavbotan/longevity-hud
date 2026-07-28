import PageShell from "@/components/PageShell";
import HudPanel from "@/components/hud/HudPanel";
import Sparkline from "@/components/hud/Sparkline";
import { rangeByKey } from "@/lib/biomarkers";
import { getLatestBiomarkers, getMarkerHistory, getReferenceRanges } from "@/lib/data";
import type { Biomarker, MarkerStatus, ReferenceRange } from "@/lib/types";

const STATUS_ACCENT: Record<MarkerStatus, string> = {
  optimal: "#46e8a8",
  watch: "#ff9d3c",
  out: "#ff4d5e",
};

const STATUS_LABEL: Record<MarkerStatus, string> = {
  optimal: "Optimal",
  watch: "Watch",
  out: "Out of range",
};

// Out-of-range surfaces first, then watch, then optimal.
const STATUS_ORDER: Record<MarkerStatus, number> = { out: 0, watch: 1, optimal: 2 };

/** Render the Attia optimal target readably from the reference range. */
function formatOptimal(range: ReferenceRange | undefined): string | null {
  if (!range) return null;
  if (range.direction === "lower" && range.optimalHigh !== undefined) {
    return `optimal < ${range.optimalHigh}`;
  }
  if (range.direction === "higher" && range.optimalLow !== undefined) {
    return `optimal >= ${range.optimalLow}`;
  }
  if (range.direction === "band" && range.optimalLow !== undefined && range.optimalHigh !== undefined) {
    return `optimal ${range.optimalLow}-${range.optimalHigh}`;
  }
  return null;
}

export default function VitalsPage() {
  const ranges = rangeByKey(getReferenceRanges());
  const history = getMarkerHistory();
  const historyByKey = new Map(history.map((h) => [h.key, h.history]));

  const markers = getLatestBiomarkers().sort((a: Biomarker, b: Biomarker) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    return byStatus !== 0 ? byStatus : a.name.localeCompare(b.name);
  });

  return (
    <PageShell title="Vitals" accent="#46e8a8">
      {markers.length === 0 ? (
        <HudPanel>
          <p className="text-sm text-hud-text-dim">
            No biomarkers yet. Upload a blood-test document to populate this tab.
          </p>
        </HudPanel>
      ) : (
        <div className="flex flex-col gap-3">
          {markers.map((m) => {
            const accent = STATUS_ACCENT[m.status];
            const optimal = formatOptimal(ranges[m.key]);
            const values = (historyByKey.get(m.key) ?? []).map((p) => p.value);

            return (
              <HudPanel key={m.key}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="truncate font-display text-xs uppercase tracking-[0.18em] text-hud-text">
                        {m.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-hud-text-dim">
                        {optimal ?? STATUS_LABEL[m.status]}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden sm:block">
                      <Sparkline values={values} accent={accent} />
                    </div>
                    <div className="flex items-baseline gap-1 text-right">
                      <span
                        className="font-display text-2xl font-bold leading-none hud-text-glow"
                        style={{ color: accent }}
                      >
                        {m.value}
                      </span>
                      <span className="font-display text-[10px] uppercase tracking-wider text-hud-cyan-dim">
                        {m.unit}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 sm:hidden">
                  <Sparkline values={values} accent={accent} width={140} height={28} />
                </div>
              </HudPanel>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
