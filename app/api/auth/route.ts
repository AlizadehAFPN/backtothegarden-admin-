import { credentialsMatch, sessionToken } from "@/lib/admin-credentials";
import { SESSION_MAX_AGE, hasValidSession, isHttps, sessionCookie } from "@/lib/server-auth";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  let matches = false;
  try {
    matches = await credentialsMatch(username, password);
  } catch (error) {
    // The stored password couldn't be read: refuse rather than guess.
    console.error("[admin-auth] Login check failed:", error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: "Login is unavailable, try again." }, { status: 503 });
  }

  if (matches) {
    const headers = new Headers();
    headers.append("Set-Cookie", sessionCookie(await sessionToken(), SESSION_MAX_AGE, isHttps(request)));
    return Response.json({ success: true }, { headers });
  }

  return Response.json({ success: false, error: "Invalid credentials" }, { status: 401 });
}

export async function GET(request: Request) {
  return Response.json({ valid: await hasValidSession(request) });
}

// Logout — clear the session cookie server-side.
export async function DELETE(request: Request) {
  const headers = new Headers();
  headers.append("Set-Cookie", sessionCookie("", 0, isHttps(request)));
  return Response.json({ success: true }, { headers });
}
