import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobVisits } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const startParam = req.nextUrl.searchParams.get("start");
  const endParam = req.nextUrl.searchParams.get("end");

  if (!startParam || !endParam) {
    return NextResponse.json(
      { error: "start and end query params are required (ISO date strings)" },
      { status: 422 }
    );
  }

  // Validate date format: must be a valid ISO date (YYYY-MM-DD or full ISO string)
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]*)?$/;
  if (!ISO_DATE_RE.test(startParam) || isNaN(Date.parse(startParam))) {
    return NextResponse.json({ error: "Invalid start date format" }, { status: 422 });
  }
  if (!ISO_DATE_RE.test(endParam) || isNaN(Date.parse(endParam))) {
    return NextResponse.json({ error: "Invalid end date format" }, { status: 422 });
  }

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
