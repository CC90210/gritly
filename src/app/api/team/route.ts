import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamMembers, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_req: NextRequest) {
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

  const rows = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.orgId, orgId))
    .orderBy(desc(teamMembers.createdAt));

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
    role?: string;
    hourlyRate?: number;
    color?: string;
    userId?: string;
  };

  if (!body.firstName || !body.lastName || !body.email) {
    return NextResponse.json(
      { error: "firstName, lastName, and email are required" },
      { status: 422 }
    );
  }

  const [row] = await db
    .insert(teamMembers)
    .values({
      orgId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone ?? null,
      role: body.role ?? "technician",
      hourlyRate: body.hourlyRate ?? null,
      color: body.color ?? "#f97316",
      userId: body.userId ?? null,
      isActive: true,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
