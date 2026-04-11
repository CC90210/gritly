import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requirePortalClient } from "@/lib/api/portal-context";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { parsePagination } from "@/lib/api/pagination";

export async function GET(req: NextRequest) {
  const portalContext = await requirePortalClient();
  if (portalContext instanceof NextResponse) return portalContext;
  const { orgId, userId, client } = portalContext;

  const limited = rateLimit(`portal:${userId}`, 60, 60_000);
  if (limited) return limited;

  const pagination = parsePagination(req.nextUrl.searchParams);
  if (pagination instanceof NextResponse) return pagination;

  const baseQuery = db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      status: invoices.status,
      dueDate: invoices.dueDate,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), eq(invoices.clientId, client.id)))
    .orderBy(desc(invoices.createdAt));
  const rows = pagination
    ? await baseQuery.limit(pagination.limit).offset(pagination.offset)
    : await baseQuery;
  return NextResponse.json(
    rows.map((invoice) => ({
      ...invoice,
      balanceDue: (invoice.total ?? 0) - (invoice.amountPaid ?? 0),
    })),
  );
}

