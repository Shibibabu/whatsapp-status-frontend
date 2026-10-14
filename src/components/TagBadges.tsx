import type { StatusState, Tag } from '../types';

interface Props {
  tagIds: string[];
  state: StatusState;
  allTags: Tag[];
  /** Show at most this many tags (category first). */
  limit?: number;
}

/** A status's tags: the category as a coloured badge, the rest as small chips. */
export default function TagBadges({ tagIds, state, allTags, limit }: Props) {
  if (state === 'pending') return <span className="badge pending">tagging…</span>;
  if (state === 'failed') return <span className="badge failed">tagging failed</span>;

  const byId = new Map(allTags.map((t) => [t.id, t]));
  const tags = tagIds.map((id) => byId.get(id) ?? { id, group: 'topic' as const, label: id, description: '' });
  tags.sort((a, b) => Number(b.group === 'category') - Number(a.group === 'category'));
  const shown = limit ? tags.slice(0, limit) : tags;

  return (
    <span className="tag-list">
      {shown.map((t) =>
        t.group === 'category' ? (
          <span key={t.id} className={`badge cat-${t.id}`} title={t.description}>
            {t.label}
          </span>
        ) : (
          <span key={t.id} className="tag" title={`${t.group}: ${t.description}`}>
            #{t.label}
          </span>
        ),
      )}
      {shown.length < tags.length && <span className="tag more">+{tags.length - shown.length}</span>}
    </span>
  );
}
