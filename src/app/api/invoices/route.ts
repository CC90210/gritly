import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceItems, organizations, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_req: NextRequest) {
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
    .from(invoices)
    .where(eq(invoices.orgId, orgId))
    .orderBy(desc(invoices.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
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

  // Auto-increment invoice counter
  const [org] = await db
    .select({ invoiceCounter: organizations.invoiceCounter })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  const newCounter = (org?.invoiceCounter ?? 1000) + 1;
  await db
    .update(organizations)
    .set({ invoiceCounter: newCounter })
    .where(eq(organizations.id, orgId));

  const invoiceNumber = `INV-${String(newCounter).padStart(5, "0")}`;

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

  return NextResponse.json({ ...invoice, items: insertedItems }, { status: 201 });
}
