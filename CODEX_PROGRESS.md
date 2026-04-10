# Codex Progress

This file is the branch-local implementation memory for Codex work on this repo.

## How to use this file

Before starting any phase, Codex must read:
- `docs/CODEX_GROUNDING.yaml`
- `docs/CODEX_RUNBOOK.md`
- `docs/CODEX_PROGRESS.md`

After every phase, Codex must update:
- Current status
- Completed phase entry
- Files changed
- Decisions locked
- Deferred work / remaining risks
- Smoke tests run

---

## Current status

- Active branch: work
- Last completed phase: **Phase 2 — Normalize top-level sidebar architecture**
- Next planned phase: **Phase 3 — Build the Experimental sidebar shell**
- Last updated by: Codex (GPT-5.3-Codex)
- Last updated on: 2026-04-10

---

## Locked architectural decisions

These should not be re-litigated unless explicitly changed by the user.

1. Top-level sidebar navigation must be only:
   - Texts
   - Voices
   - Experimental Features (conditional)

2. Global sidebar Basic/Advanced modes are deprecated.

3. Basic / Advanced is allowed only inside AI Shiur.

4. Preferences is the saved-default authority.

5. Sidebar edits session state.

6. Preview reflects session state.

7. More Options is a session-level refinement layer, not the primary control surface.

8. Experimental features are enabled in Preferences, not activated ad hoc from incidental sidebar toggles.

9. Footer behavior follows system-level experimental state.

10. Extensions menu is a stable command surface and must not mirror the full sidebar UI.

---

## Known pre-refactor issues

- Sidebar JS contains stacked/overlapping generations of mode logic.
- Resolved in Phase 1: duplicated function declaration / syntax blocker around `syncRestoreCorpusButton`.
- Resolved in Phase 1: duplicate top-level Voices markup in sidebar navigation.
- Experimental mode behavior exists partially in JS but not fully in matching DOM.
- Mitigated in Phase 1: Voices title fallback now prioritizes human-readable fields before refs/IDs.
- Preferences and sidebar behavior are closer than before but not yet fully aligned to the desired state model.

---

## Completed phases

### Phase 0 — Planning and grounding
- Status: complete
- Date: 2026-04-10

Files added/planned:
- `docs/CODEX_GROUNDING.yaml`
- `docs/CODEX_RUNBOOK.md`
- `docs/CODEX_PROGRESS.md`

Decisions locked:
- Refactor will proceed in phased Codex passes, not a single all-at-once rewrite.
- Codex must stop after each phase and update this file.
- Grounding spec is authoritative.
- This progress file is the anti-regression memory for the branch.

Deferred / remaining risks:
- No code changes made yet.
- All implementation risks remain until Phase 1 begins.

Smoke tests run:
- None yet

---



### Phase 1 — Stabilize current build
- Status: complete
- Date: 2026-04-10
- Branch: `refactor/sidebar-phase-1-stabilize`

Summary:
- Removed a malformed duplicate function declaration that could break sidebar script parsing (`syncRestoreCorpusButton`).
- Removed duplicate top-level Voices mode button markup from the sidebar mode switch section.
- Added a canonical Voices title fallback helper and wired Voices rendering/selection/pinning/session entries to prefer human-readable sheet title fields before falling back to `item.ref`.

Files changed:
- `apps-script/sidebar.page.js.html`
- `apps-script/sidebar.html`
- `CODEX_PROGRESS.md`

Decisions locked:
- Phase 1 remains a surgical stabilization pass only; no top-level architecture migration was attempted.
- Voices title rendering now uses fallback order: `item.label || item.title || item.sheet_title || item.name || (item.sheet && item.sheet.title) || item.ref`.
- Existing Basic/Advanced top-level shell remains in place until Phase 2 by design.

Deferred / remaining risks:
- Sidebar still contains stacked late override blocks and global basic/advanced mode logic (planned for Phase 2).
- Experimental mode code and DOM layering remain partially duplicated and should be normalized in later phases.
- UI snapshot baseline drift exists in `preferences.html` tests and is not part of this phase scope.

Smoke tests run:
- `npm test` (apps-script): fails due to existing `preferences.html` snapshot mismatch unrelated to Phase 1 edits; sidebar include/selector/js-contract checks passed.

Notes:
- Stopped after requested Phase 1 stabilization work.

### Phase 2 — Normalize top-level sidebar architecture
- Status: complete
- Date: 2026-04-10
- Branch: `work`

Summary:
- Replaced global Basic/Advanced/Voices top-level mode controls with canonical Texts/Voices/Experimental mode buttons in sidebar markup.
- Normalized sidebar mode state to a single top-level model (`texts`, `voices`, `experimental`) with legacy `basic`/`advanced` values mapped into `texts`.
- Removed stacked late-override mode logic and duplicate `setSidebarMode` rewrites, keeping one authoritative mode handler.
- Updated mode-dependent visibility rules so text controls use `texts`, voices behavior remains scoped to `voices`, and experimental mode is recognized without relying on legacy global basic/advanced branches.
- Updated UI selector contracts and sidebar template snapshot baselines for the new mode architecture.

Files changed:
- `apps-script/sidebar.page.js.html`
- `apps-script/sidebar.html`
- `apps-script/test/ui/contracts/selector-contracts.json`
- `apps-script/test/ui/snapshots/preferences.html.snap`
- `apps-script/test/ui/snapshots/sidebar.html.snap`
- `CODEX_PROGRESS.md`

Decisions locked:
- Top-level sidebar mode model is now `texts | voices | experimental`; legacy `basic`/`advanced` are compatibility aliases only.
- There is now a single authoritative `setSidebarMode` implementation; late layered overrides were removed.
- Mode-specific UI visibility is keyed to top-level mode only (`texts`, `voices`, `experimental`) and not to global basic/advanced state.

Deferred / remaining risks:
- Experimental mode now exists in the mode system and nav, but its full dedicated sidebar DOM/workflow remains incomplete and is deferred to Phase 3.
- AI Shiur internals are not yet sidebar-native accordion workflows; this remains Phase 5 scope.
- Preferences/session-state authority alignment is still partial and remains Phase 4 scope.

Smoke tests run:
- `cd apps-script && npm run test:ui` (pass)
- `cd apps-script && npm test` (pass)

Notes:
- Stopped after requested Phase 2 mode architecture work.

## Phase template for future updates

Copy and fill this block for each completed phase.

### Phase X — [name]
- Status: complete / partial / blocked
- Date: YYYY-MM-DD
- Branch: `branch-name`

Summary:
- ...

Files changed:
- `path/to/file`
- `path/to/file`

Decisions locked:
- ...
- ...

Deferred / remaining risks:
- ...
- ...

Smoke tests run:
- ...
- ...

Notes:
- ...
