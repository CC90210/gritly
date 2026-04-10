#!/usr/bin/env python3
"""
templates.py
HTML email templates for all Gritly notification types.

All templates use inline CSS (email clients ignore external stylesheets).
Brand: dark header (#111827), white card body, orange accent (#f97316).
Trade-appropriate copy for field service businesses (HVAC, plumbing, electrical, etc.).
"""

from datetime import datetime


# ─────────────────────────────────────────────────────────────
# SHARED LAYOUT HELPERS
# ─────────────────────────────────────────────────────────────

_BASE_STYLES = """
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  background-color: #f3f4f6;
"""

_BUTTON_STYLE = (
    "display: inline-block; padding: 12px 28px; "
    "background-color: #f97316; color: #ffffff; "
    "text-decoration: none; border-radius: 6px; "
    "font-weight: 600; font-size: 15px; "
    "letter-spacing: 0.01em;"
)

_SECONDARY_BUTTON_STYLE = (
    "display: inline-block; padding: 10px 24px; "
    "background-color: #ffffff; color: #111827; "
    "text-decoration: none; border-radius: 6px; "
    "font-weight: 500; font-size: 14px; "
    "border: 1.5px solid #d1d5db;"
)


def _wrap(business_name: str, content: str, footer_note: str = "") -> str:
    """Wrap content in the shared Gritly email shell."""
    footer_text = footer_note or (
        f"You received this email from {business_name}. "
        "Reply directly to this email to contact us."
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{business_name}</title>
</head>
<body style="{_BASE_STYLES}">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width: 600px; width: 100%;">

          <!-- HEADER -->
          <tr>
            <td style="background-color: #111827; border-radius: 8px 8px 0 0;
                       padding: 28px 36px; text-align: left;">
              <span style="color: #f97316; font-size: 20px; font-weight: 700;
                           letter-spacing: -0.02em;">{business_name}</span>
            </td>
          </tr>

          <!-- BODY CARD -->
          <tr>
            <td style="background-color: #ffffff; padding: 36px 36px 28px;
                       border-left: 1px solid #e5e7eb;
                       border-right: 1px solid #e5e7eb;">
              {content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f9fafb;
                       border: 1px solid #e5e7eb;
                       border-top: none;
                       border-radius: 0 0 8px 8px;
                       padding: 18px 36px;
                       text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;
                         line-height: 1.6;">
                {footer_text}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _divider() -> str:
    return (
        '<hr style="border: none; border-top: 1px solid #e5e7eb; '
        'margin: 24px 0;" />'
    )


def _line_item_row(description: str, amount: str) -> str:
    return f"""
    <tr>
      <td style="padding: 8px 0; font-size: 14px; color: #374151;
                 border-bottom: 1px solid #f3f4f6;">{description}</td>
      <td style="padding: 8px 0; font-size: 14px; color: #111827;
                 font-weight: 500; text-align: right;
                 border-bottom: 1px solid #f3f4f6;">{amount}</td>
    </tr>"""


def _badge(text: str, color: str = "#f97316") -> str:
    return (
        f'<span style="display: inline-block; padding: 3px 10px; '
        f'background-color: {color}20; color: {color}; '
        f'border-radius: 999px; font-size: 12px; font-weight: 600;">'
        f"{text}</span>"
    )


# ─────────────────────────────────────────────────────────────
# TEMPLATE 1 — QUOTE SENT TO CLIENT
# ─────────────────────────────────────────────────────────────

def quote_template(
    business_name: str,
    client_name: str,
    quote_number: str,
    total: float,
    items: list[dict],
    view_url: str,
    valid_until: str | None = None,
) -> str:
    """Email sent to client when a quote is issued."""
    items_html = ""
    for item in items:
        desc = item.get("description", "Service")
        qty = item.get("quantity", 1)
        unit_price = item.get("unit_price", 0)
        line_total = item.get("total", qty * unit_price)
        items_html += _line_item_row(
            f"{desc} &times; {qty}",
            f"${line_total:,.2f}",
        )

    validity_html = ""
    if valid_until:
        validity_html = (
            f'<p style="margin: 0 0 16px; font-size: 13px; color: #6b7280;">'
            f"This quote is valid until <strong>{valid_until}</strong>.</p>"
        )

    content = f"""
    <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 700;
               color: #111827; letter-spacing: -0.02em;">
      Your Quote is Ready
    </h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280;">
      Hi {client_name} — we've prepared a quote for you. Review the details
      below and approve when you're ready.
    </p>

    <div style="background-color: #f9fafb; border-radius: 8px;
                padding: 20px 24px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px; font-size: 12px; color: #9ca3af;
                text-transform: uppercase; letter-spacing: 0.05em;">
        Quote Reference
      </p>
      <p style="margin: 0; font-size: 18px; font-weight: 700; color: #111827;">
        {quote_number}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="margin-bottom: 8px;">
      {items_html}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px 0 0; font-size: 16px; font-weight: 700;
                   color: #111827;">Total</td>
        <td style="padding: 12px 0 0; font-size: 20px; font-weight: 800;
                   color: #f97316; text-align: right;">
          ${total:,.2f}
        </td>
      </tr>
    </table>

    {validity_html}

    <a href="{view_url}" style="{_BUTTON_STYLE}">
      Review &amp; Approve Quote
    </a>

    {_divider()}

    <p style="margin: 0; font-size: 13px; color: #9ca3af;">
      Questions? Simply reply to this email — we're happy to help.
    </p>
    """
    return _wrap(business_name, content)


# ─────────────────────────────────────────────────────────────
# TEMPLATE 2 — QUOTE APPROVED (to business owner)
# ─────────────────────────────────────────────────────────────

def quote_approved_template(
    business_name: str,
    client_name: str,
    quote_number: str,
    total: float,
    approved_at: str,
) -> str:
    """Email sent to business owner when a client approves a quote."""
    content = f"""
    <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 700;
               color: #111827; letter-spacing: -0.02em;">
      Quote Approved {_badge("Approved", "#16a34a")}
    </h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280;">
      <strong>{client_name}</strong> approved a quote. Time to schedule the work.
    </p>

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0;
                border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size: 13px; color: #6b7280; padding-bottom: 6px;">
            Quote
          </td>
          <td style="font-size: 13px; color: #111827; font-weight: 600;
                     text-align: right; padding-bottom: 6px;">
            {quote_number}
          </td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6b7280; padding-bottom: 6px;">
            Client
          </td>
          <td style="font-size: 13px; color: #111827; font-weight: 600;
                     text-align: right; padding-bottom: 6px;">
            {client_name}
          </td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6b7280; padding-bottom: 6px;">
            Total Value
          </td>
          <td style="font-size: 16px; color: #16a34a; font-weight: 800;
                     text-align: right; padding-bottom: 6px;">
            ${total:,.2f}
          </td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6b7280;">Approved At</td>
          <td style="font-size: 13px; color: #111827; font-weight: 500;
                     text-align: right;">
            {approved_at}
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 20px; font-size: 14px; color: #374151;">
      Next steps: schedule the job, assign a technician, and convert the
      quote to an invoice when work is complete.
    </p>
    """
    footer = (
        f"Internal notification for {business_name}. "
        "This is an automated message from Gritly."
    )
    return _wrap(business_name, content, footer_note=footer)


# ─────────────────────────────────────────────────────────────
# TEMPLATE 3 — INVOICE SENT TO CLIENT
# ─────────────────────────────────────────────────────────────

def invoice_template(
    business_name: str,
    client_name: str,
    invoice_number: str,
    total: float,
    amount_paid: float,
    due_date: str,
    items: list[dict],
    pay_url: str,
) -> str:
    """Email sent to client when an invoice is issued."""
    balance_due = total - amount_paid
    items_html = ""
    for item in items:
        desc = item.get("description", "Service")
        qty = item.get("quantity", 1)
        line_total = item.get("total", 0)
        items_html += _line_item_row(
            f"{desc} &times; {qty}",
            f"${line_total:,.2f}",
        )

    paid_row = ""
    if amount_paid > 0:
        paid_row = _line_item_row(
            "Amount Paid (deposit)",
            f"&minus;${amount_paid:,.2f}",
        )

    content = f"""
    <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 700;
               color: #111827; letter-spacing: -0.02em;">
      Invoice {invoice_number}
    </h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280;">
      Hi {client_name} — thank you for choosing {business_name}.
      Your invoice is ready below.
    </p>

    <div style="background-color: #fff7ed; border: 1px solid #fed7aa;
                border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #9a3412; font-weight: 500;">
        Payment due by <strong>{due_date}</strong>
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="margin-bottom: 8px;">
      {items_html}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="margin-bottom: 24px;">
      {paid_row}
      <tr>
        <td style="padding: 12px 0 0; font-size: 16px; font-weight: 700;
                   color: #111827;">Balance Due</td>
        <td style="padding: 12px 0 0; font-size: 20px; font-weight: 800;
                   color: #f97316; text-align: right;">
          ${balance_due:,.2f}
        </td>
      </tr>
    </table>

    <a href="{pay_url}" style="{_BUTTON_STYLE}">
      Pay Invoice Online
    </a>

    {_divider()}

    <p style="margin: 0; font-size: 13px; color: #9ca3af;">
      Questions about your invoice? Reply to this email and we'll sort it out.
    </p>
    """
    return _wrap(business_name, content)


# ─────────────────────────────────────────────────────────────
# TEMPLATE 4 — PAYMENT RECEIVED CONFIRMATION
# ─────────────────────────────────────────────────────────────

def payment_received_template(
    business_name: str,
    client_name: str,
    invoice_number: str,
    amount_paid: float,
    paid_at: str,
) -> str:
    """Email sent to client confirming a payment was received."""
    content = f"""
    <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 700;
               color: #111827; letter-spacing: -0.02em;">
      Payment Received {_badge("Paid", "#16a34a")}
    </h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280;">
      Hi {client_name} — we've received your payment. Thank you!
    </p>

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0;
                border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;">
            Invoice
          </td>
          <td style="font-size: 13px; color: #111827; font-weight: 600;
                     text-align: right; padding-bottom: 8px;">
            {invoice_number}
          </td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;">
            Amount Paid
          </td>
          <td style="font-size: 18px; color: #16a34a; font-weight: 800;
                     text-align: right; padding-bottom: 8px;">
            ${amount_paid:,.2f}
          </td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6b7280;">Date</td>
          <td style="font-size: 13px; color: #111827; font-weight: 500;
                     text-align: right;">
            {paid_at}
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 14px; color: #374151;">
      Keep this email as your payment confirmation. We appreciate your business
      and look forward to serving you again.
    </p>
    """
    return _wrap(business_name, content)


# ─────────────────────────────────────────────────────────────
# TEMPLATE 5 — JOB SCHEDULED CONFIRMATION
# ─────────────────────────────────────────────────────────────

def job_scheduled_template(
    business_name: str,
    client_name: str,
    job_number: str,
    job_title: str,
    scheduled_start: str,
    scheduled_end: str,
    address: str | None = None,
    technician: str | None = None,
) -> str:
    """Email sent to client confirming their job has been scheduled."""
    address_row = ""
    if address:
        address_row = f"""
        <tr>
          <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;
                     vertical-align: top;">Service Address</td>
          <td style="font-size: 13px; color: #111827; font-weight: 500;
                     text-align: right; padding-bottom: 8px;">{address}</td>
        </tr>"""

    tech_row = ""
    if technician:
        tech_row = f"""
        <tr>
          <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;">
            Assigned Technician
          </td>
          <td style="font-size: 13px; color: #111827; font-weight: 500;
                     text-align: right; padding-bottom: 8px;">
            {technician}
          </td>
        </tr>"""

    content = f"""
    <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 700;
               color: #111827; letter-spacing: -0.02em;">
      Service Appointment Confirmed
    </h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280;">
      Hi {client_name} — your appointment is confirmed. Here are the details:
    </p>

    <div style="background-color: #f9fafb; border-left: 4px solid #f97316;
                border-radius: 0 8px 8px 0; padding: 20px 24px;
                margin-bottom: 24px;">
      <p style="margin: 0 0 6px; font-size: 16px; font-weight: 700;
                color: #111827;">{job_title}</p>
      <p style="margin: 0; font-size: 13px; color: #9ca3af;">
        Reference: {job_number}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="margin-bottom: 24px;">
      <tr>
        <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;">
          Date &amp; Time
        </td>
        <td style="font-size: 13px; color: #111827; font-weight: 600;
                   text-align: right; padding-bottom: 8px;">
          {scheduled_start}
        </td>
      </tr>
      <tr>
        <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;">
          Estimated End
        </td>
        <td style="font-size: 13px; color: #111827; font-weight: 500;
                   text-align: right; padding-bottom: 8px;">
          {scheduled_end}
        </td>
      </tr>
      {address_row}
      {tech_row}
    </table>

    <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">
      If you need to reschedule or have any questions before your appointment,
      reply to this email or call us directly.
    </p>
    """
    return _wrap(business_name, content)


# ─────────────────────────────────────────────────────────────
# TEMPLATE 6 — JOB COMPLETED NOTIFICATION
# ─────────────────────────────────────────────────────────────

def job_completed_template(
    business_name: str,
    client_name: str,
    job_number: str,
    job_title: str,
    completed_at: str,
    next_steps: str | None = None,
) -> str:
    """Email sent to client when a job is marked complete."""
    next_html = ""
    if next_steps:
        next_html = f"""
        <div style="background-color: #fff7ed; border: 1px solid #fed7aa;
                    border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #9a3412;
                    text-transform: uppercase; letter-spacing: 0.05em;
                    font-weight: 600;">Next Steps</p>
          <p style="margin: 0; font-size: 14px; color: #374151;">
            {next_steps}
          </p>
        </div>"""

    content = f"""
    <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 700;
               color: #111827; letter-spacing: -0.02em;">
      Work Completed {_badge("Done", "#16a34a")}
    </h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280;">
      Hi {client_name} — the job has been completed. Thank you for trusting
      {business_name} with your service.
    </p>

    <div style="background-color: #f9fafb; border-radius: 8px;
                padding: 20px 24px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600;
                color: #111827;">{job_title}</p>
      <p style="margin: 0; font-size: 13px; color: #9ca3af;">
        {job_number} &middot; Completed {completed_at}
      </p>
    </div>

    {next_html}

    <p style="margin: 0; font-size: 14px; color: #374151;">
      If you have any concerns about the work performed, please don't hesitate
      to reach out. We stand behind everything we do.
    </p>
    """
    return _wrap(business_name, content)


# ─────────────────────────────────────────────────────────────
# TEMPLATE 7 — REVIEW REQUEST
# ─────────────────────────────────────────────────────────────

def review_request_template(
    business_name: str,
    client_name: str,
    job_title: str,
    review_url: str,
) -> str:
    """Email sent to client requesting a review after job completion."""
    content = f"""
    <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 700;
               color: #111827; letter-spacing: -0.02em;">
      How Did We Do?
    </h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280;">
      Hi {client_name} — we recently completed <strong>{job_title}</strong>
      for you. Your feedback means everything to us and helps other homeowners
      find trusted service providers in the area.
    </p>

    <div style="text-align: center; margin-bottom: 28px;">
      <p style="margin: 0 0 8px; font-size: 28px;">&#11088;&#11088;&#11088;&#11088;&#11088;</p>
      <p style="margin: 0 0 20px; font-size: 14px; color: #6b7280;">
        It only takes 60 seconds.
      </p>
      <a href="{review_url}" style="{_BUTTON_STYLE}">
        Leave a Review
      </a>
    </div>

    {_divider()}

    <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
      Not happy with something? Reply to this email and we'll make it right.
    </p>
    """
    return _wrap(business_name, content)


# ─────────────────────────────────────────────────────────────
# TEMPLATE 8 — BOOKING CONFIRMATION (new service request)
# ─────────────────────────────────────────────────────────────

def booking_confirmation_template(
    business_name: str,
    client_name: str,
    service_type: str,
    preferred_date: str | None,
    preferred_time: str | None,
    reference_number: str,
    address: str | None = None,
) -> str:
    """
    Email sent to client when they submit a service request (booking widget).
    Confirms receipt — NOT a scheduled appointment confirmation.
    """
    date_line = preferred_date or "We'll be in touch to confirm a time"
    time_line = preferred_time or ""
    schedule_str = f"{date_line}{' at ' + time_line if time_line else ''}"

    address_html = ""
    if address:
        address_html = f"""
        <tr>
          <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;
                     vertical-align: top;">Service Address</td>
          <td style="font-size: 13px; color: #111827; font-weight: 500;
                     text-align: right; padding-bottom: 8px;">{address}</td>
        </tr>"""

    content = f"""
    <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 700;
               color: #111827; letter-spacing: -0.02em;">
      Request Received
    </h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280;">
      Hi {client_name} — thanks for reaching out to {business_name}.
      We've received your service request and will follow up shortly to
      confirm your appointment.
    </p>

    <div style="background-color: #f9fafb; border-radius: 8px;
                padding: 20px 24px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;">
            Request
          </td>
          <td style="font-size: 13px; color: #111827; font-weight: 600;
                     text-align: right; padding-bottom: 8px;">
            {service_type}
          </td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;">
            Preferred Time
          </td>
          <td style="font-size: 13px; color: #111827; font-weight: 500;
                     text-align: right; padding-bottom: 8px;">
            {schedule_str}
          </td>
        </tr>
        {address_html}
        <tr>
          <td style="font-size: 13px; color: #6b7280;">Reference</td>
          <td style="font-size: 13px; color: #9ca3af; font-family: monospace;
                     text-align: right;">{reference_number}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">
      A team member will contact you within 1 business day to confirm your
      appointment details. If you need immediate assistance, reply to this
      email or call us directly.
    </p>
    """
    return _wrap(business_name, content)


# ─────────────────────────────────────────────────────────────
# TEMPLATE 9 — QUOTE FOLLOW-UP REMINDER
# ─────────────────────────────────────────────────────────────

def quote_followup_template(
    business_name: str,
    client_name: str,
    quote_number: str,
    total: float,
    view_url: str,
    days_since_sent: int = 3,
) -> str:
    """Follow-up email sent to client when a quote hasn't been approved."""
    content = f"""
    <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 700;
               color: #111827; letter-spacing: -0.02em;">
      Following Up on Your Quote
    </h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280;">
      Hi {client_name} — we sent you a quote {days_since_sent} day{'s' if days_since_sent != 1 else ''} ago
      and wanted to check in. We'd love to get started on your project whenever
      you're ready.
    </p>

    <div style="background-color: #f9fafb; border-radius: 8px;
                padding: 20px 24px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;">
            Quote
          </td>
          <td style="font-size: 13px; color: #111827; font-weight: 600;
                     text-align: right; padding-bottom: 8px;">
            {quote_number}
          </td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6b7280;">Total</td>
          <td style="font-size: 16px; color: #f97316; font-weight: 800;
                     text-align: right;">
            ${total:,.2f}
          </td>
        </tr>
      </table>
    </div>

    <a href="{view_url}" style="{_BUTTON_STYLE}">
      Review Quote
    </a>
    &nbsp;&nbsp;
    <a href="mailto:?subject=Question about {quote_number}"
       style="{_SECONDARY_BUTTON_STYLE}">
      Ask a Question
    </a>

    {_divider()}

    <p style="margin: 0; font-size: 13px; color: #9ca3af;">
      If you've already made other arrangements, no worries — just let us
      know and we'll close this out.
    </p>
    """
    return _wrap(business_name, content)


# ─────────────────────────────────────────────────────────────
# TEMPLATE 10 — INVOICE OVERDUE REMINDER
# ─────────────────────────────────────────────────────────────

def invoice_overdue_template(
    business_name: str,
    client_name: str,
    invoice_number: str,
    balance_due: float,
    due_date: str,
    pay_url: str,
    days_overdue: int = 1,
) -> str:
    """Overdue invoice reminder sent to client."""
    urgency_color = "#dc2626" if days_overdue > 14 else "#f97316"
    urgency_label = "Urgent" if days_overdue > 14 else "Past Due"

    content = f"""
    <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 700;
               color: #111827; letter-spacing: -0.02em;">
      Invoice Overdue {_badge(urgency_label, urgency_color)}
    </h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280;">
      Hi {client_name} — invoice {invoice_number} was due on
      <strong>{due_date}</strong> and still shows a balance.
      Please arrange payment at your earliest convenience to avoid
      any service interruptions.
    </p>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca;
                border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;">
            Invoice
          </td>
          <td style="font-size: 13px; color: #111827; font-weight: 600;
                     text-align: right; padding-bottom: 8px;">
            {invoice_number}
          </td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6b7280; padding-bottom: 8px;">
            Was Due
          </td>
          <td style="font-size: 13px; color: #dc2626; font-weight: 600;
                     text-align: right; padding-bottom: 8px;">
            {due_date}
          </td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6b7280;">Balance Due</td>
          <td style="font-size: 20px; color: #dc2626; font-weight: 800;
                     text-align: right;">
            ${balance_due:,.2f}
          </td>
        </tr>
      </table>
    </div>

    <a href="{pay_url}" style="{_BUTTON_STYLE}">
      Pay Now
    </a>

    {_divider()}

    <p style="margin: 0; font-size: 13px; color: #9ca3af;">
      If you believe this is an error or need to discuss payment arrangements,
      reply to this email — we're happy to work with you.
    </p>
    """
    return _wrap(business_name, content)


# ─────────────────────────────────────────────────────────────
# TEMPLATE 11 — DAILY DIGEST (to business owner)
# ─────────────────────────────────────────────────────────────

def daily_digest_template(
    business_name: str,
    date_str: str,
    new_requests: int,
    scheduled_today: int,
    due_today: int,
    overdue_count: int,
    overdue_amount: float,
    revenue_today: float,
) -> str:
    """Daily business digest email sent to the owner."""

    def _stat_cell(label: str, value: str, color: str = "#111827") -> str:
        return f"""
        <td style="padding: 16px 20px; text-align: center;
                   border-right: 1px solid #e5e7eb;">
          <p style="margin: 0 0 4px; font-size: 22px; font-weight: 800;
                    color: {color};">{value}</p>
          <p style="margin: 0; font-size: 11px; color: #9ca3af;
                    text-transform: uppercase; letter-spacing: 0.06em;">
            {label}
          </p>
        </td>"""

    overdue_color = "#dc2626" if overdue_count > 0 else "#16a34a"
    revenue_color = "#16a34a" if revenue_today > 0 else "#6b7280"

    content = f"""
    <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 700;
               color: #111827; letter-spacing: -0.02em;">
      Daily Business Digest
    </h2>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280;">
      {business_name} &middot; {date_str}
    </p>

    <div style="background-color: #f9fafb; border-radius: 8px;
                overflow: hidden; margin-bottom: 24px;
                border: 1px solid #e5e7eb;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          {_stat_cell("New Requests", str(new_requests), "#f97316")}
          {_stat_cell("Jobs Today", str(scheduled_today))}
          {_stat_cell("Invoices Due", str(due_today))}
          <td style="padding: 16px 20px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 22px; font-weight: 800;
                      color: {revenue_color};">
              ${revenue_today:,.2f}
            </p>
            <p style="margin: 0; font-size: 11px; color: #9ca3af;
                      text-transform: uppercase; letter-spacing: 0.06em;">
              Revenue Today
            </p>
          </td>
        </tr>
      </table>
    </div>

    {'<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 20px; margin-bottom: 24px;"><p style="margin: 0; font-size: 14px; color: #dc2626; font-weight: 500;">&#9888; ' + str(overdue_count) + ' overdue invoice' + ('s' if overdue_count != 1 else '') + ' totalling $' + f"{overdue_amount:,.2f}" + ' require attention.</p></div>' if overdue_count > 0 else ''}

    <p style="margin: 0; font-size: 13px; color: #9ca3af;">
      Log in to your Gritly dashboard to view full details and take action.
    </p>
    """
    footer = (
        f"Daily digest for {business_name}. "
        "Automated by Gritly — sent each morning."
    )
    return _wrap(business_name, content, footer_note=footer)
