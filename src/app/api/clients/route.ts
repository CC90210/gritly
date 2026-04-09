import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, users } from "@/lib/db/schema";
import { eq, and, or, like, desc } from "drizzle-orm";

async function getOrgId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const rows = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  return rows[0]?.orgId ?? null;
}

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

  return NextResponse.json(row, { status: 201 });
}
