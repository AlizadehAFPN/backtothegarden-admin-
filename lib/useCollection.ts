"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  query,
  limit as firestoreLimit,
} from "firebase/firestore";
import { db } from "./firebase";
import { notifySessionExpired } from "./sessionExpiry";

export interface DocData {
  id: string;
  [key: string]: unknown;
}

// Global cache to share listeners across components
const listenerCache = new Map<
  string,
  {
    data: DocData[];
    loading: boolean;
    subscribers: Set<() => void>;
    unsub: (() => void) | null;
  }
>();

function getOrCreateListener(collectionName: string, maxDocs?: number) {
  if (!listenerCache.has(collectionName)) {
    const entry = {
      data: [] as DocData[],
      loading: true,
      subscribers: new Set<() => void>(),
      unsub: null as (() => void) | null,
    };

    const ref = collection(db, collectionName);
    const q = maxDocs ? query(ref, firestoreLimit(maxDocs)) : ref;

    entry.unsub = onSnapshot(q, (snapshot) => {
      entry.data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      entry.loading = false;
      entry.subscribers.forEach((cb) => cb());
    });

    listenerCache.set(collectionName, entry);
  }
  return listenerCache.get(collectionName)!;
}

function releaseListener(collectionName: string, callback: () => void) {
  const entry = listenerCache.get(collectionName);
  if (!entry) return;
  entry.subscribers.delete(callback);
  if (entry.subscribers.size === 0) {
    entry.unsub?.();
    listenerCache.delete(collectionName);
  }
}

async function readFirestoreError(res: Response): Promise<string> {
  if (res.status === 401) notifySessionExpired();
  const text = await res.text();
  try {
    const body = JSON.parse(text) as { error?: unknown };
    if (typeof body?.error === "string" && body.error.length > 0) {
      return body.error;
    }
  } catch {
    /* not JSON — often HTML from an uncaught framework error */
  }
  const trimmed = text.trim();
  if (trimmed.length > 0 && trimmed.length < 800) {
    return trimmed.startsWith("<") ? `${res.statusText || "Error"} (${res.status})` : trimmed;
  }
  return res.statusText || `HTTP ${res.status}`;
}

export function useCollection(collectionName: string, maxDocs?: number) {
  const [data, setData] = useState<DocData[]>([]);
  const [loading, setLoading] = useState(true);
  const callbackRef = useRef<() => void>(() => {});

  useEffect(() => {
    const entry = getOrCreateListener(collectionName, maxDocs);

    const callback = () => {
      setData([...entry.data]);
      setLoading(entry.loading);
    };
    callbackRef.current = callback;

    entry.subscribers.add(callback);

    // Set initial state if already loaded
    if (!entry.loading) {
      setData([...entry.data]);
      setLoading(false);
    }

    return () => {
      releaseListener(collectionName, callback);
    };
  }, [collectionName, maxDocs]);

  const add = async (item: Record<string, unknown>) => {
    const res = await fetch("/api/firestore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection: collectionName, data: item }),
    });
    if (!res.ok) throw new Error(await readFirestoreError(res));
  };

  const update = async (id: string, item: Record<string, unknown>) => {
    const res = await fetch("/api/firestore", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection: collectionName, id, data: item }),
    });
    if (!res.ok) throw new Error(await readFirestoreError(res));
  };

  const remove = async (id: string) => {
    const res = await fetch("/api/firestore", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection: collectionName, id }),
    });
    if (!res.ok) throw new Error(await readFirestoreError(res));
  };

  return { data, loading, add, update, remove };
}
