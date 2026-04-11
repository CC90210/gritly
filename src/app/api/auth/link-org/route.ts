import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await request.json() as { orgId?: string };
  if (!orgId) {
    return NextResponse.json({ error: "orgId required" }, { status: 400 });
  }

  const sessionEmail = session.user.email?.trim().toLowerCase();
  const [org] = await db
    .select({ createdByEmail: organizations.createdByEmail })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (!sessionEmail || org.createdByEmail !== sessionEmail) {
    return NextResponse.json(
      { error: "Not authorized to link to this organization" },
      { status: 403 }
    );
  }

  await db
    .update(users)
    .set({ orgId, role: "owner" })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true });
}
