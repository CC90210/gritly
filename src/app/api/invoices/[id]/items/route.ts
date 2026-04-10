import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

/** Recalculate invoice totals from items */
async function recalcInvoiceTotals(invoiceId: string) {
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));

  const subtotal = items.reduce((sum, item) => sum + (item.total ?? 0), 0);

  const [inv] = await db
    .select({ taxRate: invoices.taxRate })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  const taxRate = inv?.taxRate ?? 0.13;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  await db
    .update(invoices)
    .set({ subtotal, taxAmount, total, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;

  // Verify invoice belongs to org
  const [invoice] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)))
    .limit(1);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id));

  return NextResponse.json(items);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await params;

  const [invoice] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)))
    .limit(1);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const body = await req.json() as {
    description?: string;
    quantity?: number;
    unitPrice?: number;
    sortOrder?: number;
  };

  if (!body.description || body.unitPrice === undefined) {
    return NextResponse.json(
      { error: "description and unitPrice are required" },
      { status: 422 }
    );
  }

  const quantity = body.quantity ?? 1;
  const total = body.unitPrice * quantity;

  const [item] = await db
    .insert(invoiceItems)
    .values({
      invoiceId: id,
      description: body.description,
      quantity,
      unitPrice: body.unitPrice,
      total,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  await recalcInvoiceTotals(id);

  logAudit({ orgId, userId, action: "create", entityType: "invoice_item", entityId: item.id, metadata: { invoiceId: id } });

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id: invoiceId } = await params;

  const [invoice] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)))
    .limit(1);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const body = await req.json() as {
    itemId: string;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    sortOrder?: number;
  };

  if (!body.itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 422 });
  }

  // Verify item belongs to this invoice
  const [existing] = await db
    .select()
    .from(invoiceItems)
    .where(and(eq(invoiceItems.id, body.itemId), eq(invoiceItems.invoiceId, invoiceId)))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (body.description !== undefined) updateData.description = body.description;
  if (body.quantity !== undefined) updateData.quantity = body.quantity;
  if (body.unitPrice !== undefined) updateData.unitPrice = body.unitPrice;
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

  // Recalculate item total
  const qty = body.quantity ?? existing.quantity ?? 1;
  const price = body.unitPrice ?? existing.unitPrice;
  updateData.total = price * qty;

  const [updated] = await db
    .update(invoiceItems)
    .set(updateData)
    .where(eq(invoiceItems.id, body.itemId))
    .returning();

  await recalcInvoiceTotals(invoiceId);

  logAudit({ orgId, userId, action: "update", entityType: "invoice_item", entityId: body.itemId, metadata: { invoiceId } });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const { id: invoiceId } = await params;

  const [invoice] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)))
    .limit(1);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ error: "itemId query param is required" }, { status: 422 });
  }

  const [deleted] = await db
    .delete(invoiceItems)
    .where(and(eq(invoiceItems.id, itemId), eq(invoiceItems.invoiceId, invoiceId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  await recalcInvoiceTotals(invoiceId);

  logAudit({ orgId, userId, action: "delete", entityType: "invoice_item", entityId: itemId, metadata: { invoiceId } });

  return NextResponse.json({ success: true });
}
