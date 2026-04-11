import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq, and, or, like, desc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { parsePagination } from "@/lib/api/pagination";
import { normalizeEmail, sanitizeText, toStringArray } from "@/lib/api/validation";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const search = req.nextUrl.searchParams.get("search");
  const escaped = search ? search.replace(/[%_]/g, "\\$&").slice(0, 100) : null;

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const conditions = escaped
    ? and(
        eq(clients.orgId, orgId),
        or(
          like(clients.firstName, `%${escaped}%`),
          like(clients.lastName, `%${escaped}%`),
          like(clients.email, `%${escaped}%`),
          like(clients.company, `%${escaped}%`),
        ),
      )
    : eq(clients.orgId, orgId);

  const baseQuery = db
    .select()
    .from(clients)
    .where(conditions)
    .orderBy(desc(clients.createdAt));

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
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    notes?: string;
    tags?: unknown;
    isLead?: boolean;
    source?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  const firstName = typeof body.firstName === "string" ? sanitizeText(body.firstName, 100) : "";
  const lastName = typeof body.lastName === "string" ? sanitizeText(body.lastName, 100) : "";
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "firstName and lastName are required" }, { status: 422 });
  }

  const tags = body.tags === undefined ? [] : toStringArray(body.tags);
  if (body.tags !== undefined && !tags) {
    return NextResponse.json({ error: "tags must be an array of strings" }, { status: 422 });
  }

  const [row] = await db
    .insert(clients)
    .values({
      orgId,
      firstName,
      lastName,
      email: typeof body.email === "string" ? normalizeEmail(body.email).slice(0, 254) : null,
      phone: typeof body.phone === "string" ? sanitizeText(body.phone, 30) : null,
      company: typeof body.company === "string" ? sanitizeText(body.company, 150) : null,
      notes: typeof body.notes === "string" ? sanitizeText(body.notes, 4000) : null,
      tags: tags ?? [],
      isLead: body.isLead ?? false,
      source: typeof body.source === "string" ? sanitizeText(body.source, 100) : null,
    })
    .returning();

  await logAudit({ orgId, userId, action: "create", entityType: "client", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
