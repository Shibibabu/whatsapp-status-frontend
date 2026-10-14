import { FormEvent, useEffect, useState } from 'react';
import type { FeedFilter, FeedFilterInput, Tag, TagGroup } from '../types';

interface Props {
  tags: Tag[];
  value: FeedFilter;
  /** Saving (and, for a new search, matching tags) is in progress. */
  saving: boolean;
  onChange: (f: FeedFilterInput) => void;
}

const GROUPS: { id: TagGroup; title: string }[] = [
  { id: 'category', title: 'Category' },
  { id: 'type', title: 'Type' },
  { id: 'topic', title: 'Topic' },
  { id: 'mood', title: 'Mood' },
];

/**
 * "What type of status do you want to see?"
 *  - Type anything and press Enter -> the backend maps it onto tags, learning new
 *    tags when part of it has none yet (same as when a status is posted)
 *  - Tap tag chips                 -> filter by those tags directly
 * "All" is only active when nothing is searched or picked. The filter is saved on
 * the server, so it stays applied after a reload or on another device.
 */
export default function FeedFilterBar({ tags, value, saving, onChange }: Props) {
  // What's in the box; only sent as a search when Enter is pressed.
  const [draft, setDraft] = useState(value.query);
  useEffect(() => setDraft(value.query), [value.query]);

  function toggle(id: string) {
    const selected = value.tags.includes(id) ? value.tags.filter((t) => t !== id) : [...value.tags, id];
    onChange({ query: value.query, tags: selected, match: value.match });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onChange({ query: draft.trim(), tags: value.tags, match: value.match });
  }

  const showingAll = !value.query && value.tags.length === 0;
  const unsubmitted = draft.trim() !== value.query;

  return (
    <section className="card filter">
      <label className="filter-label" htmlFor="feed-query">
        What type of status do you want to see?
      </label>
      <form className="search" onSubmit={submit}>
        <input
          id="feed-query"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. beauty, laptops for sale, something funny… then press Enter"
          enterKeyHint="search"
        />
        {saving ? (
          <span className="muted">Saving…</span>
        ) : unsubmitted && draft.trim() ? (
          <button className="link">Search</button>
        ) : (
          value.query && (
            <button type="button" className="link" onClick={() => onChange({ query: '', tags: value.tags, match: value.match })}>
              Clear
            </button>
          )
        )}
      </form>

      <div className="chips">
        <button
          className={`chip ${showingAll ? 'active' : ''}`}
          onClick={() => onChange({ query: '', tags: [], match: 'any' })}
        >
          All
        </button>
        {value.tags.length > 1 && (
          <button
            className="chip"
            title="Show statuses with any of the selected tags, or only those with all of them"
            onClick={() => onChange({ query: value.query, tags: value.tags, match: value.match === 'all' ? 'any' : 'all' })}
          >
            Match: {value.match === 'all' ? 'all tags' : 'any tag'}
          </button>
        )}
      </div>

      {GROUPS.map((g) => {
        const groupTags = tags.filter((t) => t.group === g.id);
        if (groupTags.length === 0) return null;
        return (
          <div key={g.id} className="tag-group">
            <span className="tag-group-title">{g.title}</span>
            <div className="chips">
              {groupTags.map((t) => (
                <button
                  key={t.id}
                  title={t.description}
                  className={`chip ${g.id === 'category' ? `cat-${t.id}` : ''} ${value.tags.includes(t.id) ? 'active' : ''}`}
                  onClick={() => toggle(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
