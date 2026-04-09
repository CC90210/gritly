import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceRequests, clients, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const orgId = userRows[0]?.orgId;
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

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

  // Convert to client if requested
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

  return NextResponse.json({
    ...updated,
    ...(convertedClientId ? { newClientId: convertedClientId } : {}),
  });
}
