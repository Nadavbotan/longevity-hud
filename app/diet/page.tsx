import PageShell from "@/components/PageShell";
import HudPanel from "@/components/hud/HudPanel";
import { getDiet } from "@/lib/data";
import type { DietEntry } from "@/lib/types";

function groupByDate(entries: DietEntry[]): [string, DietEntry[]][] {
  const byDate = new Map<string, DietEntry[]>();
  for (const e of entries) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }
  // getDiet() is already sorted by date desc, so insertion order is correct.
  return [...byDate.entries()];
}

export default function DietPage() {
  const days = groupByDate(getDiet());

  return (
    <PageShell title="Diet" accent="#6fb8d8">
      <p className="-mt-3 text-sm leading-relaxed text-hud-text-dim">
        A light food log. Protein and rough calories only - secondary by design.
      </p>

      <div className="flex flex-col gap-5">
        {days.length === 0 ? (
          <HudPanel>
            <p className="text-sm text-hud-text-dim">No meals logged yet.</p>
          </HudPanel>
        ) : (
          days.map(([date, meals]) => {
            const protein = meals.reduce((s, m) => s + (m.proteinG ?? 0), 0);
            const calories = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
            return (
              <section key={date}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="font-display text-[11px] uppercase tracking-[0.3em] text-hud-text-dim">
                    {date}
                  </h2>
                  <span className="font-display text-[11px] uppercase tracking-[0.15em] text-hud-cyan-dim">
                    {protein}g P / {calories} kcal
                  </span>
                </div>
                <HudPanel>
                  <ul className="flex flex-col divide-y divide-hud-cyan/10">
                    {meals.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                      >
                        <span className="min-w-0 flex-1 text-sm text-hud-text">{m.meal}</span>
                        <span className="shrink-0 font-display text-xs tracking-wide text-hud-cyan-dim">
                          {m.proteinG != null ? `${m.proteinG}g P` : ""}
                          {m.proteinG != null && m.calories != null ? " / " : ""}
                          {m.calories != null ? `${m.calories} kcal` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </HudPanel>
              </section>
            );
          })
        )}
      </div>
    </PageShell>
  );
}
