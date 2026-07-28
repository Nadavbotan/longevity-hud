#!/usr/bin/env python3
"""One-time Garmin Connect login.

Saves tokens to ~/.garminconnect/garmin_tokens.json (or GARMINTOKENS dir).
After this succeeds, daily sync uses the saved tokens only — no password.

Run:  python scripts/garmin-login.py
"""
from __future__ import annotations

import os
import sys
from getpass import getpass
from pathlib import Path


def _prompt_mfa() -> str:
    print()
    print("Garmin wants a verification code.")
    print("  - If the page title says 'GARMIN Authentication Application' -> check your EMAIL.")
    print("  - If you use an authenticator app -> enter the 6-digit code from the app.")
    print("  - Do NOT press Enter without typing a code.")
    return input("Verification code: ").strip()


def main() -> int:
    tokenstore = os.path.expanduser(os.environ.get("GARMINTOKENS", "~/.garminconnect"))

    print("Garmin one-time login")
    print("---------------------")
    print("Use the same email/password as the Garmin Connect phone app.")
    print("If login fails with 429, wait 30-60 minutes before retrying.")
    print("If you see SSL/certificate errors, disconnect VPN and try again.")
    print()

    email = (os.environ.get("EMAIL") or input("Email: ")).strip()
    password = os.environ.get("PASSWORD") or getpass("Password: ")

    from garminconnect import (
        Garmin,
        GarminConnectAuthenticationError,
        GarminConnectConnectionError,
        GarminConnectTooManyRequestsError,
    )

    client = Garmin(email=email, password=password, prompt_mfa=_prompt_mfa)

    try:
        client.login(tokenstore)
    except GarminConnectTooManyRequestsError as exc:
        print(
            f"\nGarmin rate-limited this IP (too many login attempts).\n"
            f"Wait 30-60 minutes, then run this script again.\n\n{exc}",
            file=sys.stderr,
        )
        return 1
    except GarminConnectAuthenticationError as exc:
        print(f"\nLogin failed: {exc}", file=sys.stderr)
        print("Double-check email/password and enter the MFA code when asked.", file=sys.stderr)
        return 1
    except GarminConnectConnectionError as exc:
        print(f"\nConnection error: {exc}", file=sys.stderr)
        print("Try disconnecting VPN or switching to a home network.", file=sys.stderr)
        return 1

    token_file = Path(tokenstore) / "garmin_tokens.json"
    print(f"\nSuccess. Tokens saved to {token_file}")
    print("Next:  python scripts/sync-garmin.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
