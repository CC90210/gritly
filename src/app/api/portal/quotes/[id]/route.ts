import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users, clients, quotes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Portal-scoped quote actions.
 * Clients can approve or decline their own quotes.
 * Requires the user to be authenticated and have a client record in the org.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Resolve the user's org
  const [userRow] = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!userRow?.orgId) {
    return NextResponse.json({ error: "No org" }, { status: 400 });
  }

  const orgId = userRow.orgId;

  // Resolve the client record for this portal user
  let clientId: string | undefined;
  const [byUserId] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.userId, session.user.id), eq(clients.orgId, orgId)))
    .limit(1);
  clientId = byUserId?.id;

  if (!clientId && session.user.email) {
    const [byEmail] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.email, session.user.email), eq(clients.orgId, orgId)))
      .limit(1);
    clientId = byEmail?.id;
  }

  if (!clientId) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Verify the quote belongs to this client (prevents IDOR)
  const [quote] = await db
    .select({ id: quotes.id, status: quotes.status, clientId: quotes.clientId })
    .from(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.orgId, orgId)))
    .limit(1);

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (quote.clientId !== clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (quote.status !== "sent") {
    return NextResponse.json({ error: "Quote is not in a state that can be approved or declined" }, { status: 422 });
  }

  const body = await req.json() as { status?: string; approvedAt?: string };
  const ALLOWED = new Set(["approved", "declined"]);
  if (!body.status || !ALLOWED.has(body.status)) {
    return NextResponse.json({ error: "status must be 'approved' or 'declined'" }, { status: 422 });
  }

  const updateValues: Record<string, unknown> = { status: body.status };
  if (body.status === "approved") {
    updateValues.approvedAt = body.approvedAt ? new Date(body.approvedAt) : new Date();
  }

  const [updated] = await db
    .update(quotes)
    .set(updateValues)
    .where(eq(quotes.id, id))
    .returning();

  return NextResponse.json(updated);
}
