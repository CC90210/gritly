import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceRequests, organizations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { sendEmail } from "@/lib/email";
import { bookingConfirmationTemplate } from "@/lib/email/templates";

const sanitize = (s: string, max = 500) => s.trim().slice(0, max);

// GET: requires auth (staff listing requests)
export async function GET(_req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const rows = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.orgId, orgId))
    .orderBy(desc(serviceRequests.createdAt));

  return NextResponse.json(rows);
}

// POST: public -- no auth (website booking widget)
export async function POST(req: NextRequest) {
  // Rate limit by IP for public endpoint
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

  if (!body.orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 422 });
  }

  if (!body.firstName || !body.lastName || !body.email || !body.serviceType || !body.description) {
    return NextResponse.json(
      { error: "firstName, lastName, email, serviceType, and description are required" },
      { status: 422 }
    );
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
      firstName: sanitize(body.firstName, 100),
      lastName: sanitize(body.lastName, 100),
      email: sanitize(body.email, 254),
      phone: body.phone ? sanitize(body.phone, 30) : null,
      serviceType: sanitize(body.serviceType, 100),
      description: sanitize(body.description, 2000),
      address: body.address ? sanitize(body.address, 500) : null,
      preferredDate: body.preferredDate ?? null,
      preferredTime: body.preferredTime ?? null,
      source: body.source ? sanitize(body.source, 50) : "website",
      notes: body.notes ? sanitize(body.notes, 1000) : null,
      status: "new",
    })
    .returning();

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
