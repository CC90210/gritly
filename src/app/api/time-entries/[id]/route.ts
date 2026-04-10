import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timeEntries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const body = await req.json() as {
    clockIn?: string;
    clockOut?: string;
    notes?: string;
    jobId?: string;
    visitId?: string;
  };

  // Get existing entry for duration calculation
  const [existing] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.id, id), eq(timeEntries.orgId, orgId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (body.clockIn !== undefined) updateData.clockIn = new Date(body.clockIn);
  if (body.clockOut !== undefined) updateData.clockOut = body.clockOut ? new Date(body.clockOut) : null;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.jobId !== undefined) updateData.jobId = body.jobId;
  if (body.visitId !== undefined) updateData.visitId = body.visitId;

  // Recalculate duration
  const finalClockIn = body.clockIn ? new Date(body.clockIn) : existing.clockIn;
  const finalClockOut = body.clockOut !== undefined
    ? (body.clockOut ? new Date(body.clockOut) : null)
    : existing.clockOut;

  if (finalClockIn && finalClockOut) {
    const dur = Math.round((finalClockOut.getTime() - finalClockIn.getTime()) / 60_000);
    if (dur < 0) {
      return NextResponse.json({ error: "clockOut must be after clockIn" }, { status: 422 });
    }
    updateData.durationMinutes = dur;
  } else {
    updateData.durationMinutes = null;
  }

  const [updated] = await db
    .update(timeEntries)
    .set(updateData)
    .where(and(eq(timeEntries.id, id), eq(timeEntries.orgId, orgId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  logAudit({ orgId, userId, action: "update", entityType: "time_entry", entityId: id, metadata: body });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("manager");
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

  logAudit({ orgId, userId, action: "delete", entityType: "time_entry", entityId: id });

  return NextResponse.json({ success: true });
}
