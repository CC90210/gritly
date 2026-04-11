import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export type AuditAction = "create" | "update" | "delete";
export type AuditEntityType =
  | "client"
  | "communication"
  | "quote"
  | "job"
  | "invoice"
  | "invoice_item"
  | "expense"
  | "team_member"
  | "service_request"
  | "review_request"
  | "property"
  | "service_item"
  | "maintenance_agreement"
  | "time_entry"
  | "payment"
  | "organization"
  | "onboarding"
  | "inventory_item";

const SYSTEM_AUDIT_USER_ID = "system";

/**
 * Log an audit event. Awaitable - callers should await this so the insert
 * completes before the serverless function tears down.
 */
export async function logAudit(params: {
  orgId: string;
  userId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(auditLogs)
    .values({
      orgId: params.orgId,
      userId: params.userId ?? SYSTEM_AUDIT_USER_ID,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? {},
    })
    .catch((err) => {
      // Non-fatal: audit failure must never break the primary request
      // eslint-disable-next-line no-console
      console.error("[audit] Failed to log:", err);
    });
}
