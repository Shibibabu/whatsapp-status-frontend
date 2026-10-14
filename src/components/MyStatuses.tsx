import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { timeAgo } from '../format';
import { useStatusEvent } from '../realtime';
import type { MyStatus, Tag, Viewer } from '../types';
import TagBadges from './TagBadges';

interface Props {
  meId: string;
  version: number; // changes when a new status was posted
  tags: Tag[];
}

/**
 * The user's own statuses with the tags OpenAI gave each one, updated live as
 * statuses get tagged or viewed.
 */
export default function MyStatuses({ meId, version, tags }: Props) {
  const [items, setItems] = useState<MyStatus[]>([]);
  const [openViewers, setOpenViewers] = useState<{ id: string; list: Viewer[] } | null>(null);

  const load = useCallback(() => api.myStatuses().then(setItems).catch(console.error), []);

  useEffect(() => {
    load();
  }, [load, version]);

  // Live updates instead of polling. Re-fetch on my own status events, since only
  // /statuses/mine has view counts. That also covers other tabs.
  const reloadIfMine = (s: { userId: string }) => s.userId === meId && load();
  useStatusEvent('status.created', reloadIfMine);
  useStatusEvent('status.classified', reloadIfMine);
  useStatusEvent('status.deleted', ({ id }) => setItems((prev) => prev.filter((s) => s.id !== id)));
  useStatusEvent('reconnected', load);
  useStatusEvent('status.viewed', (v) => {
    setItems((prev) => prev.map((s) => (s.id === v.statusId ? { ...s, viewCount: s.viewCount + 1 } : s)));
    setOpenViewers((open) =>
      open?.id === v.statusId
        ? { id: open.id, list: [{ id: v.viewerId, name: v.viewerName, viewedAt: new Date().toISOString() }, ...open.list] }
        : open,
    );
  });

  async function showViewers(id: string) {
    if (openViewers?.id === id) return setOpenViewers(null);
    setOpenViewers({ id, list: await api.viewers(id) });
  }

  async function remove(id: string) {
    await api.deleteStatus(id);
    load();
  }

  return (
    <section className="card">
      <h2>My statuses</h2>
      {items.length === 0 && <p className="muted">Nothing posted in the last 24 hours.</p>}
      <ul className="my-list">
        {items.map((s) => (
          <li key={s.id}>
            <div className="my-text" style={{ borderLeftColor: s.bgColor }}>
              {s.text}
            </div>
            <div className="my-meta">
              <TagBadges tagIds={s.tags} state={s.state} allTags={tags} />
              <span className="muted">{timeAgo(s.createdAt)}</span>
              <span className="spacer" />
              <button className="link" onClick={() => showViewers(s.id)}>
                👁 {s.viewCount}
              </button>
              <button className="link danger" onClick={() => remove(s.id)}>
                Delete
              </button>
            </div>
            {openViewers?.id === s.id && (
              <div className="viewers">
                {openViewers.list.length === 0
                  ? 'No views yet'
                  : openViewers.list.map((v) => `${v.name} (${timeAgo(v.viewedAt)})`).join(', ')}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
