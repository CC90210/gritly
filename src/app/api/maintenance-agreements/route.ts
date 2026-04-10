import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceAgreements, clients } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

export async function GET(_req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const rows = await db
    .select()
    .from(maintenanceAgreements)
    .where(eq(maintenanceAgreements.orgId, orgId))
    .orderBy(desc(maintenanceAgreements.createdAt));

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
    name?: string;
    frequency?: string;
    price?: number;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    notes?: string;
  };

  if (!body.clientId || !body.name || body.price === undefined || !body.startDate) {
    return NextResponse.json(
      { error: "clientId, name, price, and startDate are required" },
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
    .insert(maintenanceAgreements)
    .values({
      orgId,
      clientId: body.clientId,
      name: body.name,
      frequency: body.frequency ?? "monthly",
      price: body.price,
      startDate: body.startDate,
      endDate: body.endDate ?? null,
      isActive: body.isActive ?? true,
      notes: body.notes ?? null,
    })
    .returning();

  logAudit({ orgId, userId, action: "create", entityType: "maintenance_agreement", entityId: row.id });

  return NextResponse.json(row, { status: 201 });
}
