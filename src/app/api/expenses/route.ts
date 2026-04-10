import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  const where = jobId
    ? and(eq(expenses.orgId, orgId), eq(expenses.jobId, jobId))
    : eq(expenses.orgId, orgId);

  const rows = await db
    .select()
    .from(expenses)
    .where(where)
    .orderBy(desc(expenses.createdAt));

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
    jobId?: string;
    teamMemberId?: string;
    receiptUrl?: string;
    isReimbursable?: boolean;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!body.category || !body.description || body.amount === undefined) {
    return NextResponse.json(
      { error: "category, description, and amount are required" },
      { status: 422 }
    );
  }

  if (body.amount <= 0) {
    return NextResponse.json({ error: "amount must be positive" }, { status: 422 });
  }

  const [row] = await db
    .insert(expenses)
    .values({
      orgId,
      category: body.category,
      description: body.description,
      amount: body.amount,
      jobId: body.jobId ?? null,
      teamMemberId: body.teamMemberId ?? null,
      receiptUrl: body.receiptUrl ?? null,
      isReimbursable: body.isReimbursable ?? false,
      isReimbursed: false,
    })
    .returning();

  await logAudit({ orgId, userId, action: "create", entityType: "expense", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
