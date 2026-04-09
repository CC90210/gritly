import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { INDUSTRY_CONFIGS } from "@/lib/industry/config";
import type { IndustrySlug } from "@/lib/constants/brand";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  // Get user with org
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const user = userRows[0];
  if (!user?.orgId) {
    redirect("/login");
  }

  const orgRows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.orgId))
    .limit(1);

  const org = orgRows[0];
  if (!org) {
    redirect("/login");
  }

  const industryConfig =
    INDUSTRY_CONFIGS[org.industry as IndustrySlug] ?? INDUSTRY_CONFIGS["hvac"];

  return (
    <DashboardShell
      org={{
        id: org.id,
        name: org.name,
        slug: org.slug,
        industry: org.industry as IndustrySlug,
        plan: org.plan as "starter" | "pro" | "business",
        onboarding_completed: org.onboardingCompleted ?? false,
        settings: (org.settings ?? {}) as never,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        created_at: "",
        updated_at: "",
      }}
      industryConfig={industryConfig}
      user={{
        email: user.email ?? "",
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
      }}
    >
      {children}
    </DashboardShell>
  );
}
