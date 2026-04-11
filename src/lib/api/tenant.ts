import { db } from "@/lib/db";
import {
  clients,
  invoices,
  jobVisits,
  jobs,
  properties,
  quotes,
  serviceItems,
  teamMembers,
  users,
} from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export async function clientExists(orgId: string, clientId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)))
    .limit(1);

  return Boolean(row);
}

export async function propertyExists(orgId: string, propertyId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.orgId, orgId)))
    .limit(1);

  return Boolean(row);
}

export async function propertyBelongsToClient(
  orgId: string,
  propertyId: string,
  clientId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(
        eq(properties.id, propertyId),
        eq(properties.clientId, clientId),
        eq(properties.orgId, orgId),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function quoteExists(orgId: string, quoteId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.orgId, orgId)))
    .limit(1);

  return Boolean(row);
}

export async function jobExists(orgId: string, jobId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.orgId, orgId)))
    .limit(1);

  return Boolean(row);
}

export async function teamMemberExists(orgId: string, teamMemberId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.id, teamMemberId), eq(teamMembers.orgId, orgId)))
    .limit(1);

  return Boolean(row);
}

export async function visitExists(orgId: string, visitId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: jobVisits.id })
    .from(jobVisits)
    .where(and(eq(jobVisits.id, visitId), eq(jobVisits.orgId, orgId)))
    .limit(1);

  return Boolean(row);
}

export async function invoiceExists(orgId: string, invoiceId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)))
    .limit(1);

  return Boolean(row);
}

export async function userBelongsToOrg(orgId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.orgId, orgId)))
    .limit(1);

  return Boolean(row);
}

export async function serviceItemsExist(orgId: string, serviceIds: string[]): Promise<boolean> {
  const uniqueIds = [...new Set(serviceIds)];
  if (uniqueIds.length === 0) return true;

  const rows = await db
    .select({ id: serviceItems.id })
    .from(serviceItems)
    .where(and(eq(serviceItems.orgId, orgId), inArray(serviceItems.id, uniqueIds)));

  return rows.length === uniqueIds.length;
}

export async function teamMembersExist(
  orgId: string,
  teamMemberIds: string[],
): Promise<boolean> {
  const uniqueIds = [...new Set(teamMemberIds)];
  if (uniqueIds.length === 0) return true;

  const rows = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.orgId, orgId), inArray(teamMembers.id, uniqueIds)));

  return rows.length === uniqueIds.length;
}
