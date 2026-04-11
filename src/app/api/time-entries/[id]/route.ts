import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timeEntries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { jobExists, visitExists } from "@/lib/api/tenant";
import { isValidUuid, parseIsoDate, sanitizeText } from "@/lib/api/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const body = await parseBody<{
    clockIn?: string;
    clockOut?: string | null;
    notes?: string | null;
    jobId?: string | null;
    visitId?: string | null;
  }>(req);
  if (body instanceof NextResponse) return body;

  const [existing] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.id, id), eq(timeEntries.orgId, orgId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};

  if (body.jobId !== undefined) {
    if (body.jobId !== null && (!isValidUuid(body.jobId) || !(await jobExists(orgId, body.jobId)))) {
      return NextResponse.json({ error: "jobId must belong to the same organization" }, { status: 422 });
    }
    updateData.jobId = body.jobId;
  }

  if (body.visitId !== undefined) {
    if (body.visitId !== null && (!isValidUuid(body.visitId) || !(await visitExists(orgId, body.visitId)))) {
      return NextResponse.json({ error: "visitId must belong to the same organization" }, { status: 422 });
    }
    updateData.visitId = body.visitId;
  }

  let parsedClockIn = existing.clockIn;
  if (body.clockIn !== undefined) {
    const nextClockIn = parseIsoDate(body.clockIn);
    if (!nextClockIn) {
      return NextResponse.json({ error: "clockIn must be a valid ISO date string" }, { status: 422 });
    }
    parsedClockIn = nextClockIn;
    updateData.clockIn = nextClockIn;
  }

  let parsedClockOut = existing.clockOut;
  if (body.clockOut !== undefined) {
    if (body.clockOut === null) {
      parsedClockOut = null;
      updateData.clockOut = null;
    } else {
      const nextClockOut = parseIsoDate(body.clockOut);
      if (!nextClockOut) {
        return NextResponse.json({ error: "clockOut must be a valid ISO date string" }, { status: 422 });
      }
      parsedClockOut = nextClockOut;
      updateData.clockOut = nextClockOut;
    }
  }

  if (body.notes !== undefined) {
    updateData.notes = typeof body.notes === "string" ? sanitizeText(body.notes, 4000) : null;
  }

  if (parsedClockOut) {
    const durationMinutes = Math.round((parsedClockOut.getTime() - parsedClockIn.getTime()) / 60_000);
    if (durationMinutes < 0) {
      return NextResponse.json({ error: "clockOut must be after clockIn" }, { status: 422 });
    }
    updateData.durationMinutes = durationMinutes;
  } else {
    updateData.durationMinutes = null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 422 });
  }

  const [updated] = await db
    .update(timeEntries)
    .set(updateData)
    .where(and(eq(timeEntries.id, id), eq(timeEntries.orgId, orgId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({ orgId, userId, action: "update", entityType: "time_entry", entityId: id, metadata: body });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("admin");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const [deleted] = await db
    .delete(timeEntries)
    .where(and(eq(timeEntries.id, id), eq(timeEntries.orgId, orgId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({ orgId, userId, action: "delete", entityType: "time_entry", entityId: id });

  return NextResponse.json({ success: true });
}
