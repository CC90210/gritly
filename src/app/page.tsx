/**
 * Root route handler.
 *
 * The App Router resolves "/" by checking both app/page.tsx and
 * app/(marketing)/page.tsx. Since we cannot have two page.tsx files
 * resolving the same route, this file simply re-exports the marketing
 * homepage so the root URL "/" renders the full marketing site with
 * Navbar and Footer via (marketing)/layout.tsx.
 *
 * NOTE: Next.js App Router DOES allow a page.tsx at the root AND inside
 * a route group simultaneously — the route group takes precedence for its
 * own layout. However, to avoid ambiguity we keep this file minimal and
 * let (marketing)/page.tsx handle the actual rendering.
 */
export { default } from "./(marketing)/page";
