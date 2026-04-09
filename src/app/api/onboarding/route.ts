import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users, organizations, onboardingResponses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Save an onboarding step
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { step, data } = body;

    const userRows = await db.select({ orgId: users.orgId }).from(users).where(eq(users.id, session.user.id)).limit(1);
    const orgId = userRows[0]?.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No org" }, { status: 400 });
    }

    // Upsert the step response
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

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

// Complete onboarding (called after step 5)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { industry } = body;

    const userRows = await db.select({ orgId: users.orgId }).from(users).where(eq(users.id, session.user.id)).limit(1);
    const orgId = userRows[0]?.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No org" }, { status: 400 });
    }

    // Update org with industry and mark onboarding complete
    await db
      .update(organizations)
      .set({
        industry: industry || "hvac",
        onboardingCompleted: true,
      })
      .where(eq(organizations.id, orgId));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
