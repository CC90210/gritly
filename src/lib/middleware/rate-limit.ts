/**
 * Rate limiting is intentionally removed from application code.
 *
 * In-memory rate limiters are non-functional in serverless environments
 * (Vercel) because each invocation gets a fresh process with no shared state.
 *
 * Production rate limiting should be handled at the infrastructure layer:
 *   - Vercel Pro/Enterprise: Built-in WAF rate limiting via Vercel Firewall
 *   - Cloudflare: Rate limiting rules on the edge
 *   - Upstash Redis: If a per-route limit is ever needed at the app layer
 *
 * This stub is kept so existing imports don't break during the migration.
 * All call sites that previously called rateLimit() now receive null (allowed).
 */
export function rateLimit(
  _key: string,
  _maxRequests: number,
  _windowMs: number
): null {
  return null;
}
