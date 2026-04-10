import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceItems } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";

export async function GET(_req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const rows = await db
    .select()
    .from(serviceItems)
    .where(eq(serviceItems.orgId, orgId))
    .orderBy(desc(serviceItems.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const body = await parseBody<{
    name?: string;
    description?: string;
    defaultPrice?: number;
    unit?: string;
    category?: string;
    isActive?: boolean;
    sortOrder?: number;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 422 });
  }

  const [row] = await db
    .insert(serviceItems)
    .values({
      orgId,
      name: body.name,
      description: body.description ?? null,
      defaultPrice: body.defaultPrice ?? null,
      unit: body.unit ?? "each",
      category: body.category ?? null,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  await logAudit({ orgId, userId, action: "create", entityType: "service_item", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
