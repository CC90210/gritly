import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceItems, organizations, clients, jobs, quotes } from "@/lib/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  const where = clientId
    ? and(eq(invoices.orgId, orgId), eq(invoices.clientId, clientId))
    : eq(invoices.orgId, orgId);

  const rows = await db
    .select()
    .from(invoices)
    .where(where)
    .orderBy(desc(invoices.createdAt));

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
    jobId?: string;
    quoteId?: string;
    dueDate?: string;
    taxRate?: number;
    notes?: string;
    items?: {
      description: string;
      quantity?: number;
      unitPrice: number;
      sortOrder?: number;
    }[];
  };

  if (!body.clientId || !body.dueDate) {
    return NextResponse.json(
      { error: "clientId and dueDate are required" },
      { status: 422 }
    );
  }

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, body.clientId), eq(clients.orgId, orgId)))
    .limit(1);
  if (!client) {
    return NextResponse.json({ error: "Invalid clientId" }, { status: 422 });
  }

  if (body.jobId) {
    const [job] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.id, body.jobId), eq(jobs.orgId, orgId)))
      .limit(1);
    if (!job) {
      return NextResponse.json({ error: "Invalid jobId" }, { status: 422 });
    }
  }

  if (body.quoteId) {
    const [quote] = await db
      .select({ id: quotes.id })
      .from(quotes)
      .where(and(eq(quotes.id, body.quoteId), eq(quotes.orgId, orgId)))
      .limit(1);
    if (!quote) {
      return NextResponse.json({ error: "Invalid quoteId" }, { status: 422 });
    }
  }

  const [org] = await db
    .update(organizations)
    .set({ invoiceCounter: sql`invoice_counter + 1` })
    .where(eq(organizations.id, orgId))
    .returning({ invoiceCounter: organizations.invoiceCounter });

  const invoiceNumber = `INV-${String(org.invoiceCounter).padStart(5, "0")}`;

  const items = body.items ?? [];
  const taxRate = body.taxRate ?? 0.13;
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * (item.quantity ?? 1),
    0
  );
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const [invoice] = await db
    .insert(invoices)
    .values({
      orgId,
      invoiceNumber,
      clientId: body.clientId,
      jobId: body.jobId ?? null,
      quoteId: body.quoteId ?? null,
      dueDate: body.dueDate,
      taxRate,
      subtotal,
      taxAmount,
      total,
      amountPaid: 0,
      notes: body.notes ?? null,
      status: "draft",
    })
    .returning();

  if (items.length > 0) {
    await db.insert(invoiceItems).values(
      items.map((item, i) => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice,
        total: item.unitPrice * (item.quantity ?? 1),
        sortOrder: item.sortOrder ?? i,
      }))
    );
  }

  const insertedItems = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoice.id));

  logAudit({ orgId, userId, action: "create", entityType: "invoice", entityId: invoice.id });

  return NextResponse.json({ ...invoice, items: insertedItems }, { status: 201 });
}
