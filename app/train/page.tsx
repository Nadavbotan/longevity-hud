import PageShell from "@/components/PageShell";
import HudPanel from "@/components/hud/HudPanel";
import HudWidget from "@/components/hud/HudWidget";
import StatusRing from "@/components/hud/StatusRing";
import { getActivities, getLatestRecovery } from "@/lib/data";
import { weeklyZone2, ZONE2_WEEKLY_TARGET } from "@/lib/scoring";
import type { Activity } from "@/lib/types";

const CYAN = "#2fd4ff";

function zone2Band(minutes: number): "good" | "watch" | "risk" {
  if (minutes >= ZONE2_WEEKLY_TARGET) return "good";
  if (minutes >= ZONE2_WEEKLY_TARGET * 0.66) return "watch";
  return "risk";
}

function prettyType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TrainPage() {
  const activities = getActivities();
  const recovery = getLatestRecovery();

  const zone2 = weeklyZone2(activities);
  const zone2Pct = Math.round((zone2 / ZONE2_WEEKLY_TARGET) * 100);
  const latestVo2 = activities.find((a) => a.vo2max !== undefined)?.vo2max;

  const isStrength = (a: Activity) => /strength|gym|weight/i.test(a.type);
  const strength = activities.filter(isStrength).slice(0, 6);
  const recent = activities.slice(0, 8);

  return (
    <PageShell title="Train" accent={CYAN}>
      {/* Aerobic base: Zone 2 minutes this week against Attia's floor */}
      <section className="flex flex-col items-center gap-3 py-2">
        <StatusRing
          score={zone2Pct}
          band={zone2Band(zone2)}
          label="Zone 2 / Week"
          value={zone2}
          size={196}
        />
        <p className="font-display text-[11px] uppercase tracking-[0.22em] text-hud-text-dim">
          {zone2} of {ZONE2_WEEKLY_TARGET} min target
        </p>
      </section>

      {/* Anaerobic peak + recovery snapshot */}
      <section className="grid grid-cols-3 gap-4">
        <HudWidget label="VO2 Max" value={latestVo2 ?? "--"} />
        <HudWidget
          label="Resting HR"
          value={recovery?.restingHR ?? "--"}
          unit="bpm"
        />
        <HudWidget label="HRV" value={recovery?.hrv ?? "--"} unit="ms" />
      </section>

      {/* Strength pillar */}
      <section>
        <h2 className="mb-3 font-display text-[11px] uppercase tracking-[0.3em] text-hud-text-dim">
          Strength Sessions
        </h2>
        <HudPanel>
          {strength.length > 0 ? (
            <ul className="divide-y divide-hud-cyan/10">
              {strength.map((a, i) => (
                <ActivityRow key={`${a.date}-strength-${i}`} activity={a} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-hud-text-dim">
              No strength sessions logged yet.
            </p>
          )}
        </HudPanel>
      </section>

      {/* Recent activities feed */}
      <section>
        <h2 className="mb-3 font-display text-[11px] uppercase tracking-[0.3em] text-hud-text-dim">
          Recent Activities
        </h2>
        <HudPanel>
          {recent.length > 0 ? (
            <ul className="divide-y divide-hud-cyan/10">
              {recent.map((a, i) => (
                <ActivityRow key={`${a.date}-recent-${i}`} activity={a} showZone2 />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-hud-text-dim">
              No activities synced yet. Garmin sync runs daily.
            </p>
          )}
        </HudPanel>
      </section>
    </PageShell>
  );
}

function ActivityRow({
  activity,
  showZone2,
}: {
  activity: Activity;
  showZone2?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="truncate font-display text-sm text-hud-text">
          {prettyType(activity.type)}
        </div>
        <div className="font-display text-[10px] uppercase tracking-[0.18em] text-hud-text-dim">
          {shortDate(activity.date)} · {activity.durationMin} min
          {showZone2 && activity.zone2Min ? ` · Z2 ${activity.zone2Min}m` : ""}
        </div>
      </div>
      <div className="flex shrink-0 items-baseline gap-1">
        {activity.avgHR !== undefined ? (
          <>
            <span className="font-display text-lg font-bold leading-none text-hud-cyan hud-text-glow">
              {activity.avgHR}
            </span>
            <span className="font-display text-[10px] uppercase tracking-wider text-hud-cyan-dim">
              bpm
            </span>
          </>
        ) : (
          <span className="font-display text-xs text-hud-text-dim">--</span>
        )}
      </div>
    </li>
  );
}
