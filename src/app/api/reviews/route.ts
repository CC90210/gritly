import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviewRequests, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_req: NextRequest) {
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

  const rows = await db
    .select()
    .from(reviewRequests)
    .where(eq(reviewRequests.orgId, orgId))
    .orderBy(desc(reviewRequests.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
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

  const body = await req.json() as {
    clientId?: string;
    jobId?: string;
    sentVia?: string;
    reviewUrl?: string;
  };

  if (!body.clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 422 });
  }

  const [row] = await db
    .insert(reviewRequests)
    .values({
      orgId,
      clientId: body.clientId,
      jobId: body.jobId ?? null,
      sentVia: body.sentVia ?? "email",
      reviewUrl: body.reviewUrl ?? null,
      status: "pending",
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
