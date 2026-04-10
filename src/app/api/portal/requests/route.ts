import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, clients, serviceRequests, organizations } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { parseBody } from "@/lib/utils/parse-body";

const sanitize = (s: string, max = 500) => s.trim().slice(0, max);

async function resolveClient(userId: string, orgId: string, email: string | null) {
  const byUser = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.userId, userId), eq(clients.orgId, orgId)))
    .limit(1);
  if (byUser[0]) return byUser[0].id;

  if (email) {
    const byEmail = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.email, email), eq(clients.orgId, orgId)))
      .limit(1);
    if (byEmail[0]) return byEmail[0].id;
  }
  return null;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select({ orgId: users.orgId, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const user = userRows[0];
  if (!user?.orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

  const clientId = await resolveClient(session.user.id, user.orgId, user.email ?? null);
  if (!clientId) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Find client first/last name for email matching on requests
  const clientRecord = await db
    .select({ email: clients.email })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  const clientEmail = clientRecord[0]?.email ?? user.email;

  // Require a resolved email — prevent tautological fallback that returns all org requests
  if (!clientEmail) {
    return NextResponse.json({ error: "Client email could not be resolved" }, { status: 422 });
  }

  // Requests submitted from portal (source: "portal") or matching email
  const rows = await db
    .select()
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.orgId, user.orgId),
        eq(serviceRequests.email, clientEmail)
      )
    )
    .orderBy(desc(serviceRequests.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRows = await db
    .select({ orgId: users.orgId, email: users.email, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const user = userRows[0];
  if (!user?.orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

  // Verify org exists
  const orgRows = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, user.orgId))
    .limit(1);
  if (!orgRows[0]) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await parseBody<{
    serviceType?: string;
    description?: string;
    address?: string;
    preferredDate?: string;
    preferredTime?: string;
    notes?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!body.serviceType || !body.description) {
    return NextResponse.json(
      { error: "serviceType and description are required" },
      { status: 422 }
    );
  }

  const clientId = await resolveClient(session.user.id, user.orgId, user.email ?? null);

  const clientRecord = clientId
    ? await db.select({ firstName: clients.firstName, lastName: clients.lastName, email: clients.email }).from(clients).where(eq(clients.id, clientId)).limit(1)
    : [];

  const firstName = clientRecord[0]?.firstName ?? user.firstName ?? "";
  const lastName = clientRecord[0]?.lastName ?? user.lastName ?? "";
  const email = clientRecord[0]?.email ?? user.email ?? "";

  if (!firstName || !email) {
    return NextResponse.json({ error: "Client record incomplete" }, { status: 422 });
  }

  const [row] = await db
    .insert(serviceRequests)
    .values({
      orgId: user.orgId,
      firstName: sanitize(firstName, 100),
      lastName: sanitize(lastName, 100),
      email: sanitize(email, 254),
      serviceType: sanitize(body.serviceType, 100),
      description: sanitize(body.description, 2000),
      address: body.address ? sanitize(body.address, 500) : null,
      preferredDate: body.preferredDate ?? null,
      preferredTime: body.preferredTime ?? null,
      source: "portal",
      notes: body.notes ? sanitize(body.notes, 1000) : null,
      status: "new",
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
