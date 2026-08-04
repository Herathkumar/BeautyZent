import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Public URLs use /manager/*; app routes still live under /admin/*.
 * /admin/* redirects to /manager/* so old bookmarks keep working.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/admin/, "/manager");
    return NextResponse.redirect(url);
  }

  if (pathname === "/manager" || pathname.startsWith("/manager/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/manager/, "/admin");
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/manager", "/manager/:path*"],
};
