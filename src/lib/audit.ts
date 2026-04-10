import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export type AuditAction = "create" | "update" | "delete";
export type AuditEntityType =
  | "client"
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

/**
 * Log an audit event. Fire-and-forget — never blocks the response.
 */
export function logAudit(params: {
  orgId: string;
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}): void {
  // Fire-and-forget: don't await, don't block the caller
  db.insert(auditLogs)
    .values({
      orgId: params.orgId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? {},
    })
    .catch((err) => {
      console.error("[audit] Failed to log:", err);
    });
}
