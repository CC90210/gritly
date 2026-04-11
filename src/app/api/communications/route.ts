import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communications, clients } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";

const ALLOWED_TYPES = new Set(["email", "sms", "phone", "note"]);
const ALLOWED_DIRECTIONS = new Set(["inbound", "outbound"]);

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId } = authResult;

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId query param is required" }, { status: 422 });
  }

  // Verify the client belongs to this org
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)))
    .limit(1);

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(communications)
    .where(and(eq(communications.clientId, clientId), eq(communications.orgId, orgId)))
    .orderBy(desc(communications.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const body = await parseBody<{
    clientId: string;
    type?: string;
    direction?: string;
    subject?: string;
    body: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!body.clientId || !body.body) {
    return NextResponse.json({ error: "clientId and body are required" }, { status: 422 });
  }

  if (body.type && !ALLOWED_TYPES.has(body.type)) {
    return NextResponse.json(
      { error: `Invalid type. Allowed: ${[...ALLOWED_TYPES].join(", ")}` },
      { status: 422 }
    );
  }

  if (body.direction && !ALLOWED_DIRECTIONS.has(body.direction)) {
    return NextResponse.json(
      { error: `Invalid direction. Allowed: ${[...ALLOWED_DIRECTIONS].join(", ")}` },
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
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const [row] = await db
    .insert(communications)
    .values({
      orgId,
      clientId: body.clientId,
      type: body.type ?? "note",
      direction: body.direction ?? "outbound",
      subject: body.subject ?? null,
      body: body.body,
    })
    .returning();

  await logAudit({
    orgId,
    userId,
    action: "create",
    entityType: "communication",
    entityId: row.id,
    metadata: { clientId: body.clientId, type: body.type ?? "note" },
  });

  return NextResponse.json(row, { status: 201 });
}
