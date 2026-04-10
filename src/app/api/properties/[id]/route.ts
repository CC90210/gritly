import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { properties, quotes, jobs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId } = authResult;

  const { id } = await params;

  const [row] = await db
    .select()
    .from(properties)
    .where(and(eq(properties.id, id), eq(properties.orgId, orgId)))
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

  const { id } = await params;

  const body = await parseBody<{
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    notes?: string;
    lat?: number;
    lng?: number;
    isPrimary?: boolean;
  }>(req);
  if (body instanceof NextResponse) return body;

  const allowed = {
    ...(body.addressLine1 !== undefined && { addressLine1: body.addressLine1 }),
    ...(body.addressLine2 !== undefined && { addressLine2: body.addressLine2 }),
    ...(body.city !== undefined && { city: body.city }),
    ...(body.province !== undefined && { province: body.province }),
    ...(body.postalCode !== undefined && { postalCode: body.postalCode }),
    ...(body.notes !== undefined && { notes: body.notes }),
    ...(body.lat !== undefined && { lat: body.lat }),
    ...(body.lng !== undefined && { lng: body.lng }),
    ...(body.isPrimary !== undefined && { isPrimary: body.isPrimary }),
  };

  const [updated] = await db
    .update(properties)
    .set(allowed)
    .where(and(eq(properties.id, id), eq(properties.orgId, orgId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({ orgId, userId, action: "update", entityType: "property", entityId: id, metadata: body });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("admin");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const { id } = await params;

  // Prevent deletion if quotes or jobs reference this property
  const [quotesRef] = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(eq(quotes.propertyId, id))
    .limit(1);
  const [jobsRef] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.propertyId, id))
    .limit(1);

  if (quotesRef || jobsRef) {
    return NextResponse.json(
      { error: "Cannot delete property with existing quotes or jobs" },
      { status: 422 }
    );
  }

  const [deleted] = await db
    .delete(properties)
    .where(and(eq(properties.id, id), eq(properties.orgId, orgId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({ orgId, userId, action: "delete", entityType: "property", entityId: id });

  return NextResponse.json({ success: true });
}
