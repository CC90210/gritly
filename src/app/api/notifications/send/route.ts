import { NextRequest, NextResponse } from "next/server";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { sendEmail, getOwnerCc, isEmailConfigured } from "@/lib/email";
import {
  quoteTemplate,
  invoiceTemplate,
  jobScheduledTemplate,
  jobCompletedTemplate,
  reviewRequestTemplate,
  bookingConfirmationTemplate,
  quoteFollowUpTemplate,
  invoiceOverdueTemplate,
  paymentReceivedTemplate,
} from "@/lib/email/templates";

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// REQUEST SHAPE
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

type NotificationType =
  | "quote_sent"
  | "quote_approved"
  | "invoice_sent"
  | "payment_received"
  | "job_scheduled"
  | "job_completed"
  | "review_request"
  | "booking_confirmation"
  | "quote_followup"
  | "invoice_overdue";

interface NotificationRequest {
  type: NotificationType;
  recipientEmail: string;
  recipientPhone?: string;
  // Template-specific data â typed loosely here; each handler validates what it needs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally flexible; handlers narrow the type
  data: Record<string, any>;
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// HELPERS
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const APP_URL = process.env.APP_URL ?? "https://gritly.vercel.app";

function requireFields(
  data: Record<string, unknown>,
  fields: string[],
): string | null {
  const missing = fields.filter((f) => data[f] == null || data[f] === "");
  return missing.length > 0 ? `Missing required fields: ${missing.join(", ")}` : null;
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// HANDLER MAP
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function handleQuoteSent(
  to: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- data is arbitrary JSON from caller
  data: Record<string, any>,
): Promise<void> {
  const err = requireFields(data, [
    "businessName", "clientName", "quoteNumber", "total", "quoteId",
  ]);
  if (err) throw new Error(err);

  const html = quoteTemplate({
    businessName: data.businessName as string,
    clientName: data.clientName as string,
    quoteNumber: data.quoteNumber as string,
    total: Number(data.total),
    items: (data.items ?? []) as Parameters<typeof quoteTemplate>[0]["items"],
    viewUrl: data.viewUrl ?? `${APP_URL}/portal/quotes/${data.quoteId}`,
    validUntil: data.validUntil as string | undefined,
  });

  await sendEmail({
    to,
    subject: `Your Quote ${data.quoteNumber} from ${data.businessName}`,
    html,
    cc: getOwnerCc(),
  });
}

async function handleInvoiceSent(
  to: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
): Promise<void> {
  const err = requireFields(data, [
    "businessName", "clientName", "invoiceNumber", "total", "dueDate", "invoiceId",
  ]);
  if (err) throw new Error(err);

  const html = invoiceTemplate({
    businessName: data.businessName as string,
    clientName: data.clientName as string,
    invoiceNumber: data.invoiceNumber as string,
    total: Number(data.total),
    amountPaid: Number(data.amountPaid ?? 0),
    dueDate: data.dueDate as string,
    items: (data.items ?? []) as Parameters<typeof invoiceTemplate>[0]["items"],
    payUrl: data.payUrl ?? `${APP_URL}/portal/invoices/${data.invoiceId}/pay`,
  });

  await sendEmail({
    to,
    subject: `Invoice ${data.invoiceNumber} from ${data.businessName}`,
    html,
    cc: getOwnerCc(),
  });
}

async function handlePaymentReceived(
  to: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
): Promise<void> {
  const err = requireFields(data, [
    "businessName", "clientName", "invoiceNumber", "amountPaid", "paidAt",
  ]);
  if (err) throw new Error(err);

  const html = paymentReceivedTemplate({
    businessName: data.businessName as string,
    clientName: data.clientName as string,
    invoiceNumber: data.invoiceNumber as string,
    amountPaid: Number(data.amountPaid),
    paidAt: data.paidAt as string,
  });

  await sendEmail({
    to,
    subject: `Payment Confirmed â Invoice ${data.invoiceNumber}`,
    html,
    cc: getOwnerCc(),
  });
}

async function handleJobScheduled(
  to: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
): Promise<void> {
  const err = requireFields(data, [
    "businessName", "clientName", "jobNumber", "jobTitle",
    "scheduledStart", "scheduledEnd",
  ]);
  if (err) throw new Error(err);

  const html = jobScheduledTemplate({
    businessName: data.businessName as string,
    clientName: data.clientName as string,
    jobNumber: data.jobNumber as string,
    jobTitle: data.jobTitle as string,
    scheduledStart: data.scheduledStart as string,
    scheduledEnd: data.scheduledEnd as string,
    address: data.address as string | undefined,
    technician: data.technician as string | undefined,
  });

  await sendEmail({
    to,
    subject: `Appointment Confirmed â ${data.jobTitle}`,
    html,
    cc: getOwnerCc(),
  });
}

async function handleJobCompleted(
  to: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
): Promise<void> {
  const err = requireFields(data, [
    "businessName", "clientName", "jobNumber", "jobTitle", "completedAt",
  ]);
  if (err) throw new Error(err);

  const html = jobCompletedTemplate({
    businessName: data.businessName as string,
    clientName: data.clientName as string,
    jobNumber: data.jobNumber as string,
    jobTitle: data.jobTitle as string,
    completedAt: data.completedAt as string,
    nextSteps: data.nextSteps as string | undefined,
  });

  await sendEmail({
    to,
    subject: `Work Complete â ${data.jobTitle}`,
    html,
    cc: getOwnerCc(),
  });
}

async function handleReviewRequest(
  to: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
): Promise<void> {
  const err = requireFields(data, [
    "businessName", "clientName", "jobTitle", "reviewRequestId",
  ]);
  if (err) throw new Error(err);

  const html = reviewRequestTemplate({
    businessName: data.businessName as string,
    clientName: data.clientName as string,
    jobTitle: data.jobTitle as string,
    reviewUrl: data.reviewUrl ?? `${APP_URL}/review/${data.reviewRequestId}`,
  });

  await sendEmail({
    to,
    subject: `How did we do? â ${data.jobTitle}`,
    html,
    cc: getOwnerCc(),
  });
}

async function handleBookingConfirmation(
  to: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
): Promise<void> {
  const err = requireFields(data, [
    "businessName", "clientName", "serviceType", "referenceNumber",
  ]);
  if (err) throw new Error(err);

  const html = bookingConfirmationTemplate({
    businessName: data.businessName as string,
    clientName: data.clientName as string,
    serviceType: data.serviceType as string,
    preferredDate: data.preferredDate as string | undefined,
    preferredTime: data.preferredTime as string | undefined,
    referenceNumber: data.referenceNumber as string,
    address: data.address as string | undefined,
  });

  await sendEmail({
    to,
    subject: `We received your service request â ${data.businessName}`,
    html,
    cc: getOwnerCc(),
  });
}

async function handleQuoteFollowup(
  to: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
): Promise<void> {
  const err = requireFields(data, [
    "businessName", "clientName", "quoteNumber", "total", "quoteId",
  ]);
  if (err) throw new Error(err);

  const html = quoteFollowUpTemplate({
    businessName: data.businessName as string,
    clientName: data.clientName as string,
    quoteNumber: data.quoteNumber as string,
    total: Number(data.total),
    viewUrl: data.viewUrl ?? `${APP_URL}/portal/quotes/${data.quoteId}`,
    daysSinceSent: data.daysSinceSent != null ? Number(data.daysSinceSent) : undefined,
  });

  await sendEmail({
    to,
    subject: `Following up on Quote ${data.quoteNumber}`,
    html,
    cc: getOwnerCc(),
  });
}

async function handleInvoiceOverdue(
  to: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
): Promise<void> {
  const err = requireFields(data, [
    "businessName", "clientName", "invoiceNumber", "balanceDue", "dueDate", "invoiceId",
  ]);
  if (err) throw new Error(err);

  const html = invoiceOverdueTemplate({
    businessName: data.businessName as string,
    clientName: data.clientName as string,
    invoiceNumber: data.invoiceNumber as string,
    balanceDue: Number(data.balanceDue),
    dueDate: data.dueDate as string,
    payUrl: data.payUrl ?? `${APP_URL}/portal/invoices/${data.invoiceId}/pay`,
    daysOverdue: data.daysOverdue != null ? Number(data.daysOverdue) : undefined,
  });

  await sendEmail({
    to,
    subject: `Payment Overdue â Invoice ${data.invoiceNumber}`,
    html,
    cc: getOwnerCc(),
  });
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// ROUTE HANDLER
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Require at least technician role -- notifications are sent by the app on behalf of the org
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;

  let body: NotificationRequest;

  try {
    body = (await req.json()) as NotificationRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { type, recipientEmail, data } = body;

  if (!type || !recipientEmail || !data) {
    return NextResponse.json(
      { error: "type, recipientEmail, and data are required" },
      { status: 400 },
    );
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email service is not configured" }, { status: 503 });
  }

  try {
    switch (type) {
      case "quote_sent":
        await handleQuoteSent(recipientEmail, data);
        break;
      case "quote_approved":
        // quote_approved notifies the owner â recipientEmail should be the owner's address
        await sendEmail({
          to: recipientEmail,
          subject: `Quote Approved â ${(data.quoteNumber as string) ?? ""}`,
          html: (await import("@/lib/email/templates")).quoteApprovedTemplate({
            businessName: data.businessName as string,
            clientName: data.clientName as string,
            quoteNumber: data.quoteNumber as string,
            total: Number(data.total),
            approvedAt: data.approvedAt as string,
          }),
        });
        break;
      case "invoice_sent":
        await handleInvoiceSent(recipientEmail, data);
        break;
      case "payment_received":
        await handlePaymentReceived(recipientEmail, data);
        break;
      case "job_scheduled":
        await handleJobScheduled(recipientEmail, data);
        break;
      case "job_completed":
        await handleJobCompleted(recipientEmail, data);
        break;
      case "review_request":
        await handleReviewRequest(recipientEmail, data);
        break;
      case "booking_confirmation":
        await handleBookingConfirmation(recipientEmail, data);
        break;
      case "quote_followup":
        await handleQuoteFollowup(recipientEmail, data);
        break;
      case "invoice_overdue":
        await handleInvoiceOverdue(recipientEmail, data);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown notification type: ${type as string}` },
          { status: 400 },
        );
    }

    return NextResponse.json({ success: true, type, to: recipientEmail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
