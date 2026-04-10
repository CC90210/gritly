import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, clients, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import PortalShell from "@/components/portal/PortalShell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const userRows = await db
    .select({ orgId: users.orgId, role: users.role, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const user = userRows[0];
  if (!user?.orgId) {
    redirect("/login");
  }

  // Portal is for "client" role users only — staff use /dash
  if (user.role !== "client") {
    redirect("/dash");
  }

  const orgRows = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, user.orgId))
    .limit(1);

  const org = orgRows[0];
  if (!org) redirect("/login");

  // Find client record linked to this user
  const clientRows = await db
    .select({ id: clients.id, firstName: clients.firstName, lastName: clients.lastName })
    .from(clients)
    .where(eq(clients.userId, session.user.id))
    .limit(1);

  const clientRecord = clientRows[0] ?? null;

  return (
    <PortalShell
      orgName={org.name}
      user={{
        email: user.email ?? "",
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
      }}
      clientName={
        clientRecord
          ? `${clientRecord.firstName} ${clientRecord.lastName}`.trim()
          : (user.firstName ?? user.email ?? "")
      }
    >
      {children}
    </PortalShell>
  );
}
