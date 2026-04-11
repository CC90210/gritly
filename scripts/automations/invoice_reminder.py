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
  - Sends an overdue reminder email to the client
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
from templates import invoice_overdue_template


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

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_dt = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    app_url = os.getenv("APP_URL", "https://gritly.vercel.app")
    cc_email = os.getenv("CC_EMAIL") or os.getenv("FROM_EMAIL")

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
            overdue_invoices = db.execute(
                """
                SELECT i.id, i.client_id, i.invoice_number, i.total,
                       i.amount_paid, i.status, i.due_date,
                       c.first_name, c.last_name, c.email
                FROM invoices i
                JOIN clients c ON c.id = i.client_id
                WHERE i.org_id = ?
                  AND i.status NOT IN ('paid', 'void')
                  AND i.due_date < ?
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
                first_name: str = inv[7] or ""
                last_name: str = inv[8] or ""
                client_email: str | None = inv[9]

                client_name = f"{first_name} {last_name}".strip() or client_id
                balance_due = total - amount_paid
                org_outstanding += balance_due

                # Calculate days overdue for template urgency
                days_overdue = 1
                try:
                    due_dt = datetime.strptime(due_date, "%Y-%m-%d").replace(
                        tzinfo=timezone.utc
                    )
                    days_overdue = max(1, (today_dt - due_dt).days)
                except ValueError:
                    pass

                # Dedup: skip if a reminder was already sent today for this invoice
                reminder_subject = f"Overdue Invoice Reminder: {invoice_number}"
                day_start_ts = int(today_dt.timestamp())
                already_sent = db.execute(
                    """
                    SELECT id FROM communications
                    WHERE org_id = ?
                      AND client_id = ?
                      AND subject = ?
                      AND created_at >= ?
                    LIMIT 1
                    """,
                    [current_org_id, client_id, reminder_subject, day_start_ts],
                ).rows
                if already_sent:
                    print(
                        f"  [SKIP] Invoice {invoice_number} — reminder already sent today"
                    )
                    org_outstanding -= balance_due  # don't double-count in totals
                    continue

                now_ts = int(datetime.now(timezone.utc).timestamp())
                body = (
                    f"Automated reminder: Invoice {invoice_number} was due on {due_date}. "
                    f"Balance outstanding: ${balance_due:,.2f}. "
                    f"Please contact the client to arrange payment."
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
                        reminder_subject,
                        body,
                    ],
                )

                # Mark invoice as 'overdue' if not already
                if current_status != "overdue":
                    db.execute(
                        """
                        UPDATE invoices
                        SET status = 'overdue', updated_at = ?
                        WHERE id = ?
                        """,
                        [now_ts, inv_id],
                    )

                # Send email to client
                if client_email and email_svc:
                    pay_url = f"{app_url}/portal/invoices/{inv_id}/pay"
                    html = invoice_overdue_template(
                        business_name=org_name,
                        client_name=client_name,
                        invoice_number=invoice_number,
                        balance_due=balance_due,
                        due_date=due_date,
                        pay_url=pay_url,
                        days_overdue=days_overdue,
                    )
                    ok, detail = email_svc.send(
                        to_email=client_email,
                        subject=f"Payment Overdue — Invoice {invoice_number}",
                        html_body=html,
                        cc=cc_email,
                    )
                    if ok:
                        print(
                            f"  [EMAIL SENT] Overdue reminder for invoice {invoice_number} "
                            f"→ {client_email}"
                        )
                    else:
                        print(
                            f"  [EMAIL ERROR] Invoice {invoice_number}: {detail}",
                            file=sys.stderr,
                        )
                elif not client_email:
                    print(
                        f"  [SKIP EMAIL] Invoice {invoice_number} — client has no email address"
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
