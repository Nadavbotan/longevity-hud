"use client";

import { motion, useReducedMotion } from "framer-motion";

interface ArcReactorProps {
  size?: number;
  className?: string;
}

const CYAN = "#2fd4ff";
const BLUE = "#1e7fff";
const CYAN_DIM = "#6fb8d8";

/**
 * Animated Iron Man arc reactor: concentric SVG rings with a pulsing core.
 * Only transform/opacity animate, so it stays GPU-light. Rotation is disabled
 * when the user prefers reduced motion.
 */
export default function ArcReactor({ size = 220, className }: ArcReactorProps) {
  const reduceMotion = useReducedMotion();

  // viewBox is fixed at 100x100; the SVG scales to `size`.
  const spin = (duration: number, reverse = false) =>
    reduceMotion
      ? undefined
      : {
          rotate: reverse ? [360, 0] : [0, 360],
          transition: { duration, ease: "linear" as const, repeat: Infinity },
        };

  return (
    <div
      className={className}
      style={{ width: size, height: size, maxWidth: "100%" }}
      role="img"
      aria-label="Arc reactor"
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        style={{ display: "block", filter: "drop-shadow(0 0 14px rgba(47,212,255,0.35))" }}
      >
        <defs>
          <radialGradient id="arc-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#eafaff" />
            <stop offset="45%" stopColor={CYAN} />
            <stop offset="100%" stopColor={BLUE} stopOpacity="0.15" />
          </radialGradient>
        </defs>

        {/* faint outer halo */}
        <circle cx="50" cy="50" r="48" fill="none" stroke={BLUE} strokeOpacity="0.12" strokeWidth="0.6" />

        {/* outer dashed ring, slow clockwise */}
        <motion.g style={{ originX: "50px", originY: "50px" }} animate={spin(22)}>
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke={CYAN}
            strokeOpacity="0.5"
            strokeWidth="1.2"
            strokeDasharray="2 4"
            strokeLinecap="round"
          />
        </motion.g>

        {/* segmented ring, counter-rotating */}
        <motion.g style={{ originX: "50px", originY: "50px" }} animate={spin(16, true)}>
          <circle
            cx="50"
            cy="50"
            r="37"
            fill="none"
            stroke={CYAN_DIM}
            strokeOpacity="0.7"
            strokeWidth="2"
            strokeDasharray="14 6"
          />
        </motion.g>

        {/* tick ring, faster clockwise */}
        <motion.g style={{ originX: "50px", originY: "50px" }} animate={spin(9)}>
          <circle
            cx="50"
            cy="50"
            r="30"
            fill="none"
            stroke={CYAN}
            strokeOpacity="0.35"
            strokeWidth="4"
            strokeDasharray="0.5 5"
            strokeLinecap="round"
          />
        </motion.g>

        {/* static inner ring */}
        <circle cx="50" cy="50" r="23" fill="none" stroke={CYAN} strokeOpacity="0.6" strokeWidth="1" />

        {/* glowing core, pulsing opacity + scale */}
        <motion.circle
          cx="50"
          cy="50"
          r="15"
          fill="url(#arc-core)"
          style={{ originX: "50px", originY: "50px" }}
          animate={
            reduceMotion
              ? undefined
              : {
                  opacity: [0.75, 1, 0.75],
                  scale: [0.94, 1.04, 0.94],
                }
          }
          transition={
            reduceMotion
              ? undefined
              : { duration: 3, ease: "easeInOut", repeat: Infinity }
          }
        />
        <circle cx="50" cy="50" r="6" fill="#eafaff" fillOpacity="0.9" />
      </svg>
    </div>
  );
}
