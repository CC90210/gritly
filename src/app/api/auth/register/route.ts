import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseBody } from "@/lib/utils/parse-body";
import { logAudit } from "@/lib/audit";
import { normalizeEmail, sanitizeText } from "@/lib/api/validation";
import { rateLimit } from "@/lib/middleware/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = rateLimit(`ip:auth-register:${ip}`, 5, 60_000);
  if (limited) return limited;

  try {
    const body = await parseBody<{
      businessName?: string;
      name?: string;
      email?: string;
      password?: string;
    }>(request);
    if (body instanceof NextResponse) return body;

    const businessName = typeof body.businessName === "string" ? sanitizeText(body.businessName, 150) : "";
    const normalizedEmail = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!businessName || !normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Business name, email, and password are required." },
        { status: 400 },
      );
    }

    if (!EMAIL_RE.test(normalizedEmail)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 422 });
    }

    if (password.length < 8 || password.length > 1024) {
      return NextResponse.json(
        { error: "Password must be between 8 and 1024 characters." },
        { status: 422 },
      );
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    let slug = slugify(businessName);
    if (!slug) {
      return NextResponse.json({ error: "Business name is invalid." }, { status: 422 });
    }

    const existingSlugs = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    if (existingSlugs.length > 0) {
      slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
    }

    const orgId = crypto.randomUUID();
    await db.insert(organizations).values({
      id: orgId,
      name: businessName,
      slug,
      createdByEmail: normalizedEmail,
      industry: "hvac",
      plan: "starter",
      onboardingCompleted: false,
    });

    await logAudit({
      orgId,
      action: "create",
      entityType: "organization",
      entityId: orgId,
      metadata: { slug, createdByEmail: normalizedEmail },
    });

    void body.name;

    return NextResponse.json({ orgId }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("UNIQUE constraint")) {
      return NextResponse.json(
        { error: "Business name already taken. Try a different name." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
