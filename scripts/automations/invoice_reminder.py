#!/usr/bin/env python3
"""
invoice_reminder.py
Send reminders for overdue invoices.

Queries invoices where:
  - status is not 'paid' and not 'void'
  - due_date < today (stored as ISO date string: YYYY-MM-DD)

For each:
  - Creates a communication record logging the reminder
  - Updates the invoice status to 'overdue' if not already

Prints a summary of overdue invoices with total amount outstanding.
In production, the communication record would trigger a Twilio SMS or
SendGrid email via a delivery worker.
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


def run(org_id: str | None = None) -> None:
    db = get_db()

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if org_id:
        orgs = db.execute("SELECT id, name FROM organizations WHERE id = ?", [org_id]).rows
    else:
        orgs = db.execute("SELECT id, name FROM organizations").rows

    total_processed = 0
    grand_total_outstanding = 0.0

    for org in orgs:
        current_org_id: str = org[0]
        org_name: str = org[1]

        try:
            # Find invoices that are past due and not yet paid or voided
            overdue_invoices = db.execute(
                """
                SELECT id, client_id, invoice_number, total, amount_paid, status, due_date
                FROM invoices
                WHERE org_id = ?
                  AND status NOT IN ('paid', 'void')
                  AND due_date < ?
                """,
                [current_org_id, today_str],
            ).rows

            org_count = 0
            org_outstanding = 0.0

            for inv in overdue_invoices:
                inv_id: str = inv[0]
                client_id: str = inv[1]
                invoice_number: str = inv[2]
                total: float = inv[3] or 0.0
                amount_paid: float = inv[4] or 0.0
                current_status: str = inv[5]
                due_date: str = inv[6]

                balance_due = total - amount_paid
                org_outstanding += balance_due

                now_ts = int(datetime.now(timezone.utc).timestamp())
                body = (
                    f"Automated reminder: Invoice {invoice_number} was due on {due_date}. "
                    f"Balance outstanding: ${balance_due:,.2f}. "
                    f"Please contact the client to arrange payment."
                )

                # Create a communication record for the reminder
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
                        f"Overdue Invoice Reminder: {invoice_number}",
                        body,
                    ],
                )

                # Mark invoice as 'overdue' if it isn't already
                if current_status != "overdue":
                    db.execute(
                        """
                        UPDATE invoices
                        SET status = 'overdue', updated_at = ?
                        WHERE id = ?
                        """,
                        [now_ts, inv_id],
                    )

                org_count += 1
                print(
                    f"  [OVERDUE] Invoice {invoice_number} — due {due_date}, "
                    f"balance ${balance_due:,.2f} (client {client_id})"
                )

            total_processed += org_count
            grand_total_outstanding += org_outstanding

            if overdue_invoices:
                print(
                    f"[{org_name}] {org_count} overdue invoice(s), "
                    f"${org_outstanding:,.2f} outstanding."
                )

        except Exception as exc:
            print(f"[ERROR] Org {org_name} ({current_org_id}): {exc}", file=sys.stderr)

    print(
        f"\nInvoice Reminders — Total overdue: {total_processed}, "
        f"Grand total outstanding: ${grand_total_outstanding:,.2f}"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Remind clients about overdue invoices.")
    parser.add_argument("--org-id", help="Limit to a single organisation ID")
    args = parser.parse_args()
    run(org_id=args.org_id)
