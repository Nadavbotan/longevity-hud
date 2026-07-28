"use client";

import React from "react";
import { motion } from "framer-motion";

interface HudCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: string;
  href: string;
  external?: boolean;
}

/**
 * Interactive launcher card for a section. Renders an anchor with a framed HUD
 * look; on hover it scales up, brightens its border and emits a cyan glow.
 */
export default function HudCard({
  title,
  subtitle,
  icon,
  accent = "#2fd4ff",
  href,
  external = false,
}: HudCardProps) {
  const externalProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <motion.a
      href={href}
      {...externalProps}
      initial="rest"
      whileHover="hover"
      whileFocus="hover"
      animate="rest"
      variants={{
        rest: { scale: 1, boxShadow: "0 0 0px rgba(47,212,255,0)" },
        hover: { scale: 1.03, boxShadow: "0 0 24px rgba(47,212,255,0.35)" },
      }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="group block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-hud-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-hud-bg"
    >
      <motion.div
        variants={{
          rest: { borderColor: "rgba(64,196,255,0.18)" },
          hover: { borderColor: "rgba(47,212,255,0.7)" },
        }}
        className="hud-clip relative h-full border bg-hud-panel p-4 backdrop-blur-md sm:p-5"
      >
        <div className="flex items-start gap-3">
          {icon ? (
            <span
              className="shrink-0 transition-transform group-hover:scale-110"
              style={{ color: accent }}
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <div
              className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-hud-text group-hover:hud-text-glow"
              style={{ color: accent }}
            >
              {title}
            </div>
            {subtitle ? (
              <div className="mt-1 truncate text-xs text-hud-text-dim">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    </motion.a>
  );
}
