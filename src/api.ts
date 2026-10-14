import type { FeedFilter, FeedFilterInput, FeedStatus, MyStatus, SavedFilter, Tag, User, Viewer } from './types';

// Every backend call goes through here. `/api` is proxied to the NestJS server
// by vite.config.ts.
const BASE = '/api';

let currentUserId: string | null = null;

/** Called on login/logout. Every later request sends this as `x-user-id`. */
export function setCurrentUser(id: string | null) {
  currentUserId = id;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (currentUserId) headers['x-user-id'] = currentUserId;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    // NestJS errors look like { message: string | string[], statusCode }
    const data = await res.json().catch(() => null);
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new ApiError(res.status, msg ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // users
  register: (phone: string, name: string) => request<User>('POST', '/users', { phone, name }),
  login: (phone: string) => request<User>('POST', '/users/login', { phone }),

  // contacts
  contacts: () => request<User[]>('GET', '/contacts'),
  addContact: (phone: string) => request<User>('POST', '/contacts', { phone }),
  removeContact: (id: string) => request<void>('DELETE', `/contacts/${id}`),

  // tags
  tags: () => request<Tag[]>('GET', '/tags'),

  // statuses
  postStatus: (text: string, bgColor: string) =>
    request<MyStatus>('POST', '/statuses', { text, bgColor }),
  myStatuses: () => request<MyStatus[]>('GET', '/statuses/mine'),
  deleteStatus: (id: string) => request<void>('DELETE', `/statuses/${id}`),
  markViewed: (id: string) => request<void>('POST', `/statuses/${id}/view`),
  viewers: (id: string) => request<Viewer[]>('GET', `/statuses/${id}/viewers`),

  /** The viewer's saved feed filter. */
  getFilter: () => request<FeedFilter>('GET', '/statuses/filter'),
  /** Saves the filter. A new `query` is mapped onto tags (and may learn new ones) on the server. */
  saveFilter: (filter: FeedFilterInput) => request<SavedFilter>('PUT', '/statuses/filter', filter),

  /** Contacts' statuses with the saved filter applied by the server. */
  feed: () => request<FeedStatus[]>('GET', '/statuses/feed'),
};
