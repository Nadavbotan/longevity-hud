import {
  Wallet,
  HeartPulse,
  Library,
  Lightbulb,
  Plane,
  Baby,
  Clock,
  BookOpen,
  Activity,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  wallet: Wallet,
  "heart-pulse": HeartPulse,
  library: Library,
  lightbulb: Lightbulb,
  plane: Plane,
  baby: Baby,
  clock: Clock,
  "book-open": BookOpen,
  activity: Activity,
};

export default function Icon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Cmp = MAP[name] ?? Activity;
  return <Cmp size={size} className={className} aria-hidden />;
}
