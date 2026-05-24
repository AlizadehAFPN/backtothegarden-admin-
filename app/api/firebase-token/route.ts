import { createHmac } from "crypto";
import { getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import "@/lib/firebase-admin";

const VALID_USERNAME = process.env.ADMIN_USERNAME || "admin";
const VALID_PASSWORD = process.env.ADMIN_PASSWORD || "A@a12345B@b";

function expectedToken() {
  const secret = process.env.SESSION_SECRET || VALID_PASSWORD;
  return createHmac("sha256", secret).update(`${VALID_USERNAME}:${VALID_PASSWORD}`).digest("hex");
}

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const val = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("btg-session="))?.split("=")[1];

  if (val !== expectedToken()) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getAuth(getApps()[0]).createCustomToken("admin");
  return Response.json({ token });
}
