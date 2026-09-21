# Cone

CrossFit coaching management app — Vite + React 19 + Supabase. Full documentation lives in
[`CLAUDE.md`](./CLAUDE.md) in this folder — a lean always-loaded core, with the per-area
detail in [`docs/arch/`](./docs/arch/). This file is just the entry point.

**Working dir:** this folder (`cone/`). Public entry HTML files and `themes.css` live at the repo
root instead — see [`CLAUDE.md`](./CLAUDE.md) for why.

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

- [`CLAUDE.md`](./CLAUDE.md) — the core: structure, the two Supabase clients, data colours, build + deploy
- [`docs/arch/`](./docs/arch/) — per-area detail, loaded on demand (Criador, Publicador, Agenda/Resultados,
  Atletas/Afiliados, TV, shared utils, design system, Supabase, lint policy)
- [`docs/BACKLOG.md`](./docs/BACKLOG.md) — open work
- [`docs/WORKFLOW.md`](./docs/WORKFLOW.md) — session ritual and process
