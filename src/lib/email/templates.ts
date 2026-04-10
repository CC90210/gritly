/**
 * templates.ts
 * HTML email templates for all Gritly notification types.
 *
 * All templates use inline CSS — email clients ignore external stylesheets.
 * Brand: dark header (#111827), white card body, orange accent (#f97316).
 * Trade-appropriate copy for field service businesses.
 */

// ─────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────

const BTN =
  "display:inline-block;padding:12px 28px;background-color:#f97316;" +
  "color:#ffffff;text-decoration:none;border-radius:6px;" +
  "font-weight:600;font-size:15px;letter-spacing:0.01em;";

const BTN_SECONDARY =
  "display:inline-block;padding:10px 24px;background-color:#ffffff;" +
  "color:#111827;text-decoration:none;border-radius:6px;" +
  "font-weight:500;font-size:14px;border:1.5px solid #d1d5db;";

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />`;
}

function badge(text: string, color = "#f97316"): string {
  return `<span style="display:inline-block;padding:3px 10px;` +
    `background-color:${color}20;color:${color};border-radius:999px;` +
    `font-size:12px;font-weight:600;">${text}</span>`;
}

function lineItemRow(description: string, amount: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:#374151;
      border-bottom:1px solid #f3f4f6;">${description}</td>
    <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:500;
      text-align:right;border-bottom:1px solid #f3f4f6;">${amount}</td>
  </tr>`;
}

function wrap(businessName: string, content: string, footerNote?: string): string {
  const footer =
    footerNote ??
    `You received this email from ${businessName}. Reply directly to contact us.`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${businessName}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background-color:#111827;border-radius:8px 8px 0 0;padding:28px 36px;">
            <span style="color:#f97316;font-size:20px;font-weight:700;letter-spacing:-0.02em;">${businessName}</span>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background-color:#ffffff;padding:36px 36px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            ${content}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:18px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">${footer}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE PARAM TYPES
// ─────────────────────────────────────────────────────────────

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuoteTemplateParams {
  businessName: string;
  clientName: string;
  quoteNumber: string;
  total: number;
  items: LineItem[];
  viewUrl: string;
  validUntil?: string;
}

export interface QuoteApprovedTemplateParams {
  businessName: string;
  clientName: string;
  quoteNumber: string;
  total: number;
  approvedAt: string;
}

export interface InvoiceTemplateParams {
  businessName: string;
  clientName: string;
  invoiceNumber: string;
  total: number;
  amountPaid: number;
  dueDate: string;
  items: LineItem[];
  payUrl: string;
}

export interface PaymentReceivedTemplateParams {
  businessName: string;
  clientName: string;
  invoiceNumber: string;
  amountPaid: number;
  paidAt: string;
}

export interface JobScheduledTemplateParams {
  businessName: string;
  clientName: string;
  jobNumber: string;
  jobTitle: string;
  scheduledStart: string;
  scheduledEnd: string;
  address?: string;
  technician?: string;
}

export interface JobCompletedTemplateParams {
  businessName: string;
  clientName: string;
  jobNumber: string;
  jobTitle: string;
  completedAt: string;
  nextSteps?: string;
}

export interface ReviewRequestTemplateParams {
  businessName: string;
  clientName: string;
  jobTitle: string;
  reviewUrl: string;
}

export interface BookingConfirmationTemplateParams {
  businessName: string;
  clientName: string;
  serviceType: string;
  preferredDate?: string;
  preferredTime?: string;
  referenceNumber: string;
  address?: string;
}

export interface QuoteFollowUpTemplateParams {
  businessName: string;
  clientName: string;
  quoteNumber: string;
  total: number;
  viewUrl: string;
  daysSinceSent?: number;
}

export interface InvoiceOverdueTemplateParams {
  businessName: string;
  clientName: string;
  invoiceNumber: string;
  balanceDue: number;
  dueDate: string;
  payUrl: string;
  daysOverdue?: number;
}

export interface DailyDigestTemplateParams {
  businessName: string;
  dateStr: string;
  newRequests: number;
  scheduledToday: number;
  dueToday: number;
  overdueCount: number;
  overdueAmount: number;
  revenueToday: number;
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 1 — QUOTE SENT
// ─────────────────────────────────────────────────────────────

export function quoteTemplate(p: QuoteTemplateParams): string {
  const itemRows = p.items
    .map((i) =>
      lineItemRow(
        `${i.description} &times; ${i.quantity}`,
        `$${i.total.toLocaleString("en-CA", { minimumFractionDigits: 2 })}`,
      ),
    )
    .join("");

  const validityHtml = p.validUntil
    ? `<p style="margin:0 0 16px;font-size:13px;color:#6b7280;">
        This quote is valid until <strong>${p.validUntil}</strong>.
       </p>`
    : "";

  const content = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.02em;">
      Your Quote is Ready
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      Hi ${p.clientName} — we've prepared a quote for you. Review the details below and approve when you're ready.
    </p>
    <div style="background-color:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Quote Reference</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#111827;">${p.quoteNumber}</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">${itemRows}</table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#111827;">Total</td>
        <td style="padding:12px 0 0;font-size:20px;font-weight:800;color:#f97316;text-align:right;">
          $${p.total.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
        </td>
      </tr>
    </table>
    ${validityHtml}
    <a href="${p.viewUrl}" style="${BTN}">Review &amp; Approve Quote</a>
    ${divider()}
    <p style="margin:0;font-size:13px;color:#9ca3af;">Questions? Simply reply to this email — we're happy to help.</p>
  `;
  return wrap(p.businessName, content);
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 2 — QUOTE APPROVED (owner notification)
// ─────────────────────────────────────────────────────────────

export function quoteApprovedTemplate(p: QuoteApprovedTemplateParams): string {
  const content = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">
      Quote Approved ${badge("Approved", "#16a34a")}
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      <strong>${p.clientName}</strong> approved a quote. Time to schedule the work.
    </p>
    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${lineItemRow("Quote", p.quoteNumber)}
        ${lineItemRow("Client", p.clientName)}
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6b7280;">Total Value</td>
          <td style="padding:8px 0;font-size:16px;color:#16a34a;font-weight:800;text-align:right;">
            $${p.total.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
          </td>
        </tr>
        ${lineItemRow("Approved At", p.approvedAt)}
      </table>
    </div>
    <p style="margin:0;font-size:14px;color:#374151;">
      Next steps: schedule the job, assign a technician, and convert the quote to an invoice when work is complete.
    </p>
  `;
  return wrap(
    p.businessName,
    content,
    `Internal notification for ${p.businessName}. Automated by Gritly.`,
  );
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 3 — INVOICE SENT
// ─────────────────────────────────────────────────────────────

export function invoiceTemplate(p: InvoiceTemplateParams): string {
  const balanceDue = p.total - p.amountPaid;
  const itemRows = p.items
    .map((i) =>
      lineItemRow(
        `${i.description} &times; ${i.quantity}`,
        `$${i.total.toLocaleString("en-CA", { minimumFractionDigits: 2 })}`,
      ),
    )
    .join("");
  const paidRow =
    p.amountPaid > 0
      ? lineItemRow(
          "Amount Paid (deposit)",
          `&minus;$${p.amountPaid.toLocaleString("en-CA", { minimumFractionDigits: 2 })}`,
        )
      : "";

  const content = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Invoice ${p.invoiceNumber}</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      Hi ${p.clientName} — thank you for choosing ${p.businessName}. Your invoice is ready below.
    </p>
    <div style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#9a3412;font-weight:500;">
        Payment due by <strong>${p.dueDate}</strong>
      </p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">${itemRows}</table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${paidRow}
      <tr>
        <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#111827;">Balance Due</td>
        <td style="padding:12px 0 0;font-size:20px;font-weight:800;color:#f97316;text-align:right;">
          $${balanceDue.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
        </td>
      </tr>
    </table>
    <a href="${p.payUrl}" style="${BTN}">Pay Invoice Online</a>
    ${divider()}
    <p style="margin:0;font-size:13px;color:#9ca3af;">Questions about your invoice? Reply to this email and we'll sort it out.</p>
  `;
  return wrap(p.businessName, content);
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 4 — PAYMENT RECEIVED
// ─────────────────────────────────────────────────────────────

export function paymentReceivedTemplate(p: PaymentReceivedTemplateParams): string {
  const content = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">
      Payment Received ${badge("Paid", "#16a34a")}
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      Hi ${p.clientName} — we've received your payment. Thank you!
    </p>
    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${lineItemRow("Invoice", p.invoiceNumber)}
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6b7280;">Amount Paid</td>
          <td style="padding:8px 0;font-size:18px;color:#16a34a;font-weight:800;text-align:right;">
            $${p.amountPaid.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
          </td>
        </tr>
        ${lineItemRow("Date", p.paidAt)}
      </table>
    </div>
    <p style="margin:0;font-size:14px;color:#374151;">
      Keep this email as your payment confirmation. We appreciate your business and look forward to serving you again.
    </p>
  `;
  return wrap(p.businessName, content);
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 5 — JOB SCHEDULED
// ─────────────────────────────────────────────────────────────

export function jobScheduledTemplate(p: JobScheduledTemplateParams): string {
  const addressRow = p.address
    ? lineItemRow("Service Address", p.address)
    : "";
  const techRow = p.technician
    ? lineItemRow("Assigned Technician", p.technician)
    : "";

  const content = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Service Appointment Confirmed</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      Hi ${p.clientName} — your appointment is confirmed. Here are the details:
    </p>
    <div style="background-color:#f9fafb;border-left:4px solid #f97316;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111827;">${p.jobTitle}</p>
      <p style="margin:0;font-size:13px;color:#9ca3af;">Reference: ${p.jobNumber}</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${lineItemRow("Date &amp; Time", p.scheduledStart)}
      ${lineItemRow("Estimated End", p.scheduledEnd)}
      ${addressRow}
      ${techRow}
    </table>
    <p style="margin:0;font-size:14px;color:#374151;">
      If you need to reschedule or have any questions before your appointment, reply to this email or call us directly.
    </p>
  `;
  return wrap(p.businessName, content);
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 6 — JOB COMPLETED
// ─────────────────────────────────────────────────────────────

export function jobCompletedTemplate(p: JobCompletedTemplateParams): string {
  const nextHtml = p.nextSteps
    ? `<div style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;color:#9a3412;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Next Steps</p>
        <p style="margin:0;font-size:14px;color:#374151;">${p.nextSteps}</p>
       </div>`
    : "";

  const content = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">
      Work Completed ${badge("Done", "#16a34a")}
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      Hi ${p.clientName} — the job has been completed. Thank you for trusting ${p.businessName} with your service.
    </p>
    <div style="background-color:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#111827;">${p.jobTitle}</p>
      <p style="margin:0;font-size:13px;color:#9ca3af;">${p.jobNumber} &middot; Completed ${p.completedAt}</p>
    </div>
    ${nextHtml}
    <p style="margin:0;font-size:14px;color:#374151;">
      If you have any concerns about the work performed, please don't hesitate to reach out. We stand behind everything we do.
    </p>
  `;
  return wrap(p.businessName, content);
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 7 — REVIEW REQUEST
// ─────────────────────────────────────────────────────────────

export function reviewRequestTemplate(p: ReviewRequestTemplateParams): string {
  const content = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">How Did We Do?</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      Hi ${p.clientName} — we recently completed <strong>${p.jobTitle}</strong> for you.
      Your feedback means everything to us and helps other homeowners find trusted service providers in the area.
    </p>
    <div style="text-align:center;margin-bottom:28px;">
      <p style="margin:0 0 8px;font-size:28px;">&#11088;&#11088;&#11088;&#11088;&#11088;</p>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">It only takes 60 seconds.</p>
      <a href="${p.reviewUrl}" style="${BTN}">Leave a Review</a>
    </div>
    ${divider()}
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
      Not happy with something? Reply to this email and we'll make it right.
    </p>
  `;
  return wrap(p.businessName, content);
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 8 — BOOKING CONFIRMATION
// ─────────────────────────────────────────────────────────────

export function bookingConfirmationTemplate(p: BookingConfirmationTemplateParams): string {
  const dateLine = p.preferredDate ?? "We'll be in touch to confirm a time";
  const timePart = p.preferredTime ? ` at ${p.preferredTime}` : "";
  const scheduleStr = `${dateLine}${timePart}`;
  const addressRow = p.address ? lineItemRow("Service Address", p.address) : "";

  const content = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Request Received</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      Hi ${p.clientName} — thanks for reaching out to ${p.businessName}.
      We've received your service request and will follow up shortly to confirm your appointment.
    </p>
    <div style="background-color:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${lineItemRow("Request", p.serviceType)}
        ${lineItemRow("Preferred Time", scheduleStr)}
        ${addressRow}
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6b7280;">Reference</td>
          <td style="padding:8px 0;font-size:13px;color:#9ca3af;font-family:monospace;text-align:right;">${p.referenceNumber}</td>
        </tr>
      </table>
    </div>
    <p style="margin:0;font-size:14px;color:#374151;">
      A team member will contact you within 1 business day to confirm your appointment details.
      If you need immediate assistance, reply to this email or call us directly.
    </p>
  `;
  return wrap(p.businessName, content);
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 9 — QUOTE FOLLOW-UP
// ─────────────────────────────────────────────────────────────

export function quoteFollowUpTemplate(p: QuoteFollowUpTemplateParams): string {
  const days = p.daysSinceSent ?? 3;
  const dayLabel = days === 1 ? "1 day" : `${days} days`;

  const content = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Following Up on Your Quote</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      Hi ${p.clientName} — we sent you a quote ${dayLabel} ago and wanted to check in.
      We'd love to get started on your project whenever you're ready.
    </p>
    <div style="background-color:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${lineItemRow("Quote", p.quoteNumber)}
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6b7280;">Total</td>
          <td style="padding:8px 0;font-size:16px;color:#f97316;font-weight:800;text-align:right;">
            $${p.total.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
          </td>
        </tr>
      </table>
    </div>
    <a href="${p.viewUrl}" style="${BTN}">Review Quote</a>
    &nbsp;&nbsp;
    <a href="mailto:?subject=Question about ${p.quoteNumber}" style="${BTN_SECONDARY}">Ask a Question</a>
    ${divider()}
    <p style="margin:0;font-size:13px;color:#9ca3af;">
      If you've already made other arrangements, no worries — just let us know and we'll close this out.
    </p>
  `;
  return wrap(p.businessName, content);
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 10 — INVOICE OVERDUE
// ─────────────────────────────────────────────────────────────

export function invoiceOverdueTemplate(p: InvoiceOverdueTemplateParams): string {
  const daysOverdue = p.daysOverdue ?? 1;
  const urgencyColor = daysOverdue > 14 ? "#dc2626" : "#f97316";
  const urgencyLabel = daysOverdue > 14 ? "Urgent" : "Past Due";

  const content = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">
      Invoice Overdue ${badge(urgencyLabel, urgencyColor)}
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      Hi ${p.clientName} — invoice ${p.invoiceNumber} was due on <strong>${p.dueDate}</strong>
      and still shows a balance. Please arrange payment at your earliest convenience.
    </p>
    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${lineItemRow("Invoice", p.invoiceNumber)}
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6b7280;">Was Due</td>
          <td style="padding:8px 0;font-size:13px;color:#dc2626;font-weight:600;text-align:right;">${p.dueDate}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6b7280;">Balance Due</td>
          <td style="padding:8px 0;font-size:20px;color:#dc2626;font-weight:800;text-align:right;">
            $${p.balanceDue.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
          </td>
        </tr>
      </table>
    </div>
    <a href="${p.payUrl}" style="${BTN}">Pay Now</a>
    ${divider()}
    <p style="margin:0;font-size:13px;color:#9ca3af;">
      If you believe this is an error or need to discuss payment arrangements, reply to this email — we're happy to work with you.
    </p>
  `;
  return wrap(p.businessName, content);
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE 11 — DAILY DIGEST (owner)
// ─────────────────────────────────────────────────────────────

export function dailyDigestTemplate(p: DailyDigestTemplateParams): string {
  const revenueColor = p.revenueToday > 0 ? "#16a34a" : "#6b7280";
  const overdueAlert =
    p.overdueCount > 0
      ? `<div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 20px;margin-bottom:24px;">
           <p style="margin:0;font-size:14px;color:#dc2626;font-weight:500;">
             &#9888; ${p.overdueCount} overdue invoice${p.overdueCount !== 1 ? "s" : ""}
             totalling $${p.overdueAmount.toLocaleString("en-CA", { minimumFractionDigits: 2 })} require attention.
           </p>
         </div>`
      : "";

  const content = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Daily Business Digest</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">${p.businessName} &middot; ${p.dateStr}</p>

    <div style="background-color:#f9fafb;border-radius:8px;overflow:hidden;margin-bottom:24px;border:1px solid #e5e7eb;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:16px 20px;text-align:center;border-right:1px solid #e5e7eb;">
            <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#f97316;">${p.newRequests}</p>
            <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">New Requests</p>
          </td>
          <td style="padding:16px 20px;text-align:center;border-right:1px solid #e5e7eb;">
            <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">${p.scheduledToday}</p>
            <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Jobs Today</p>
          </td>
          <td style="padding:16px 20px;text-align:center;border-right:1px solid #e5e7eb;">
            <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">${p.dueToday}</p>
            <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Invoices Due</p>
          </td>
          <td style="padding:16px 20px;text-align:center;">
            <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:${revenueColor};">
              $${p.revenueToday.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
            </p>
            <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">Revenue Today</p>
          </td>
        </tr>
      </table>
    </div>

    ${overdueAlert}

    <p style="margin:0;font-size:13px;color:#9ca3af;">
      Log in to your Gritly dashboard to view full details and take action.
    </p>
  `;
  return wrap(
    p.businessName,
    content,
    `Daily digest for ${p.businessName}. Automated by Gritly — sent each morning.`,
  );
}
