import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export type PortalClientContext = {
  orgId: string;
  userId: string;
  email: string | null;
  client: typeof clients.$inferSelect;
};

export async function requirePortalClient(): Promise<PortalClientContext | NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({ orgId: users.orgId, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user?.orgId) {
    return NextResponse.json({ error: "No organization linked" }, { status: 400 });
  }

  let client = (
    await db
      .select()
      .from(clients)
      .where(and(eq(clients.userId, session.user.id), eq(clients.orgId, user.orgId)))
      .limit(1)
  )[0];

  if (!client && user.email) {
    client = (
      await db
        .select()
        .from(clients)
        .where(and(eq(clients.email, user.email), eq(clients.orgId, user.orgId)))
        .limit(1)
    )[0];
  }

  if (!client) {
    return NextResponse.json({ error: "Client record not found" }, { status: 404 });
  }

  return {
    orgId: user.orgId,
    userId: session.user.id,
    email: user.email ?? null,
    client,
  };
}
