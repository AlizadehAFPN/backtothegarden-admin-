import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let app: App;

type ServiceAccount = Parameters<typeof cert>[0];

/** True only when a JSON service account was loaded (not project-ID-only / ADC). */
let firebaseAdminUsesServiceAccount = false;

export function firebaseAdminUsesServiceAccountJson(): boolean {
  return firebaseAdminUsesServiceAccount;
}

function isTypicalServerlessHost(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.NETLIFY === "true" ||
      process.env.CF_PAGES === "1"
  );
}

/**
 * Serverless hosts cannot use your laptop’s gcloud login. Without injected JSON, writes fail.
 */
export function firestoreAdminMisconfiguredMessage(): string | null {
  if (!isTypicalServerlessHost()) return null;
  if (firebaseAdminUsesServiceAccountJson()) return null;
  return (
    "Firestore Admin has no service account on this deployment. Add FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 " +
    "in your host’s env (Preview = staging, Production = prod), then redeploy. " +
    "Same JSON as localhost .env.local — from Firebase Console → Project settings → Service accounts → Generate new private key."
  );
}

function initWithProjectIdOnly(): App {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.warn(
      "[firebase-admin] NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing; Firestore API writes may fail."
    );
  }
  return initializeApp({
    projectId,
  });
}

function resolveCredentialPath(p: string): string {
  const t = p.trim();
  return isAbsolute(t) ? t : resolve(process.cwd(), t);
}

function readServiceAccountFile(absolute: string): ServiceAccount | null {
  try {
    const json = readFileSync(absolute, "utf8");
    return JSON.parse(json) as ServiceAccount;
  } catch (e) {
    console.error(
      "[firebase-admin] Could not read or parse service account file:",
      absolute,
      e instanceof Error ? e.message : e
    );
    return null;
  }
}

/**
 * Order: file-path env vars → optional JSON path in FIREBASE_SERVICE_ACCOUNT_KEY → BASE64 → inline JSON.
 * Multiline JSON pasted into `.env` does not work (dotenv splits lines). Use a `.json` file + GOOGLE_APPLICATION_CREDENTIALS instead.
 */
function loadServiceAccountJson(): ServiceAccount | null {
  const filePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (filePath) {
    const absolute = resolveCredentialPath(filePath);
    if (existsSync(absolute)) {
      const fromFile = readServiceAccountFile(absolute);
      if (fromFile) return fromFile;
    } else {
      console.error("[firebase-admin] Service account file not found:", absolute);
    }
  }

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
  if (b64?.trim()) {
    try {
      const decoded = Buffer.from(b64.trim(), "base64").toString("utf8");
      return JSON.parse(decoded) as ServiceAccount;
    } catch (e) {
      console.error(
        "[firebase-admin] FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 decode/parse failed.",
        e instanceof Error ? e.message : e
      );
      return null;
    }
  }

  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!inline) return null;

  const asPath = resolveCredentialPath(inline);
  if (!inline.startsWith("{") && existsSync(asPath)) {
    return readServiceAccountFile(asPath);
  }

  try {
    return JSON.parse(inline) as ServiceAccount;
  } catch {
    /* fall through */
  }

  console.error(
    "[firebase-admin] FIREBASE_SERVICE_ACCOUNT_KEY must be either:\n" +
      "  • One single-line JSON string (minified), or\n" +
      "  • A relative path to a .json file (e.g. FIREBASE_SERVICE_ACCOUNT_KEY=./secrets/staging-sa.json), or\n" +
      "  • Same path via GOOGLE_APPLICATION_CREDENTIALS=./secrets/staging-sa.json\n" +
      "Multiline JSON pasted inside .env is invalid: dotenv splits lines so JSON.parse never sees the full key — Admin SDK falls back to gcloud (invalid_rapt)."
  );
  return null;
}

if (getApps().length === 0) {
  const account = loadServiceAccountJson();
  if (account) {
    firebaseAdminUsesServiceAccount = true;
    app = initializeApp({ credential: cert(account) });
  } else {
    if (isTypicalServerlessHost()) {
      console.warn(
        "[firebase-admin] No service account JSON in env. Add FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 on your host (Preview for staging). User OAuth / gcloud does not run on serverless."
      );
    } else if (process.env.NODE_ENV === "development") {
      console.warn(
        "[firebase-admin] No service account in env (localhost). Add to .env.local: GOOGLE_APPLICATION_CREDENTIALS=./your-service-account.json (path to the JSON from Firebase Console → Service accounts), or FIREBASE_SERVICE_ACCOUNT_KEY as one-line JSON. Relying on gcloud user login often fails with invalid_rapt on Google Workspace."
      );
    }
    app = initWithProjectIdOnly();
  }
} else {
  app = getApps()[0];
}

export const adminDb = getFirestore(app);
