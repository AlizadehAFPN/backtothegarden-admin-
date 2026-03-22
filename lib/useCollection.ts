"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  limit as firestoreLimit,
} from "firebase/firestore";
import { db } from "./firebase";

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
    await addDoc(collection(db, collectionName), {
      ...item,
      createdAt: serverTimestamp(),
    });
  };

  const update = async (id: string, item: Record<string, unknown>) => {
    await updateDoc(doc(db, collectionName, id), item);
  };

  const remove = async (id: string) => {
    await deleteDoc(doc(db, collectionName, id));
  };

  return { data, loading, add, update, remove };
}
