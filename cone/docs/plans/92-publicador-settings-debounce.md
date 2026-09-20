# 92 — Debounce Publicador's `settings` upsert, and flush on unmount (#181)

> ✅ Done: `0cca9e6` · 2026-09-20 — see BACKLOG.md · closes #181.
>
> **Verified live** (local stack, Playwright request counts, no edits left in the seed): opening
> Publicador → 0 `settings` writes; 20 keystrokes in Rodapé → 1 write, ~465 ms after the last key;
> typing then switching tab 32 ms later → 1 write (the unmount flush) and `cone_settings_v1` plus the
> reopened field hold the edit; timer flush then unmount → still 1; the write body carries
> `boxThemes`/`dvBg` (spread at write time). Same for Afiliados → Meu perfil → Chave Pix against
> `coach_profile` (0 / 1 / 1). **Negative control:** with the unmount flush disabled, the same fast
> switch wrote nothing and left `cone_settings_v1` unchanged. A click-driven field (Blocos treatment)
> still persists across a reload.
>
> **Where the plan was wrong.** It said `skipCoachEffectRef`'s path "leaves no pending payload and
> needs no change". True with nothing typed, false with a Pix keystroke followed by an invoice advance
> inside 500 ms: the skip run's cleanup cancels the *timer* but not the queued *payload*, so the
> unmount flush wrote the pre-advance `coach` over the stamp `advanceInvoice` had just saved.
> Reproduced with Playwright's fake clock (a second write with no `2026-09` stamp; `cone_coach_v1`
> lost the draft), fixed by nulling `pendingCoachRef` in the skip branch, re-run clean. Also: the
> localStorage key is `cone_settings_v1`, not `cone_settings` as the Acceptance section writes it.
>
> Promoted from Icebox P2 on 2026-09-18 with [plans/91](./91-untargeted-session-audience.md) and
> [plans/93](./93-focus-visible.md). A full `/app-review` pass runs once all three ship.

## Context

`Publicador.jsx:166-202` is one effect that calls `saveSettings({ ...loadSettings(), …13 fields })`
whenever any of those fields changes. Three of them are wired **per keystroke** in the Títulos
panel: `gymName`, `titles` and `footer`. `saveSettings` (`utils/storage.js:174-177`) is
`cacheSettingsLS` plus `dbSaveSettings`, a whole-blob upsert. So typing a 20-character title sends
**20 full `settings` upserts** to Supabase.

The effect **is** mount-guarded (`settingsMounted`), so the read-writes bug class (#76/#109/#111) is
closed here. It is **not debounced**, though, and CLAUDE.md's rule for this exact shape (many small
fields feeding one persisted blob) is "debounce the effect and skip its first (mount) run". The
reference is `afiliados/Afiliados.jsx:103-116`: 500 ms, mount-skip.

⚠️ **The reference has a latent last-edit loss, so don't copy it verbatim.** `App.jsx:230-288`
renders tabs as `{tab === 'x' && <Tab/>}`, so **switching tabs unmounts the tab**. The reference's
cleanup is `return () => clearTimeout(t)`. An edit made less than 500 ms before the user clicks
another tab has its save cancelled and is never written. Afiliados' `coach` profile (name, Pix key)
has that defect today. This plan fixes it in both places the same way, rather than copying it into
a second one.

## Acceptance

- Typing a 20-character title in Publicador → Títulos fires **one** `settings` upsert, ~500 ms after
  the last keystroke.
- Type into a Títulos field, then switch tabs **within** 500 ms. The edit is persisted: it is in
  `localStorage` `cone_settings`, and the upsert fired.
- The same holds for Afiliados → Meu perfil (e.g. the Pix key field).
- **Opening either tab still writes nothing.** Both mount-skips are preserved (#109).
- **Only one save runs per change.** A flush that fires on unmount doesn't also fire a timer save
  after it, and vice versa.
- `...loadSettings()` is still spread **at write time**, so a key another writer added
  (`boxWarnings`, `boxThemes`, `theme`) survives. That is #142's reason for the spread.
- `npm test` / `npm run lint` (`--max-warnings 0`) / `npm run format:check` / `npm run build:all`
  are clean.

## Files

- `src/components/tabs/Publicador.jsx` (:161-202)
- `src/components/tabs/afiliados/Afiliados.jsx` (:92-116)
- `CLAUDE.md`: the "Supabase clients — CRITICAL" paragraph, whose last sentence names the debounce
  shape (`MeuNegocioPane` → `coach`)

## Approach

1. **Publicador.** Keep `settingsMounted`.
   - Hold the latest payload in a `pendingSettingsRef` (named `*Ref`, per the react-hooks policy).
   - `flush()` saves `{ ...loadSettings(), ...pendingSettingsRef.current }` if the ref is
     non-null, then nulls it.
   - The effect sets the ref, schedules `setTimeout(flush, 500)`, and returns `clearTimeout`.
   - A second, unmount-only effect `useEffect(() => () => flush(), [])` saves whatever is still
     pending when the tab unmounts. It needs a written-reason comment: it's the only thing standing
     between a fast tab switch and a lost edit.
2. **Afiliados.** Apply the same unmount flush to the `coach` effect. `skipCoachEffectRef`
   (`advanceInvoice`'s direct save) returns before a timer is scheduled, so it leaves no pending
   payload and needs no change. Confirm that by reading it, not by assuming it.
3. **No shared hook.** There are two call sites, and Afiliados' skip-flag makes the two shapes
   genuinely different. Say so in a comment at one of them so the next reader doesn't "fix" it.
4. **CLAUDE.md.** One sentence where the debounce rule is stated: *flush the pending write on
   unmount, because SPA tabs unmount on switch, and a debounce whose cleanup only
   `clearTimeout`s drops the last edit.*

## Verification

There are no render tests, by deliberate policy, so this is verified live.

1. `supabase start` → `npm run dev`. With Playwright, count requests matching `/rest/v1/settings`.
   - Open Publicador: expect **0** requests.
   - Type a 20-character title: expect **1**, about 500 ms after the last key.
   - Type again and click another tab within 500 ms: expect **1**, and `localStorage.cone_settings`
     holds the new title.
   - Reopen Publicador: the title is there.
2. Repeat step 1 for Afiliados → Meu perfil → Pix key, counting `/rest/v1/coach_profile`.
3. Regression: Publicador's click-driven fields (zone count, block treatment, day picker) still
   persist after a reload.
4. The four CI gates.

Model: Sonnet   ·   Size: S
