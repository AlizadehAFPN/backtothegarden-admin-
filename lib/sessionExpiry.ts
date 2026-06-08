// Lightweight pub/sub so any layer (data fetches, uploads) can signal that the
// server rejected us with 401, and AuthContext can react by prompting re-login.

type Listener = () => void;

const listeners = new Set<Listener>();

/** Call when a request returns HTTP 401 (session expired / not authenticated). */
export function notifySessionExpired(): void {
  listeners.forEach((cb) => cb());
}

export function onSessionExpired(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
