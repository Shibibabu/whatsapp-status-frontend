import { useEffect, useState } from 'react';
import { api, setCurrentUser } from './api';
import Composer from './components/Composer';
import Contacts from './components/Contacts';
import Feed from './components/Feed';
import FeedFilterBar from './components/FeedFilterBar';
import LoginScreen from './components/LoginScreen';
import MyStatuses from './components/MyStatuses';
import { connectRealtime, useStatusEvent } from './realtime';
import type { FeedFilter, FeedFilterInput, Tag, User } from './types';

const SESSION_KEY = 'status-app-user';

// sessionStorage (not localStorage) so each browser tab keeps its own login.
// That lets you test two users side by side in two tabs.

function loadSession(): User | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function saveSession(user: User | null) {
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable (private mode): session just won't persist */
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const u = loadSession();
    setCurrentUser(u?.id ?? null); // must be set before the first API call
    return u;
  });
  const [tags, setTags] = useState<Tag[]>([]);

  // The viewer's "what type of status do I want to see", saved on the server.
  const [filter, setFilter] = useState<FeedFilter | null>(null);
  const [learned, setLearned] = useState<Tag[]>([]);
  const [savingFilter, setSavingFilter] = useState(false);
  const [filterError, setFilterError] = useState('');

  // Bumping these numbers tells a child component to re-fetch its data.
  const [myStatusesVersion, setMyStatusesVersion] = useState(0);
  const [feedVersion, setFeedVersion] = useState(0);

  const loadTags = () => api.tags().then(setTags).catch(console.error);
  useEffect(() => {
    loadTags();
  }, []);

  // OpenAI may have created new tags for this status: fetch the list again to get their labels.
  useStatusEvent('status.classified', (s) => {
    if (s.tags.some((id) => !tags.some((t) => t.id === id))) loadTags();
  });

  // Load the saved filter whenever someone logs in.
  useEffect(() => {
    setFilter(null);
    if (user) api.getFilter().then(setFilter).catch((e) => setFilterError(e.message));
  }, [user?.id]);

  async function changeFilter(next: FeedFilterInput) {
    setSavingFilter(true);
    setFilterError('');
    try {
      const { createdTags, ...saved } = await api.saveFilter(next);
      setLearned(createdTags);
      if (createdTags.length) loadTags();
      setFilter(saved);
    } catch (e) {
      setFilterError((e as Error).message);
    } finally {
      setSavingFilter(false);
    }
  }

  // Live updates (new, classified, deleted, viewed statuses) for whoever is logged in.
  useEffect(() => {
    connectRealtime(user?.id ?? null);
    return () => connectRealtime(null);
  }, [user?.id]);

  function handleLogin(u: User) {
    setCurrentUser(u.id);
    saveSession(u);
    setUser(u);
  }

  function handleLogout() {
    setCurrentUser(null);
    saveSession(null);
    setUser(null);
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Status</span>
        <span className="me">
          {user.name} <small>{user.phone}</small>
        </span>
        <button className="link" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <div className="layout">
        {/* Left: things about ME — post a status, see my statuses, manage contacts */}
        <aside className="sidebar">
          <Composer onPosted={() => setMyStatusesVersion((v) => v + 1)} />
          <MyStatuses meId={user.id} version={myStatusesVersion} tags={tags} />
          <Contacts onChanged={() => setFeedVersion((v) => v + 1)} />
        </aside>

        {/* Right: what my contacts posted, filtered by the type I asked for */}
        <main className="main">
          {filterError && <p className="error">{filterError}</p>}
          {filter ? (
            <>
              <FeedFilterBar tags={tags} value={filter} saving={savingFilter} onChange={changeFilter} />
              <Feed
                meId={user.id}
                filter={filter}
                learned={learned}
                tags={tags}
                version={feedVersion}
                onRefresh={() => setFeedVersion((v) => v + 1)}
              />
            </>
          ) : (
            !filterError && <p className="muted">Loading your filter…</p>
          )}
        </main>
      </div>
    </div>
  );
}
