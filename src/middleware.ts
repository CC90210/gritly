import { type NextRequest, NextResponse } from "next/server";

const GRITLY_ROLES = new Set([
  "owner",
  "admin",
  "manager",
  "dispatcher",
  "technician",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDashRoute = pathname.startsWith("/dash");
  const isPortalRoute = pathname.startsWith("/portal");
  const isOnboardingRoute = pathname.startsWith("/onboarding");

  // Public routes pass through
  if (!isDashRoute && !isPortalRoute && !isOnboardingRoute) {
    return NextResponse.next();
  }

  // Skip middleware if Supabase is not configured
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  try {
    const { updateSession } = await import("@/lib/supabase/middleware");
    const { supabaseResponse, user } = await updateSession(request);

    // All protected routes require auth
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = (user.user_metadata?.role as string) ?? "client";
    const onboardingCompleted = user.user_metadata?.onboarding_completed as
      | boolean
      | undefined;

    // /portal/* requires client role
    if (isPortalRoute && GRITLY_ROLES.has(role)) {
      return NextResponse.redirect(new URL("/dash", request.url));
    }

    if (isDashRoute && role === "client") {
      return NextResponse.redirect(new URL("/portal", request.url));
    }

    // /dash/* requires completed onboarding (except onboarding route itself)
    if (isDashRoute && !onboardingCompleted) {
      return NextResponse.redirect(new URL("/onboarding/1", request.url));
    }

    // /onboarding/* — auth required but onboarding not required
    // Already authed, if they completed onboarding push to dash
    if (isOnboardingRoute && onboardingCompleted) {
      return NextResponse.redirect(new URL("/dash", request.url));
    }

    return supabaseResponse;
  } catch {
    // If anything fails, pass through — pages handle their own auth checks
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/dash/:path*", "/portal/:path*", "/onboarding/:path*"],
};
