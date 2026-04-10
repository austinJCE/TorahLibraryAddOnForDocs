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

- Active branch: codex_refactor
- Last completed phase: _none_
- Next planned phase: **Phase 1 — Stabilize current build**
- Last updated by: _pending_
- Last updated on: _pending_

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
- There is a known duplicated function declaration / syntax blocker around `syncRestoreCorpusButton`.
- Sidebar top-level navigation currently contains duplicate Voices markup.
- Experimental mode behavior exists partially in JS but not fully in matching DOM.
- Voices result titles can regress to raw sheet refs/IDs.
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
