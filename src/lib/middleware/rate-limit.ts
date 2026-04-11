/**
 * Rate limiting is intentionally removed from application code.
 *
 * In-memory rate limiters are non-functional in serverless environments
 * (Vercel) because each invocation gets a fresh process with no shared state.
 *
 * Production rate limiting should be handled at the infrastructure layer:
 *   - Vercel Edge / Vercel Firewall: real edge-enforced rate limiting
 *   - Cloudflare: Rate limiting rules on the edge
 *   - Upstash Redis: If a per-route limit is ever needed at the app layer
 *
 * This stub is intentionally a no-op so existing imports do not break while the
 * app is waiting for a real implementation. All current call sites are allowed.
 */
export function rateLimit(
  _key: string,
  _maxRequests: number,
  _windowMs: number
): null {
  return null;
}
