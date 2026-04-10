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

- Active branch: refactor/sidebar-phase-5-ai-shiur-sidebar
- Last completed phase: **Phase 5 — Move AI Shiur fully into Experimental**
- Next planned phase: **Phase 6 — Texts controls and preview sync**
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

### Phase 3 — Build the Experimental sidebar shell
- Status: complete
- Date: 2026-04-10
- Branch: `work`

Summary:
- Added a real Experimental Features section to the sidebar DOM with dedicated Surprise Me and AI Shiur accordion blocks.
- Wired visible Experimental content to real sidebar nodes (`.experimental-section`, `.surprise-feature`, `.ai-shiur-feature`) so mode toggles no longer depend on missing markup.
- Added distinct footer quick-action rows for standard vs experimental actions and bound them to existing mode-driven visibility logic.
- Hid the search/reference row in Experimental mode so the shell behaves as a dedicated surface rather than a text/voices search state.

Files changed:
- `apps-script/sidebar.html`
- `apps-script/sidebar.page.js.html`
- `apps-script/test/ui/snapshots/sidebar.html.snap`
- `CODEX_PROGRESS.md`

Decisions locked:
- Experimental mode now has a concrete sidebar DOM surface with real accordion sections for Surprise Me and AI Shiur.
- Experimental top-level tab visibility continues to be determined from saved preference-backed feature flags (`experimental_ai_source_sheet_enabled` / `popcorn_enabled`), not incidental local toggles.
- Footer quick actions are now explicitly split into `standard-quick-actions` and `experimental-quick-actions`, with mode-based visibility handled in one place.

Deferred / remaining risks:
- AI Shiur internals are still modal-first command wiring (`openAiLessonGenerator`) and not yet a full sidebar-native workflow (Phase 5).
- Preferences/session authority model is still partial; explicit alignment of saved defaults vs live session behavior remains Phase 4 scope.
- Styling polish for the new Experimental section and row spacing relies on existing shared styles and may need targeted cleanup in a later UI pass.

Smoke tests run:
- `cd apps-script && npm run test:ui` (pass)
- `cd apps-script && UPDATE_UI_SNAPSHOTS=1 npm run test:ui` (pass; snapshot refresh)
- `cd apps-script && npm test` (pass)

Notes:
- Stopped after requested Phase 3 experimental shell work.


### Phase 4 — Align Preferences and state flow
- Status: complete
- Date: 2026-04-10
- Branch: `work`

Summary:
- Added compatibility mapping in Preferences form serialization so `surprise_me_enabled` writes the canonical `popcorn_enabled` preference key used by sidebar/menu experimental gating.
- Added reverse mapping when loading preferences so existing accounts with only `popcorn_enabled` hydrate the Preferences experimental toggle correctly.
- Preserved the existing session-vs-default split: Preferences remains defaults authority while sidebar keeps live session editing behavior.

Files changed:
- `apps-script/preferences.page.js.html`
- `CODEX_PROGRESS.md`

Decisions locked:
- Surprise Me experimental enablement is now canonically persisted via `popcorn_enabled`, with `surprise_me_enabled` retained as UI-facing compatibility input.
- Preferences save flow continues to update saved defaults only; sidebar live session state behavior remains unchanged in this phase.

Deferred / remaining risks:
- Sidebar still contains a late `syncSessionOverrideButtons` function reassignment that should be normalized in a later cleanup pass.
- AI Shiur remains modal-first and is not yet fully sidebar-native (Phase 5 scope).
- A broader end-to-end verification that Preferences changes never implicitly overwrite active sidebar session state remains for Phase 9 verification.

Smoke tests run:
- `cd apps-script && npm run test:ui` (pass)

Notes:
- Stopped after requested Phase 4 work.


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



### Phase 5 — Move AI Shiur fully into Experimental
- Status: complete
- Date: 2026-04-10
- Branch: `refactor/sidebar-phase-5-ai-shiur-sidebar`

Summary:
- Replaced the Experimental AI Shiur accordion CTA with an inline sidebar-native workflow that supports generation directly from the Experimental tab.
- Added internal AI Shiur Basic/Advanced mode controls inside the accordion and wired advanced provider/key options without reintroducing global sidebar Basic/Advanced mode state.
- Added inline AI Shiur generation handlers (topic-based and quick actions) that call `generateAiLessonDraft` directly, making the modal opener a secondary convenience path rather than the primary flow.
- Removed remaining global search-mode dependence on legacy `basic`/`advanced` values in server-side sidebar mode persistence and bootstrap normalization.

Files changed:
- `apps-script/sidebar.html`
- `apps-script/sidebar.page.js.html`
- `apps-script/Code.gs`
- `apps-script/test/ui/snapshots/sidebar.html.snap`
- `CODEX_PROGRESS.md`

Decisions locked:
- AI Shiur primary UX now lives in the Experimental sidebar accordion with inline controls; the modal opener is no longer the primary generation path.
- Basic/Advanced remains available only as an internal AI Shiur toggle (`data-ai-mode`) and is not used as a top-level sidebar mode.
- Sidebar search mode persistence is canonicalized to `texts | voices | experimental`, with legacy stored values mapped to `texts`.

Deferred / remaining risks:
- Inline AI Shiur UI currently reuses existing shared styles and may need targeted styling polish and spacing/accessibility refinement in a later UI pass.
- Sidebar AI quick-action controls do not yet expose the full AI dialog configuration surface (audience/style fields) and currently rely on saved defaults for those fields.
- End-to-end validation in a live Apps Script deployment is still required to confirm gateway/bootstrap behavior under production auth and key-policy states.

Smoke tests run:
- `cd apps-script && npm run test:ui` (fail first run due to expected snapshot drift after sidebar markup changes)
- `cd apps-script && UPDATE_UI_SNAPSHOTS=1 npm run test:ui` (pass)
- `cd apps-script && npm test` (pass)

Notes:
- Stopped after requested Phase 5 work.
