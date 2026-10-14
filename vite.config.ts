import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The dev server forwards /api/* to the NestJS backend, so the browser only ever
// talks to one origin and the backend needs no CORS setup.
//   /api/statuses/feed  ->  http://localhost:3000/statuses/feed
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
