import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (clientId && (!isValidUuid(clientId) || !(await clientExists(orgId, clientId)))) {
    return NextResponse.json({ error: "clientId must belong to the same organization" }, { status: 422 });
  }

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const where = clientId
    ? and(eq(properties.orgId, orgId), eq(properties.clientId, clientId))
    : eq(properties.orgId, orgId);

  const baseQuery = db
    .select()
    .from(properties)
    .where(where);

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
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    notes?: string;
    lat?: number;
    lng?: number;
    isPrimary?: boolean;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!isValidUuid(body.clientId) || !(await clientExists(orgId, body.clientId))) {
    return NextResponse.json({ error: "clientId must belong to the same organization" }, { status: 422 });
  }

  const addressLine1 = typeof body.addressLine1 === "string" ? sanitizeText(body.addressLine1, 200) : "";
  if (!addressLine1) {
    return NextResponse.json({ error: "addressLine1 is required" }, { status: 422 });
  }

  if (body.lat !== undefined && body.lat !== null && !isFiniteNumber(body.lat)) {
    return NextResponse.json({ error: "lat must be a finite number" }, { status: 422 });
  }

  if (body.lng !== undefined && body.lng !== null && !isFiniteNumber(body.lng)) {
    return NextResponse.json({ error: "lng must be a finite number" }, { status: 422 });
  }

  const [row] = await db
    .insert(properties)
    .values({
      orgId,
      clientId: body.clientId,
      addressLine1,
      addressLine2: typeof body.addressLine2 === "string" ? sanitizeText(body.addressLine2, 200) : null,
      city: typeof body.city === "string" ? sanitizeText(body.city, 100) : "",
      province: typeof body.province === "string" ? sanitizeText(body.province, 100) : "",
      postalCode: typeof body.postalCode === "string" ? sanitizeText(body.postalCode, 30) : null,
      notes: typeof body.notes === "string" ? sanitizeText(body.notes, 4000) : null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      isPrimary: body.isPrimary ?? true,
    })
    .returning();

  await logAudit({ orgId, userId, action: "create", entityType: "property", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
