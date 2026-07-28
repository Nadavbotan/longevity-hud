"use client";

import { motion, useReducedMotion } from "framer-motion";

interface HudGaugeProps {
  value: string | number;
  label: string;
  sub?: string;
  accent?: string;
  size?: number;
}

/**
 * Circular HUD dial: a ringed circle with a big centered value and labels.
 * A dashed ring slowly sweeps around (disabled under reduced-motion).
 */
export default function HudGauge({
  value,
  label,
  sub,
  accent = "#2fd4ff",
  size = 140,
}: HudGaugeProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="flex flex-col items-center text-center"
      style={{ width: size, maxWidth: "100%" }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block" }}>
          {/* track */}
          <circle cx="50" cy="50" r="45" fill="none" stroke={accent} strokeOpacity="0.15" strokeWidth="2" />

          {/* sweeping dashed ring */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={accent}
            strokeOpacity="0.85"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="60 230"
            style={{ originX: "50px", originY: "50px" }}
            animate={reduceMotion ? undefined : { rotate: [0, 360] }}
            transition={
              reduceMotion ? undefined : { duration: 8, ease: "linear", repeat: Infinity }
            }
          />

          {/* inner tick ring */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke={accent}
            strokeOpacity="0.3"
            strokeWidth="3"
            strokeDasharray="0.5 4"
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display text-2xl font-bold leading-none hud-text-glow"
            style={{ color: accent }}
          >
            {value}
          </span>
          {sub ? (
            <span className="mt-1 font-display text-[9px] uppercase tracking-[0.18em] text-hud-text-dim">
              {sub}
            </span>
          ) : null}
        </div>
      </div>

      <span className="mt-2 font-display text-[10px] uppercase tracking-[0.22em] text-hud-cyan-dim">
        {label}
      </span>
    </div>
  );
}
