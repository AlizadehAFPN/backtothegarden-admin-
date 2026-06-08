import { createHmac } from "crypto";

// Single source of truth for the admin login. Keep this the only place that
// reads ADMIN_USERNAME / ADMIN_PASSWORD / SESSION_SECRET so the session-cookie
// derivation can never drift between routes.

const isProd = process.env.NODE_ENV === "production";

// Convenience defaults for local development only. These are intentionally
// NOT honoured in production (see adminAuthConfigured) so a missing env var
// can't silently expose a well-known password that lives in source.
const DEV_USERNAME = "admin";
const DEV_PASSWORD = "A@a12345B@b";

const envUsername = process.env.ADMIN_USERNAME;
const envPassword = process.env.ADMIN_PASSWORD;
const envSecret = process.env.SESSION_SECRET;

const adminUsername = envUsername || (isProd ? "" : DEV_USERNAME);
const adminPassword = envPassword || (isProd ? "" : DEV_PASSWORD);
const sessionSecret = envSecret || adminPassword;

/**
 * In production, real credentials must be configured via env. If they aren't,
 * authentication fails closed instead of accepting the dev defaults.
 */
export function adminAuthConfigured(): boolean {
  if (!isProd) return true;
  return Boolean(envUsername && envPassword);
}

/** The signed value stored in the `btg-session` cookie. */
export function sessionToken(): string {
  return createHmac("sha256", sessionSecret)
    .update(`${adminUsername}:${adminPassword}`)
    .digest("hex");
}

/** True when the submitted username + password are the configured admin's. */
export function credentialsMatch(username: string, password: string): boolean {
  if (!adminAuthConfigured()) return false;
  return username === adminUsername && password === adminPassword;
}
