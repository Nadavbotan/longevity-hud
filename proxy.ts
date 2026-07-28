import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Bodies are deliberately null. On Vercel's Edge runtime a string/stream body
// returned from the proxy can get its ReadableStream locked by the response
// pipeline, throwing ERR_INVALID_STATE ("ReadableStream is locked"). A null body
// has no stream to lock. For Basic Auth the browser shows its own credential
// dialog on a 401, so the body text would never be displayed anyway.
function unauthorized(): NextResponse {
  return new NextResponse(null, {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Longevity"' },
  });
}

// Refuse to serve rather than expose medical data if the gate is misconfigured
// in production (see security review: fail closed, not open).
function misconfigured(): NextResponse {
  return new NextResponse(null, { status: 503 });
}

/**
 * Constant-time string compare for the Edge runtime (node:crypto.timingSafeEqual
 * is not available here). Length is allowed to leak; the secret bytes are not.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function proxy(request: NextRequest): NextResponse {
  const password = process.env.HUB_PASSWORD;

  if (!password) {
    // Open only outside production (convenient local dev). In a production
    // build with no password set, fail closed so health data is never public.
    if (process.env.NODE_ENV === "production") return misconfigured();
    return NextResponse.next();
  }

  const user = process.env.HUB_USER || "admin";

  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Basic ")) {
    return unauthorized();
  }

  const encoded = header.slice("Basic ".length).trim();

  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized();
  }

  // Only split on the first ":"; passwords may legitimately contain colons.
  const separator = decoded.indexOf(":");
  if (separator === -1) {
    return unauthorized();
  }

  const providedUser = decoded.slice(0, separator);
  const providedPass = decoded.slice(separator + 1);

  // Compare both halves without short-circuiting on the user mismatch.
  const ok = safeEqual(providedUser, user) && safeEqual(providedPass, password);
  if (!ok) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/add|_next/static|_next/image|favicon.ico).*)"],
};
