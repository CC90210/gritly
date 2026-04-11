import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceAgreements } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { parsePagination } from "@/lib/api/pagination";
import { clientExists } from "@/lib/api/tenant";
import { isFiniteNumber, isValidUuid, sanitizeText } from "@/lib/api/validation";

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
    .from(maintenanceAgreements)
    .where(eq(maintenanceAgreements.orgId, orgId))
    .orderBy(desc(maintenanceAgreements.createdAt));

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
    clientId?: string;
    name?: string;
    frequency?: string;
    price?: number;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    notes?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!isValidUuid(body.clientId) || !(await clientExists(orgId, body.clientId))) {
    return NextResponse.json({ error: "clientId must belong to the same organization" }, { status: 422 });
  }

  const name = typeof body.name === "string" ? sanitizeText(body.name, 200) : "";
  const startDate = typeof body.startDate === "string" ? sanitizeText(body.startDate, 50) : "";
  if (!name || !startDate || !isFiniteNumber(body.price) || body.price < 0) {
    return NextResponse.json(
      { error: "name, startDate, and a non-negative price are required" },
      { status: 422 },
    );
  }

  const [row] = await db
    .insert(maintenanceAgreements)
    .values({
      orgId,
      clientId: body.clientId,
      name,
      frequency: typeof body.frequency === "string" ? sanitizeText(body.frequency, 50) : "monthly",
      price: body.price,
      startDate,
      endDate: typeof body.endDate === "string" ? sanitizeText(body.endDate, 50) : null,
      isActive: body.isActive ?? true,
      notes: typeof body.notes === "string" ? sanitizeText(body.notes, 4000) : null,
    })
    .returning();

  await logAudit({ orgId, userId, action: "create", entityType: "maintenance_agreement", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
