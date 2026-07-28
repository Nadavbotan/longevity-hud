"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, HeartPulse, Activity, Target, Utensils } from "lucide-react";

const TABS = [
  { href: "/", label: "HUD", Icon: Radar },
  { href: "/vitals", label: "Vitals", Icon: HeartPulse },
  { href: "/train", label: "Train", Icon: Activity },
  { href: "/goals", label: "Goals", Icon: Target },
  { href: "/diet", label: "Diet", Icon: Utensils },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hud-line bg-hud-bg/85 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-[0.15em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-hud-cyan ${
                  active ? "text-hud-cyan hud-text-glow" : "text-hud-text-dim hover:text-hud-cyan-dim"
                }`}
              >
                <Icon size={20} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
