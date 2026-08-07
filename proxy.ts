import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

const API_BASE =
  process.env.API_URL_INTERNAL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export function proxy(req: NextRequest, event: NextFetchEvent) {
  // Skip router prefetches so only real page views are reported
  const isPrefetch =
    req.headers.get("next-router-prefetch") !== null ||
    req.headers.get("purpose") === "prefetch";

  if (!isPrefetch) {
    // Fire-and-forget: never delays or fails the page response
    event.waitUntil(
      fetch(`${API_BASE}/api/visit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Visit-Secret": process.env.VISIT_SECRET || "",
        },
        body: JSON.stringify({
          path: req.nextUrl.pathname,
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "",
          userAgent: req.headers.get("user-agent") || "",
          referrer: req.headers.get("referer") || "",
          language: req.headers.get("accept-language")?.split(",")[0] || "",
        }),
      }).catch(() => {})
    );
  }

  return NextResponse.next();
}

export const config = {
  // Pages only: skip static assets, files with extensions, and API routes
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
