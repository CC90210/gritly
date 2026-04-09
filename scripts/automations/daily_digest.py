#!/usr/bin/env python3
"""
daily_digest.py
Generate a daily business summary for the organisation owner.

Collects for today (UTC):
  - New service requests received
  - Jobs scheduled for today
  - Invoices due today
  - Overdue invoices (past due, unpaid)
  - Revenue collected today (payments.created_at = today)

Prints a formatted report to stdout.

In production, the report would be emailed to the business owner via
SendGrid (add SENDGRID_API_KEY to .env.local and DIGEST_EMAIL_TO).

Future integration:
  from sendgrid import SendGridAPIClient
  from sendgrid.helpers.mail import Mail
  sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
  sg.send(Mail(from_email="noreply@gritly.app", to_emails=recipient, ...))
"""

import sys
import os
import argparse
from datetime import datetime, timedelta, timezone

import libsql_experimental as libsql
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env.local"))


def get_db() -> libsql.Connection:
    url = os.getenv("TURSO_DATABASE_URL")
    token = os.getenv("TURSO_AUTH_TOKEN")
    if not url or not token:
        raise EnvironmentError(
            "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in .env.local"
        )
    return libsql.connect(url, auth_token=token)


def _today_bounds_utc() -> tuple[int, int]:
    """Return Unix timestamps for the start and end of today in UTC."""
    now = datetime.now(timezone.utc)
    start = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    return int(start.timestamp()), int(end.timestamp())


def _today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def run(org_id: str | None = None) -> None:
    db = get_db()

    today_str = _today_str()
    day_start_ts, day_end_ts = _today_bounds_utc()
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    if org_id:
        orgs = db.execute("SELECT id, name FROM organizations WHERE id = ?", [org_id]).rows
    else:
        orgs = db.execute("SELECT id, name FROM organizations").rows

    for org in orgs:
        current_org_id: str = org[0]
        org_name: str = org[1]

        try:
            # 1. New service requests today
            new_requests_row = db.execute(
                """
                SELECT COUNT(*) FROM service_requests
                WHERE org_id = ? AND created_at >= ? AND created_at < ?
                """,
                [current_org_id, day_start_ts, day_end_ts],
            ).rows
            new_requests: int = new_requests_row[0][0] if new_requests_row else 0

            # 2. Jobs scheduled for today
            # scheduled_start is a Unix timestamp; jobs whose start falls within today
            scheduled_today_row = db.execute(
                """
                SELECT COUNT(*) FROM jobs
                WHERE org_id = ?
                  AND status = 'scheduled'
                  AND scheduled_start >= ?
                  AND scheduled_start < ?
                """,
                [current_org_id, day_start_ts, day_end_ts],
            ).rows
            scheduled_today: int = scheduled_today_row[0][0] if scheduled_today_row else 0

            # 3. Invoices due today (due_date is YYYY-MM-DD string)
            due_today_row = db.execute(
                """
                SELECT COUNT(*) FROM invoices
                WHERE org_id = ?
                  AND due_date = ?
                  AND status NOT IN ('paid', 'void')
                """,
                [current_org_id, today_str],
            ).rows
            due_today: int = due_today_row[0][0] if due_today_row else 0

            # 4. Overdue invoices (past due, not paid or voided)
            overdue_row = db.execute(
                """
                SELECT COUNT(*), COALESCE(SUM(total - amount_paid), 0)
                FROM invoices
                WHERE org_id = ?
                  AND due_date < ?
                  AND status NOT IN ('paid', 'void')
                """,
                [current_org_id, today_str],
            ).rows
            overdue_count: int = overdue_row[0][0] if overdue_row else 0
            overdue_amount: float = overdue_row[0][1] if overdue_row else 0.0

            # 5. Revenue collected today (payments created today)
            revenue_row = db.execute(
                """
                SELECT COALESCE(SUM(amount), 0)
                FROM payments
                WHERE org_id = ?
                  AND created_at >= ?
                  AND created_at < ?
                """,
                [current_org_id, day_start_ts, day_end_ts],
            ).rows
            revenue_today: float = revenue_row[0][0] if revenue_row else 0.0

            # Print formatted digest
            separator = "=" * 48
            print(separator)
            print(f"  GRITLY DAILY DIGEST — {org_name}")
            print(f"  {now_utc}")
            print(separator)
            print(f"  New Service Requests Today : {new_requests}")
            print(f"  Jobs Scheduled Today       : {scheduled_today}")
            print(f"  Invoices Due Today         : {due_today}")
            print(f"  Overdue Invoices           : {overdue_count} (${overdue_amount:,.2f} outstanding)")
            print(f"  Revenue Collected Today    : ${revenue_today:,.2f}")
            print(separator)
            print()

        except Exception as exc:
            print(f"[ERROR] Org {org_name} ({current_org_id}): {exc}", file=sys.stderr)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Print the daily business digest.")
    parser.add_argument("--org-id", help="Limit to a single organisation ID")
    args = parser.parse_args()
    run(org_id=args.org_id)
