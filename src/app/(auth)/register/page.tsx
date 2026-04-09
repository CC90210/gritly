"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/auth/client";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function RegisterPage() {
  const [businessName, setBusinessName] = useState("");
  const [yourName, setYourName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create org via API
      const orgRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, name: yourName, email, password }),
      });

      const orgData = await orgRes.json();
      if (!orgRes.ok) {
        setError(orgData.error || "Registration failed.");
        return;
      }
      const orgId: string = orgData.orgId;

      // Step 2: Sign in via better-auth
      const result = await signUp.email({
        email,
        password,
        name: yourName,
      });

      if (result.error) {
        // User might already exist from the API call — try signing in
        const signInResult = await (await import("@/lib/auth/client")).signIn.email({ email, password });
        if (signInResult.error) {
          setError("Account created but sign-in failed. Please go to the login page.");
          return;
        }
      }

      // Link the authenticated user to their org
      await fetch("/api/auth/link-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      window.location.href = "/onboarding/1";
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Start your free trial</h1>
        <p className="text-sm text-[#6b7280] mt-1">No credit card required</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-[#d1d5db] mb-1.5">
            Business name
          </label>
          <input
            id="businessName"
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Apex HVAC & Plumbing"
            className={cn(
              "w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2.5",
              "text-white text-sm placeholder:text-[#4b5563]",
              "focus:outline-none focus:border-orange-500 transition-colors"
            )}
          />
        </div>

        <div>
          <label htmlFor="yourName" className="block text-sm font-medium text-[#d1d5db] mb-1.5">
            Your name
          </label>
          <input
            id="yourName"
            type="text"
            required
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            placeholder="Jordan Smith"
            className={cn(
              "w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2.5",
              "text-white text-sm placeholder:text-[#4b5563]",
              "focus:outline-none focus:border-orange-500 transition-colors"
            )}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#d1d5db] mb-1.5">
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            className={cn(
              "w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2.5",
              "text-white text-sm placeholder:text-[#4b5563]",
              "focus:outline-none focus:border-orange-500 transition-colors"
            )}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#d1d5db] mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
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
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#6b7280]">
        Already have an account?{" "}
        <Link href="/login" className="text-orange-500 hover:text-orange-400">
          Sign in
        </Link>
      </p>
    </>
  );
}
