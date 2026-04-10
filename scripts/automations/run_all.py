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

from dotenv import load_dotenv

# Load .env.local first, then fall back to automations/.env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env.local"))
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from email_service import GritlyEmailService
from sms_service import GritlySMSService
from review_request import run as run_reviews
from quote_followup import run as run_followups
from invoice_reminder import run as run_reminders
from booking_confirmation import run as run_confirmations
from maintenance_renewal import run as run_renewals
from daily_digest import run as run_digest


def _init_services() -> tuple[GritlyEmailService | None, GritlySMSService]:
    """
    Initialise email and SMS services once at startup and report their status.
    Each automation creates its own service instances (via from_env) so this
    is purely diagnostic output at the top of the run.
    """
    try:
        email_svc = GritlyEmailService.from_env()
        print(
            f"[EMAIL] SMTP configured -- "
            f"{email_svc.smtp_host}:{email_svc.smtp_port} "
            f"as {email_svc.from_email}"
        )
    except EnvironmentError as exc:
        print(f"[EMAIL] Not configured ({exc}) -- emails will be stubbed")
        email_svc = None

    sms_svc = GritlySMSService.from_env()
    if sms_svc.enabled:
        print(f"[SMS] Twilio configured -- from {sms_svc._from_number}")
    else:
        print("[SMS] Not configured -- SMS will be logged only")

    return email_svc, sms_svc


def main(org_id: str | None = None) -> None:
    started_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    separator = "=" * 48
    print(f"\n{separator}")
    print(f"  GRITLY AUTOMATIONS -- {started_at}")
    print(f"{separator}\n")

    _init_services()
    print()

    steps: list[tuple[str, object]] = [
        ("Review Requests", run_reviews),
        ("Quote Follow-ups", run_followups),
        ("Invoice Reminders", run_reminders),
        ("Booking Confirmations", run_confirmations),
        ("Maintenance Renewals", run_renewals),
        ("Daily Digest", run_digest),
    ]

    failures: list[str] = []
    for label, fn in steps:
        print(f"--- {label} ---")
        try:
            fn(org_id=org_id)
        except Exception as exc:
            print(f"[ERROR] {label} failed: {exc}", file=sys.stderr)
            failures.append(label)
        print()

    finished_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(separator)
    if failures:
        print(f"  Automations complete with {len(failures)} failure(s) -- {finished_at}")
        print(f"  Failed: {', '.join(failures)}")
    else:
        print(f"  All automations complete -- {finished_at}")
    print(f"{separator}\n")

    if failures:
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run all Gritly automations.")
    parser.add_argument("--org-id", help="Limit all automations to a single organisation ID")
    args = parser.parse_args()
    main(org_id=args.org_id)
