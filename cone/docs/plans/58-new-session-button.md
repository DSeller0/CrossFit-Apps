# 58 — #119 · Criador's "+ sessão" opens the day's first session instead of a new one

> ✅ Done: d1299e3 · 2026-08-03 — see BACKLOG.md

## Context

From the user's 2026-08-03 report: *"When you hit the button, it keeps getting the first session of
the day you clicked, it does not generate a blank new session. If you want to create a new session
you create in a blank day and change dates after."*

The workaround they describe is exactly what the code does. `criador/WeekGrid.jsx:493-499`'s
`wg-add` button passes only a date to `onPickDay`, which is `pickDay` (`Criador.jsx:204-208`):

```js
const pickDay = dateKey => {
  const first = (sessions[dateKey] || []).filter(boxFilter)[0]
  if (first) startEdit(first, dateKey)
  else openNewSession(dateKey)
}
```

On an empty day `first` is undefined and the blank path runs — which is why creating on a blank day
and changing the date works. On any day that already has a session matching the box filter, the
button opens that session instead.

🔴 **The consequence is worse than the reported annoyance.** `startEdit` sets
`editing = { dateKey, id: s.id }` (`Criador.jsx:180`), so a subsequent **Salvar writes to the
existing session's id**. A coach who believes he is adding a second session to a day silently
overwrites the first one. That is the regression this plan actually has to close — the blank form is
the symptom, the overwrite is the damage.

The button's own accessible name already promises the correct behaviour —
`aria-label={`Nova sessão em ${DAY_PT[di]} ${date.getDate()}`}` (`WeekGrid.jsx:496`) — so this is a
wiring mistake, not a design decision someone made and forgot.

**The correct path already exists and is simply not wired here:** `openNewSession`
(`Criador.jsx:192-200`) builds `{...emptyS(), date: dateKey, locationIds}` and opens
`SessionMetaModal`; `commitMeta`'s new-session branch (`:247-255`) then does
`setForm(draft); setBlocks([]); setEditing(null); setEditorOpen(true)`. Today it is reachable only
from the toolbar "Nova sessão" (`:772`) and the cross-tab preload (`:265`).

## Acceptance

- "+ sessão" on a day that **already has** a session opens a **blank** editor (`editing === null`,
  `blocks === []`), with the date and the browsing box pre-filled exactly as it does on an empty day.
- Saving that new session produces a **second** session on the day. The pre-existing one is
  unchanged — this is the assertion that matters, not the blank form.
- The session-card click paths still open the existing session for editing (`WeekGrid.jsx:374`
  mobile pencil, `:424` card, `:429` keyboard).
- The collapsed day strip and the mobile empty-day row behave per the decision recorded below,
  deliberately rather than incidentally.
- 645 tests pass · lint clean at `--max-warnings 0` · `build:all` clean.

## Files

| File | Change |
|---|---|
| `src/components/tabs/Criador.jsx` | Pass `openNewSession` down as a new `onNewSession` prop beside the existing `onPickDay={pickDay}` (`:808`). No new logic — `openNewSession` (`:192-200`) is already correct. |
| `src/components/tabs/criador/WeekGrid.jsx` | Accept `onNewSession` in the props destructure (beside `onPickDay`, `:93`); call it from `wg-add` (`:497`). |

## Approach

1. **Add the prop, don't change `pickDay`.** `pickDay`'s "open the day's session, or start one" is
   the right behaviour for a *day picker* — it is just the wrong behaviour for a button labelled
   "Nova sessão em…". Leave `pickDay` intact and give `wg-add` a direct line to `openNewSession`.

2. **Decide the other two `onPickDay` call sites explicitly** — both are day pickers, not add
   buttons, and the recommendation is to **leave both alone**:
   - `WeekGrid.jsx:305` — the collapsed day strip's `onSelect`. This is the desktop day *picker*
     shown while editing; "click a day → open that day's session" is what a picker should do, and
     it falls through to `openNewSession` on an empty day already.
   - `WeekGrid.jsx:316-331` — the mobile empty-day row. It renders **only when `!list.length`**
     (`:316`), so `pickDay` can only ever take the `openNewSession` branch there. Already correct
     by construction; changing it would be churn.

   Write the call into the code as a short comment at `pickDay`, so the next reader doesn't
   "unify" the three call sites back together.

3. **Note for whoever runs #74-C** (`Criador.jsx` decomposition, Tier 2's last row): `pickDay` /
   `openNewSession` / `startEdit` belong to the `useSessionEditor` seam in that row's recorded seam
   analysis. This change adds one prop and no new state, so the seam analysis survives it — that is
   why it was recorded by name rather than by line.

## Verification

Drive it against the seeded local stack (`supabase start` + `node scripts/seed-dev.mjs`).
⚠️ **Check for a stale service worker first** — `sw.js` scopes over the dev server and serves
precached prod assets with *no console error* (CLAUDE.md). If your edits don't appear, that is why.

**The regression, in order — this is the whole test:**
1. Pick a day that already has a session. Note its name and block count.
2. Click **"+ sessão"**. → The meta modal opens on a **blank** draft with that day's date and the
   current box pre-selected. Confirm.
3. Confirm → the editor opens empty (no blocks, no inherited name).
4. Give it a name, add a block, **Salvar**.
5. → The day now shows **two** session cards. **Re-open the original and confirm it is untouched** —
   same name, same blocks. Reload the page and confirm both survived the round-trip to Supabase.

**Also check:**
- On an **empty** day, "+ sessão" still works exactly as before (this path was never broken).
- Clicking a session **card** still opens that session for editing, at 1280 and at 390 (the mobile
  pencil, `WeekGrid.jsx:374`).
- With a **box filter** active, the new session inherits the selected box (`Criador.jsx:198`) and
  "Todos"/"Sem box" still yields an empty `locationIds`.
- The **collapsed day strip** (toggle the week minimised while editing) still opens the day's
  session — the unchanged behaviour, confirmed rather than assumed.
- Multi-session days render both cards in the week grid and in `WeekSessionCard`'s Texto mode.

**Gates:** `npm test` · `npm run lint` · `npm run build:all` · commit + push.
No `design:cards` run needed — `WeekGrid` *is* gallery-rendered, but this change touches only a
handler, not markup or CSS. Re-run it anyway if the diff turns out to touch either.

Model: Sonnet · Size: S
