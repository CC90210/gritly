import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const [org] = await db
    .select({ name: organizations.name, settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ name: org.name, settings: org.settings ?? {} });
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireRole("admin");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const body = await req.json() as {
    name?: string;
    settings?: Record<string, unknown>;
  };

  const [existing] = await db
    .select({ name: organizations.name, settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "name must be a non-empty string" }, { status: 422 });
    }
    updateData.name = body.name.trim();
  }

  if (body.settings !== undefined) {
    if (typeof body.settings !== "object" || Array.isArray(body.settings)) {
      return NextResponse.json({ error: "settings must be an object" }, { status: 422 });
    }
    updateData.settings = { ...(existing.settings ?? {}), ...body.settings };
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 422 });
  }

  const [updated] = await db
    .update(organizations)
    .set(updateData)
    .where(eq(organizations.id, orgId))
    .returning({ name: organizations.name, settings: organizations.settings });

  logAudit({ orgId, userId, action: "update", entityType: "organization", entityId: orgId, metadata: body });

  return NextResponse.json({ name: updated.name, settings: updated.settings ?? {} });
}
