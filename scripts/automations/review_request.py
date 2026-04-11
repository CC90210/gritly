#!/usr/bin/env python3
"""
review_request.py
After a job is completed, create a review_request record for the client
and send an email review request.

Queries jobs where:
  - status = 'completed'
  - completed_at is within the last 24 hours

Skips jobs that already have a pending/sent review request.
"""

import sys
import os
import argparse
import uuid
from datetime import datetime, timedelta, timezone

import libsql_experimental as libsql
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env.local"))

from email_service import GritlyEmailService
from templates import review_request_template


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
        print(f"[EMAIL] Not configured — skipping email delivery: {exc}")
        return None


def run(org_id: str | None = None) -> None:
    db = get_db()
    email_svc = _build_email_service()

    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    cutoff_ts = int(cutoff.timestamp())

    app_url = os.getenv("APP_URL", "https://gritly.vercel.app")
    cc_email = os.getenv("CC_EMAIL") or os.getenv("FROM_EMAIL")

    if org_id:
        orgs = db.execute("SELECT id, name FROM organizations WHERE id = ?", [org_id]).rows
    else:
        orgs = db.execute("SELECT id, name FROM organizations LIMIT 500").rows

    total_created = 0
    total_skipped = 0

    for org in orgs:
        current_org_id: str = org[0]
        org_name: str = org[1]

        try:
            completed_jobs = db.execute(
                """
                SELECT j.id, j.client_id, j.job_number, j.title,
                       c.first_name, c.last_name, c.email
                FROM jobs j
                JOIN clients c ON c.id = j.client_id
                WHERE j.org_id = ?
                  AND j.status = 'completed'
                  AND j.completed_at >= ?
                LIMIT 200
                """,
                [current_org_id, cutoff_ts],
            ).rows

            org_created = 0
            org_skipped = 0

            for job in completed_jobs:
                job_id: str = job[0]
                client_id: str = job[1]
                job_number: str = job[2]
                job_title: str = job[3]
                first_name: str = job[4] or ""
                last_name: str = job[5] or ""
                client_email: str | None = job[6]

                client_name = f"{first_name} {last_name}".strip() or client_id

                existing = db.execute(
                    """
                    SELECT id FROM review_requests
                    WHERE job_id = ? AND org_id = ?
                    LIMIT 1
                    """,
                    [job_id, current_org_id],
                ).rows

                if existing:
                    org_skipped += 1
                    continue

                new_id = uuid.uuid4().hex
                now_ts = int(datetime.now(timezone.utc).timestamp())

                db.execute(
                    """
                    INSERT INTO review_requests
                      (id, created_at, org_id, client_id, job_id, sent_via, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    [new_id, now_ts, current_org_id, client_id, job_id, "email", "pending"],
                )
                db.commit()

                # Send email if client has an address and email service is ready
                if client_email and email_svc:
                    review_url = f"{app_url}/review/{new_id}"
                    html = review_request_template(
                        business_name=org_name,
                        client_name=client_name,
                        job_title=job_title,
                        review_url=review_url,
                    )
                    ok, detail = email_svc.send(
                        to_email=client_email,
                        subject=f"How did we do? — {job_title}",
                        html_body=html,
                        cc=cc_email,
                    )
                    if ok:
                        # Update record to 'sent' now that email was delivered
                        db.execute(
                            "UPDATE review_requests SET status = 'sent' WHERE id = ?",
                            [new_id],
                        )
                        db.commit()
                        print(
                            f"  [SENT] Review request email for job {job_number} "
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

                org_created += 1
                print(
                    f"  [CREATED] Review request for job {job_number} '{job_title}' "
                    f"(client {client_id})"
                )

            total_created += org_created
            total_skipped += org_skipped

            if completed_jobs:
                print(
                    f"[{org_name}] {org_created} review request(s) created, "
                    f"{org_skipped} already existed."
                )

        except Exception as exc:
            print(f"[ERROR] Org {org_name} ({current_org_id}): {exc}", file=sys.stderr)

    print(
        f"\nReview Requests — Total created: {total_created}, "
        f"already existed: {total_skipped}"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create review requests for completed jobs.")
    parser.add_argument("--org-id", help="Limit to a single organisation ID")
    args = parser.parse_args()
    run(org_id=args.org_id)
