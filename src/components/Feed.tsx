import { useEffect, useState } from 'react';
import { api } from '../api';
import { initials, timeAgo } from '../format';
import { useStatusEvent } from '../realtime';
import type { FeedFilter, FeedStatus, LiveStatus, Tag } from '../types';
import StatusViewer from './StatusViewer';
import TagBadges from './TagBadges';

interface Props {
  meId: string;
  filter: FeedFilter;
  tags: Tag[];
  version: number;
  onRefresh: () => void;
  /** Tags the last saved search created, to mention in the UI. */
  learned: Tag[];
}

/** Contacts' statuses with the viewer's saved filter applied (by the server, and to live events). */
export default function Feed({ meId, filter, learned, tags, version, onRefresh }: Props) {
  const [items, setItems] = useState<FeedStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const query = filter.query;
  const filterKey = `${query}|${JSON.stringify(filter.concepts)}|${filter.tags.join(',')}|${filter.match}`;

  // The server applies the saved filter; re-fetch whenever it changes.
  useEffect(() => {
    let cancelled = false; // ignore responses that arrive after a newer request
    setLoading(true);
    setError('');
    api
      .feed()
      .then((data) => !cancelled && setItems(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filterKey, version]);

  function markSeen(id: string) {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, seen: true } : s)));
  }

  /** The picked chips: any (or all) of them. No chips means no restriction. */
  function matchesChips(statusTags: string[]) {
    if (filter.tags.length === 0) return true;
    return filter.match === 'all' && filter.tags.length > 1
      ? filter.tags.every((t) => statusTags.includes(t))
      : filter.tags.some((t) => statusTags.includes(t));
  }

  // Same rules as the backend: an exact tag from every search concept, and the chips.
  function matchesFilter(s: LiveStatus) {
    if (query) {
      if (filter.concepts.length === 0) return false;
      const ok = filter.concepts.every((c) => c.some((t) => t.weight >= 1 && s.tags.includes(t.id)));
      if (!ok) return false;
    }
    return matchesChips(s.tags);
  }

  /** Same score as the backend: weight of the search tags it has / weight of all search tags. */
  function relevanceOf(statusTags: string[]): number | undefined {
    if (!query || filter.concepts.length === 0) return undefined;
    const best = new Map<string, number>();
    for (const t of filter.concepts.flat()) best.set(t.id, Math.max(t.weight, best.get(t.id) ?? 0));
    let total = 0;
    let have = 0;
    for (const [id, w] of best) {
      total += w;
      if (statusTags.includes(id)) have += w;
    }
    return Math.round((have / total) * 100) / 100;
  }

  /** Best match first when searching, then newest. */
  function ranked(list: FeedStatus[]) {
    if (!query) return list;
    return [...list].sort(
      (a, b) => (b.relevance ?? 0) - (a.relevance ?? 0) || b.createdAt.localeCompare(a.createdAt),
    );
  }

  /** Adds, updates or removes a pushed status so the grid matches the current filter. */
  function applyLive(s: LiveStatus) {
    if (s.userId === meId) return; // the feed only shows contacts' statuses
    setItems((prev) => {
      const exists = prev.some((p) => p.id === s.id);
      if (!matchesFilter(s)) return exists ? prev.filter((p) => p.id !== s.id) : prev;
      const relevance = relevanceOf(s.tags);
      if (exists) return ranked(prev.map((p) => (p.id === s.id ? { ...p, ...s, relevance } : p)));
      return ranked([{ ...s, seen: false, relevance }, ...prev]);
    });
  }

  useStatusEvent('status.created', applyLive);
  useStatusEvent('status.classified', applyLive);
  useStatusEvent('status.deleted', ({ id }) => setItems((prev) => prev.filter((p) => p.id !== id)));
  useStatusEvent('reconnected', onRefresh);

  const labelOf = (id: string) => tags.find((t) => t.id === id)?.label ?? id;

  return (
    <section>
      <div className="feed-header">
        <h2>
          Recent updates
          {filter.tags.length > 0 && <span className="muted"> · {filter.tags.length} tag(s)</span>}
        </h2>
        <button className="link" onClick={onRefresh}>
          ↻ Refresh
        </button>
      </div>

      {query && filter.concepts.length > 0 && (
        <p className="muted matched">
          Showing “{query}” as:{' '}
          {filter.concepts
            .map((c) => c.filter((t) => t.weight >= 1).map((t) => labelOf(t.id)).join(' or '))
            .join(' + ')}
          {filter.concepts.some((c) => c.some((t) => t.weight < 1)) && (
            <>
              {' '}· ranked higher with:{' '}
              {filter.concepts
                .flat()
                .filter((t) => t.weight < 1)
                .map((t) => labelOf(t.id))
                .join(', ')}
            </>
          )}
          {learned.length > 0 && (
            <span className="learned"> · learned new tag: {learned.map((t) => t.label).join(', ')}</span>
          )}
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="muted empty">
          {query && filter.concepts.length === 0
            ? `No tags match “${query}”. Try different words.`
            : 'No statuses match. Try other tags, or add more contacts.'}
        </p>
      )}

      <div className={`grid ${loading ? 'loading' : ''}`}>
        {items.map((s, i) => (
          <button key={s.id} className={`tile ${s.seen ? 'seen' : ''}`} onClick={() => setOpenIndex(i)}>
            <div className="tile-body" style={{ background: s.bgColor }}>
              <p>{s.text}</p>
            </div>
            {s.relevance != null && (
              <div className="relevance" title="How well this status matches your search">
                {Math.round(s.relevance * 100)}% match
              </div>
            )}
            <div className="tile-footer">
              <span className={`avatar ${s.seen ? 'seen' : ''}`}>{initials(s.authorName)}</span>
              <span className="tile-author">
                <strong>{s.authorName}</strong>
                <small className="muted">{timeAgo(s.createdAt)}</small>
              </span>
            </div>
            <div className="tile-tags">
              <TagBadges tagIds={s.tags} state={s.state} allTags={tags} limit={4} />
            </div>
          </button>
        ))}
      </div>

      {openIndex != null && (
        <StatusViewer
          statuses={items}
          startIndex={openIndex}
          tags={tags}
          onSeen={markSeen}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
}
