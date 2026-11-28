import { timingSafeEqual } from "crypto";
import { adminAuthConfigured, sessionToken } from "./admin-credentials";

// 30 days — keeps admins logged in instead of silently expiring after a day.
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

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
export async function hasValidSession(request: Request): Promise<boolean> {
  const value = readSessionCookie(request);
  if (!value) return false;
  try {
    // If real credentials aren't configured in production, nobody is authorized.
    if (!(await adminAuthConfigured())) return false;
    const a = Buffer.from(value);
    const b = Buffer.from(await sessionToken());
    return a.length === b.length && timingSafeEqual(a, b);
  } catch (error) {
    // The stored password couldn't be read: refuse rather than guess.
    console.error(
      "[admin-auth] Session check failed:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/** Standard 401 response for protected route handlers. */
export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized — please log in again." }, { status: 401 });
}

/**
 * Only flag the cookie `Secure` over real HTTPS. On plain http://localhost,
 * Safari silently drops Secure cookies, which would break login locally.
 * x-forwarded-proto covers production behind a proxy (e.g. Vercel).
 */
export function isHttps(request: Request): boolean {
  const xfProto = request.headers.get("x-forwarded-proto");
  if (xfProto) return xfProto.split(",")[0].trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

/** The Set-Cookie value for the admin session cookie. */
export function sessionCookie(value: string, maxAge: number, secure: boolean): string {
  return `btg-session=${value}; HttpOnly;${secure ? " Secure;" : ""} SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}
