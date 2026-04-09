"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      const onboardingCompleted =
        data.user?.user_metadata?.onboarding_completed as boolean | undefined;

      if (!onboardingCompleted) {
        router.push("/onboarding/1");
        return;
      }

      const role = data.user?.user_metadata?.role as string | undefined;
      if (role === "client") {
        router.push(redirect ?? "/portal");
      } else {
        router.push(redirect ?? "/dash");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Welcome back</h1>
        <p className="text-sm text-[#6b7280] mt-1">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#d1d5db] mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={cn(
              "w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2.5",
              "text-white text-sm placeholder:text-[#4b5563]",
              "focus:outline-none focus:border-orange-500 transition-colors"
            )}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#d1d5db]"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-orange-500 hover:text-orange-400"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={cn(
              "w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2.5",
              "text-white text-sm placeholder:text-[#4b5563]",
              "focus:outline-none focus:border-orange-500 transition-colors"
            )}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold",
            "rounded-lg px-4 py-2.5 text-sm transition-colors",
            "flex items-center justify-center gap-2",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#6b7280]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-orange-500 hover:text-orange-400">
          Get started free
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
