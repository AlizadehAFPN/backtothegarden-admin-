import { createHmac } from "crypto";

const VALID_USERNAME = process.env.ADMIN_USERNAME || "admin";
const VALID_PASSWORD = process.env.ADMIN_PASSWORD || "A@a12345B@b";

function sessionToken() {
  const secret = process.env.SESSION_SECRET || VALID_PASSWORD;
  return createHmac("sha256", secret).update(`${VALID_USERNAME}:${VALID_PASSWORD}`).digest("hex");
}

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      `btg-session=${sessionToken()}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
    );
    return Response.json({ success: true }, { headers });
  }

  return Response.json({ success: false, error: "Invalid credentials" }, { status: 401 });
}

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const val = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("btg-session="))?.split("=")[1];
  return Response.json({ valid: val === sessionToken() });
}
