import { timingSafeEqual } from "crypto";
import { adminAuthConfigured, sessionToken } from "./admin-credentials";

function readSessionCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  return (
    cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("btg-session="))
      ?.split("=")[1] ?? null
  );
}

/** True when the request carries a valid, non-expired admin session cookie. */
export function hasValidSession(request: Request): boolean {
  // If real credentials aren't configured in production, nobody is authorized.
  if (!adminAuthConfigured()) return false;
  const value = readSessionCookie(request);
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(sessionToken());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Standard 401 response for protected route handlers. */
export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized — please log in again." }, { status: 401 });
}
