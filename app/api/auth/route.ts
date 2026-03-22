const VALID_USERNAME = process.env.ADMIN_USERNAME || "admin";
const VALID_PASSWORD = process.env.ADMIN_PASSWORD || "A@a12345B@b";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    return Response.json({ success: true });
  }

  return Response.json({ success: false, error: "Invalid credentials" }, { status: 401 });
}
