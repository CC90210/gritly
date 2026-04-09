import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { INDUSTRY_CONFIGS } from "@/lib/industry/config";
import type { IndustrySlug } from "@/lib/constants/brand";
import type { Organization } from "@/lib/types/database";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) {
    redirect("/login");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (!org) {
    redirect("/login");
  }

  const industryConfig =
    INDUSTRY_CONFIGS[(org as Organization).industry as IndustrySlug] ??
    INDUSTRY_CONFIGS["hvac"];

  return (
    <DashboardShell
      org={org as Organization}
      industryConfig={industryConfig}
      user={{
        email: user.email ?? "",
        firstName: (user.user_metadata?.first_name as string) ?? "",
        lastName: (user.user_metadata?.last_name as string) ?? "",
      }}
    >
      {children}
    </DashboardShell>
  );
}
