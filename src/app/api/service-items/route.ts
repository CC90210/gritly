import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceItems } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { parsePagination } from "@/lib/api/pagination";
import { isFiniteNumber, sanitizeText } from "@/lib/api/validation";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const baseQuery = db
    .select()
    .from(serviceItems)
    .where(eq(serviceItems.orgId, orgId))
    .orderBy(desc(serviceItems.createdAt));

  const rows = pagination
    ? await baseQuery.limit(pagination.limit).offset(pagination.offset)
    : await baseQuery;

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
    defaultPrice?: number | null;
    unit?: string;
    category?: string;
    isActive?: boolean;
    sortOrder?: number;
  }>(req);
  if (body instanceof NextResponse) return body;

  const name = typeof body.name === "string" ? sanitizeText(body.name, 200) : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 422 });
  }

  if (body.defaultPrice !== undefined && body.defaultPrice !== null && (!isFiniteNumber(body.defaultPrice) || body.defaultPrice < 0)) {
    return NextResponse.json({ error: "defaultPrice must be a non-negative number" }, { status: 422 });
  }

  const [row] = await db
    .insert(serviceItems)
    .values({
      orgId,
      name,
      description: typeof body.description === "string" ? sanitizeText(body.description, 2000) : null,
      defaultPrice: body.defaultPrice ?? null,
      unit: typeof body.unit === "string" ? sanitizeText(body.unit, 50) : "each",
      category: typeof body.category === "string" ? sanitizeText(body.category, 100) : null,
      isActive: body.isActive ?? true,
      sortOrder: Number.isInteger(body.sortOrder) ? body.sortOrder : 0,
    })
    .returning();

  await logAudit({ orgId, userId, action: "create", entityType: "service_item", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
