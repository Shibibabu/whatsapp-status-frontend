// Shapes of the JSON the backend returns. Keep in sync with the NestJS services.

export interface User {
  id: string;
  phone: string;
  name: string;
}

export type TagGroup = 'category' | 'type' | 'topic' | 'mood';

/** A search tag: weight 1 = exactly what was asked for, below 1 = related (ranking only). */
export interface WeightedTag {
  id: string;
  weight: number;
}

/** One item from GET /tags. The list grows as OpenAI creates new tags. */
export interface Tag {
  id: string;
  group: TagGroup;
  label: string;
  description: string;
}

export type StatusState = 'pending' | 'classified' | 'failed';

/** One item from GET /statuses/feed */
export interface FeedStatus {
  id: string;
  userId: string;
  authorName: string;
  text: string;
  bgColor: string;
  tags: string[]; // tag ids; empty while pending
  state: StatusState;
  createdAt: string;
  expiresAt: string;
  seen: boolean;
  /** 0-1, how well the status matches the saved search; only present when searching. */
  relevance?: number;
}

/** A status pushed over GET /statuses/stream: a feed item without `seen` or `relevance`. */
export type LiveStatus = Omit<FeedStatus, 'seen' | 'relevance'>;

export interface StatusViewedEvent {
  statusId: string;
  viewerId: string;
  viewerName: string;
}

/** One item from GET /statuses/mine */
export interface MyStatus {
  id: string;
  text: string;
  bgColor: string;
  tags: string[];
  state: StatusState;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
}

export interface Viewer {
  id: string;
  name: string;
  viewedAt: string;
}

/**
 * The viewer's feed filter, saved on the server (GET/PUT /statuses/filter) and
 * applied by the server every time the feed is fetched.
 */
export interface FeedFilter {
  /** The submitted search text, e.g. "laptops for sale". Empty = no search. */
  query: string;
  /**
   * `query` as weighted tags, one array per part of the search. A status needs an
   * exact tag (weight 1) from each part; related tags (lower weight) only raise its score.
   */
  concepts: WeightedTag[][];
  /** Tag chips picked directly. */
  tags: string[];
  /** How picked chips combine: any of them or all of them. */
  match: 'any' | 'all';
}

/** What the filter bar sends; the server works out `concepts` from `query`. */
export type FeedFilterInput = Omit<FeedFilter, 'concepts'>;

/** PUT /statuses/filter response. */
export interface SavedFilter extends FeedFilter {
  /** Tags learned from this search (already applied to existing statuses). */
  createdTags: Tag[];
}
