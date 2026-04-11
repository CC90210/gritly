import { createHmac } from "crypto";

export interface PortalInviteTokenPayload {
  clientId: string;
  orgId: string;
  email: string;
  expiresAt: number;
}

function getPortalInviteSecret(): string {
  const secret = process.env.PORTAL_INVITE_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("PORTAL_INVITE_SECRET or BETTER_AUTH_SECRET must be configured");
  }
  return secret;
}

export function createPortalInviteToken(
  payload: Omit<PortalInviteTokenPayload, "expiresAt"> & { expiresAt?: number }
): string {
  const tokenPayload: PortalInviteTokenPayload = {
    ...payload,
    expiresAt: payload.expiresAt ?? Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString("base64url");
  const signature = createHmac("sha256", getPortalInviteSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}
