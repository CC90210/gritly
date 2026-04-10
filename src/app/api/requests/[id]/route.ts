import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceRequests, clients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";

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

  const REQUEST_STATUSES = new Set(["new", "reviewing", "scheduled", "declined", "converted"]);

  const body = await parseBody<{
    status?: string;
    notes?: string;
    convertToClient?: boolean;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (body.status !== undefined && !REQUEST_STATUSES.has(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${[...REQUEST_STATUSES].join(", ")}` },
      { status: 422 }
    );
  }

  let convertedClientId: string | undefined;

  if (body.convertToClient && !request.convertedToClientId) {
    // Re-fetch the request to guard against race conditions where two concurrent
    // requests both see convertedToClientId as null and both try to insert
    const [fresh] = await db
      .select({ convertedToClientId: serviceRequests.convertedToClientId })
      .from(serviceRequests)
      .where(and(eq(serviceRequests.id, id), eq(serviceRequests.orgId, orgId)))
      .limit(1);

    if (fresh?.convertedToClientId) {
      return NextResponse.json(
        { error: "Request has already been converted to a client", existingClientId: fresh.convertedToClientId },
        { status: 409 }
      );
    }

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
