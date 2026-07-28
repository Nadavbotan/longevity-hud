#!/usr/bin/env python3
"""Offline self-check for the pure Garmin mapping functions.

No network, no garminconnect install required: it loads only the pure mappers
from sync-garmin.py and asserts they produce the GarminDaily / Activity shapes,
including a sparse case where most fields are missing.

Run: python3 scripts/sync_garmin_check.py
"""
import importlib.util
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "sync_garmin", Path(__file__).resolve().parent / "sync-garmin.py"
)
sync_garmin = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sync_garmin)

map_daily = sync_garmin.map_daily
map_activity = sync_garmin.map_activity


def check_daily_full():
    stats = {
        "restingHeartRate": 52,
        "averageStressLevel": 28,
        "bodyBatteryMostRecentValue": 71,
        "totalSteps": 8421,
    }
    hrv = {"hrvSummary": {"lastNightAvg": 46, "weeklyAvg": 49}}
    sleep = {
        "dailySleepDTO": {
            "sleepTimeSeconds": 27000,  # 7.5h
            "sleepScores": {"overall": {"value": 82}},
        }
    }
    out = map_daily("2026-06-24", stats, hrv, sleep)
    assert out == {
        "date": "2026-06-24",
        "restingHR": 52,
        "hrv": 46,
        "sleepScore": 82,
        "sleepHours": 7.5,
        "stress": 28,
        "bodyBattery": 71,
        "steps": 8421,
    }, out


def check_daily_sparse():
    # Garmin commonly returns -1/-2 sentinels and missing sub-objects on
    # off-days; those must be omitted, never written as null.
    stats = {"restingHeartRate": 55, "averageStressLevel": -1, "totalSteps": 0}
    out = map_daily("2026-06-25", stats, None, None)
    assert out == {"date": "2026-06-25", "restingHR": 55, "steps": 0}, out
    assert "stress" not in out and "hrv" not in out and "sleepScore" not in out, out


def check_activity_full():
    activity = {
        "activityType": {"typeKey": "running"},
        "duration": 3000.0,  # 50 min
        "hrTimeInZone_2": 1500.0,  # 25 min in zone 2
        "averageHR": 138.6,
        "vO2MaxValue": 51.2,
    }
    out = map_activity("2026-06-24", activity)
    assert out == {
        "date": "2026-06-24",
        "type": "running",
        "durationMin": 50,
        "zone2Min": 25,
        "avgHR": 139,
        "vo2max": 51,
    }, out


def check_activity_sparse():
    # Strength session: no zone data, no VO2, no avg HR.
    activity = {"activityType": {"typeKey": "strength_training"}, "duration": 1800}
    out = map_activity("2026-06-24", activity)
    assert out == {
        "date": "2026-06-24",
        "type": "strength_training",
        "durationMin": 30,
        "zone2Min": 0,
    }, out
    assert "avgHR" not in out and "vo2max" not in out, out


def main():
    checks = [
        check_daily_full,
        check_daily_sparse,
        check_activity_full,
        check_activity_sparse,
    ]
    for check in checks:
        check()
        print(f"ok: {check.__name__}")
    print(f"\nAll {len(checks)} mapping checks passed.")


if __name__ == "__main__":
    main()
