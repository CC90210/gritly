#!/usr/bin/env python3
"""
run_all.py
Run all Gritly automations in sequence.
Designed to be called by cron or an n8n workflow.

Usage:
  python scripts/automations/run_all.py
  python scripts/automations/run_all.py --org-id <id>
"""

import sys
import os
import argparse
from datetime import datetime, timezone

# Ensure sibling scripts are importable when called from the repo root
sys.path.insert(0, os.path.dirname(__file__))

from review_request import run as run_reviews
from quote_followup import run as run_followups
from invoice_reminder import run as run_reminders
from booking_confirmation import run as run_confirmations
from maintenance_renewal import run as run_renewals
from daily_digest import run as run_digest


def main(org_id: str | None = None) -> None:
    started_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"\n{'=' * 48}")
    print(f"  GRITLY AUTOMATIONS — {started_at}")
    print(f"{'=' * 48}\n")

    steps: list[tuple[str, object]] = [
        ("Review Requests", run_reviews),
        ("Quote Follow-ups", run_followups),
        ("Invoice Reminders", run_reminders),
        ("Booking Confirmations", run_confirmations),
        ("Maintenance Renewals", run_renewals),
        ("Daily Digest", run_digest),
    ]

    for label, fn in steps:
        print(f"--- {label} ---")
        try:
            fn(org_id=org_id)
        except Exception as exc:
            print(f"[ERROR] {label} failed: {exc}", file=sys.stderr)
        print()

    finished_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"{'=' * 48}")
    print(f"  All automations complete — {finished_at}")
    print(f"{'=' * 48}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run all Gritly automations.")
    parser.add_argument("--org-id", help="Limit all automations to a single organisation ID")
    args = parser.parse_args()
    main(org_id=args.org_id)
