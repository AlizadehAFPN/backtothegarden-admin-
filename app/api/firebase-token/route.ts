import { getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { hasValidSession, unauthorized } from "@/lib/server-auth";
import "@/lib/firebase-admin";

export async function GET(request: Request) {
  if (!hasValidSession(request)) return unauthorized();

  const token = await getAuth(getApps()[0]).createCustomToken("admin");
  return Response.json({ token });
}
