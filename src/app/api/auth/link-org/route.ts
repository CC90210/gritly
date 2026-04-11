import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseBody } from "@/lib/utils/parse-body";
import { isValidUuid } from "@/lib/api/validation";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimit(`session:link-org:${session.user.id}`, 30, 60_000);
    if (limited) return limited;

    const body = await parseBody<{ orgId?: string }>(request);
    if (body instanceof NextResponse) return body;

    if (!isValidUuid(body.orgId)) {
      return NextResponse.json({ error: "A valid orgId is required" }, { status: 422 });
    }

    const orgId = body.orgId;
    const sessionEmail = session.user.email?.trim().toLowerCase();

    const [org] = await db
      .select({ createdByEmail: organizations.createdByEmail })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (!sessionEmail || org.createdByEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Not authorized to link to this organization" },
        { status: 403 },
      );
    }

    const [existingUser] = await db
      .select({ orgId: users.orgId })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (existingUser?.orgId && existingUser.orgId !== orgId) {
      return NextResponse.json(
        { error: "This user is already linked to a different organization" },
        { status: 409 },
      );
    }

    await db
      .update(users)
      .set({ orgId, role: "owner" })
      .where(eq(users.id, session.user.id));

    await logAudit({
      orgId,
      userId: session.user.id,
      action: "update",
      entityType: "organization",
      entityId: orgId,
      metadata: { linkedUserId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
