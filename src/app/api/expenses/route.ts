import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const orgId = userRows[0]?.orgId;
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const orgId = userRows[0]?.orgId;
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

  const body = await req.json() as {
    category?: string;
    description?: string;
    amount?: number;
    jobId?: string;
    teamMemberId?: string;
    receiptUrl?: string;
    isReimbursable?: boolean;
  };

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

  return NextResponse.json(row, { status: 201 });
}
