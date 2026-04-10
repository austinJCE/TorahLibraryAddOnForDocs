# Codex Runbook for TorahLibraryAddOnForDocs

This runbook is intended to be committed into the repository so Codex has a stable, explicit refactor brief.

## How to use this runbook

- Run **one phase at a time**.
- Ask Codex to **stop after each phase**.
- Review the diff before continuing.
- Do **not** ask Codex to "fix everything" in one pass.
- Treat `CODEX_GROUNDING.yaml` as the authoritative product/UX spec.

## Branching rule

Create one branch per phase:

- `codex/phase-01-stabilize-sidebar`
- `codex/phase-02-normalize-modes`
- `codex/phase-03-experimental-surface`
- `codex/phase-04-preferences-state-flow`
- `codex/phase-05-ai-shiur-sidebar-native`
- `codex/phase-06-texts-preview-sync`
- `codex/phase-07-extensions-menu`
- `codex/phase-08-module-split`
- `codex/phase-09-final-verification`

## Required Codex output format for every phase

At the end of each phase, Codex must output:

1. `Changed files:`
2. `What changed:`
3. `Assumptions:`
4. `Risks / follow-ups:`
5. `Stopped after phase:`

## Global constraints

- Preserve the working **Texts search pipeline** unless a specific bug fix requires touching it.
- Do not reintroduce global sidebar `basic` / `advanced` modes.
- Top-level sidebar modes must be only:
  - `texts`
  - `voices`
  - `experimental` (conditional)
- `Basic / Advanced` is allowed **only inside AI Shiur**.
- Preferences are the **saved default authority**.
- Sidebar edits **session state**.
- Preview reflects **session state**.
- More Options are **session-level refinements**, not hidden global defaults.
- Experimental features are **enabled in Preferences**, not activated from incidental local toggles.
- Remove dead/conflicting legacy logic rather than layering new overrides on top.

---

## Phase 1 — Stabilize the current build

### Prompt

```text
You are working in a Google Apps Script add-on repo for a Google Docs sidebar.

Before editing:
- Read CODEX_GROUNDING.yaml and follow it as the authoritative product spec.
- Create a new branch named codex/phase-01-stabilize-sidebar.

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

Deliverables:
- Make the fixes
- Summarize exactly which files changed
- Explain each fix briefly
- Stop after this stabilization pass
```

---

## Phase 2 — Normalize top-level sidebar modes

### Prompt

```text
Before editing:
- Read CODEX_GROUNDING.yaml and follow it as the authoritative product spec.
- Create a new branch named codex/phase-02-normalize-modes from the latest reviewed branch.

Task: perform the sidebar mode architecture refactor.

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

Deliverables:
- Make the changes
- List changed files
- Identify any leftover legacy mode code that should be addressed later
- Stop after this phase
```

---

## Phase 3 — Build the Experimental Features sidebar surface

### Prompt

```text
Before editing:
- Read CODEX_GROUNDING.yaml and follow it as the authoritative product spec.
- Create a new branch named codex/phase-03-experimental-surface from the latest reviewed branch.

Task: implement the Experimental Features sidebar surface so the DOM matches the intended behavior.

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

Acceptance criteria:
- No JS references missing experimental DOM nodes
- Experimental tab visibility is preference-gated
- Standard and experimental footer actions are structurally distinct
- Surprise Me and AI Shiur have persistent sidebar locations

Deliverables:
- Make the changes
- Summarize changed files and new DOM structure
- Stop after this phase
```

---

## Phase 4 — Align Preferences and state flow

### Prompt

```text
Before editing:
- Read CODEX_GROUNDING.yaml and follow it as the authoritative product spec.
- Create a new branch named codex/phase-04-preferences-state-flow from the latest reviewed branch.

Task: refactor Preferences and sidebar state flow to enforce a clean source-of-truth model.

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
5. Experimental feature enablement must be controlled in Preferences:
   - master experimental enablement if present
   - AI Mode
   - Surprise Me

Important:
- Preferences should mirror saved defaults, not compete with live sidebar controls.
- Do not bury live layout/display/translation controls in Preferences.

Acceptance criteria:
- Preferences changes do not silently override current live session until applied/saved
- Sidebar initializes from preferences but can diverge during session
- Reset-to-defaults behavior is coherent
- Experimental tab visibility follows preference state

Deliverables:
- Make the changes
- Summarize changed files and state-flow decisions
- Stop after this phase
```

---

## Phase 5 — Move AI Shiur fully into the Experimental tab

### Prompt

```text
Before editing:
- Read CODEX_GROUNDING.yaml and follow it as the authoritative product spec.
- Create a new branch named codex/phase-05-ai-shiur-sidebar-native from the latest reviewed branch.

Task: refactor AI Shiur so it is sidebar-native inside Experimental Features.

Requirements:
1. AI Shiur must live inside the Experimental Features tab as an accordion-based workflow.
2. Basic / Advanced must exist only inside the AI Shiur accordion.
3. Remove any remaining dependency on global sidebar basic/advanced modes.
4. If the old AI modal remains, demote it to a secondary/legacy path only if necessary; do not keep it as the primary UX.
5. Ensure AI-related quick actions and controls follow the system-level experimental state.

Important UX rule:
- AI Shiur is no longer modal-first.
- Its internal Basic/Advanced toggle affects only the AI Shiur accordion UI, not global sidebar state.

Acceptance criteria:
- No global sidebar mode changes occur when toggling AI Shiur Basic/Advanced
- AI Shiur can be reached persistently from Experimental Features
- Old modal-only assumptions are removed or clearly isolated

Deliverables:
- Make the changes
- Summarize changed files
- Note any legacy modal code still intentionally retained
- Stop after this phase
```

---

## Phase 6 — Clean up Texts live controls and preview sync

### Prompt

```text
Before editing:
- Read CODEX_GROUNDING.yaml and follow it as the authoritative product spec.
- Create a new branch named codex/phase-06-texts-preview-sync from the latest reviewed branch.

Task: do a UX/state pass on the Texts tab to enforce the correct split between live controls and More Options.

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

Constraints:
- Do not move these live controls into Preferences.
- Do not make Preview depend on stale saved defaults.

Acceptance criteria:
- Texts controls are visible where intended
- More Options behaves as a refinement layer
- Preview updates correctly for layout/display/translation and detail toggles
- No duplicate control path exists for the same live behavior

Deliverables:
- Make the changes
- Summarize changed files
- Stop after this phase
```

---

## Phase 7 — Refactor the Extensions menu

### Prompt

```text
Before editing:
- Read CODEX_GROUNDING.yaml and follow it as the authoritative product spec.
- Create a new branch named codex/phase-07-extensions-menu from the latest reviewed branch.

Task: refactor the Google Docs Extensions menu to match the intended command-surface model.

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

Acceptance criteria:
- Menu ordering is stable
- Preferences/Support remain persistent bottom items
- Experimental items appear only when enabled
- Base menu renders reliably even under limited auth

Deliverables:
- Make the changes
- Summarize changed files
- Stop after this phase
```

---

## Phase 8 — Controlled module split

### Prompt

```text
Before editing:
- Read CODEX_GROUNDING.yaml and follow it as the authoritative product spec.
- Create a new branch named codex/phase-08-module-split from the latest reviewed branch.

Task: begin the controlled file-structure refactor.

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
4. Do not do a cosmetic rewrite for its own sake; preserve working behavior while improving structure.
5. Remove dead duplicated logic instead of copying it into new modules.

Important:
- This is a controlled split, not a full redesign.
- Preserve working behavior introduced in earlier phases.

Acceptance criteria:
- Shared state/api/feedback logic is separated from page-specific code
- Sidebar page file is materially smaller and more focused
- Legacy duplicated mode logic does not survive the split
- File names and responsibilities align with the target architecture

Deliverables:
- Make the changes
- Summarize new file structure
- Note any follow-up split that should happen later
- Stop after this phase
```

---

## Phase 9 — Final verification and cleanup

### Prompt

```text
Before editing:
- Read CODEX_GROUNDING.yaml and follow it as the authoritative product spec.
- Create a new branch named codex/phase-09-final-verification from the latest reviewed branch.

Task: do a final verification pass across the refactor.

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

Deliverables:
- Fix any remaining inconsistencies you find
- Produce a concise final report:
  - changed files
  - remaining risks
  - recommended manual smoke tests
- Stop
```

---

## Manual smoke tests after each reviewed phase

- Sidebar opens without JS parse errors.
- Texts search returns and renders results.
- Selecting a text updates Preview.
- Voices results show human-readable titles where available.
- Top-level tabs shown are the expected set for the current preference state.
- Experimental tab appears only when enabled in Preferences.
- Footer actions match standard vs experimental state.
- Preferences changes do not unexpectedly overwrite current live session state.
