import { credentialsMatch, sessionToken } from "@/lib/admin-credentials";
import { hasValidSession } from "@/lib/server-auth";

// 30 days — keeps admins logged in instead of silently expiring after a day.
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Only flag the cookie `Secure` over real HTTPS. On plain http://localhost,
 * Safari silently drops Secure cookies, which would break login locally.
 * x-forwarded-proto covers production behind a proxy (e.g. Vercel).
 */
function isHttps(request: Request): boolean {
  const xfProto = request.headers.get("x-forwarded-proto");
  if (xfProto) return xfProto.split(",")[0].trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

function sessionCookie(value: string, maxAge: number, secure: boolean): string {
  return `btg-session=${value}; HttpOnly;${secure ? " Secure;" : ""} SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (credentialsMatch(username, password)) {
    const headers = new Headers();
    headers.append("Set-Cookie", sessionCookie(sessionToken(), SESSION_MAX_AGE, isHttps(request)));
    return Response.json({ success: true }, { headers });
  }

  return Response.json({ success: false, error: "Invalid credentials" }, { status: 401 });
}

export async function GET(request: Request) {
  return Response.json({ valid: hasValidSession(request) });
}

// Logout — clear the session cookie server-side.
export async function DELETE(request: Request) {
  const headers = new Headers();
  headers.append("Set-Cookie", sessionCookie("", 0, isHttps(request)));
  return Response.json({ success: true }, { headers });
}
