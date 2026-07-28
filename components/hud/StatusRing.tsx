"use client";

import { motion, useReducedMotion } from "framer-motion";

type Band = "good" | "watch" | "risk";

const BAND_COLOR: Record<Band, string> = {
  good: "#46e8a8",
  watch: "#ff9d3c",
  risk: "#ff4d5e",
};

interface StatusRingProps {
  /** 0-100 progress. */
  score: number;
  band: Band;
  label: string;
  /** Big centered readout; defaults to the score. */
  value?: string | number;
  size?: number;
}

/**
 * Arc-reactor style progress ring: a track plus a stroke-dashoffset arc whose
 * length encodes `score` and whose color encodes `band`. The arc animates in
 * once (disabled under reduced motion).
 */
export default function StatusRing({
  score,
  band,
  label,
  value,
  size = 132,
}: StatusRingProps) {
  const reduceMotion = useReducedMotion();
  const color = BAND_COLOR[band];
  const r = 42;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * circ;

  return (
    <div className="flex flex-col items-center text-center" style={{ width: size, maxWidth: "100%" }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block" }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeOpacity="0.15" strokeWidth="6" />
          <motion.circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            transform="rotate(-90 50 50)"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            initial={reduceMotion ? undefined : { strokeDasharray: `0 ${circ}` }}
            animate={reduceMotion ? undefined : { strokeDasharray: `${dash} ${circ - dash}` }}
            transition={reduceMotion ? undefined : { duration: 1.1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold leading-none hud-text-glow" style={{ color }}>
            {value ?? clamped}
          </span>
        </div>
      </div>
      <span className="mt-2 font-display text-[10px] uppercase tracking-[0.2em] text-hud-cyan-dim">
        {label}
      </span>
    </div>
  );
}
