import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// Vite build config for the public HTML pages at the repo root.
// Base differs from the React app (/CrossFit-Apps/ vs /CrossFit-Apps/cone/),
// so a separate config is needed. log.html is retired and excluded.
export default defineConfig({
  root,
  // .env.* files live in cone/ (__dirname), not repo root (root) — envDir
  // defaults to `root`, so without this the public build silently gets
  // undefined Supabase creds.
  envDir: __dirname,
  base: '/CrossFit-Apps/',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: resolve(root, 'public-dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(root, 'index.html'), // React
        schedule: resolve(root, 'schedule.html'),
        me: resolve(root, 'me.html'),
        results: resolve(root, 'results.html'),
        leaderboard: resolve(root, 'leaderboard.html'),
        athletes: resolve(root, 'athletes.html'),
        timer: resolve(root, 'timer.html'),
        tema: resolve(root, 'tema.html'),
        recover: resolve(root, 'recover.html'),
        tv: resolve(root, 'tv.html'),
      },
    },
  },
})
