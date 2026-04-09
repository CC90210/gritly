import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobVisits, users } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

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

  const startParam = req.nextUrl.searchParams.get("start");
  const endParam = req.nextUrl.searchParams.get("end");

  if (!startParam || !endParam) {
    return NextResponse.json(
      { error: "start and end query params are required (ISO date strings)" },
      { status: 422 }
    );
  }

  // scheduledDate is stored as text (YYYY-MM-DD), so use string comparison
  const rows = await db
    .select()
    .from(jobVisits)
    .where(
      and(
        eq(jobVisits.orgId, orgId),
        gte(jobVisits.scheduledDate, startParam),
        lte(jobVisits.scheduledDate, endParam)
      )
    );

  return NextResponse.json(rows);
}
