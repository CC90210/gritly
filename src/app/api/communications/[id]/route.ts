import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const { id } = await params;

  const [existing] = await db
    .select({ id: communications.id, clientId: communications.clientId })
    .from(communications)
    .where(and(eq(communications.id, id), eq(communications.orgId, orgId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Communication not found" }, { status: 404 });
  }

  await db
    .delete(communications)
    .where(and(eq(communications.id, id), eq(communications.orgId, orgId)));

  await logAudit({
    orgId,
    userId,
    action: "delete",
    entityType: "communication",
    entityId: id,
    metadata: { clientId: existing.clientId },
  });

  return new NextResponse(null, { status: 204 });
}
