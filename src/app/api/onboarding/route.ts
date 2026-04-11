import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { onboardingResponses, organizations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { isPlainObject, sanitizeText } from "@/lib/api/validation";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole("manager");
    if (!isAuthorized(authResult)) return authResult;
    const { orgId, userId } = authResult;

    const limited = rateLimit(`session:${userId}`, 60, 60_000);
    if (limited) return limited;

    const body = await parseBody<{ step?: number; data?: Record<string, unknown> }>(request);
    if (body instanceof NextResponse) return body;

    const step = body.step;
    if (typeof step !== "number" || !Number.isInteger(step) || step < 1 || step > 5) {
      return NextResponse.json({ error: "step must be an integer between 1 and 5" }, { status: 422 });
    }

    if (body.data !== undefined && !isPlainObject(body.data)) {
      return NextResponse.json({ error: "data must be a JSON object" }, { status: 422 });
    }

    const existing = await db
      .select({ id: onboardingResponses.id })
      .from(onboardingResponses)
      .where(and(eq(onboardingResponses.orgId, orgId), eq(onboardingResponses.step, step)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(onboardingResponses)
        .set({ data: body.data ?? {}, updatedAt: new Date() })
        .where(eq(onboardingResponses.id, existing[0].id));
    } else {
      await db.insert(onboardingResponses).values({
        orgId,
        step,
        data: body.data ?? {},
      });
    }

    await logAudit({
      orgId,
      userId,
      action: "update",
      entityType: "onboarding",
      entityId: orgId,
      metadata: { step },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireRole("manager");
    if (!isAuthorized(authResult)) return authResult;
    const { orgId, userId } = authResult;

    const limited = rateLimit(`session:${userId}`, 60, 60_000);
    if (limited) return limited;

    const body = await parseBody<{ industry?: string }>(request);
    if (body instanceof NextResponse) return body;

    const industry = typeof body.industry === "string" ? sanitizeText(body.industry, 50) : "hvac";

    await db
      .update(organizations)
      .set({
        industry,
        onboardingCompleted: true,
      })
      .where(eq(organizations.id, orgId));

    await logAudit({
      orgId,
      userId,
      action: "update",
      entityType: "organization",
      entityId: orgId,
      metadata: { onboardingCompleted: true, industry },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

