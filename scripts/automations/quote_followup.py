#!/usr/bin/env python3
"""
quote_followup.py
Follow up on quotes that were sent but not yet approved or declined.

Queries quotes where:
  - status = 'sent'
  - sent_at is older than 3 days

For each, creates a communication record logging the follow-up,
updates the quote status to 'followed_up', and sends a follow-up
email to the client with a link to view/approve the quote.
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
from templates import quote_followup_template


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


def run(org_id: str | None = None) -> None:
    db = get_db()
    email_svc = _build_email_service()

    cutoff = datetime.now(timezone.utc) - timedelta(days=3)
    cutoff_ts = int(cutoff.timestamp())

    app_url = os.getenv("APP_URL", "https://gritly.vercel.app")
    cc_email = os.getenv("CC_EMAIL") or os.getenv("FROM_EMAIL")

    if org_id:
        orgs = db.execute("SELECT id, name FROM organizations WHERE id = ?", [org_id]).rows
    else:
        orgs = db.execute("SELECT id, name FROM organizations").rows

    total_followed_up = 0

    for org in orgs:
        current_org_id: str = org[0]
        org_name: str = org[1]

        try:
            stale_quotes = db.execute(
                """
                SELECT q.id, q.client_id, q.quote_number, q.total, q.sent_at,
                       c.first_name, c.last_name, c.email
                FROM quotes q
                JOIN clients c ON c.id = q.client_id
                WHERE q.org_id = ?
                  AND q.status = 'sent'
                  AND q.sent_at IS NOT NULL
                  AND q.sent_at < ?
                """,
                [current_org_id, cutoff_ts],
            ).rows

            org_count = 0

            for quote in stale_quotes:
                quote_id: str = quote[0]
                client_id: str = quote[1]
                quote_number: str = quote[2]
                total: float = quote[3] or 0.0
                sent_at_ts: int | None = quote[4]
                first_name: str = quote[5] or ""
                last_name: str = quote[6] or ""
                client_email: str | None = quote[7]

                client_name = f"{first_name} {last_name}".strip() or client_id

                # Calculate days since sent for template copy
                days_since = 3
                if sent_at_ts:
                    sent_dt = datetime.fromtimestamp(sent_at_ts, tz=timezone.utc)
                    days_since = max(1, (datetime.now(timezone.utc) - sent_dt).days)

                now_ts = int(datetime.now(timezone.utc).timestamp())
                body = (
                    f"Automated follow-up: Quote {quote_number} (${total:,.2f}) was sent "
                    f"more than {days_since} day(s) ago and has not been approved. "
                    f"Please follow up with the client."
                )

                # Log communication record
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
                        f"Follow-up: Quote {quote_number}",
                        body,
                    ],
                )

                # Update quote status
                db.execute(
                    """
                    UPDATE quotes
                    SET status = 'followed_up', updated_at = ?
                    WHERE id = ?
                    """,
                    [now_ts, quote_id],
                )

                # Send email to client
                if client_email and email_svc:
                    view_url = f"{app_url}/portal/quotes/{quote_id}"
                    html = quote_followup_template(
                        business_name=org_name,
                        client_name=client_name,
                        quote_number=quote_number,
                        total=total,
                        view_url=view_url,
                        days_since_sent=days_since,
                    )
                    ok, detail = email_svc.send(
                        to_email=client_email,
                        subject=f"Following up on Quote {quote_number}",
                        html_body=html,
                        cc=cc_email,
                    )
                    if ok:
                        print(
                            f"  [EMAIL SENT] Follow-up for quote {quote_number} "
                            f"→ {client_email}"
                        )
                    else:
                        print(
                            f"  [EMAIL ERROR] Quote {quote_number}: {detail}",
                            file=sys.stderr,
                        )
                elif not client_email:
                    print(
                        f"  [SKIP EMAIL] Quote {quote_number} — client has no email address"
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
