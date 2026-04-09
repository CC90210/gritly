#!/usr/bin/env python3
"""
booking_confirmation.py
Send booking confirmations when a job is newly scheduled.

Queries jobs where:
  - status = 'scheduled'
  - No existing communication of subject matching 'Booking Confirmation'
    has been sent for this job's client (checked via the communications table)

For each:
  - Creates a communication record of type='email', direction='outbound'
    with subject='Booking Confirmation' and a body containing job details.

In production, the communication record would trigger SendGrid or Twilio
to deliver the actual email/SMS to the client.
"""

import sys
import os
import argparse
import uuid
from datetime import datetime, timezone

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


def _format_timestamp(ts: int | None) -> str:
    """Convert Unix epoch integer to a human-readable local datetime string."""
    if ts is None:
        return "TBD"
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%B %d, %Y at %I:%M %p UTC")


def run(org_id: str | None = None) -> None:
    db = get_db()

    if org_id:
        orgs = db.execute("SELECT id, name FROM organizations WHERE id = ?", [org_id]).rows
    else:
        orgs = db.execute("SELECT id, name FROM organizations").rows

    total_sent = 0
    total_skipped = 0

    for org in orgs:
        current_org_id: str = org[0]
        org_name: str = org[1]

        try:
            # Fetch all scheduled jobs for this org
            scheduled_jobs = db.execute(
                """
                SELECT j.id, j.client_id, j.job_number, j.title,
                       j.description, j.scheduled_start, j.scheduled_end
                FROM jobs j
                WHERE j.org_id = ?
                  AND j.status = 'scheduled'
                """,
                [current_org_id],
            ).rows

            org_sent = 0
            org_skipped = 0

            for job in scheduled_jobs:
                job_id: str = job[0]
                client_id: str = job[1]
                job_number: str = job[2]
                title: str = job[3]
                description: str = job[4] or ""
                scheduled_start: int | None = job[5]
                scheduled_end: int | None = job[6]

                # Check if a booking confirmation already exists for this job.
                # We look for a communication on this client with the exact subject pattern.
                subject_pattern = f"Booking Confirmation: {job_number}"
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
                    org_skipped += 1
                    continue

                start_str = _format_timestamp(scheduled_start)
                end_str = _format_timestamp(scheduled_end)

                body = (
                    f"Hi, this is a confirmation for your upcoming service appointment.\n\n"
                    f"Job: {title}\n"
                    f"Reference: {job_number}\n"
                    f"Scheduled Start: {start_str}\n"
                    f"Scheduled End: {end_str}\n"
                    f"Details: {description}\n\n"
                    f"If you need to reschedule or have any questions, please contact us.\n"
                    f"— {org_name}"
                )

                now_ts = int(datetime.now(timezone.utc).timestamp())

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
                        "email",
                        "outbound",
                        subject_pattern,
                        body,
                    ],
                )

                org_sent += 1
                print(
                    f"  [CONFIRMED] Job {job_number} '{title}' — "
                    f"start: {start_str} (client {client_id})"
                )

            total_sent += org_sent
            total_skipped += org_skipped

            if scheduled_jobs:
                print(
                    f"[{org_name}] {org_sent} confirmation(s) sent, "
                    f"{org_skipped} already confirmed."
                )

        except Exception as exc:
            print(f"[ERROR] Org {org_name} ({current_org_id}): {exc}", file=sys.stderr)

    print(
        f"\nBooking Confirmations — Sent: {total_sent}, "
        f"already confirmed: {total_skipped}"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send booking confirmations for scheduled jobs.")
    parser.add_argument("--org-id", help="Limit to a single organisation ID")
    args = parser.parse_args()
    run(org_id=args.org_id)
