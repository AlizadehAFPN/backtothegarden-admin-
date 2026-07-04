import { adminDb, firestoreAdminMisconfiguredMessage } from "@/lib/firebase-admin";
import { hasValidSession, unauthorized } from "@/lib/server-auth";
import { Timestamp, Query, DocumentData } from "firebase-admin/firestore";

/**
 * Server-side, indexed, paginated Users search.
 *
 * The Users collection is large (thousands of docs), so — unlike the content
 * collections — we never download it whole into the browser. This route pages
 * through it and runs PREFIX searches directly against Firestore's index:
 *
 *   • No query (or < MIN_SEARCH_CHARS): cursor-paginated listing, newest first.
 *   • With a query: case-insensitive prefix match on user_names / user_email,
 *     using range queries (`>= q`, `<= q + `) that hit the single-field
 *     index — a handful of reads per match, scaling to millions of users.
 *
 * Firestore range queries are case-sensitive and match from the start of the
 * value, so we run a few capitalization variants of the term and merge them.
 */

const LIST_PAGE_SIZE = 50;
const SEARCH_LIMIT = 100; // cap on prefix matches returned in one response
const MIN_SEARCH_CHARS = 3;
const HIGH_CHAR = ""; // sorts after any normal character — the prefix upper bound

// Only the fields the admin UI actually renders / edits. Projecting keeps the
// payload small and sidesteps serializing refs (listPlans, listFavorites, …).
const FIELDS = [
  "user_names",
  "user_email",
  "user_type",
  "user_isMembresy",
  "user_genre",
  "user_image",
] as const;

interface UserRow {
  id: string;
  [key: string]: unknown;
}

function toRow(
  doc: FirebaseFirestore.QueryDocumentSnapshot<DocumentData>
): UserRow {
  const data = doc.data();
  const row: UserRow = { id: doc.id };
  for (const f of FIELDS) row[f] = data[f] ?? "";
  return row;
}

/** Distinct capitalization variants so a prefix search is effectively case-insensitive. */
function nameVariants(q: string): string[] {
  const lower = q.toLowerCase();
  const title = lower.charAt(0).toUpperCase() + lower.slice(1);
  const upper = q.toUpperCase();
  return Array.from(new Set([q, lower, title, upper]));
}

function encodeCursor(ts: Timestamp): string {
  return Buffer.from(JSON.stringify({ s: ts.seconds, n: ts.nanoseconds })).toString(
    "base64"
  );
}

function decodeCursor(raw: string): Timestamp | null {
  try {
    const { s, n } = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (typeof s === "number" && typeof n === "number") return new Timestamp(s, n);
  } catch {
    /* malformed cursor — ignore and start from the top */
  }
  return null;
}

export async function GET(request: Request) {
  if (!hasValidSession(request)) return unauthorized();

  const misconfigured = firestoreAdminMisconfiguredMessage();
  if (misconfigured) return Response.json({ error: misconfigured }, { status: 503 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const cursorParam = url.searchParams.get("cursor");

  const base = adminDb.collection("Users");

  try {
    // ---- Search mode: indexed prefix match on name + email ----
    if (q.length >= MIN_SEARCH_CHARS) {
      const queries: Query<DocumentData>[] = [];

      // Name: a range query per capitalization variant.
      for (const v of nameVariants(q)) {
        queries.push(
          base
            .select(...FIELDS)
            .orderBy("user_names")
            .startAt(v)
            .endAt(v + HIGH_CHAR)
            .limit(SEARCH_LIMIT)
        );
      }
      // Email is stored lowercase, so one lowercased prefix query is enough.
      queries.push(
        base
          .select(...FIELDS)
          .orderBy("user_email")
          .startAt(q.toLowerCase())
          .endAt(q.toLowerCase() + HIGH_CHAR)
          .limit(SEARCH_LIMIT)
      );

      const snapshots = await Promise.all(queries.map((query) => query.get()));

      // Merge + dedupe by id.
      const byId = new Map<string, UserRow>();
      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          if (!byId.has(doc.id)) byId.set(doc.id, toRow(doc));
        }
      }

      const users = Array.from(byId.values()).sort((a, b) =>
        String(a.user_names ?? "").localeCompare(String(b.user_names ?? ""))
      );
      const capped = users.length > SEARCH_LIMIT;

      return Response.json({
        mode: "search",
        users: users.slice(0, SEARCH_LIMIT),
        nextCursor: null,
        capped,
      });
    }

    // ---- List mode: cursor-paginated, newest first ----
    let listQuery = base
      .select(...FIELDS, "createdAt")
      .orderBy("createdAt", "desc")
      .limit(LIST_PAGE_SIZE);

    if (cursorParam) {
      const cursor = decodeCursor(cursorParam);
      if (cursor) listQuery = listQuery.startAfter(cursor);
    }

    const snap = await listQuery.get();
    const users = snap.docs.map(toRow);

    let nextCursor: string | null = null;
    if (snap.size === LIST_PAGE_SIZE) {
      const lastCreated = snap.docs[snap.docs.length - 1].get("createdAt");
      if (lastCreated instanceof Timestamp) nextCursor = encodeCursor(lastCreated);
    }

    // Total (cheap aggregate) only on the first page, for the header count.
    let total: number | undefined;
    if (!cursorParam) {
      total = (await base.count().get()).data().count;
    }

    return Response.json({ mode: "list", users, nextCursor, capped: false, total });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[users GET]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
