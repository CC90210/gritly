import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations, serviceRequests } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { parseBody } from "@/lib/utils/parse-body";
import { requirePortalClient } from "@/lib/api/portal-context";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { parsePagination } from "@/lib/api/pagination";
import { logAudit } from "@/lib/audit";
import { sanitizeText } from "@/lib/api/validation";

export async function GET(req: NextRequest) {
  const portalContext = await requirePortalClient();
  if (portalContext instanceof NextResponse) return portalContext;
  const { orgId, userId, client, email } = portalContext;

  const limited = rateLimit(`portal:${userId}`, 60, 60_000);
  if (limited) return limited;

  const clientEmail = client.email ?? email;
  if (!clientEmail) {
    return NextResponse.json({ error: "Client email could not be resolved" }, { status: 422 });
  }

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const baseQuery = db
    .select()
    .from(serviceRequests)
    .where(and(eq(serviceRequests.orgId, orgId), eq(serviceRequests.email, clientEmail)))
    .orderBy(desc(serviceRequests.createdAt));
  const rows = pagination
    ? await baseQuery.limit(pagination.limit).offset(pagination.offset)
    : await baseQuery;

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const portalContext = await requirePortalClient();
  if (portalContext instanceof NextResponse) return portalContext;
  const { orgId, userId, client } = portalContext;

  const limited = rateLimit(`portal:${userId}`, 30, 60_000);
  if (limited) return limited;

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await parseBody<{
    serviceType?: string;
    description?: string;
    address?: string;
    preferredDate?: string;
    preferredTime?: string;
    notes?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  const serviceType = typeof body.serviceType === "string" ? sanitizeText(body.serviceType, 100) : "";
  const description = typeof body.description === "string" ? sanitizeText(body.description, 2000) : "";

  if (!serviceType || !description) {
    return NextResponse.json(
      { error: "serviceType and description are required" },
      { status: 422 },
    );
  }

  if (!client.firstName || !client.email) {
    return NextResponse.json({ error: "Client record incomplete" }, { status: 422 });
  }

  const [row] = await db
    .insert(serviceRequests)
    .values({
      orgId,
      firstName: sanitizeText(client.firstName, 100),
      lastName: sanitizeText(client.lastName, 100),
      email: client.email,
      serviceType,
      description,
      address: typeof body.address === "string" ? sanitizeText(body.address, 500) : null,
      preferredDate: typeof body.preferredDate === "string" ? body.preferredDate : null,
      preferredTime: typeof body.preferredTime === "string" ? body.preferredTime : null,
      source: "portal",
      notes: typeof body.notes === "string" ? sanitizeText(body.notes, 1000) : null,
      status: "new",
    })
    .returning();

  await logAudit({
    orgId,
    userId,
    action: "create",
    entityType: "service_request",
    entityId: row.id,
    metadata: { source: "portal" },
  });

  return NextResponse.json(row, { status: 201 });
}

