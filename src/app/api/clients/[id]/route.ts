import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, quotes, jobs, invoices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.orgId, orgId)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const body = await parseBody<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    notes?: string;
    tags?: string[];
    isLead?: boolean;
    source?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  const allowed = {
    ...(body.firstName !== undefined && { firstName: body.firstName }),
    ...(body.lastName !== undefined && { lastName: body.lastName }),
    ...(body.email !== undefined && { email: body.email }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.company !== undefined && { company: body.company }),
    ...(body.notes !== undefined && { notes: body.notes }),
    ...(body.tags !== undefined && { tags: body.tags }),
    ...(body.isLead !== undefined && { isLead: body.isLead }),
    ...(body.source !== undefined && { source: body.source }),
    updatedAt: new Date(),
  };

  const [updated] = await db
    .update(clients)
    .set(allowed)
    .where(and(eq(clients.id, id), eq(clients.orgId, orgId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({ orgId, userId, action: "update", entityType: "client", entityId: id, metadata: body });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("admin");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;

  // Cascade delete protection: check for related entities
  const [quoteRef] = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.clientId, id), eq(quotes.orgId, orgId)))
    .limit(1);
  if (quoteRef) {
    return NextResponse.json(
      { error: "Cannot delete client with existing quotes. Delete or reassign them first." },
      { status: 422 }
    );
  }

  const [jobRef] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.clientId, id), eq(jobs.orgId, orgId)))
    .limit(1);
  if (jobRef) {
    return NextResponse.json(
      { error: "Cannot delete client with existing jobs. Delete or reassign them first." },
      { status: 422 }
    );
  }

  const [invoiceRef] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.clientId, id), eq(invoices.orgId, orgId)))
    .limit(1);
  if (invoiceRef) {
    return NextResponse.json(
      { error: "Cannot delete client with existing invoices. Delete or reassign them first." },
      { status: 422 }
    );
  }

  const [deleted] = await db
    .delete(clients)
    .where(and(eq(clients.id, id), eq(clients.orgId, orgId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({ orgId, userId, action: "delete", entityType: "client", entityId: id });

  return NextResponse.json({ success: true });
}
