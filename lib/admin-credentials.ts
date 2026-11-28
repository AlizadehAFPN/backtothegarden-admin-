import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./password-policy";

// Single source of truth for the admin login. Keep this the only place that
// reads ADMIN_USERNAME / ADMIN_PASSWORD / SESSION_SECRET and the stored
// password, so the session-cookie derivation can never drift between routes.
//
// There are deliberately no built-in defaults: a password written here can be
// read by anyone with access to the repository. Without ADMIN_USERNAME and a
// password, login fails closed in every environment.
//
// Password: ADMIN_PASSWORD is the starting password. Once the admin changes it
// in the panel (/security), only a scrypt hash is stored in Firestore at
// AdminSettings/credentials and it replaces ADMIN_PASSWORD. Firestore is the
// only place both the deployed panel and local dev can share it; env vars can't
// be changed at runtime. To recover a forgotten password, delete that document
// in the Firebase console and ADMIN_PASSWORD works again.

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const CACHE_MS = 30_000;

const adminUsername = process.env.ADMIN_USERNAME ?? "";
const envPassword = process.env.ADMIN_PASSWORD ?? "";
// Set SESSION_SECRET to a random value. It falls back to ADMIN_PASSWORD so a
// deployment that hasn't added it yet keeps working.
const sessionSecret = process.env.SESSION_SECRET || envPassword;

const credentialsRef = adminDb.doc("AdminSettings/credentials");

type StoredPassword = {
  hash: string; // hex
  salt: string; // hex
  N: number;
  r: number;
  p: number;
  keylen: number;
  version: string; // changes on every password change, so old cookies stop working
};

// A short in-memory cache keeps every API request from reading Firestore. A
// password change on another server instance takes effect here within CACHE_MS.
let cache: { value: StoredPassword | null; at: number } | null = null;

async function storedPassword(): Promise<StoredPassword | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  // A read error throws: callers then refuse access instead of falling back to
  // ADMIN_PASSWORD, which may be an old, known password.
  const snapshot = await credentialsRef.get();
  const value = snapshot.exists ? (snapshot.data() as StoredPassword) : null;
  cache = { value, at: Date.now() };
  return value;
}

/** Constant-time comparison of two strings of any length. */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

async function hashPassword(password: string, salt: Buffer, params = SCRYPT): Promise<Buffer> {
  return scryptAsync(password, salt, params.keylen, { N: params.N, r: params.r, p: params.p });
}

/** True when an admin username and a password (stored or env) are configured. */
export async function adminAuthConfigured(): Promise<boolean> {
  if (!adminUsername) return false;
  return Boolean(envPassword) || (await storedPassword()) !== null;
}

/** True when `password` is the admin's current password. */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (typeof password !== "string" || password.length > MAX_PASSWORD_LENGTH) return false;
  const stored = await storedPassword();
  if (!stored) return Boolean(envPassword) && safeEqual(password, envPassword);
  const expected = Buffer.from(stored.hash, "hex");
  const actual = await hashPassword(password, Buffer.from(stored.salt, "hex"), stored);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** The signed value stored in the `btg-session` cookie. */
export async function sessionToken(): Promise<string> {
  const stored = await storedPassword();
  // Without a stored password the token is the same as before this feature
  // existed, so deploying it doesn't log anyone out.
  const subject = stored ? `${adminUsername}:v:${stored.version}` : `${adminUsername}:${envPassword}`;
  return createHmac("sha256", sessionSecret).update(subject).digest("hex");
}

/** True when the submitted username + password are the configured admin's. */
export async function credentialsMatch(username: string, password: string): Promise<boolean> {
  if (!(await adminAuthConfigured())) {
    console.error(
      "[admin-auth] Login refused: set ADMIN_USERNAME and ADMIN_PASSWORD (see .env.example)."
    );
    return false;
  }
  return safeEqual(String(username ?? ""), adminUsername) && (await verifyAdminPassword(password));
}

export type PasswordChangeError =
  | "missingFields"
  | "mismatch"
  | "tooShort"
  | "tooLong"
  | "sameAsCurrent"
  | "wrongCurrent";

/**
 * Validates a password change request. Returns the reason it is refused, or
 * null when it may go ahead.
 */
export async function checkPasswordChange(
  currentPassword: unknown,
  newPassword: unknown,
  confirmPassword: unknown,
): Promise<PasswordChangeError | null> {
  if (
    typeof currentPassword !== "string" || !currentPassword ||
    typeof newPassword !== "string" || !newPassword ||
    typeof confirmPassword !== "string" || !confirmPassword
  ) {
    return "missingFields";
  }
  if (newPassword !== confirmPassword) return "mismatch";
  if (newPassword.length < MIN_PASSWORD_LENGTH) return "tooShort";
  if (newPassword.length > MAX_PASSWORD_LENGTH) return "tooLong";
  if (newPassword === currentPassword) return "sameAsCurrent";
  if (!(await verifyAdminPassword(currentPassword))) return "wrongCurrent";
  return null;
}

/** Stores a new admin password (as a scrypt hash) and ends every other session. */
export async function setAdminPassword(newPassword: string): Promise<void> {
  const salt = randomBytes(16);
  const hash = await hashPassword(newPassword, salt);
  const value: StoredPassword = {
    hash: hash.toString("hex"),
    salt: salt.toString("hex"),
    ...SCRYPT,
    version: randomBytes(16).toString("hex"),
  };
  await credentialsRef.set({ ...value, updatedAt: FieldValue.serverTimestamp() });
  cache = { value, at: Date.now() };
}
