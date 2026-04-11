import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviewRequests } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { parsePagination } from "@/lib/api/pagination";
import { clientExists, jobExists } from "@/lib/api/tenant";
import { isValidUuid, sanitizeText } from "@/lib/api/validation";

const REVIEW_CHANNELS = new Set(["email", "sms"]);

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const baseQuery = db
    .select()
    .from(reviewRequests)
    .where(eq(reviewRequests.orgId, orgId))
    .orderBy(desc(reviewRequests.createdAt));

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
    clientId?: string;
    jobId?: string | null;
    sentVia?: string;
    reviewUrl?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!isValidUuid(body.clientId) || !(await clientExists(orgId, body.clientId))) {
    return NextResponse.json({ error: "clientId must belong to the same organization" }, { status: 422 });
  }

  if (body.jobId !== undefined && body.jobId !== null) {
    if (!isValidUuid(body.jobId) || !(await jobExists(orgId, body.jobId))) {
      return NextResponse.json({ error: "jobId must belong to the same organization" }, { status: 422 });
    }
  }

  const sentVia = typeof body.sentVia === "string" ? body.sentVia : "email";
  if (!REVIEW_CHANNELS.has(sentVia)) {
    return NextResponse.json(
      { error: `sentVia must be one of: ${[...REVIEW_CHANNELS].join(", ")}` },
      { status: 422 },
    );
  }

  const [row] = await db
    .insert(reviewRequests)
    .values({
      orgId,
      clientId: body.clientId,
      jobId: body.jobId ?? null,
      sentVia,
      reviewUrl: typeof body.reviewUrl === "string" ? sanitizeText(body.reviewUrl, 2000) : null,
      status: "pending",
    })
    .returning();

  await logAudit({ orgId, userId, action: "create", entityType: "review_request", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
