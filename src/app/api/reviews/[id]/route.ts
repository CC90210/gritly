import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviewRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("admin");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const [deleted] = await db
    .delete(reviewRequests)
    .where(and(eq(reviewRequests.id, id), eq(reviewRequests.orgId, orgId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  logAudit({ orgId, userId, action: "delete", entityType: "review_request", entityId: id });

  return NextResponse.json({ success: true });
}
