import { createBrowserClient } from "@supabase/ssr";

// Note: We do not pass the Database generic to createBrowserClient.
// Our handwritten Database type (src/lib/types/database.ts) is used for
// typed query results via explicit casting at the call site — not for
// constraining the Supabase client itself, which requires Supabase CLI-generated
// types to produce correct Insert/Update constraints.
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables.\n" +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
