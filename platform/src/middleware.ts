import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BOOT_COOKIE = "fhsalon_boot";

function isDocumentNavigation(request: NextRequest) {
  if (request.method !== "GET") return false;
  // App Router RSC / prefetch — never replace with splash
  if (request.headers.get("rsc")) return false;
  if (request.headers.get("next-router-prefetch")) return false;
  if (request.headers.get("next-router-state-tree")) return false;

  const dest = request.headers.get("sec-fetch-dest");
  // iframe loads of the real app use dest=iframe — must NOT get the splash again
  if (dest === "iframe" || dest === "empty") return false;
  if (dest && dest !== "document") return false;

  const accept = request.headers.get("accept") || "";
  // Safari sometimes omits Accept details; only bail when clearly non-HTML.
  if (accept.includes("application/json") && !accept.includes("text/html")) return false;

  return true;
}

function coldBootShell(pathname: string): string | null {
  if (pathname === "/manager" || pathname.startsWith("/manager/")) {
    return "/shells/manager.html";
  }
  if (pathname === "/stylist" || pathname.startsWith("/stylist/")) {
    return "/shells/stylist.html";
  }
  if (/^\/display\/[^/]+\/?$/.test(pathname)) {
    return "/shells/display.html";
  }
  return null;
}

/**
 * Public URLs use /manager/*; app routes still live under /admin/*.
 * Cold document opens get a static splash first (Edge/CDN) so Safari
 * never sits on a blank white screen while the Node app wakes up.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/admin/, "/manager");
    return NextResponse.redirect(url);
  }

  const shell = coldBootShell(pathname);
  const hasBoot = Boolean(request.cookies.get(BOOT_COOKIE)?.value);
  if (shell && isDocumentNavigation(request) && !hasBoot) {
    const url = request.nextUrl.clone();
    url.pathname = shell;
    url.search = "";
    const res = NextResponse.rewrite(url);
    // Remember intended path for the shell (URL bar still shows the app path on rewrite).
    res.cookies.set("fhsalon_boot_next", pathname + request.nextUrl.search, {
      path: "/",
      maxAge: 60,
      sameSite: "lax",
    });
    return res;
  }

  if (pathname === "/manager" || pathname.startsWith("/manager/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/manager/, "/admin");
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/manager",
    "/manager/:path*",
    "/stylist",
    "/stylist/:path*",
    "/display/:path*",
  ],
};
