import React from "react";
import HudPanel from "./HudPanel";

interface HudWidgetProps {
  label: string;
  value: string | number;
  unit?: string;
  footer?: string;
  accent?: string;
  icon?: React.ReactNode;
}

/**
 * Compact status readout: small label, a large value with optional unit, and
 * an optional footer line. Wraps HudPanel for the holographic frame.
 */
export default function HudWidget({
  label,
  value,
  unit,
  footer,
  accent = "#2fd4ff",
  icon,
}: HudWidgetProps) {
  return (
    <HudPanel>
      <div className="flex items-start justify-between gap-3">
        <span className="font-display text-[10px] uppercase tracking-[0.22em] text-hud-text-dim">
          {label}
        </span>
        {icon ? <span style={{ color: accent }}>{icon}</span> : null}
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className="font-display text-3xl font-bold leading-none hud-text-glow"
          style={{ color: accent }}
        >
          {value}
        </span>
        {unit ? (
          <span className="font-display text-xs uppercase tracking-wider text-hud-cyan-dim">
            {unit}
          </span>
        ) : null}
      </div>

      {footer ? (
        <div className="mt-2 text-xs text-hud-text-dim">{footer}</div>
      ) : null}
    </HudPanel>
  );
}
