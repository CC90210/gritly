import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations, serviceRequests } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { sendEmail } from "@/lib/email";
import { bookingConfirmationTemplate } from "@/lib/email/templates";
import { isValidUuid, normalizeEmail, sanitizeText } from "@/lib/api/validation";
import { parsePagination } from "@/lib/api/pagination";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const baseQuery = db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.orgId, orgId))
    .orderBy(desc(serviceRequests.createdAt));
  const rows = pagination
    ? await baseQuery.limit(pagination.limit).offset(pagination.offset)
    : await baseQuery;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = rateLimit(`ip:requests:${ip}`, 5, 60_000);
  if (limited) return limited;

  const body = await parseBody<{
    orgId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    serviceType?: string;
    description?: string;
    address?: string;
    preferredDate?: string;
    preferredTime?: string;
    source?: string;
    notes?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!isValidUuid(body.orgId)) {
    return NextResponse.json({ error: "A valid orgId is required" }, { status: 422 });
  }

  const firstName = typeof body.firstName === "string" ? sanitizeText(body.firstName, 100) : "";
  const lastName = typeof body.lastName === "string" ? sanitizeText(body.lastName, 100) : "";
  const email = typeof body.email === "string" ? normalizeEmail(body.email).slice(0, 254) : "";
  const serviceType = typeof body.serviceType === "string" ? sanitizeText(body.serviceType, 100) : "";
  const description = typeof body.description === "string" ? sanitizeText(body.description, 2000) : "";

  if (!firstName || !lastName || !email || !serviceType || !description) {
    return NextResponse.json(
      { error: "firstName, lastName, email, serviceType, and description are required" },
      { status: 422 },
    );
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 422 });
  }

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, body.orgId))
    .limit(1);

  if (!org) {
    return NextResponse.json({ error: "Invalid organization" }, { status: 404 });
  }

  const [row] = await db
    .insert(serviceRequests)
    .values({
      orgId: body.orgId,
      firstName,
      lastName,
      email,
      phone: typeof body.phone === "string" ? sanitizeText(body.phone, 30) : null,
      serviceType,
      description,
      address: typeof body.address === "string" ? sanitizeText(body.address, 500) : null,
      preferredDate: typeof body.preferredDate === "string" ? body.preferredDate : null,
      preferredTime: typeof body.preferredTime === "string" ? body.preferredTime : null,
      source: typeof body.source === "string" ? sanitizeText(body.source, 50) : "website",
      notes: typeof body.notes === "string" ? sanitizeText(body.notes, 1000) : null,
      status: "new",
    })
    .returning();

  await logAudit({
    orgId: body.orgId,
    action: "create",
    entityType: "service_request",
    entityId: row.id,
    metadata: { source: row.source, publicRequest: true },
  });

  let confirmationEmailSent = false;
  try {
    const emailResult = await sendEmail({
      to: row.email,
      subject: `We received your service request - ${org.name}`,
      html: bookingConfirmationTemplate({
        businessName: org.name,
        clientName: `${row.firstName} ${row.lastName}`.trim(),
        serviceType: row.serviceType,
        preferredDate: row.preferredDate ?? undefined,
        preferredTime: row.preferredTime ?? undefined,
        referenceNumber: row.id,
        address: row.address ?? undefined,
      }),
    });
    confirmationEmailSent = emailResult.success;
  } catch (error) {
    console.error("[requests] Failed to send confirmation email:", error);
  }

  return NextResponse.json({ ...row, confirmationEmailSent }, { status: 201 });
}

