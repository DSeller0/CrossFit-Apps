# Cone

CrossFit coaching management app — Vite + React 19 + Supabase. Full documentation lives in
[`CLAUDE.md`](../CLAUDE.md) at the repo root; this file is just the entry point.

**Working dir:** this folder (`cone/`). Public entry HTML files and `themes.css` live at the repo
root instead — see `CLAUDE.md` for why.

## Setup

```
supabase start        # local Supabase stack (Docker required), once per session
npm install
npm run dev            # SPA dev server
npm run dev:public     # public pages dev server (index/schedule/results/etc.)
npm test                # unit tests
npm run lint            # eslint
npm run build:all       # SPA + public pages, into dist/ and public-dist/
```

## Where to look next

- [`CLAUDE.md`](../CLAUDE.md) — architecture, Supabase schema, design system, conventions
- [`docs/BACKLOG.md`](./docs/BACKLOG.md) — open work
- [`docs/WORKFLOW.md`](./docs/WORKFLOW.md) — session ritual and process
