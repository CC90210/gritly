import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, clients, jobs } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

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

  const clientRows = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.userId, session.user.id), eq(clients.orgId, user.orgId)))
    .limit(1);

  let clientId = clientRows[0]?.id;

  if (!clientId && user.email) {
    const byEmail = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.email, user.email), eq(clients.orgId, user.orgId)))
      .limit(1);
    clientId = byEmail[0]?.id;
  }

  if (!clientId) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const rows = await db
    .select({
      id: jobs.id,
      jobNumber: jobs.jobNumber,
      title: jobs.title,
      status: jobs.status,
      scheduledStart: jobs.scheduledStart,
      scheduledEnd: jobs.scheduledEnd,
      completedAt: jobs.completedAt,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .where(eq(jobs.clientId, clientId))
    .orderBy(desc(jobs.createdAt));

  return NextResponse.json(rows);
}
