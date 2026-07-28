#!/usr/bin/env python3
"""Import a Garmin Connect data export into data/garmin/.

Reads the DI_CONNECT export layout under Raw-data/Garmin past data/ by default.
Merges into existing daily/activity JSON without overwriting fields the live
sync already wrote.

Run: python3 scripts/import-garmin-export.py [--export-dir PATH]
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_EXPORT = REPO_ROOT / "Raw-data" / "Garmin past data" / "DI_CONNECT"
DAILY_DIR = REPO_ROOT / "data" / "garmin" / "daily"
ACTIVITIES_DIR = REPO_ROOT / "data" / "garmin" / "activities"

_spec = importlib.util.spec_from_file_location(
    "sync_garmin", Path(__file__).resolve().parent / "sync-garmin.py"
)
sync_garmin = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sync_garmin)
map_daily = sync_garmin.map_daily
map_activity = sync_garmin.map_activity


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2) + "\n", encoding="utf-8")


def _read_json(path: Path, fallback: Any) -> Any:
    if not path.is_file():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return fallback


def _merge_daily(existing: dict, incoming: dict) -> dict:
    out = dict(existing)
    for key, value in incoming.items():
        if key == "date":
            out["date"] = value
        elif key not in out:
            out[key] = value
    return out


def _activity_key(activity: dict) -> tuple:
    return (
        activity.get("date"),
        activity.get("type"),
        activity.get("durationMin"),
        activity.get("avgHR"),
    )


def _merge_activities(existing: list, incoming: list) -> list:
    seen = {_activity_key(a) for a in existing}
    out = list(existing)
    for activity in incoming:
        key = _activity_key(activity)
        if key not in seen:
            out.append(activity)
            seen.add(key)
    return out


def _ts_to_date(ts: float | int | None) -> str | None:
    if ts is None:
        return None
    return datetime.fromtimestamp(float(ts) / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


def _load_hrv_by_date(export_dir: Path) -> dict[str, float]:
    wellness = export_dir / "DI-Connect-Wellness"
    out: dict[str, float] = {}
    for path in wellness.glob("*healthStatusData.json"):
        rows = json.loads(path.read_text(encoding="utf-8"))
        for row in rows:
            cdate = row.get("calendarDate")
            if not cdate:
                continue
            for metric in row.get("metrics") or []:
                if metric.get("type") == "HRV" and metric.get("value") is not None:
                    out[cdate] = float(metric["value"])
    return out


def _load_uds_rows(export_dir: Path) -> list[dict]:
    agg = export_dir / "DI-Connect-Aggregator"
    rows: list[dict] = []
    for path in agg.glob("UDSFile_*.json"):
        rows.extend(json.loads(path.read_text(encoding="utf-8")))
    return rows


def _load_export_activities(export_dir: Path) -> list[dict]:
    fitness = export_dir / "DI-Connect-Fitness"
    activities: list[dict] = []
    for path in fitness.glob("*summarizedActivities.json"):
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not payload:
            continue
        block = payload[0].get("summarizedActivitiesExport") if isinstance(payload, list) else None
        if not block:
            continue
        activities.extend(block)
    return activities


def import_daily(export_dir: Path) -> int:
    hrv_by_date = _load_hrv_by_date(export_dir)
    written = 0
    for row in _load_uds_rows(export_dir):
        cdate = row.get("calendarDate")
        if not cdate:
            continue
        stats = {
            "restingHeartRate": row.get("restingHeartRate"),
            "averageStressLevel": row.get("averageStressLevel"),
            "bodyBatteryMostRecentValue": row.get("bodyBatteryMostRecentValue"),
            "totalSteps": row.get("totalSteps"),
        }
        hrv = {"hrvSummary": {"lastNightAvg": hrv_by_date.get(cdate)}} if cdate in hrv_by_date else None
        incoming = map_daily(cdate, stats, hrv, None)
        if len(incoming) <= 1:
            continue
        path = DAILY_DIR / f"{cdate}.json"
        merged = _merge_daily(_read_json(path, {"date": cdate}), incoming)
        _write_json(path, merged)
        written += 1
    return written


def import_activities(export_dir: Path) -> int:
    by_date: dict[str, list[dict]] = {}
    for raw in _load_export_activities(export_dir):
        cdate = _ts_to_date(raw.get("startTimeLocal") or raw.get("beginTimestamp"))
        if not cdate:
            continue
        adapted = {
            "activityType": {"typeKey": raw.get("activityType") or "unknown"},
            "duration": raw.get("duration"),
            "hrTimeInZone_2": raw.get("hrTimeInZone_2"),
            "averageHR": raw.get("avgHr"),
            "vO2MaxValue": raw.get("vO2MaxValue"),
        }
        by_date.setdefault(cdate, []).append(map_activity(cdate, adapted))

    written = 0
    for cdate, incoming in sorted(by_date.items()):
        path = ACTIVITIES_DIR / f"{cdate}.json"
        merged = _merge_activities(_read_json(path, []), incoming)
        if not merged:
            continue
        _write_json(path, merged)
        written += 1
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="Import Garmin Connect export JSON.")
    parser.add_argument(
        "--export-dir",
        type=Path,
        default=DEFAULT_EXPORT,
        help=f"DI_CONNECT folder (default: {DEFAULT_EXPORT})",
    )
    args = parser.parse_args()
    export_dir = args.export_dir.expanduser().resolve()
    if not export_dir.is_dir():
        print(f"Export dir not found: {export_dir}", file=sys.stderr)
        return 1

    daily_count = import_daily(export_dir)
    activity_count = import_activities(export_dir)
    print(f"Imported/merged {daily_count} daily files and {activity_count} activity-day files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
