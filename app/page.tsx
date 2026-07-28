import HomeHud from "@/components/home/HomeHud";
import { computeStatus } from "@/lib/scoring";
import {
  getLatestBiomarkers,
  getReferenceRanges,
  getLatestRecovery,
  getActivities,
} from "@/lib/data";

export default function Home() {
  const recovery = getLatestRecovery();
  const status = computeStatus(
    getLatestBiomarkers(),
    getReferenceRanges(),
    recovery,
    getActivities(),
  );

  return <HomeHud status={status} recovery={recovery} />;
}
