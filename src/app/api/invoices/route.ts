import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceItems, organizations } from "@/lib/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { parsePagination } from "@/lib/api/pagination";
import { clientExists, jobExists, quoteExists } from "@/lib/api/tenant";
import { isFiniteNumber, isValidUuid, sanitizeText } from "@/lib/api/validation";
import { rateLimit } from "@/lib/middleware/rate-limit";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (clientId && (!isValidUuid(clientId) || !(await clientExists(orgId, clientId)))) {
    return NextResponse.json({ error: "clientId must belong to the same organization" }, { status: 422 });
  }

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const where = clientId
    ? and(eq(invoices.orgId, orgId), eq(invoices.clientId, clientId))
    : eq(invoices.orgId, orgId);

  const baseQuery = db
    .select()
    .from(invoices)
    .where(where)
    .orderBy(desc(invoices.createdAt));

  const rows = pagination
    ? await baseQuery.limit(pagination.limit).offset(pagination.offset)
    : await baseQuery;

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const limited = rateLimit(`session:${userId}`, 60, 60_000);
  if (limited) return limited;

  const body = await parseBody<{
    clientId?: string;
    jobId?: string | null;
    quoteId?: string | null;
    dueDate?: string;
    taxRate?: number;
    notes?: string;
    items?: {
      description?: string;
      quantity?: number;
      unitPrice?: number;
      sortOrder?: number;
    }[];
  }>(req);
  if (body instanceof NextResponse) return body;

  if (!isValidUuid(body.clientId) || !(await clientExists(orgId, body.clientId))) {
    return NextResponse.json({ error: "clientId must belong to the same organization" }, { status: 422 });
  }

  const clientId = body.clientId;

  if (body.jobId !== undefined && body.jobId !== null) {
    if (!isValidUuid(body.jobId) || !(await jobExists(orgId, body.jobId))) {
      return NextResponse.json({ error: "jobId must belong to the same organization" }, { status: 422 });
    }
  }

  if (body.quoteId !== undefined && body.quoteId !== null) {
    if (!isValidUuid(body.quoteId) || !(await quoteExists(orgId, body.quoteId))) {
      return NextResponse.json({ error: "quoteId must belong to the same organization" }, { status: 422 });
    }
  }

  const dueDate = typeof body.dueDate === "string" ? sanitizeText(body.dueDate, 50) : "";
  if (!dueDate) {
    return NextResponse.json({ error: "dueDate is required" }, { status: 422 });
  }

  const taxRate = body.taxRate ?? 0.13;
  if (!isFiniteNumber(taxRate) || taxRate < 0 || taxRate > 1) {
    return NextResponse.json({ error: "taxRate must be a number between 0 and 1" }, { status: 422 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length > 200) {
    return NextResponse.json({ error: "An invoice may not contain more than 200 items" }, { status: 422 });
  }

  const normalizedItems = items.map((item, index) => {
    const description = typeof item.description === "string" ? sanitizeText(item.description, 500) : "";
    const quantity = item.quantity ?? 1;
    const unitPrice = item.unitPrice;

    if (!description) {
      throw new Error(`Item ${index + 1}: description is required`);
    }

    if (!isFiniteNumber(quantity) || quantity <= 0) {
      throw new Error(`Item ${index + 1}: quantity must be a positive number`);
    }

    if (!isFiniteNumber(unitPrice) || unitPrice < 0) {
      throw new Error(`Item ${index + 1}: unitPrice must be a non-negative number`);
    }

    return {
      description,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
      sortOrder: Number.isInteger(item.sortOrder) ? item.sortOrder : index,
    };
  });

  try {
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    const invoice = await db.transaction(async (tx) => {
      const [org] = await tx
        .update(organizations)
        .set({ invoiceCounter: sql`invoice_counter + 1` })
        .where(eq(organizations.id, orgId))
        .returning({ invoiceCounter: organizations.invoiceCounter });

      const counter = org?.invoiceCounter ?? 1000;
      const invoiceNumber = `INV-${String(counter).padStart(5, "0")}`;

      const [newInvoice] = await tx
        .insert(invoices)
        .values({
          orgId,
          invoiceNumber,
          clientId,
          jobId: body.jobId ?? null,
          quoteId: body.quoteId ?? null,
          dueDate,
          taxRate,
          subtotal,
          taxAmount,
          total,
          amountPaid: 0,
          notes: typeof body.notes === "string" ? sanitizeText(body.notes, 4000) : null,
          status: "draft",
        })
        .returning();

      if (normalizedItems.length > 0) {
        await tx.insert(invoiceItems).values(
          normalizedItems.map((item) => ({
            invoiceId: newInvoice.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            sortOrder: item.sortOrder,
          })),
        );
      }

      return newInvoice;
    });

    const insertedItems = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id));

    await logAudit({ orgId, userId, action: "create", entityType: "invoice", entityId: invoice.id });

    return NextResponse.json({ ...invoice, items: insertedItems }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create invoice";
    const status = message.startsWith("Item ") ? 422 : 500;
    return NextResponse.json({ error: status === 422 ? message : "Internal error" }, { status });
  }
}

