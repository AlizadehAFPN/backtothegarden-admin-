import { existsSync, readFileSync } from "fs";
import path from "path";
import { config as loadDotenv, parse as parseDotenv } from "dotenv";
import type { NextConfig } from "next";

/** When running `yarn staging`, `.env.local` often wins for duplicate keys — including prod Firebase IDs. These prefixes always come from `.env.staging` so you hit the staging project while keeping other local-only vars. */
const STAGING_OVERRIDE_PREFIXES = ["NEXT_PUBLIC_FIREBASE_", "FIREBASE_SERVICE_ACCOUNT"];

function shouldForceFromStaging(key: string): boolean {
  return STAGING_OVERRIDE_PREFIXES.some((p) => key.startsWith(p));
}

/**
 * Next already ran `loadEnvConfig` before this file.
 * 1) Load `.env.staging` without override (fills keys missing from `.env.local`).
 * 2) Re-apply Firebase + Admin SDK vars **from** `.env.staging` so staging wins over `.env.local` for those keys only.
 * 3) Expose `NEXT_PUBLIC_BACKTOTHEGARDEN_ENV=staging` for a UI badge.
 */
if (process.env.BACKTOTHEGARDEN_ENV === "staging") {
  const stagingPath = path.join(process.cwd(), ".env.staging");
  if (existsSync(stagingPath)) {
    loadDotenv({ path: stagingPath });

    const parsed = parseDotenv(readFileSync(stagingPath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (shouldForceFromStaging(key)) {
        process.env[key] = value;
      }
    }
  }
  process.env.NEXT_PUBLIC_BACKTOTHEGARDEN_ENV = "staging";
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
