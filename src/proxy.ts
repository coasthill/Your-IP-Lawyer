import { NextResponse, type NextRequest } from "next/server";

/**
 * Coarse gate for the admin area: without a session cookie, go to the login page.
 * The real authorisation check happens server-side in the admin layout and every action
 * (the cookie is validated against the database there).
 */
const SESSION_COOKIE = "yil_admin";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!request.cookies.get(SESSION_COOKIE)?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
