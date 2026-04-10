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

- Active branch: refactor/sidebar-phase-1-stabilize
- Last completed phase: **Phase 1 — Stabilize current build**
- Next planned phase: **Phase 2 — Normalize top-level sidebar architecture**
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
