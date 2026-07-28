import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function PageShell({
  title,
  accent = "#2fd4ff",
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-sm font-display text-xs uppercase tracking-[0.2em] text-hud-text-dim outline-none transition-colors hover:text-hud-cyan focus-visible:ring-2 focus-visible:ring-hud-cyan"
        >
          <ChevronLeft size={16} aria-hidden /> Hub
        </Link>
        <h1
          className="font-display text-lg font-bold uppercase tracking-[0.18em] hud-text-glow"
          style={{ color: accent }}
        >
          {title}
        </h1>
      </header>
      {children}
    </main>
  );
}
