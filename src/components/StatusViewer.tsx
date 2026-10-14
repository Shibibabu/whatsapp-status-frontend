import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { timeAgo } from '../format';
import type { FeedStatus, Tag } from '../types';
import TagBadges from './TagBadges';

const DURATION_MS = 5000;

interface Props {
  statuses: FeedStatus[];
  startIndex: number;
  tags: Tag[];
  onSeen: (id: string) => void;
  onClose: () => void;
}

/** Full-screen viewer like WhatsApp: auto-advances, tap left/right to navigate. */
export default function StatusViewer({ statuses, startIndex, tags, onSeen, onClose }: Props) {
  // Track the open status by id: live updates can insert or remove items around it.
  const [currentId, setCurrentId] = useState(statuses[startIndex]?.id);
  const index = statuses.findIndex((s) => s.id === currentId);
  const status = index >= 0 ? statuses[index] : undefined;
  const lastIndex = useRef(startIndex);
  if (index >= 0) lastIndex.current = index;

  // The open status was deleted by its author: show the one that took its place, or close.
  useEffect(() => {
    if (index >= 0) return;
    const replacement = statuses[Math.min(lastIndex.current, statuses.length - 1)];
    if (replacement) setCurrentId(replacement.id);
    else onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, statuses]);

  // Mark as seen on the server whenever a status is shown.
  const nextRef = useRef(next);
  nextRef.current = next;
  useEffect(() => {
    if (!status) return;
    if (!status.seen) {
      api.markViewed(status.id).then(() => onSeen(status.id)).catch(console.error);
    }
    const timer = setTimeout(() => nextRef.current(), DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.id]);

  // Keyboard: ← → Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function next() {
    if (index >= 0 && index + 1 < statuses.length) setCurrentId(statuses[index + 1].id);
    else onClose();
  }
  function prev() {
    if (index > 0) setCurrentId(statuses[index - 1].id);
  }

  if (!status) return null;

  return (
    <div className="viewer" style={{ background: status.bgColor }} role="dialog" aria-modal="true">
      <div className="progress">
        {statuses.map((s, i) => (
          <div key={s.id} className="bar">
            <div
              key={`${s.id}-${index}`}
              className={`fill ${i < index ? 'done' : i === index ? 'running' : ''}`}
              style={{ animationDuration: `${DURATION_MS}ms` }}
            />
          </div>
        ))}
      </div>
      <div className="viewer-head">
        <div>
          <strong>{status.authorName}</strong> <small>{timeAgo(status.createdAt)}</small>
        </div>
        <TagBadges tagIds={status.tags} state={status.state} allTags={tags} />
        <button className="close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="viewer-text">{status.text}</div>
      <button className="nav left" onClick={prev} aria-label="Previous" />
      <button className="nav right" onClick={next} aria-label="Next" />
    </div>
  );
}
