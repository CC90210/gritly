#!/usr/bin/env python3
"""
review_request.py
After a job is completed, create a review_request record for the client.

Queries jobs where:
  - status = 'completed'
  - completed_at is within the last 24 hours

Skips jobs that already have a pending/sent review request.
In production, the review_request record would trigger a Twilio/SendGrid
notification via a webhook or a separate delivery worker.
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


def run(org_id: str | None = None) -> None:
    db = get_db()

    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    # Turso stores timestamps as Unix epoch integers
    cutoff_ts = int(cutoff.timestamp())

    # Fetch all orgs to iterate (or scope to a single org if --org-id provided)
    if org_id:
        orgs = db.execute("SELECT id, name FROM organizations WHERE id = ?", [org_id]).rows
    else:
        orgs = db.execute("SELECT id, name FROM organizations").rows

    total_created = 0
    total_skipped = 0

    for org in orgs:
        current_org_id: str = org[0]
        org_name: str = org[1]

        try:
            # Find completed jobs in the last 24 hours for this org
            completed_jobs = db.execute(
                """
                SELECT id, client_id, job_number, title
                FROM jobs
                WHERE org_id = ?
                  AND status = 'completed'
                  AND completed_at >= ?
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

                # Check if a review request already exists for this job
                existing = db.execute(
                    """
                    SELECT id FROM review_requests
                    WHERE job_id = ?
                      AND org_id = ?
                    LIMIT 1
                    """,
                    [job_id, current_org_id],
                ).rows

                if existing:
                    org_skipped += 1
                    continue

                # Create the review request record
                new_id = __import__("uuid").uuid4().hex
                now_ts = int(datetime.now(timezone.utc).timestamp())

                db.execute(
                    """
                    INSERT INTO review_requests
                      (id, created_at, org_id, client_id, job_id, sent_via, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    [new_id, now_ts, current_org_id, client_id, job_id, "email", "pending"],
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
