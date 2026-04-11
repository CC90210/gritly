# Gritly Automations

Standalone Python scripts that connect to the Turso (libSQL) database and
perform automated business operations for field service companies.

Each script can be run independently or all together via `run_all.py`.

---

## Scripts

| Script | What it does |
|---|---|
| `review_request.py` | Creates review_request records for jobs completed in the last 24 hours (skips duplicates) |
| `quote_followup.py` | Logs follow-up reminders for quotes sent more than 3 days ago without a response; marks them `followed_up` |
| `invoice_reminder.py` | Marks past-due invoices as `overdue` and logs a reminder communication for each |
| `booking_confirmation.py` | Logs a booking confirmation communication for every newly scheduled job (skips already confirmed) |
| `maintenance_renewal.py` | Logs renewal reminders for maintenance agreements expiring within 30 days |
| `daily_digest.py` | Prints a formatted daily business summary (requests, jobs, invoices, revenue) |
| `missed_call_textback.py` | Creates a service_request for a missed call and sends an auto SMS (Twilio stub — see instructions below) |
| `run_all.py` | Runs all of the above in sequence |

---

## Environment Variables

Add these to `.env.local` at the project root:

```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

For the missed call text-back (when Twilio is wired up):

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+14155551234
```

For email delivery (Gmail SMTP with an App Password):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-app-password
FROM_NAME=Your Business Name
FROM_EMAIL=you@gmail.com
CC_EMAIL=you@gmail.com          # CC'd on every outbound client email
DIGEST_EMAIL_TO=owner@yourbusiness.com  # daily digest recipient
APP_URL=https://gritly.vercel.app       # base URL for portal links in emails
```

---

## Installation

```bash
pip install -r scripts/automations/requirements.txt
```

---

## Running

Run all automations:

```bash
python scripts/automations/run_all.py
```

Run for a single organisation:

```bash
python scripts/automations/run_all.py --org-id <org-uuid>
```

Run a single script:

```bash
python scripts/automations/invoice_reminder.py --org-id <org-uuid>
```

Test the missed call text-back:

```bash
python scripts/automations/missed_call_textback.py --org-id <org-uuid> --phone +14155559876
```

---

## Cron Job

Run all automations every day at 7:00 AM UTC:

```cron
0 7 * * * cd /path/to/gritly && python scripts/automations/run_all.py >> /var/log/gritly-automations.log 2>&1
```

---

## n8n Workflow

1. Create an n8n Schedule trigger (e.g., daily at 7 AM).
2. Add an Execute Command node:
   ```
   cd /path/to/gritly && python scripts/automations/run_all.py
   ```
3. Optionally pipe stdout to a Slack or email notification node.

For the missed call text-back, create a Webhook trigger node in n8n,
connect it to your Twilio phone number's "Call comes in" webhook URL,
then use an Execute Command node to call:

```
python scripts/automations/missed_call_textback.py --org-id <id> --phone {{$json.From}}
```

---

## Hardening Notes

- All DB writes call `db.commit()` immediately after each INSERT/UPDATE so data is not lost on crash.
- Connections call `conn.sync()` on open to pull latest remote state before querying.
- All `SELECT` queries without a narrow WHERE clause are bounded with `LIMIT` to prevent unbounded scans.
- `booking_confirmation.py` scopes its job query to a 30-day lookahead window so it never re-scans historical scheduled jobs.
- All user-provided strings in email templates are HTML-escaped via `_esc()` to prevent XSS.
- Each script is idempotent: running it twice will not double-send (dedup via `communications` table or `review_requests` table).
- Missing SMTP credentials → stub mode (logs to stdout, does not crash).
- Missing Twilio credentials → stub mode (logs to stdout, does not crash).
- Exit code 1 from `run_all.py` when any step fails, so cron can detect failures.

## Future Integrations

| Feature | Package | Env Vars needed |
|---|---|---|
| SMS delivery | `twilio` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |
| Slack alerts | `slack-sdk` | `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` |
