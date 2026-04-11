import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // better-auth stores session in cookies
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ??
    request.cookies.get("__Secure-better-auth.session_token")?.value;
  const hasSession = !!sessionToken;

  const isDash = pathname.startsWith("/dash");
  const isPortal = pathname.startsWith("/portal");
  const isOnboarding = pathname.startsWith("/onboarding");

  if ((isDash || isPortal || isOnboarding) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dash/:path*", "/portal/:path*", "/onboarding/:path*"],
};
