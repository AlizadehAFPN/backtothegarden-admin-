import { checkPasswordChange, sessionToken, setAdminPassword } from "@/lib/admin-credentials";
import { firestoreAdminMisconfiguredMessage } from "@/lib/firebase-admin";
import {
  SESSION_MAX_AGE,
  hasValidSession,
  isHttps,
  sessionCookie,
  unauthorized,
} from "@/lib/server-auth";

/**
 * Changes the admin password (the /security page). Requires the current
 * session plus the current password, the new password and its confirmation.
 * Every other session is logged out; this one gets a fresh cookie.
 *
 * Errors come back as `{ error: <code> }` with HTTP 400 (never 401, so the
 * panel doesn't treat a wrong current password as an expired session).
 */
export async function POST(request: Request) {
  if (!(await hasValidSession(request))) return unauthorized();

  const misconfigured = firestoreAdminMisconfiguredMessage();
  if (misconfigured) {
    return Response.json({ error: "notConfigured", message: misconfigured }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const { currentPassword, newPassword, confirmPassword } = body ?? {};

  try {
    const problem = await checkPasswordChange(currentPassword, newPassword, confirmPassword);
    if (problem) {
      return Response.json({ error: problem }, { status: 400 });
    }
    await setAdminPassword(newPassword);
  } catch (error) {
    console.error(
      "[admin-auth] Password change failed:",
      error instanceof Error ? error.message : error
    );
    return Response.json({ error: "generic" }, { status: 500 });
  }

  const headers = new Headers();
  headers.append("Set-Cookie", sessionCookie(await sessionToken(), SESSION_MAX_AGE, isHttps(request)));
  return Response.json({ success: true }, { headers });
}
