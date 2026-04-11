#!/usr/bin/env python3
"""
daily_digest.py
Generate a daily business summary and email it to the organisation owner.

Collects for today (UTC):
  - New service requests received
  - Jobs scheduled for today
  - Invoices due today
  - Overdue invoices (past due, unpaid)
  - Revenue collected today (payments.created_at = today)

Prints a formatted report to stdout and emails the owner when SMTP is configured.
The digest recipient is DIGEST_EMAIL_TO (falls back to FROM_EMAIL).
"""

import sys
import os
import argparse
from datetime import datetime, timedelta, timezone

import libsql_experimental as libsql
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env.local"))

from email_service import GritlyEmailService
from templates import daily_digest_template


def get_db() -> libsql.Connection:
    url = os.getenv("TURSO_DATABASE_URL")
    token = os.getenv("TURSO_AUTH_TOKEN")
    if not url or not token:
        raise EnvironmentError(
            "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in .env.local"
        )
    conn = libsql.connect(url, auth_token=token)
    conn.sync()
    return conn


def _build_email_service() -> GritlyEmailService | None:
    try:
        return GritlyEmailService.from_env()
    except EnvironmentError as exc:
        print(f"[EMAIL] Not configured — digest will print only: {exc}")
        return None


def _today_bounds_utc() -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    start = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    return int(start.timestamp()), int(end.timestamp())


def _today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def run(org_id: str | None = None) -> None:
    db = get_db()
    email_svc = _build_email_service()

    today_str = _today_str()
    day_start_ts, day_end_ts = _today_bounds_utc()
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # Digest goes to the owner's email — separate from CC_EMAIL
    digest_recipient = (
        os.getenv("DIGEST_EMAIL_TO")
        or os.getenv("FROM_EMAIL")
    )

    if org_id:
        orgs = db.execute("SELECT id, name FROM organizations WHERE id = ?", [org_id]).rows
    else:
        orgs = db.execute("SELECT id, name FROM organizations LIMIT 500").rows

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

            # 3. Invoices due today
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

            # 4. Overdue invoices
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

            # 5. Revenue collected today
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

            # Print to stdout regardless of email config
            separator = "=" * 48
            print(separator)
            print(f"  GRITLY DAILY DIGEST — {org_name}")
            print(f"  {now_utc}")
            print(separator)
            print(f"  New Service Requests Today : {new_requests}")
            print(f"  Jobs Scheduled Today       : {scheduled_today}")
            print(f"  Invoices Due Today         : {due_today}")
            print(
                f"  Overdue Invoices           : "
                f"{overdue_count} (${overdue_amount:,.2f} outstanding)"
            )
            print(f"  Revenue Collected Today    : ${revenue_today:,.2f}")
            print(separator)
            print()

            # Send email digest to owner
            if email_svc and digest_recipient:
                date_display = datetime.now(timezone.utc).strftime("%B %d, %Y")
                html = daily_digest_template(
                    business_name=org_name,
                    date_str=date_display,
                    new_requests=new_requests,
                    scheduled_today=scheduled_today,
                    due_today=due_today,
                    overdue_count=overdue_count,
                    overdue_amount=overdue_amount,
                    revenue_today=revenue_today,
                )
                ok, detail = email_svc.send(
                    to_email=digest_recipient,
                    subject=f"Daily Digest — {org_name} — {date_display}",
                    html_body=html,
                )
                if ok:
                    print(f"[{org_name}] Daily digest emailed to {digest_recipient}")
                else:
                    print(
                        f"[EMAIL ERROR] Daily digest for {org_name}: {detail}",
                        file=sys.stderr,
                    )

        except Exception as exc:
            print(f"[ERROR] Org {org_name} ({current_org_id}): {exc}", file=sys.stderr)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Print and email the daily business digest.")
    parser.add_argument("--org-id", help="Limit to a single organisation ID")
    args = parser.parse_args()
    run(org_id=args.org_id)
