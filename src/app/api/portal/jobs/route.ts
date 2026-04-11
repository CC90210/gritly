import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requirePortalClient } from "@/lib/api/portal-context";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { parsePagination } from "@/lib/api/pagination";

export async function GET(req: NextRequest) {
  const portalContext = await requirePortalClient();
  if (portalContext instanceof NextResponse) return portalContext;
  const { orgId, userId, client } = portalContext;

  const limited = rateLimit(`portal:${userId}`, 60, 60_000);
  if (limited) return limited;

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const baseQuery = db
    .select({
      id: jobs.id,
      jobNumber: jobs.jobNumber,
      title: jobs.title,
      status: jobs.status,
      scheduledStart: jobs.scheduledStart,
      scheduledEnd: jobs.scheduledEnd,
      completedAt: jobs.completedAt,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .where(and(eq(jobs.orgId, orgId), eq(jobs.clientId, client.id)))
    .orderBy(desc(jobs.createdAt));
  const rows = pagination
    ? await baseQuery.limit(pagination.limit).offset(pagination.offset)
    : await baseQuery;

  return NextResponse.json(rows);
}

