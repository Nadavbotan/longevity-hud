#!/usr/bin/env python3
"""Print base64-encoded garmin_tokens.json for the GARMIN_TOKEN GitHub secret.

Run after garmin-login.py succeeds:
  python scripts/garmin-token-export.py | pbcopy
"""
from __future__ import annotations

import base64
import sys
from pathlib import Path


def main() -> int:
    token_file = Path.home() / ".garminconnect" / "garmin_tokens.json"
    if not token_file.is_file():
        print("No tokens found. Run:  python scripts/garmin-login.py", file=sys.stderr)
        return 1
    sys.stdout.write(base64.b64encode(token_file.read_bytes()).decode())
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
