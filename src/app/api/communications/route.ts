import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communications } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { parsePagination } from "@/lib/api/pagination";
import { clientExists } from "@/lib/api/tenant";
import { isValidUuid, sanitizeText } from "@/lib/api/validation";

const ALLOWED_TYPES = new Set(["email", "sms", "phone", "note"]);
const ALLOWED_DIRECTIONS = new Set(["inbound", "outbound"]);

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId || !isValidUuid(clientId) || !(await clientExists(orgId, clientId))) {
    return NextResponse.json({ error: "clientId must belong to the same organization" }, { status: 422 });
  }

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const baseQuery = db
    .select()
    .from(communications)
    .where(and(eq(communications.clientId, clientId), eq(communications.orgId, orgId)))
    .orderBy(desc(communications.createdAt));

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
    type?: string;
    direction?: string;
    subject?: string;
    body?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!isValidUuid(body.clientId) || !(await clientExists(orgId, body.clientId))) {
    return NextResponse.json({ error: "clientId must belong to the same organization" }, { status: 422 });
  }

  const type = typeof body.type === "string" ? body.type : "note";
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json(
      { error: `Invalid type. Allowed: ${[...ALLOWED_TYPES].join(", ")}` },
      { status: 422 },
    );
  }

  const direction = typeof body.direction === "string" ? body.direction : "outbound";
  if (!ALLOWED_DIRECTIONS.has(direction)) {
    return NextResponse.json(
      { error: `Invalid direction. Allowed: ${[...ALLOWED_DIRECTIONS].join(", ")}` },
      { status: 422 },
    );
  }

  const messageBody = typeof body.body === "string" ? sanitizeText(body.body, 10000) : "";
  if (!messageBody) {
    return NextResponse.json({ error: "body is required" }, { status: 422 });
  }

  const [row] = await db
    .insert(communications)
    .values({
      orgId,
      clientId: body.clientId,
      type,
      direction,
      subject: typeof body.subject === "string" ? sanitizeText(body.subject, 200) : null,
      body: messageBody,
    })
    .returning();

  await logAudit({
    orgId,
    userId,
    action: "create",
    entityType: "communication",
    entityId: row.id,
    metadata: { clientId: body.clientId, type },
  });

  return NextResponse.json(row, { status: 201 });
}
