import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
// Database type is used for typed return values at the call site via explicit casting.
// It is not passed into createServerClient — see client.ts for explanation.

/**
 * Server-side Supabase client with cookie-based session handling.
 * Returns a chainable no-op proxy when env vars are missing so pages
 * don't crash in CI or during local dev without credentials.
 */
export async function createServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const emptyResult = { data: [], error: null, count: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- safe proxy stub for missing env
    const chainable: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- safe proxy stub for missing env
    const handler: ProxyHandler<Record<string, any>> = {
      get(_target, prop) {
        if (prop === "data") return [];
        if (prop === "error") return null;
        if (prop === "count") return 0;
        if (prop === "then")
          return (resolve: (v: unknown) => void) => resolve(emptyResult);
        return () => new Proxy(chainable, handler);
      },
    };
    const queryProxy = new Proxy(chainable, handler);

    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({
          data: { user: null, session: null },
          error: { message: "Supabase not configured" },
        }),
        signUp: async () => ({
          data: { user: null, session: null },
          error: { message: "Supabase not configured" },
        }),
        signOut: async () => ({ error: null }),
      },
      from: () => queryProxy,
      rpc: () => queryProxy,
    } as unknown as ReturnType<typeof createServerClient>;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component — cookies cannot be set here; Route Handler sets them
        }
      },
    },
  });
}

/**
 * Service-role client for admin operations (bypasses RLS).
 * Never call this from a client component or public API route.
 */
export async function createAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase admin credentials not configured.\n" +
        "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  const { createClient } = await import("@supabase/supabase-js");
  return createClient(supabaseUrl, serviceRoleKey);
}
