import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole("admin");
    if (!isAuthorized(authResult)) return authResult;
    const { orgId, userId } = authResult;

    const limited = rateLimit(`session:${userId}`, 60, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const { rows } = body as { rows: Record<string, string>[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows to import" }, { status: 400 });
    }

    if (rows.length > 5000) {
      return NextResponse.json(
        { error: "Import limited to 5,000 rows per request. Split your file and try again." },
        { status: 422 }
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstName = row.first_name?.trim() || "";
      const lastName = row.last_name?.trim() || "";
      const company = row.company?.trim() || "";

      if (!firstName && !lastName && !company) {
        skipped++;
        continue;
      }

      try {
        await db.insert(clients).values({
          orgId,
          firstName: firstName || "Unknown",
          lastName: lastName || "",
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          company: company || null,
          source: "import",
        });
        imported++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "Failed"}`);
        skipped++;
      }
    }

    logAudit({ orgId, userId, action: "create", entityType: "client", entityId: "bulk-import", metadata: { imported, skipped } });

    return NextResponse.json({ imported, skipped, errors });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
