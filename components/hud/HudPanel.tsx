import React from "react";

interface HudPanelProps {
  children: React.ReactNode;
  className?: string;
  label?: string;
}

/**
 * Holographic framed container: beveled clip-path frame, cyan hairline border,
 * translucent panel fill and backdrop blur. Optional corner brackets and a
 * small uppercase Orbitron caption.
 */
export default function HudPanel({ children, className, label }: HudPanelProps) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="hud-clip hud-border relative bg-hud-panel backdrop-blur-md">
        {/* corner ticks */}
        <span className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 border-l border-t border-hud-cyan/60" />
        <span className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 border-r border-t border-hud-cyan/60" />
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-3 w-3 border-b border-l border-hud-cyan/60" />
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-3 w-3 border-b border-r border-hud-cyan/60" />

        <div className="p-4 sm:p-5">
          {label ? (
            <div className="mb-3 font-display text-[10px] uppercase tracking-[0.22em] text-hud-cyan-dim">
              {label}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
