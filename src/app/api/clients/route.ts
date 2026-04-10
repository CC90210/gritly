import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, users } from "@/lib/db/schema";
import { eq, and, or, like, desc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const search = req.nextUrl.searchParams.get("search");

  const conditions = search
    ? and(
        eq(clients.orgId, orgId),
        or(
          like(clients.firstName, `%${search}%`),
          like(clients.lastName, `%${search}%`),
          like(clients.email, `%${search}%`),
          like(clients.company, `%${search}%`)
        )
      )
    : eq(clients.orgId, orgId);

  const rows = await db
    .select()
    .from(clients)
    .where(conditions)
    .orderBy(desc(clients.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const body = await req.json() as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    notes?: string;
    tags?: string[];
    isLead?: boolean;
    source?: string;
  };

  if (!body.firstName || !body.lastName) {
    return NextResponse.json(
      { error: "firstName and lastName are required" },
      { status: 422 }
    );
  }

  const [row] = await db
    .insert(clients)
    .values({
      orgId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email ?? null,
      phone: body.phone ?? null,
      company: body.company ?? null,
      notes: body.notes ?? null,
      tags: body.tags ?? [],
      isLead: body.isLead ?? false,
      source: body.source ?? null,
    })
    .returning();

  logAudit({ orgId, userId, action: "create", entityType: "client", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
