import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users, organizations, onboardingResponses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimit(`session:${session.user.id}`, 60, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const { step, data } = body;

    if (!Number.isInteger(step) || step < 1 || step > 5) {
      return NextResponse.json({ error: "step must be an integer between 1 and 5" }, { status: 422 });
    }

    const userRows = await db.select({ orgId: users.orgId }).from(users).where(eq(users.id, session.user.id)).limit(1);
    const orgId = userRows[0]?.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No org" }, { status: 400 });
    }

    const existing = await db
      .select({ id: onboardingResponses.id })
      .from(onboardingResponses)
      .where(and(eq(onboardingResponses.orgId, orgId), eq(onboardingResponses.step, step)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(onboardingResponses)
        .set({ data, updatedAt: new Date() })
        .where(eq(onboardingResponses.id, existing[0].id));
    } else {
      await db.insert(onboardingResponses).values({
        orgId,
        step,
        data,
      });
    }

    logAudit({ orgId, userId: session.user.id, action: "update", entityType: "onboarding", entityId: orgId, metadata: { step } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimit(`session:${session.user.id}`, 60, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const { industry } = body;

    const userRows = await db.select({ orgId: users.orgId }).from(users).where(eq(users.id, session.user.id)).limit(1);
    const orgId = userRows[0]?.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No org" }, { status: 400 });
    }

    await db
      .update(organizations)
      .set({
        industry: industry || "hvac",
        onboardingCompleted: true,
      })
      .where(eq(organizations.id, orgId));

    logAudit({ orgId, userId: session.user.id, action: "update", entityType: "organization", entityId: orgId, metadata: { onboardingCompleted: true, industry } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
