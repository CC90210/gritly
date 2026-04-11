import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { parseBody } from "@/lib/utils/parse-body";
import { requirePortalClient } from "@/lib/api/portal-context";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

const ALLOWED_STATUSES = new Set(["approved", "declined"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const portalContext = await requirePortalClient();
  if (portalContext instanceof NextResponse) return portalContext;
  const { orgId, userId, client } = portalContext;

  const limited = rateLimit(`portal:${userId}`, 30, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const [quote] = await db
    .select({
      id: quotes.id,
      status: quotes.status,
      clientId: quotes.clientId,
      updatedAt: quotes.updatedAt,
    })
    .from(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.orgId, orgId)))
    .limit(1);

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (quote.clientId !== client.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (quote.status !== "sent") {
    return NextResponse.json(
      { error: "Quote is not in a state that can be approved or declined" },
      { status: 422 },
    );
  }

  const body = await parseBody<{ status?: string; approvedAt?: string }>(req);
  if (body instanceof NextResponse) return body;

  if (!body.status || !ALLOWED_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "status must be 'approved' or 'declined'" }, { status: 422 });
  }

  const approvedAt = body.status === "approved"
    ? (body.approvedAt ? new Date(body.approvedAt) : new Date())
    : null;
  const optimisticGuard = quote.updatedAt
    ? eq(quotes.updatedAt, quote.updatedAt)
    : isNull(quotes.updatedAt);

  const [updated] = await db
    .update(quotes)
    .set({
      status: body.status,
      approvedAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(quotes.id, id),
        eq(quotes.orgId, orgId),
        eq(quotes.clientId, client.id),
        eq(quotes.status, "sent"),
        optimisticGuard,
      ),
    )
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Quote was updated by another request. Reload and try again." },
      { status: 409 },
    );
  }

  await logAudit({
    orgId,
    userId,
    action: "update",
    entityType: "quote",
    entityId: id,
    metadata: { status: body.status, portalAction: true },
  });

  return NextResponse.json(updated);
}
