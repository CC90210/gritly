import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

async function uniqueSlug(
  admin: Awaited<ReturnType<typeof createAdminSupabase>>,
  base: string
): Promise<string> {
  let candidate = slugify(base);
  let attempt = 0;

  while (true) {
    const slug = attempt === 0 ? candidate : `${candidate}-${attempt}`;
    const { data } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) return slug;
    attempt++;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      businessName: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    };

    const { businessName, firstName, lastName, email, password } = body;

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

    const admin = await createAdminSupabase();

    // 1. Create the organization (industry defaults to hvac, updated in onboarding)
    const slug = await uniqueSlug(admin, businessName);
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({
        name: businessName,
        slug,
        industry: "hvac", // placeholder — overwritten in onboarding step 1
        plan: "starter",
        onboarding_completed: false,
      })
      .select("id")
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: orgError?.message ?? "Failed to create organization." },
        { status: 500 }
      );
    }

    // 2. Create the auth user with org_id in metadata
    //    The handle_new_user trigger will auto-create the profile row
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          org_id: org.id,
          role: "owner",
          first_name: firstName,
          last_name: lastName,
          onboarding_completed: false,
        },
      });

    if (authError || !authData.user) {
      // Rollback org creation
      await admin.from("organizations").delete().eq("id", org.id);
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create user account." },
        { status: 500 }
      );
    }

    return NextResponse.json({ orgId: org.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
