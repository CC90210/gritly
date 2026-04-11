import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { parsePagination } from "@/lib/api/pagination";
import { jobExists, teamMemberExists } from "@/lib/api/tenant";
import { isFiniteNumber, isValidUuid, sanitizeText } from "@/lib/api/validation";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (jobId && (!isValidUuid(jobId) || !(await jobExists(orgId, jobId)))) {
    return NextResponse.json({ error: "jobId must belong to the same organization" }, { status: 422 });
  }

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const where = jobId
    ? and(eq(expenses.orgId, orgId), eq(expenses.jobId, jobId))
    : eq(expenses.orgId, orgId);

  const baseQuery = db
    .select()
    .from(expenses)
    .where(where)
    .orderBy(desc(expenses.createdAt));

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
    category?: string;
    description?: string;
    amount?: number;
    jobId?: string | null;
    teamMemberId?: string | null;
    receiptUrl?: string;
    isReimbursable?: boolean;
  }>(req);
  if (body instanceof NextResponse) return body;

  const category = typeof body.category === "string" ? sanitizeText(body.category, 100) : "";
  const description = typeof body.description === "string" ? sanitizeText(body.description, 1000) : "";

  if (!category || !description || !isFiniteNumber(body.amount) || body.amount <= 0) {
    return NextResponse.json(
      { error: "category, description, and a positive amount are required" },
      { status: 422 },
    );
  }

  if (body.jobId !== undefined && body.jobId !== null) {
    if (!isValidUuid(body.jobId) || !(await jobExists(orgId, body.jobId))) {
      return NextResponse.json({ error: "jobId must belong to the same organization" }, { status: 422 });
    }
  }

  if (body.teamMemberId !== undefined && body.teamMemberId !== null) {
    if (!isValidUuid(body.teamMemberId) || !(await teamMemberExists(orgId, body.teamMemberId))) {
      return NextResponse.json(
        { error: "teamMemberId must belong to the same organization" },
        { status: 422 },
      );
    }
  }

  const [row] = await db
    .insert(expenses)
    .values({
      orgId,
      category,
      description,
      amount: body.amount,
      jobId: body.jobId ?? null,
      teamMemberId: body.teamMemberId ?? null,
      receiptUrl: typeof body.receiptUrl === "string" ? sanitizeText(body.receiptUrl, 2000) : null,
      isReimbursable: body.isReimbursable ?? false,
      isReimbursed: false,
    })
    .returning();

  await logAudit({ orgId, userId, action: "create", entityType: "expense", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
