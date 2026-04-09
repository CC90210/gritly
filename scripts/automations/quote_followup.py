#!/usr/bin/env python3
"""
quote_followup.py
Follow up on quotes that were sent but not yet approved or declined.

Queries quotes where:
  - status = 'sent'
  - sent_at is older than 3 days

For each, creates a communication record of type 'note' (outbound)
logging the follow-up, and updates the quote status to 'followed_up'.

In production, the communication record would trigger a Twilio SMS or
SendGrid email to the client.
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

    cutoff = datetime.now(timezone.utc) - timedelta(days=3)
    cutoff_ts = int(cutoff.timestamp())

    if org_id:
        orgs = db.execute("SELECT id, name FROM organizations WHERE id = ?", [org_id]).rows
    else:
        orgs = db.execute("SELECT id, name FROM organizations").rows

    total_followed_up = 0

    for org in orgs:
        current_org_id: str = org[0]
        org_name: str = org[1]

        try:
            # Find quotes that are 'sent' and older than 3 days
            stale_quotes = db.execute(
                """
                SELECT id, client_id, quote_number, total
                FROM quotes
                WHERE org_id = ?
                  AND status = 'sent'
                  AND sent_at IS NOT NULL
                  AND sent_at < ?
                """,
                [current_org_id, cutoff_ts],
            ).rows

            org_count = 0

            for quote in stale_quotes:
                quote_id: str = quote[0]
                client_id: str = quote[1]
                quote_number: str = quote[2]
                total: float = quote[3] or 0.0

                now_ts = int(datetime.now(timezone.utc).timestamp())
                body = (
                    f"Automated follow-up: Quote {quote_number} (${total:,.2f}) was sent "
                    f"more than 3 days ago and has not been approved. "
                    f"Please follow up with the client."
                )

                # Log a communication record for the follow-up
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
                        f"Follow-up: Quote {quote_number}",
                        body,
                    ],
                )

                # Update quote status to 'followed_up'
                db.execute(
                    """
                    UPDATE quotes
                    SET status = 'followed_up', updated_at = ?
                    WHERE id = ?
                    """,
                    [now_ts, quote_id],
                )

                org_count += 1
                print(
                    f"  [FOLLOWED UP] Quote {quote_number} — ${total:,.2f} "
                    f"(client {client_id})"
                )

            total_followed_up += org_count

            if stale_quotes:
                print(f"[{org_name}] {org_count} quote(s) followed up.")

        except Exception as exc:
            print(f"[ERROR] Org {org_name} ({current_org_id}): {exc}", file=sys.stderr)

    print(f"\nQuote Follow-ups — Total processed: {total_followed_up}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Follow up on unresponded quotes.")
    parser.add_argument("--org-id", help="Limit to a single organisation ID")
    args = parser.parse_args()
    run(org_id=args.org_id)
