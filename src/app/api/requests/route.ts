import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceRequests, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET: requires auth (staff listing requests)
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const orgId = userRows[0]?.orgId;
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

  const rows = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.orgId, orgId))
    .orderBy(desc(serviceRequests.createdAt));

  return NextResponse.json(rows);
}

// POST: public — no auth (website booking widget)
// Requires orgId in body so the widget knows which org to submit to
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    orgId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    serviceType?: string;
    description?: string;
    address?: string;
    preferredDate?: string;
    preferredTime?: string;
    source?: string;
    notes?: string;
  };

  if (!body.orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 422 });
  }

  if (!body.firstName || !body.lastName || !body.email || !body.serviceType || !body.description) {
    return NextResponse.json(
      { error: "firstName, lastName, email, serviceType, and description are required" },
      { status: 422 }
    );
  }

  const [row] = await db
    .insert(serviceRequests)
    .values({
      orgId: body.orgId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone ?? null,
      serviceType: body.serviceType,
      description: body.description,
      address: body.address ?? null,
      preferredDate: body.preferredDate ?? null,
      preferredTime: body.preferredTime ?? null,
      source: body.source ?? "website",
      notes: body.notes ?? null,
      status: "new",
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
