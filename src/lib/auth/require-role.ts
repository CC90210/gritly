import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const ROLE_HIERARCHY: Record<string, number> = {
  client: 0,
  technician: 1,
  dispatcher: 2,
  manager: 3,
  admin: 4,
  owner: 5,
};

export type RoleResult = {
  session: { user: { id: string; email: string; name: string } };
  orgId: string;
  role: string;
  userId: string;
};

/**
 * Enforce RBAC on API routes.
 * Returns the session context if authorized, or a NextResponse 401/403 error.
 */
export async function requireRole(
  minRole: keyof typeof ROLE_HIERARCHY
): Promise<RoleResult | NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select({ orgId: users.orgId, role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const user = userRows[0];
  if (!user?.orgId) {
    return NextResponse.json({ error: "No organization linked" }, { status: 400 });
  }

  const userRank = ROLE_HIERARCHY[user.role] ?? -1;
  const requiredRank = ROLE_HIERARCHY[minRole] ?? 0;

  if (userRank < requiredRank) {
    return NextResponse.json(
      { error: `Forbidden: requires ${minRole} role or higher` },
      { status: 403 }
    );
  }

  return {
    session: session as RoleResult["session"],
    orgId: user.orgId,
    role: user.role,
    userId: session.user.id,
  };
}

/** Type guard: returns true if the result is an authorized context, false if it's an error response */
export function isAuthorized(result: RoleResult | NextResponse): result is RoleResult {
  return !(result instanceof NextResponse);
}
