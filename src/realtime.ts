import { useEffect, useRef } from 'react';
import type { LiveStatus, StatusViewedEvent } from './types';

// One Server-Sent Events connection per tab (GET /statuses/stream). Components
// subscribe with useStatusEvent() instead of polling or waiting for a refresh.

interface EventMap {
  'status.created': LiveStatus;
  'status.classified': LiveStatus;
  'status.deleted': { id: string };
  'status.viewed': StatusViewedEvent;
  /** The connection dropped and came back; events may have been missed, so re-fetch. */
  reconnected: void;
}
type EventName = keyof EventMap;
type Handler<K extends EventName> = (data: EventMap[K]) => void;

const SERVER_EVENTS: EventName[] = ['status.created', 'status.classified', 'status.deleted', 'status.viewed'];

const handlers = new Map<EventName, Set<Handler<any>>>();
let source: EventSource | null = null;

function emit<K extends EventName>(name: K, data: EventMap[K]) {
  handlers.get(name)?.forEach((h) => h(data));
}

/** Called on login/logout. EventSource can't send headers, so the user id goes in the URL. */
export function connectRealtime(userId: string | null) {
  source?.close();
  source = null;
  if (!userId) return;

  const es = new EventSource(`/api/statuses/stream?userId=${encodeURIComponent(userId)}`);
  let dropped = false;
  es.onerror = () => {
    dropped = true; // EventSource retries on its own
  };
  es.onopen = () => {
    if (dropped) emit('reconnected', undefined);
    dropped = false;
  };
  for (const name of SERVER_EVENTS) {
    es.addEventListener(name, (e) => emit(name, JSON.parse((e as MessageEvent).data)));
  }
  source = es;
}

/** Runs `handler` for every `name` event while the component is mounted. */
export function useStatusEvent<K extends EventName>(name: K, handler: Handler<K>) {
  // Always call the latest handler, so it sees current props/state.
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const h: Handler<K> = (data) => ref.current(data);
    if (!handlers.has(name)) handlers.set(name, new Set());
    handlers.get(name)!.add(h);
    return () => {
      handlers.get(name)!.delete(h);
    };
  }, [name]);
}
