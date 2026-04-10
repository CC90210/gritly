import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviewRequests } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

export async function GET(_req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const rows = await db
    .select()
    .from(reviewRequests)
    .where(eq(reviewRequests.orgId, orgId))
    .orderBy(desc(reviewRequests.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

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

  logAudit({ orgId, userId, action: "create", entityType: "review_request", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
