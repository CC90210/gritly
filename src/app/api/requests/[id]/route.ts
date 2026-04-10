import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceRequests, clients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

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

  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(and(eq(serviceRequests.id, id), eq(serviceRequests.orgId, orgId)))
    .limit(1);

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as {
    status?: string;
    notes?: string;
    convertToClient?: boolean;
  };

  let convertedClientId: string | undefined;

  if (body.convertToClient && !request.convertedToClientId) {
    const [newClient] = await db
      .insert(clients)
      .values({
        orgId,
        firstName: request.firstName,
        lastName: request.lastName,
        email: request.email,
        phone: request.phone ?? null,
        source: request.source ?? "website",
        isLead: false,
      })
      .returning();

    convertedClientId = newClient.id;
    logAudit({ orgId, userId, action: "create", entityType: "client", entityId: newClient.id, metadata: { convertedFromRequest: id } });
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.status) updateData.status = body.status;
  if (body.notes) updateData.notes = body.notes;
  if (convertedClientId) {
    updateData.convertedToClientId = convertedClientId;
    updateData.status = "scheduled";
  }

  const [updated] = await db
    .update(serviceRequests)
    .set(updateData)
    .where(and(eq(serviceRequests.id, id), eq(serviceRequests.orgId, orgId)))
    .returning();

  logAudit({ orgId, userId, action: "update", entityType: "service_request", entityId: id, metadata: body });

  return NextResponse.json({
    ...updated,
    ...(convertedClientId ? { newClientId: convertedClientId } : {}),
  });
}
