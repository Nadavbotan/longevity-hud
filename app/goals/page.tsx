import { ArrowRight } from "lucide-react";
import PageShell from "@/components/PageShell";
import HudPanel from "@/components/hud/HudPanel";
import StatusRing from "@/components/hud/StatusRing";
import { getGoals } from "@/lib/data";
import type { DecathlonTask } from "@/lib/types";

const STATUS_LABEL: Record<DecathlonTask["status"], string> = {
  "on-track": "On Track",
  behind: "Behind",
  achieved: "Achieved",
};

function bandFor(task: DecathlonTask): "good" | "watch" | "risk" {
  if (task.status === "achieved") return "good";
  if (task.status === "behind") return task.progress < 40 ? "risk" : "watch";
  return task.progress >= 66 ? "good" : "watch";
}

export default function GoalsPage() {
  const goals = getGoals();

  return (
    <PageShell title="Goals" accent="#ff9d3c">
      <p className="-mt-3 max-w-xl text-sm leading-relaxed text-hud-text-dim">
        The Centenarian Decathlon: the physical things to still do late in life,
        back-calculated to the capacity needed now. Every workout serves one of these.
      </p>

      <div className="flex flex-col gap-4">
        {goals.length === 0 ? (
          <HudPanel>
            <p className="text-sm text-hud-text-dim">No decathlon tasks yet.</p>
          </HudPanel>
        ) : (
          goals.map((g) => (
            <HudPanel key={g.id} label={STATUS_LABEL[g.status]}>
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
                <StatusRing
                  score={g.progress}
                  band={bandFor(g)}
                  label={STATUS_LABEL[g.status]}
                  size={120}
                />
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h2 className="font-display text-base font-bold leading-snug text-hud-text hud-text-glow sm:text-lg">
                    {g.description}
                  </h2>
                  <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-xs text-hud-text-dim">{g.currentCapacity}</span>
                    <ArrowRight size={14} className="text-hud-amber" aria-hidden />
                    <span className="text-xs font-medium text-hud-text">{g.requiredCapacity}</span>
                  </div>
                </div>
              </div>
            </HudPanel>
          ))
        )}
      </div>
    </PageShell>
  );
}
