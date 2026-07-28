#!/usr/bin/env python3
"""Pull a day's Garmin daily summary + activities into data/garmin/.

Auth resumes from a persisted token store (env GARMINTOKENS dir, default
~/.garminconnect) and refreshes it, so no password ever touches the daily
flow and datacenter-IP login challenges are avoided (see PLAN.md section 6).

The raw-dict -> typed-shape mappings are pure functions (no network) so they
can be checked offline by scripts/sync_garmin_check.py.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DAILY_DIR = REPO_ROOT / "data" / "garmin" / "daily"
ACTIVITIES_DIR = REPO_ROOT / "data" / "garmin" / "activities"


def _num(value: Any) -> float | None:
    """Numeric value, or None for missing/Garmin negative sentinels (-1, -2)."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return value if value >= 0 else None
    return None


def map_daily(cdate: str, stats: dict | None, hrv: dict | None, sleep: dict | None) -> dict:
    """Map raw Garmin daily-summary/HRV/sleep dicts to a GarminDaily object.

    Any field Garmin does not provide is omitted rather than written as null,
    matching the optional fields of the GarminDaily type.
    """
    stats = stats or {}
    hrv = hrv or {}
    sleep = sleep or {}
    out: dict[str, Any] = {"date": cdate}

    rhr = _num(stats.get("restingHeartRate"))
    if rhr is not None:
        out["restingHR"] = int(rhr)

    hrv_avg = _num((hrv.get("hrvSummary") or {}).get("lastNightAvg"))
    if hrv_avg is not None:
        out["hrv"] = int(hrv_avg)

    sleep_dto = sleep.get("dailySleepDTO") or {}
    score = _num(((sleep_dto.get("sleepScores") or {}).get("overall") or {}).get("value"))
    if score is not None:
        out["sleepScore"] = int(score)

    sleep_secs = _num(sleep_dto.get("sleepTimeSeconds"))
    if sleep_secs:
        out["sleepHours"] = round(sleep_secs / 3600, 1)

    stress = _num(stats.get("averageStressLevel"))
    if stress is not None:
        out["stress"] = int(stress)

    body_battery = _num(stats.get("bodyBatteryMostRecentValue"))
    if body_battery is not None:
        out["bodyBattery"] = int(body_battery)

    steps = _num(stats.get("totalSteps"))
    if steps is not None:
        out["steps"] = int(steps)

    return out


def map_activity(cdate: str, activity: dict | None) -> dict:
    """Map one raw Garmin activity dict to an Activity object.

    zone2Min comes from time logged in HR zone 2 when the activity exposes it,
    otherwise 0. Optional fields absent from the source are omitted.
    """
    activity = activity or {}
    out: dict[str, Any] = {
        "date": cdate,
        "type": (activity.get("activityType") or {}).get("typeKey") or "unknown",
        "durationMin": round((_num(activity.get("duration")) or 0) / 60),
    }

    zone2_secs = _num(activity.get("hrTimeInZone_2"))
    out["zone2Min"] = round(zone2_secs / 60) if zone2_secs else 0

    avg_hr = _num(activity.get("averageHR"))
    if avg_hr is not None:
        out["avgHR"] = round(avg_hr)

    vo2 = _num(activity.get("vO2MaxValue"))
    if vo2 is not None:
        out["vo2max"] = round(vo2)

    return out


def _client(tokenstore: str):
    """Resume + refresh a Garmin session from the token store (no password)."""
    from garminconnect import Garmin

    store = Path(tokenstore).expanduser()
    if not (store / "garmin_tokens.json").is_file():
        print(
            "No Garmin login saved yet.\n"
            "Run this first:  python scripts/garmin-login.py",
            file=sys.stderr,
        )
        raise SystemExit(1)

    api = Garmin()
    api.login(str(store))
    return api


def _fetch_day(api, cdate: str):
    def safe(fn, *args):
        try:
            return fn(*args)
        except Exception as exc:  # noqa: BLE001 - one bad endpoint must not abort the day
            print(f"warn: {getattr(fn, '__name__', 'call')} failed: {exc}", file=sys.stderr)
            return None

    stats = safe(api.get_stats, cdate)
    hrv = safe(api.get_hrv_data, cdate)
    sleep = safe(api.get_sleep_data, cdate)
    activities = safe(api.get_activities_by_date, cdate, cdate) or []
    return stats, hrv, sleep, activities


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync one day of Garmin data.")
    parser.add_argument("--date", help="YYYY-MM-DD (default: yesterday)")
    args = parser.parse_args()

    cdate = args.date or (date.today() - timedelta(days=1)).isoformat()
    tokenstore = os.environ.get("GARMINTOKENS", os.path.expanduser("~/.garminconnect"))

    print(f"Syncing Garmin data for {cdate} (token store: {tokenstore})")
    api = _client(tokenstore)
    stats, hrv, sleep, activities = _fetch_day(api, cdate)

    daily = map_daily(cdate, stats, hrv, sleep)
    mapped_activities = [map_activity(cdate, a) for a in activities]

    if len(daily) <= 1 and not mapped_activities:
        print(f"Garmin returned no data for {cdate}; leaving existing files untouched.")
        return 0

    _write_json(DAILY_DIR / f"{cdate}.json", daily)
    _write_json(ACTIVITIES_DIR / f"{cdate}.json", mapped_activities)

    print(
        f"Wrote daily ({len(daily) - 1} metrics) and "
        f"{len(mapped_activities)} activit{'y' if len(mapped_activities) == 1 else 'ies'} for {cdate}."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
