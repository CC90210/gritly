#!/usr/bin/env python3
"""
maintenance_renewal.py
Check for maintenance agreements due for renewal within the next 30 days.

Queries maintenance_agreements where:
  - is_active = 1 (true)
  - end_date is a date string (YYYY-MM-DD) within the next 30 days
  - end_date is not null

For each:
  - Creates a communication record reminding the client/team about renewal.

In production, this communication record would trigger a SendGrid email or
Twilio SMS to the client, or an internal notification to the business owner.
"""

import sys
import os
import argparse
import uuid
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


def run(org_id: str | None = None) -> None:
    db = get_db()

    today = datetime.now(timezone.utc).date()
    window_end = today + timedelta(days=30)

    today_str = today.strftime("%Y-%m-%d")
    window_end_str = window_end.strftime("%Y-%m-%d")

    if org_id:
        orgs = db.execute("SELECT id, name FROM organizations WHERE id = ?", [org_id]).rows
    else:
        orgs = db.execute("SELECT id, name FROM organizations").rows

    total_reminders = 0

    for org in orgs:
        current_org_id: str = org[0]
        org_name: str = org[1]

        try:
            # Find active maintenance agreements expiring within 30 days
            expiring = db.execute(
                """
                SELECT id, client_id, name, frequency, price, end_date
                FROM maintenance_agreements
                WHERE org_id = ?
                  AND is_active = 1
                  AND end_date IS NOT NULL
                  AND end_date >= ?
                  AND end_date <= ?
                """,
                [current_org_id, today_str, window_end_str],
            ).rows

            org_count = 0

            for agreement in expiring:
                agreement_id: str = agreement[0]
                client_id: str = agreement[1]
                name: str = agreement[2]
                frequency: str = agreement[3]
                price: float = agreement[4] or 0.0
                end_date: str = agreement[5]

                # Check how many days remain
                end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
                days_remaining = (end_dt - today).days

                # Check if a renewal reminder has already been sent for this agreement
                subject_pattern = f"Maintenance Renewal Reminder: {agreement_id}"
                existing = db.execute(
                    """
                    SELECT id FROM communications
                    WHERE org_id = ?
                      AND client_id = ?
                      AND subject = ?
                    LIMIT 1
                    """,
                    [current_org_id, client_id, subject_pattern],
                ).rows

                if existing:
                    print(
                        f"  [SKIPPED] '{name}' — renewal reminder already sent "
                        f"(expires {end_date})"
                    )
                    continue

                now_ts = int(datetime.now(timezone.utc).timestamp())
                body = (
                    f"Maintenance agreement renewal reminder:\n\n"
                    f"Agreement: {name}\n"
                    f"Frequency: {frequency}\n"
                    f"Price: ${price:,.2f}\n"
                    f"Expiry Date: {end_date} ({days_remaining} day(s) remaining)\n\n"
                    f"Please contact the client to renew this agreement before it expires.\n"
                    f"— {org_name}"
                )

                db.execute(
                    """
                    INSERT INTO communications
                      (id, created_at, org_id, client_id, type, direction, subject, body)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    [
                        uuid.uuid4().hex,
                        now_ts,
                        current_org_id,
                        client_id,
                        "note",
                        "outbound",
                        subject_pattern,
                        body,
                    ],
                )

                org_count += 1
                print(
                    f"  [REMINDER] '{name}' — expires {end_date} "
                    f"({days_remaining}d), ${price:,.2f}/{frequency} "
                    f"(client {client_id})"
                )

            total_reminders += org_count

            if expiring:
                print(f"[{org_name}] {org_count} renewal reminder(s) created.")

        except Exception as exc:
            print(f"[ERROR] Org {org_name} ({current_org_id}): {exc}", file=sys.stderr)

    print(f"\nMaintenance Renewals — Total reminders created: {total_reminders}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Remind about maintenance agreements expiring within 30 days."
    )
    parser.add_argument("--org-id", help="Limit to a single organisation ID")
    args = parser.parse_args()
    run(org_id=args.org_id)
