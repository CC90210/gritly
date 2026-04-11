import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessName, name, email, password } = body;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!businessName || !normalizedEmail || !password) {
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

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
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
    // If better-auth signup fails after this insert, a background cleanup job should
    // remove organizations older than 5 minutes that still have no linked owner user.
    await db.insert(organizations).values({
      id: orgId,
      name: businessName,
      slug,
      createdByEmail: normalizedEmail,
      industry: "hvac",
      plan: "starter",
      onboardingCompleted: false,
    });

    // Suppress unused variable warning — name may be used by caller for display
    void name;

    return NextResponse.json({ orgId }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    // Catch duplicate slug race condition (two simultaneous signups with same business name)
    if (msg.includes("UNIQUE constraint")) {
      return NextResponse.json(
        { error: "Business name already taken. Try a different name." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
