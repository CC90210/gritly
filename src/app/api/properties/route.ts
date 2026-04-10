import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { properties, clients } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const clientId = req.nextUrl.searchParams.get("clientId");

  const where = clientId
    ? and(eq(properties.orgId, orgId), eq(properties.clientId, clientId))
    : eq(properties.orgId, orgId);

  const rows = await db
    .select()
    .from(properties)
    .where(where);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const body = await req.json() as {
    clientId?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    notes?: string;
    lat?: number;
    lng?: number;
    isPrimary?: boolean;
  };

  if (!body.clientId || !body.addressLine1) {
    return NextResponse.json(
      { error: "clientId and addressLine1 are required" },
      { status: 422 }
    );
  }

  // Verify client belongs to org
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, body.clientId), eq(clients.orgId, orgId)))
    .limit(1);
  if (!client) {
    return NextResponse.json({ error: "Invalid clientId" }, { status: 422 });
  }

  const [row] = await db
    .insert(properties)
    .values({
      orgId,
      clientId: body.clientId,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2 ?? null,
      city: body.city ?? "",
      province: body.province ?? "",
      postalCode: body.postalCode ?? null,
      notes: body.notes ?? null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      isPrimary: body.isPrimary ?? true,
    })
    .returning();

  logAudit({ orgId, userId, action: "create", entityType: "property", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
