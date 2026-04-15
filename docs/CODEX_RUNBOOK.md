# Codex Refactor Runbook

This runbook is the operational guide for phased Codex work on the Google Docs add-on refactor.

## Required repo docs

Codex must read these before every phase:

- `docs/CODEX_GROUNDING.yaml`
- `docs/CODEX_RUNBOOK.md`
- `docs/CODEX_PROGRESS.md`

## Authority order

1. `CODEX_GROUNDING.yaml` — authoritative product and architecture contract
2. `CODEX_PROGRESS.md` — branch-local implementation memory and already-completed work
3. `CODEX_RUNBOOK.md` — execution plan for the next phase only

If there is any conflict:
- product behavior is governed by `CODEX_GROUNDING.yaml`
- already-completed implementation decisions for the current branch are governed by `CODEX_PROGRESS.md`
- phase sequencing is governed by `CODEX_RUNBOOK.md`

## Global instructions for every Codex phase

Use this preamble at the top of every Codex task:

```text
Read docs/CODEX_GROUNDING.yaml, docs/CODEX_RUNBOOK.md, and docs/CODEX_PROGRESS.md first.
Treat CODEX_GROUNDING.yaml as authoritative.
Use CODEX_PROGRESS.md to avoid repeating completed work or reintroducing removed patterns.
Only execute the requested phase.
At the end of the phase:
1. update docs/CODEX_PROGRESS.md
2. summarize files changed
3. list decisions locked
4. list remaining risks / deferred work
Then stop.
```

## Branch naming convention

Use one branch per phase unless intentionally continuing the same branch:

- `refactor/sidebar-phase-1-stabilize`
- `refactor/sidebar-phase-2-modes`
- `refactor/sidebar-phase-3-experimental-shell`
- `refactor/sidebar-phase-4-state-and-preferences`
- `refactor/sidebar-phase-5-ai-shiur-sidebar`
- `refactor/sidebar-phase-6-texts-preview-sync`
- `refactor/sidebar-phase-7-extensions-menu`
- `refactor/sidebar-phase-8-module-split`
- `refactor/sidebar-phase-9-verification`

## Required output format from Codex after each phase

Codex should end each phase with exactly this structure:

```text
Phase completed:
Branch:
Files changed:
- ...

Decisions locked:
- ...

Deferred / remaining risks:
- ...

Smoke tests run:
- ...

CODEX_PROGRESS.md updated: yes
Stopped after requested phase: yes
```

## Phase 1 — Stabilize the current build

### Prompt
```text
Read docs/CODEX_GROUNDING.yaml, docs/CODEX_RUNBOOK.md, and docs/CODEX_PROGRESS.md first.
Treat CODEX_GROUNDING.yaml as authoritative.
Use CODEX_PROGRESS.md to avoid repeating completed work or reintroducing removed patterns.

Create or switch to branch: refactor/sidebar-phase-1-stabilize

Task: perform a stabilization pass only. Do not refactor architecture yet.

Goals:
1. Fix any JavaScript syntax errors or malformed duplicated declarations that can prevent sidebar JS from loading.
2. Fix the duplicate top-level Voices button in the sidebar mode switcher.
3. Fix Voices search result titles so they prefer human-readable sheet titles over raw sheet IDs/refs.
4. Do not change the overall product architecture yet.
5. Preserve the current working search pipeline unless a bug fix is required for stability.

Important constraints:
- Do not introduce new top-level modes yet.
- Do not begin module splitting yet.
- Do not remove existing features unless they are dead/duplicated markup directly causing regressions.
- Keep diffs minimal and surgical.

Specific known issues to look for:
- duplicated function declarations in sidebar JS, especially around syncRestoreCorpusButton
- duplicate “Voices” button in sidebar navigation
- Voices result rendering falling back too quickly to item.ref instead of title-like fields

Voices title fallback should prefer this order:
item.label || item.title || item.sheet_title || item.name || (item.sheet && item.sheet.title) || item.ref

At the end of the phase:
1. update docs/CODEX_PROGRESS.md
2. summarize files changed
3. list decisions locked
4. list remaining risks / deferred work
Then stop.
```

## Phase 2 — Normalize top-level sidebar architecture

### Prompt
```text
Read docs/CODEX_GROUNDING.yaml, docs/CODEX_RUNBOOK.md, and docs/CODEX_PROGRESS.md first.
Treat CODEX_GROUNDING.yaml as authoritative.
Use CODEX_PROGRESS.md to avoid repeating completed work or reintroducing removed patterns.

Create or switch to branch: refactor/sidebar-phase-2-modes

Now perform the sidebar mode architecture refactor.

Target top-level sidebar navigation:
- Texts
- Voices
- Experimental Features (conditional)

Requirements:
1. Remove global sidebar “basic” vs “advanced” mode behavior.
2. Replace it with a single authoritative top-level mode model:
   - texts
   - voices
   - experimental
3. Keep Basic/Advanced only as an internal concept for AI Shiur later; do not preserve global basic/advanced UI logic.
4. Update all mode-setting logic, body/data-mode classes, visibility rules, and event handlers to use the new model.
5. Remove dead or conflicting legacy mode code rather than layering another override on top.

Important:
- Do not yet build the full AI Shiur accordion internals.
- Do not yet rework Preferences.
- Focus only on making the sidebar shell and mode logic coherent.

Acceptance criteria:
- No global sidebar code path depends on “basic” or “advanced”
- Texts and Voices are always visible
- Experimental mode is recognized as a top-level mode in code
- No duplicate setSidebarMode implementations remain
- Mode visibility logic is consolidated, not layered

At the end of the phase:
1. update docs/CODEX_PROGRESS.md
2. summarize files changed
3. list decisions locked
4. list remaining risks / deferred work
Then stop.
```

## Phase 3 — Build the Experimental sidebar shell

### Prompt
```text
Read docs/CODEX_GROUNDING.yaml, docs/CODEX_RUNBOOK.md, and docs/CODEX_PROGRESS.md first.
Treat CODEX_GROUNDING.yaml as authoritative.
Use CODEX_PROGRESS.md to avoid repeating completed work or reintroducing removed patterns.

Create or switch to branch: refactor/sidebar-phase-3-experimental-shell

Now implement the Experimental Features sidebar surface so the DOM matches the intended behavior.

Requirements:
1. Add a real top-level Experimental Features tab/button to the sidebar.
2. Make it conditional based on saved preference state, not local incidental toggles.
3. Add a real Experimental Features section in the sidebar with accordions for:
   - Surprise Me
   - AI Shiur
4. Add distinct footer rows / containers for:
   - standard quick actions
   - experimental quick actions
5. Ensure the sidebar JS toggles real DOM elements that now exist, instead of expecting missing nodes.

Behavior rules:
- Experimental tab appears only when enabled in Preferences/system state.
- Surprise Me lives in the Experimental tab, not as a dead sidebar toggle.
- AI Shiur lives in the Experimental tab, not modal-first.
- Footer behavior follows system-level experimental state.

Constraints:
- Do not yet fully redesign AI Shiur internals beyond placing it in the Experimental tab.
- Preserve standard Texts/Voices behavior.

At the end of the phase:
1. update docs/CODEX_PROGRESS.md
2. summarize files changed
3. list decisions locked
4. list remaining risks / deferred work
Then stop.
```

## Phase 4 — Align Preferences and state flow

### Prompt
```text
Read docs/CODEX_GROUNDING.yaml, docs/CODEX_RUNBOOK.md, and docs/CODEX_PROGRESS.md first.
Treat CODEX_GROUNDING.yaml as authoritative.
Use CODEX_PROGRESS.md to avoid repeating completed work or reintroducing removed patterns.

Create or switch to branch: refactor/sidebar-phase-4-state-and-preferences

Now refactor Preferences and sidebar state flow to enforce a clean source-of-truth model.

Target model:
- userPreferences = saved defaults
- sessionState = live working state
- sidebar edits sessionState
- preview reflects sessionState
- “Save as defaults” writes sessionState back to userPreferences

Requirements:
1. Ensure Preferences acts as the default-state authority, not the primary live interaction surface.
2. Ensure Texts live controls remain in the sidebar:
   - language layout
   - display layout
   - translation selection when multiple are available
3. Ensure More Options remains a session-level refinement surface:
   - citation below text
   - transliteration
   - niqqud
   - cantillation
4. Ensure Preview always reflects current session state, not raw saved preferences.
5. Experimental feature enablement must be controlled in Preferences.

At the end of the phase:
1. update docs/CODEX_PROGRESS.md
2. summarize files changed
3. list decisions locked
4. list remaining risks / deferred work
Then stop.
```

## Phase 5 — Move AI Shiur fully into Experimental

### Prompt
```text
Read docs/CODEX_GROUNDING.yaml, docs/CODEX_RUNBOOK.md, and docs/CODEX_PROGRESS.md first.
Treat CODEX_GROUNDING.yaml as authoritative.
Use CODEX_PROGRESS.md to avoid repeating completed work or reintroducing removed patterns.

Create or switch to branch: refactor/sidebar-phase-5-ai-shiur-sidebar

Now refactor AI Shiur so it is sidebar-native inside Experimental Features.

Requirements:
1. AI Shiur must live inside the Experimental Features tab as an accordion-based workflow.
2. Basic / Advanced must exist only inside the AI Shiur accordion.
3. Remove any remaining dependency on global sidebar basic/advanced modes.
4. If the old AI modal remains, demote it to a secondary/legacy path only if necessary; do not keep it as the primary UX.
5. Ensure AI-related quick actions and controls follow the system-level experimental state.

At the end of the phase:
1. update docs/CODEX_PROGRESS.md
2. summarize files changed
3. list decisions locked
4. list remaining risks / deferred work
Then stop.
```

## Phase 6 — Texts controls and preview sync

### Prompt
```text
Read docs/CODEX_GROUNDING.yaml, docs/CODEX_RUNBOOK.md, and docs/CODEX_PROGRESS.md first.
Treat CODEX_GROUNDING.yaml as authoritative.
Use CODEX_PROGRESS.md to avoid repeating completed work or reintroducing removed patterns.

Create or switch to branch: refactor/sidebar-phase-6-texts-preview-sync

Now do a UX/state pass on the Texts tab to enforce the correct split between live controls and More Options.

Requirements:
1. Keep these as always-visible live controls in the main Texts workflow:
   - language layout
   - display layout
   - translation selection when multiple are available
2. Keep these in More Options:
   - citation below text
   - transliteration
   - niqqud
   - cantillation
3. Ensure changing any of the above immediately updates Preview.
4. Ensure Preview reflects the actual current insertion/rendering state.
5. Preserve the intended compact/expanded selector UX for layout/display controls.

At the end of the phase:
1. update docs/CODEX_PROGRESS.md
2. summarize files changed
3. list decisions locked
4. list remaining risks / deferred work
Then stop.
```

## Phase 7 — Extensions menu

### Prompt
```text
Read docs/CODEX_GROUNDING.yaml, docs/CODEX_RUNBOOK.md, and docs/CODEX_PROGRESS.md first.
Treat CODEX_GROUNDING.yaml as authoritative.
Use CODEX_PROGRESS.md to avoid repeating completed work or reintroducing removed patterns.

Create or switch to branch: refactor/sidebar-phase-7-extensions-menu

Now refactor the Google Docs Extensions menu to match the intended command-surface model.

Target top-level order:
1. Texts
2. Voices
3. Quick Actions submenu
4. Conditional experimental items:
   - Generate Shiur Draft (experimental) if AI experimental is enabled
   - Surprise Me if enabled
5. Preferences
6. Support

Quick Actions submenu should always include:
- Transform Divine Names
- Link Texts with Sefaria

And if experimental AI is enabled, also include after a separator:
- Today's Daf Lesson (45 min)
- Today's 929 Lesson (45 min)
- This Week's Parashah Lesson (45 min)

Requirements:
1. Preserve safe rendering under AuthMode.NONE.
2. Base menu must still render even if preferences cannot yet be read.
3. Experimental items must be conditional and stable.
4. Keep top-menu quick actions distinct from sidebar footer actions.

At the end of the phase:
1. update docs/CODEX_PROGRESS.md
2. summarize files changed
3. list decisions locked
4. list remaining risks / deferred work
Then stop.
```

## Phase 8 — Module split

### Prompt
```text
Read docs/CODEX_GROUNDING.yaml, docs/CODEX_RUNBOOK.md, and docs/CODEX_PROGRESS.md first.
Treat CODEX_GROUNDING.yaml as authoritative.
Use CODEX_PROGRESS.md to avoid repeating completed work or reintroducing removed patterns.

Create or switch to branch: refactor/sidebar-phase-8-module-split

Now begin the controlled file-structure refactor.

Target direction:
Server files:
- Code.gs
- AiLessonGateway.gs
- attribution.gs
- gematriya.gs
- surprise-me-feature.gs
- transliteration.gs
- ui_core.gs
- ui_pages.gs

Shared HTML/CSS/JS partials:
- ui_head.html
- ui_shell.css.html
- ui_components.css.html
- ui_utilities.css.html
- ui_core.js.html
- ui_api.js.html
- ui_state.js.html
- ui_dom.js.html
- ui_feedback.js.html

Page modules:
- sidebar.html
- sidebar.page.js.html
- preferences.html
- preferences.page.js.html
- ai_lesson.html
- ai_lesson.page.js.html
- surprise-me.html
- surprise-me.page.js.html

Requirements:
1. Extract shared logic from monolithic sidebar JS into reusable partials/modules.
2. Keep page modules thin and purpose-specific.
3. Prefer behavior hooks via data-* attributes where practical.
4. Preserve working behavior introduced in earlier phases.
5. Remove dead duplicated logic instead of copying it into new modules.

At the end of the phase:
1. update docs/CODEX_PROGRESS.md
2. summarize files changed
3. list decisions locked
4. list remaining risks / deferred work
Then stop.
```

## Phase 9 — Final verification

### Prompt
```text
Read docs/CODEX_GROUNDING.yaml, docs/CODEX_RUNBOOK.md, and docs/CODEX_PROGRESS.md first.
Treat CODEX_GROUNDING.yaml as authoritative.
Use CODEX_PROGRESS.md to avoid repeating completed work or reintroducing removed patterns.

Create or switch to branch: refactor/sidebar-phase-9-verification

Do a final verification pass across the refactor.

Checklist:
1. Search works in Texts.
2. Voices shows human-readable sheet titles, not raw IDs where title data exists.
3. Sidebar top-level modes are only:
   - Texts
   - Voices
   - Experimental Features (conditional)
4. Basic/Advanced is only inside AI Shiur.
5. Experimental tab appears only when enabled in Preferences.
6. Surprise Me lives in Experimental Features and is not a dead toggle.
7. Preferences acts as defaults authority, not live session UI.
8. Preview reflects session state.
9. More Options acts as a session override layer.
10. Extensions menu order and conditional behavior match the intended spec.
11. No duplicate or layered setSidebarMode-style logic remains.
12. No obvious dead experimental DOM hooks remain.
13. No syntax/runtime blockers remain in sidebar JS.

Fix any remaining inconsistencies you find.

At the end of the phase:
1. update docs/CODEX_PROGRESS.md
2. summarize files changed
3. list decisions locked
4. list remaining risks / deferred work
Then stop.
```
