import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, organizations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireRole, isAuthorized } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { createPortalInviteToken } from "@/lib/portal/invite-token";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("manager");
  if (!isAuthorized(authResult)) return authResult;
  const { orgId, userId } = authResult;

  const { id } = await params;

  const [client] = await db
    .select({
      id: clients.id,
      firstName: clients.firstName,
      lastName: clients.lastName,
      email: clients.email,
    })
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.orgId, orgId)))
    .limit(1);

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (!client.email) {
    return NextResponse.json({ error: "Client must have an email address to receive a portal invite" }, { status: 422 });
  }

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const inviteToken = createPortalInviteToken({
    clientId: client.id,
    orgId,
    email: client.email,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const signupUrl = new URL("/register", baseUrl);
  signupUrl.searchParams.set("email", client.email);
  signupUrl.searchParams.set("portalInvite", inviteToken);

  const emailResult = await sendEmail({
    to: client.email,
    subject: `${org.name} invited you to the client portal`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
        <p>Hello ${escapeHtml(client.firstName)} ${escapeHtml(client.lastName)},</p>
        <p>${escapeHtml(org.name)} invited you to set up access to your client portal.</p>
        <p>
          <a href="${signupUrl.toString()}" style="display:inline-block;padding:12px 20px;background:#f97316;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">
            Create your portal account
          </a>
        </p>
        <p>If the button does not work, copy and paste this link into your browser:</p>
        <p>${escapeHtml(signupUrl.toString())}</p>
      </div>
    `,
  });

  if (!emailResult.success) {
    return NextResponse.json(
      { error: emailResult.reason ?? "Email service is not configured", signupUrl: signupUrl.toString() },
      { status: 503 }
    );
  }

  await logAudit({
    orgId,
    userId,
    action: "update",
    entityType: "client",
    entityId: client.id,
    metadata: { portalInviteSent: true, signupUrl: signupUrl.toString() },
  });

  return NextResponse.json({ success: true, signupUrl: signupUrl.toString() });
}
