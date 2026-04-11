import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/utils/parse-body";
import { isPlainObject, normalizeEmail, sanitizeText } from "@/lib/api/validation";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole("manager");
    if (!isAuthorized(authResult)) return authResult;
    const { orgId, userId } = authResult;

    const limited = rateLimit(`session:${userId}`, 10, 60_000);
    if (limited) return limited;

    const body = await parseBody<{ rows?: unknown[] }>(request, { maxBytes: 10_000_000 });
    if (body instanceof NextResponse) return body;

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json({ error: "No rows to import" }, { status: 400 });
    }

    if (body.rows.length > 5000) {
      return NextResponse.json(
        { error: "Import limited to 5,000 rows per request. Split your file and try again." },
        { status: 422 },
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const validRows: {
      orgId: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      company: string | null;
      source: string;
    }[] = [];

    for (const [index, rawRow] of body.rows.entries()) {
      if (!isPlainObject(rawRow)) {
        skipped += 1;
        errors.push(`Row ${index + 1}: invalid row object`);
        continue;
      }

      const firstName = typeof rawRow.first_name === "string" ? sanitizeText(rawRow.first_name, 100) : "";
      const lastName = typeof rawRow.last_name === "string" ? sanitizeText(rawRow.last_name, 100) : "";
      const company = typeof rawRow.company === "string" ? sanitizeText(rawRow.company, 150) : "";
      const email = typeof rawRow.email === "string" ? normalizeEmail(rawRow.email).slice(0, 254) : null;
      const phone = typeof rawRow.phone === "string" ? sanitizeText(rawRow.phone, 30) : null;

      if (!firstName && !lastName && !company) {
        skipped += 1;
        continue;
      }

      validRows.push({
        orgId,
        firstName: firstName || "Unknown",
        lastName,
        email,
        phone,
        company: company || null,
        source: "import",
      });
    }

    const batchSize = 100;
    try {
      for (let index = 0; index < validRows.length; index += batchSize) {
        const batch = validRows.slice(index, index + batchSize);
        await db.insert(clients).values(batch);
        imported += batch.length;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Batch insert failed");
      skipped += validRows.length - imported;
    }

    await logAudit({
      orgId,
      userId,
      action: "create",
      entityType: "client",
      entityId: "bulk-import",
      metadata: { imported, skipped, attempted: body.rows.length },
    });

    return NextResponse.json({ imported, skipped, errors });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

