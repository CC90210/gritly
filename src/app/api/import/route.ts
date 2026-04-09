import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users, clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRows = await db.select({ orgId: users.orgId }).from(users).where(eq(users.id, session.user.id)).limit(1);
    const orgId = userRows[0]?.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No org" }, { status: 400 });
    }

    const body = await request.json();
    const { rows } = body as { rows: Record<string, string>[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows to import" }, { status: 400 });
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

    return NextResponse.json({ imported, skipped, errors });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
