import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const authResult = await requireRole("technician");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const body = await parseBody<{ invoiceId: string }>(req);
  if (body instanceof NextResponse) return body;

  if (!body.invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 422 });
  }

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, body.invoiceId), eq(invoices.orgId, orgId)))
    .limit(1);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "paid" || invoice.status === "void") {
    return NextResponse.json(
      { error: `Cannot create a payment link for a ${invoice.status} invoice` },
      { status: 422 }
    );
  }

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoice.id));

  const balanceDue = (invoice.total ?? 0) - (invoice.amountPaid ?? 0);

  if (balanceDue <= 0) {
    return NextResponse.json({ error: "No balance due on this invoice" }, { status: 422 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;

  // Build line items from invoice items; fall back to a single line item for the balance
  const lineItems: { price_data: { currency: string; product_data: { name: string }; unit_amount: number }; quantity: number }[] =
    items.length > 0
      ? items.map((item) => ({
          price_data: {
            currency: "cad",
            product_data: {
              name: item.description,
            },
            // Stripe amounts are in cents
            unit_amount: Math.round(item.unitPrice * 100),
          },
          quantity: Math.round(item.quantity ?? 1),
        }))
      : [
          {
            price_data: {
              currency: "cad",
              product_data: {
                name: `Invoice ${invoice.invoiceNumber}`,
              },
              unit_amount: Math.round(balanceDue * 100),
            },
            quantity: 1,
          },
        ];

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${baseUrl}/dash/invoices/${invoice.id}?payment=success`,
    cancel_url: `${baseUrl}/dash/invoices/${invoice.id}?payment=cancelled`,
    metadata: {
      invoiceId: invoice.id,
      orgId,
    },
  });

  await logAudit({
    orgId,
    userId,
    action: "create",
    entityType: "payment",
    entityId: invoice.id,
    metadata: { stripeSessionId: session.id, invoiceId: invoice.id },
  });

  return NextResponse.json({ url: session.url });
}
