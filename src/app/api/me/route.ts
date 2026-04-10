import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/middleware/rate-limit";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const limited = rateLimit(`session:${session.user.id}`, 60, 60_000);
    if (limited) return limited;

    const userRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        orgId: users.orgId,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const user = userRows[0];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let org = null;
    let onboardingCompleted = false;

    if (user.orgId) {
      const orgRows = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user.orgId))
        .limit(1);

      org = orgRows[0] ?? null;
      onboardingCompleted = org?.onboardingCompleted ?? false;
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      orgId: user.orgId,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      onboardingCompleted,
      org: org ? { id: org.id, name: org.name, slug: org.slug, industry: org.industry, plan: org.plan } : null,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
