#!/usr/bin/env python3
"""
booking_confirmation.py
Send booking confirmations when a job is newly scheduled.

Queries jobs where:
  - status = 'scheduled'
  - No existing communication with subject 'Booking Confirmation: <job_number>'
    has already been sent for this job

For each:
  - Creates a communication record (email, outbound)
  - Sends a confirmation email to the client with job details
"""

import sys
import os
import argparse
import uuid
from datetime import datetime, timezone

import libsql_experimental as libsql
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env.local"))

from email_service import GritlyEmailService
from templates import job_scheduled_template


def get_db() -> libsql.Connection:
    url = os.getenv("TURSO_DATABASE_URL")
    token = os.getenv("TURSO_AUTH_TOKEN")
    if not url or not token:
        raise EnvironmentError(
            "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in .env.local"
        )
    return libsql.connect(url, auth_token=token)


def _build_email_service() -> GritlyEmailService | None:
    try:
        return GritlyEmailService.from_env()
    except EnvironmentError as exc:
        print(f"[EMAIL] Not configured — skipping email delivery: {exc}")
        return None


def _format_timestamp(ts: int | None) -> str:
    """Convert Unix epoch integer to a human-readable UTC datetime string."""
    if ts is None:
        return "TBD"
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%B %d, %Y at %I:%M %p UTC")


def run(org_id: str | None = None) -> None:
    db = get_db()
    email_svc = _build_email_service()

    cc_email = os.getenv("CC_EMAIL") or os.getenv("FROM_EMAIL")

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
            scheduled_jobs = db.execute(
                """
                SELECT j.id, j.client_id, j.job_number, j.title,
                       j.description, j.scheduled_start, j.scheduled_end,
                       c.first_name, c.last_name, c.email,
                       p.address_line1, p.city, p.province
                FROM jobs j
                JOIN clients c ON c.id = j.client_id
                LEFT JOIN properties p ON p.id = j.property_id
                WHERE j.org_id = ?
                  AND j.status = 'scheduled'
                """,
                [current_org_id],
            ).rows

            org_sent = 0
            org_skipped = 0

            for job in scheduled_jobs:
                client_id: str = job[1]
                job_number: str = job[2]
                title: str = job[3]
                description: str = job[4] or ""
                scheduled_start: int | None = job[5]
                scheduled_end: int | None = job[6]
                first_name: str = job[7] or ""
                last_name: str = job[8] or ""
                client_email: str | None = job[9]
                addr_line1: str | None = job[10]
                city: str | None = job[11]
                province: str | None = job[12]

                client_name = f"{first_name} {last_name}".strip() or client_id

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

                # Build address string if available
                address: str | None = None
                if addr_line1:
                    parts = [addr_line1]
                    if city:
                        parts.append(city)
                    if province:
                        parts.append(province)
                    address = ", ".join(parts)

                comm_body = (
                    f"Booking confirmation sent for job {title} ({job_number}). "
                    f"Scheduled: {start_str} — {end_str}."
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
                        comm_body,
                    ],
                )

                # Send email to client
                if client_email and email_svc:
                    html = job_scheduled_template(
                        business_name=org_name,
                        client_name=client_name,
                        job_number=job_number,
                        job_title=title,
                        scheduled_start=start_str,
                        scheduled_end=end_str,
                        address=address,
                    )
                    ok, detail = email_svc.send(
                        to_email=client_email,
                        subject=f"Appointment Confirmed — {title}",
                        html_body=html,
                        cc=cc_email,
                    )
                    if ok:
                        print(
                            f"  [EMAIL SENT] Booking confirmation for job {job_number} "
                            f"→ {client_email}"
                        )
                    else:
                        print(
                            f"  [EMAIL ERROR] Job {job_number}: {detail}",
                            file=sys.stderr,
                        )
                elif not client_email:
                    print(
                        f"  [SKIP EMAIL] Job {job_number} — client has no email address"
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
