# Status frontend (React + Vite)

UI for the `whatsapp-status-backend` NestJS API.

```bash
npm install
npm run dev          # http://localhost:5173  (backend must be running on :3000)
```

For demo data, run `../whatsapp-status-backend/scripts/seed-demo.sh`, then log in
with phone `+910000000000`.

## Code map

```
src/
  main.tsx                 React entry point
  App.tsx                  Session + page layout; holds the feed filter state
  api.ts                   Every backend call (adds the x-user-id header)
  types.ts                 TypeScript shapes of the backend's JSON
  realtime.ts              Live updates over Server-Sent Events (useStatusEvent hook)
  components/
    LoginScreen.tsx        Log in / register by phone (placeholder auth)
    Composer.tsx           Type and post a new status
    MyStatuses.tsx         Your statuses + the tags OpenAI gave them (updates live)
    Contacts.tsx           Add/remove the people whose statuses you see
    FeedFilterBar.tsx      "What type of status do you want to see?" (tag chips by group)
    Feed.tsx               Fetches /statuses/feed?tags=..., then applies live events
    StatusViewer.tsx       Full-screen viewer, marks statuses as seen
    TagBadges.tsx          A status's tags (category coloured) / pending / failed
```

`vite.config.ts` proxies `/api/*` to `http://localhost:3000/*`, so the backend
needs no CORS configuration in development.
