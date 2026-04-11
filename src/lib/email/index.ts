import nodemailer from "nodemailer";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  cc?: string;
}

export interface SendEmailResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
}

// Reusable transporter - created lazily on first use.
// Avoids creating a new SMTP connection for every email send.
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) return null;

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: false, // STARTTLS on port 587
    auth: { user, pass },
    connectionTimeout: 30_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
  });

  return _transporter;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

/**
 * Send an HTML email via the business owner's Gmail SMTP (App Password).
 * Reads credentials from environment variables - never hardcoded.
 *
 * Configure in .env.local:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_NAME, FROM_EMAIL
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const transporter = getTransporter();
  const fromName = process.env.FROM_NAME ?? "";
  const fromEmail = process.env.FROM_EMAIL ?? process.env.SMTP_USER ?? "";

  if (!transporter) {
    console.warn("[email] SMTP_USER or SMTP_PASSWORD not set - email not sent:", params.subject);
    return { success: false, skipped: true, reason: "Email service not configured" };
  }

  await transporter.sendMail({
    from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
    to: params.to,
    cc: params.cc,
    subject: params.subject,
    html: params.html,
  });

  return { success: true };
}

/**
 * Returns the CC address for outbound client emails (owner gets a copy).
 * Falls back to FROM_EMAIL when CC_EMAIL is not explicitly set.
 */
export function getOwnerCc(): string | undefined {
  return process.env.CC_EMAIL ?? process.env.FROM_EMAIL ?? undefined;
}
