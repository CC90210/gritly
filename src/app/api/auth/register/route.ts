import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/middleware/rate-limit";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limited = rateLimit(`ip:auth:${ip}`, 10, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const { businessName, name, email, password } = body;

    if (!businessName || !email || !password) {
      return NextResponse.json(
        { error: "Business name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    let slug = slugify(businessName);
    const existingSlugs = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1);
    if (existingSlugs.length > 0) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const orgId = crypto.randomUUID();
    await db.insert(organizations).values({
      id: orgId,
      name: businessName,
      slug,
      industry: "hvac",
      plan: "starter",
      onboardingCompleted: false,
    });

    return NextResponse.json({ orgId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
