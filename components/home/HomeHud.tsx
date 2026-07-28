"use client";

import { motion, useReducedMotion } from "framer-motion";
import ArcReactor from "@/components/hud/ArcReactor";
import StatusRing from "@/components/hud/StatusRing";
import HudPanel from "@/components/hud/HudPanel";
import type { GarminDaily, LongevityStatus } from "@/lib/types";

interface Props {
  status: LongevityStatus;
  recovery: GarminDaily | null;
}

const BAND_LABEL: Record<string, string> = {
  good: "On Track",
  watch: "Watch",
  risk: "At Risk",
};

const fade = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.45, ease: "easeOut" as const },
  }),
};

export default function HomeHud({ status, recovery }: Props) {
  const reduceMotion = useReducedMotion();

  const motionProps = (i: number) =>
    reduceMotion
      ? {}
      : { custom: i, variants: fade, initial: "hidden" as const, animate: "show" as const };

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-10">
      <motion.header className="flex items-center justify-between" {...motionProps(0)}>
        <span className="font-display text-sm uppercase tracking-[0.4em] text-hud-cyan hud-text-glow">
          Longevity
        </span>
        <span className="font-display text-xs uppercase tracking-[0.2em] text-hud-text-dim">
          {BAND_LABEL[status.band]}
        </span>
      </motion.header>

      {/* composite headline: status ring framed by an ambient arc reactor */}
      <motion.section
        className="flex flex-col items-center py-2"
        {...motionProps(1)}
      >
        <div className="relative flex items-center justify-center">
          <ArcReactor
            size={296}
            className="pointer-events-none absolute inset-0 m-auto opacity-50"
          />
          <StatusRing
            score={status.score}
            band={status.band}
            label="Longevity Status"
            size={200}
          />
        </div>
      </motion.section>

      {/* the one nudge for today - the clear hero secondary */}
      <motion.section {...motionProps(2)}>
        <HudPanel label="Today's move">
          <p className="text-base leading-relaxed text-hud-text sm:text-lg">
            {status.nudge}
          </p>
        </HudPanel>
      </motion.section>

      {/* four horsemen */}
      <motion.section {...motionProps(3)}>
        <h2 className="mb-3 font-display text-[11px] uppercase tracking-[0.3em] text-hud-text-dim">
          The Four Horsemen
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {status.horsemen.map((h) => (
            <StatusRing
              key={h.key}
              score={h.score}
              band={h.band}
              label={h.label}
              size={120}
            />
          ))}
        </div>
      </motion.section>

      {/* today's recovery */}
      <motion.section {...motionProps(4)}>
        <h2 className="mb-3 font-display text-[11px] uppercase tracking-[0.3em] text-hud-text-dim">
          Recovery
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <RecoveryStat label="HRV" value={recovery?.hrv} unit="ms" />
          <RecoveryStat label="Sleep" value={recovery?.sleepScore} unit="/100" />
          <RecoveryStat label="Body Battery" value={recovery?.bodyBattery} unit="/100" />
        </div>
      </motion.section>
    </main>
  );
}

function RecoveryStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | undefined;
  unit: string;
}) {
  return (
    <HudPanel>
      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-hud-text-dim">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-2xl font-bold leading-none text-hud-cyan hud-text-glow">
          {value ?? "--"}
        </span>
        <span className="font-display text-[10px] uppercase tracking-wider text-hud-cyan-dim">
          {unit}
        </span>
      </div>
    </HudPanel>
  );
}
