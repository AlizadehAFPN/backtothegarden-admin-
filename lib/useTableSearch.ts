"use client";

import { useMemo, useState } from "react";
import { DocData } from "./useCollection";

/**
 * Minimum number of characters before a search is applied. Below this the full,
 * unfiltered table is shown. Per product requirement: the search kicks in once
 * the third character is typed.
 */
export const MIN_SEARCH_CHARS = 3;

/**
 * Case-insensitive substring search across the ENTIRE collection.
 *
 * Every page loads its whole collection up-front via `useCollection`'s realtime
 * listener, so filtering here runs over all documents in the table — never just
 * the current page or a limited slice. That guarantees the search reaches every
 * record regardless of how large the collection is.
 *
 * @param data   the full collection (all docs)
 * @param fields the field(s) to match against (e.g. "name" or ["name", "email"])
 */
export function useTableSearch(data: DocData[], fields: string | string[]) {
  const [search, setSearch] = useState("");
  const fieldList = Array.isArray(fields) ? fields : [fields];
  const fieldKey = fieldList.join(",");

  const query = search.trim().toLowerCase();
  const active = query.length >= MIN_SEARCH_CHARS;

  const filtered = useMemo(() => {
    if (!active) return data;
    return data.filter((row) =>
      fieldList.some((f) =>
        String(row[f] ?? "").toLowerCase().includes(query)
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query, active, fieldKey]);

  return { search, setSearch, filtered, active };
}
