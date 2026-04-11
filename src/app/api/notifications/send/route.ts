import { NextRequest, NextResponse } from "next/server";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { parseBody } from "@/lib/utils/parse-body";
import { sendEmail, getOwnerCc, isEmailConfigured } from "@/lib/email";
import {
  bookingConfirmationTemplate,
  invoiceOverdueTemplate,
  invoiceTemplate,
  jobCompletedTemplate,
  jobScheduledTemplate,
  paymentReceivedTemplate,
  quoteApprovedTemplate,
  quoteFollowUpTemplate,
  quoteTemplate,
  reviewRequestTemplate,
} from "@/lib/email/templates";
import { rateLimit } from "@/lib/middleware/rate-limit";

const APP_URL = process.env.APP_URL ?? "https://gritly.vercel.app";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  type?: NotificationType;
  recipientEmail?: string;
  recipientPhone?: string;
  data?: Record<string, unknown>;
}

function requireFields(data: Record<string, unknown>, fields: string[]): string | null {
  const missing = fields.filter((field) => {
    const value = data[field];
    return value == null || value === "";
  });

  return missing.length > 0 ? `Missing required fields: ${missing.join(", ")}` : null;
}

function getString(data: Record<string, unknown>, field: string): string | undefined {
  const value = data[field];
  return typeof value === "string" ? value : undefined;
}

function getNumber(data: Record<string, unknown>, field: string): number | undefined {
  const value = data[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

type LineItems = Parameters<typeof quoteTemplate>[0]["items"];

function getLineItems(data: Record<string, unknown>): LineItems {
  const items = data.items;
  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return [];
    }

    const candidate = item as Record<string, unknown>;
    const description = getString(candidate, "description");
    const quantity = getNumber(candidate, "quantity");
    const unitPrice = getNumber(candidate, "unitPrice");
    const total = getNumber(candidate, "total");

    if (!description || quantity === undefined || unitPrice === undefined || total === undefined) {
      return [];
    }

    return [{ description, quantity, unitPrice, total }];
  });
}

async function handleQuoteSent(to: string, data: Record<string, unknown>): Promise<void> {
  const err = requireFields(data, ["businessName", "clientName", "quoteNumber", "total", "quoteId"]);
  if (err) throw new Error(err);

  await sendEmail({
    to,
    subject: `Your Quote ${getString(data, "quoteNumber")} from ${getString(data, "businessName")}`,
    html: quoteTemplate({
      businessName: getString(data, "businessName")!,
      clientName: getString(data, "clientName")!,
      quoteNumber: getString(data, "quoteNumber")!,
      total: getNumber(data, "total")!,
      items: getLineItems(data),
      viewUrl: getString(data, "viewUrl") ?? `${APP_URL}/portal/quotes/${getString(data, "quoteId")}`,
      validUntil: getString(data, "validUntil"),
    }),
    cc: getOwnerCc(),
  });
}

async function handleQuoteApproved(to: string, data: Record<string, unknown>): Promise<void> {
  const err = requireFields(data, ["businessName", "clientName", "quoteNumber", "total", "approvedAt"]);
  if (err) throw new Error(err);

  await sendEmail({
    to,
    subject: `Quote Approved - ${getString(data, "quoteNumber")}`,
    html: quoteApprovedTemplate({
      businessName: getString(data, "businessName")!,
      clientName: getString(data, "clientName")!,
      quoteNumber: getString(data, "quoteNumber")!,
      total: getNumber(data, "total")!,
      approvedAt: getString(data, "approvedAt")!,
    }),
  });
}

async function handleInvoiceSent(to: string, data: Record<string, unknown>): Promise<void> {
  const err = requireFields(data, ["businessName", "clientName", "invoiceNumber", "total", "dueDate", "invoiceId"]);
  if (err) throw new Error(err);

  await sendEmail({
    to,
    subject: `Invoice ${getString(data, "invoiceNumber")} from ${getString(data, "businessName")}`,
    html: invoiceTemplate({
      businessName: getString(data, "businessName")!,
      clientName: getString(data, "clientName")!,
      invoiceNumber: getString(data, "invoiceNumber")!,
      total: getNumber(data, "total")!,
      amountPaid: getNumber(data, "amountPaid") ?? 0,
      dueDate: getString(data, "dueDate")!,
      items: getLineItems(data),
      payUrl: getString(data, "payUrl") ?? `${APP_URL}/portal/invoices/${getString(data, "invoiceId")}/pay`,
    }),
    cc: getOwnerCc(),
  });
}

async function handlePaymentReceived(to: string, data: Record<string, unknown>): Promise<void> {
  const err = requireFields(data, ["businessName", "clientName", "invoiceNumber", "amountPaid", "paidAt"]);
  if (err) throw new Error(err);

  await sendEmail({
    to,
    subject: `Payment Confirmed - Invoice ${getString(data, "invoiceNumber")}`,
    html: paymentReceivedTemplate({
      businessName: getString(data, "businessName")!,
      clientName: getString(data, "clientName")!,
      invoiceNumber: getString(data, "invoiceNumber")!,
      amountPaid: getNumber(data, "amountPaid")!,
      paidAt: getString(data, "paidAt")!,
    }),
    cc: getOwnerCc(),
  });
}

async function handleJobScheduled(to: string, data: Record<string, unknown>): Promise<void> {
  const err = requireFields(data, ["businessName", "clientName", "jobNumber", "jobTitle", "scheduledStart", "scheduledEnd"]);
  if (err) throw new Error(err);

  await sendEmail({
    to,
    subject: `Appointment Confirmed - ${getString(data, "jobTitle")}`,
    html: jobScheduledTemplate({
      businessName: getString(data, "businessName")!,
      clientName: getString(data, "clientName")!,
      jobNumber: getString(data, "jobNumber")!,
      jobTitle: getString(data, "jobTitle")!,
      scheduledStart: getString(data, "scheduledStart")!,
      scheduledEnd: getString(data, "scheduledEnd")!,
      address: getString(data, "address"),
      technician: getString(data, "technician"),
    }),
    cc: getOwnerCc(),
  });
}

async function handleJobCompleted(to: string, data: Record<string, unknown>): Promise<void> {
  const err = requireFields(data, ["businessName", "clientName", "jobNumber", "jobTitle", "completedAt"]);
  if (err) throw new Error(err);

  await sendEmail({
    to,
    subject: `Work Complete - ${getString(data, "jobTitle")}`,
    html: jobCompletedTemplate({
      businessName: getString(data, "businessName")!,
      clientName: getString(data, "clientName")!,
      jobNumber: getString(data, "jobNumber")!,
      jobTitle: getString(data, "jobTitle")!,
      completedAt: getString(data, "completedAt")!,
      nextSteps: getString(data, "nextSteps"),
    }),
    cc: getOwnerCc(),
  });
}

async function handleReviewRequest(to: string, data: Record<string, unknown>): Promise<void> {
  const err = requireFields(data, ["businessName", "clientName", "jobTitle", "reviewRequestId"]);
  if (err) throw new Error(err);

  await sendEmail({
    to,
    subject: `How did we do? - ${getString(data, "jobTitle")}`,
    html: reviewRequestTemplate({
      businessName: getString(data, "businessName")!,
      clientName: getString(data, "clientName")!,
      jobTitle: getString(data, "jobTitle")!,
      reviewUrl: getString(data, "reviewUrl") ?? `${APP_URL}/review/${getString(data, "reviewRequestId")}`,
    }),
    cc: getOwnerCc(),
  });
}

async function handleBookingConfirmation(to: string, data: Record<string, unknown>): Promise<void> {
  const err = requireFields(data, ["businessName", "clientName", "serviceType", "referenceNumber"]);
  if (err) throw new Error(err);

  await sendEmail({
    to,
    subject: `We received your service request - ${getString(data, "businessName")}`,
    html: bookingConfirmationTemplate({
      businessName: getString(data, "businessName")!,
      clientName: getString(data, "clientName")!,
      serviceType: getString(data, "serviceType")!,
      preferredDate: getString(data, "preferredDate"),
      preferredTime: getString(data, "preferredTime"),
      referenceNumber: getString(data, "referenceNumber")!,
      address: getString(data, "address"),
    }),
    cc: getOwnerCc(),
  });
}

async function handleQuoteFollowup(to: string, data: Record<string, unknown>): Promise<void> {
  const err = requireFields(data, ["businessName", "clientName", "quoteNumber", "total", "quoteId"]);
  if (err) throw new Error(err);

  await sendEmail({
    to,
    subject: `Following up on Quote ${getString(data, "quoteNumber")}`,
    html: quoteFollowUpTemplate({
      businessName: getString(data, "businessName")!,
      clientName: getString(data, "clientName")!,
      quoteNumber: getString(data, "quoteNumber")!,
      total: getNumber(data, "total")!,
      viewUrl: getString(data, "viewUrl") ?? `${APP_URL}/portal/quotes/${getString(data, "quoteId")}`,
      daysSinceSent: getNumber(data, "daysSinceSent"),
    }),
    cc: getOwnerCc(),
  });
}

async function handleInvoiceOverdue(to: string, data: Record<string, unknown>): Promise<void> {
  const err = requireFields(data, ["businessName", "clientName", "invoiceNumber", "balanceDue", "dueDate", "invoiceId"]);
  if (err) throw new Error(err);

  await sendEmail({
    to,
    subject: `Payment Overdue - Invoice ${getString(data, "invoiceNumber")}`,
    html: invoiceOverdueTemplate({
      businessName: getString(data, "businessName")!,
      clientName: getString(data, "clientName")!,
      invoiceNumber: getString(data, "invoiceNumber")!,
      balanceDue: getNumber(data, "balanceDue")!,
      dueDate: getString(data, "dueDate")!,
      payUrl: getString(data, "payUrl") ?? `${APP_URL}/portal/invoices/${getString(data, "invoiceId")}/pay`,
      daysOverdue: getNumber(data, "daysOverdue"),
    }),
    cc: getOwnerCc(),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { userId } = authResult;

  const limited = rateLimit(`session:notifications:${userId}`, 60, 60_000);
  if (limited) return limited;

  const body = await parseBody<NotificationRequest>(req);
  if (body instanceof NextResponse) return body;

  const { type, recipientEmail, data } = body;

  if (!type || !recipientEmail || !data) {
    return NextResponse.json(
      { error: "type, recipientEmail, and data are required" },
      { status: 400 },
    );
  }

  if (!EMAIL_RE.test(recipientEmail)) {
    return NextResponse.json({ error: "recipientEmail must be a valid email address" }, { status: 422 });
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
        await handleQuoteApproved(recipientEmail, data);
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
        return NextResponse.json({ error: `Unknown notification type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, type, to: recipientEmail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
