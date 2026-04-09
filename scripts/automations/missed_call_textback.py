#!/usr/bin/env python3
"""
missed_call_textback.py
Placeholder for missed call text-back automation.

Integration target: Twilio (inbound call webhook) + Turso DB.

When a call is missed on the business line, this script:
  1. Creates a service_request record with source = 'missed_call'
  2. Sends an automatic SMS via Twilio to the caller

Twilio credentials required (add to .env.local):
  TWILIO_ACCOUNT_SID  — from console.twilio.com
  TWILIO_AUTH_TOKEN   — from console.twilio.com
  TWILIO_FROM_NUMBER  — your Twilio phone number (E.164 format, e.g. +14155551234)

How to wire this up:
  1. Set your Twilio phone number's webhook for "A call comes in" to a POST endpoint
     (e.g., an n8n webhook or a Next.js API route at /api/webhooks/twilio-missed-call)
  2. That endpoint extracts the caller's phone number and calls:
       process_missed_call(phone_number="+1...", org_id="...")
  3. This script handles the DB write and SMS send.
"""

import sys
import os
import uuid
import argparse
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


def _send_sms(to_number: str, body: str) -> None:
    """
    Send an SMS via Twilio.

    Uncomment and install twilio package when ready:
      pip install twilio

    from twilio.rest import Client
    client = Client(
        os.getenv("TWILIO_ACCOUNT_SID"),
        os.getenv("TWILIO_AUTH_TOKEN"),
    )
    client.messages.create(
        body=body,
        from_=os.getenv("TWILIO_FROM_NUMBER"),
        to=to_number,
    )
    """
    # Placeholder — log to stdout until Twilio is wired up
    print(f"  [SMS STUB] To: {to_number} | Message: {body}")


def process_missed_call(phone_number: str, org_id: str) -> str:
    """
    Handle a missed call event.

    Creates a service_request record with source='missed_call' and sends
    an automatic SMS reply to the caller.

    Returns the new service_request ID.
    """
    db = get_db()
    now_ts = int(datetime.now(timezone.utc).timestamp())
    new_id = uuid.uuid4().hex

    # Verify the org exists
    org_row = db.execute(
        "SELECT id, name FROM organizations WHERE id = ? LIMIT 1",
        [org_id],
    ).rows

    if not org_row:
        raise ValueError(f"Organisation {org_id} not found.")

    org_name: str = org_row[0][1]

    # Create a service_request record so the team can see it in the dashboard
    db.execute(
        """
        INSERT INTO service_requests
          (id, created_at, updated_at, org_id, status,
           first_name, last_name, email, phone,
           service_type, description, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            new_id,
            now_ts,
            now_ts,
            org_id,
            "new",
            "Unknown",        # first_name — unknown from missed call
            "Caller",         # last_name
            "",               # email — unknown
            phone_number,
            "Unknown",        # service_type — to be determined on callback
            f"Missed call from {phone_number}. Automatic text-back sent.",
            "missed_call",
        ],
    )

    print(f"[CREATED] Service request {new_id} for missed call from {phone_number} (org: {org_name})")

    # Send automatic text-back
    sms_body = (
        f"Hi! Sorry we missed your call. We've received your message and "
        f"will call you back shortly. — {org_name}"
    )
    _send_sms(to_number=phone_number, body=sms_body)

    return new_id


def run(org_id: str | None = None) -> None:
    """
    Standalone run — simulates a missed call for demonstration.
    In production this function is called by a webhook handler, not run directly.
    """
    if org_id is None:
        print(
            "Missed Call Text-Back: This script is webhook-driven.\n"
            "Call process_missed_call(phone_number, org_id) from your webhook handler.\n"
            "Pass --org-id and --phone to test manually."
        )
        return

    phone = os.getenv("TEST_PHONE_NUMBER", "+10000000000")
    print(f"[TEST] Simulating missed call from {phone} for org {org_id}")
    process_missed_call(phone_number=phone, org_id=org_id)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Missed call text-back. Pass --org-id to test manually."
    )
    parser.add_argument("--org-id", help="Organisation ID to simulate a missed call for")
    parser.add_argument("--phone", help="Caller phone number (E.164 format)", default="+10000000000")
    args = parser.parse_args()

    if args.org_id:
        process_missed_call(phone_number=args.phone, org_id=args.org_id)
    else:
        run()
