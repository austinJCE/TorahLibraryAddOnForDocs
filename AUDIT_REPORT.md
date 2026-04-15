# Repo vs PRD Audit — Torah Library Google Docs Add-on

## 1. Executive Summary

**Overall compliance rating: Low-to-Medium**

### Biggest Strengths
- Three-tab architecture (Texts/Voices/Experimental) exists and conditional visibility works
- State layers (accountPreferences, sessionPreferences, effectivePreferences) are implemented
- Search with debounced typing, Enter, and click triggers all function
- Corpus grouping/hiding/restoring works without recursion
- Insertion correctly separates linked title from citation as distinct features
- Session Library with pinned/recent items and corpus filtering works
- Pre-clasp QC script exists with tag balance and syntax checks

### Biggest Risks
- **4 undefined functions** called at runtime (`focusResultByIndex`, `showSidebarNotice`, `showSidebarToast`, `openPreferencesWithHint`) — these will crash when triggered
- **7 late-file function overrides** using the `__orig`/`original` pattern the PRD explicitly prohibits
- **5 duplicate function definitions** across files (correctness depends on include order)
- **8 of 12 PRD-specified modules do not exist** — logic remains in monolithic sidebar_js.html (2,135 lines)
- **Stale test contracts** reference file names that don't exist in the repo

### Most Urgent Gaps
1. Undefined functions causing runtime crashes on keyboard nav and experimental features
2. Footer structure does not match PRD (Session Library in wrong row, no Actions button, Preferences hidden)
3. Experimental tab accordions contain only "Open" buttons, not inline controls as PRD requires
4. No visible filter chips above search results
5. Include-order-dependent correctness throughout the codebase

## 2. Compliance Matrix

| PRD Area | Requirement | Status | Evidence | Notes / Risk |
|---|---|---|---|---|
| **8.1 State Layers** | Three layers: userPrefs, sessionState, effectiveState | **Partial** | `sidebar_js.html:24-26` globals `accountPreferences`, `sessionPreferences`, `effectivePreferences` | Globals, not encapsulated; also duplicated in `ui_state.html:9` |
| **8.2 On Load** | `sessionState = deepCopy(userPreferences)` | **Compliant** | `sidebar_js.html:304-316` bootstrap handler clones from server | Uses `clonePlainObject` (shallow copy, not deep) |
| **8.2 Save Defaults** | `userPreferences = deepCopy(sessionState)` | **Compliant** | `sidebar_js.html:119-129` `saveSessionAsDefaults()` | Calls backend `saveSidebarSessionAsAccountDefaults` |
| **8.2 Reset Session** | `sessionState = deepCopy(userPreferences)` | **Compliant** | `sidebar_js.html:107-117` `resetSessionOverrides()` | Clears session, rebuilds effective from account |
| **8.2 Cancel/Close Prefs** | No state alteration | **Compliant** | `preferences_js.html` modal close handler | Preferences modal is a separate dialog |
| **8.4 Single Source of Truth** | All surfaces read/write through one source | **Partial** | Preferences modal and sidebar use separate server calls | No shared in-memory bus; sidebar reloads on pref change |
| **9.2 Pref Sections** | Texts, Voices, Experimental | **Compliant** | `preferences.html` contains all three sections | Verified in preferences HTML |
| **9.5 Experimental Toggle** | Master toggle + AI Mode + Surprise Me | **Compliant** | `preferences.html` has `surprise_me_enabled`, `experimental_ai_source_sheet_enabled` | Toggles exist and persist |
| **9.6 Pref Buttons** | Save/Reset/Cancel | **Compliant** | `preferences.html` has save, reset, close buttons | Standard modal pattern |
| **10.1 Sidebar Flow** | Vertical order: tabs→search→results→D&L→More Opts→Preview→Footer | **Compliant** | `sidebar.html:18-262` follows this order | Correct vertical stacking |
| **10.2 Three-Column Layout** | Stable label-control-input columns | **Partial** | CSS uses `.toggle-row` with label + switch but no strict 3-col grid | No explicit fixed-width column system found |
| **10.4 More Options Header** | Title + compact Reset + compact Save | **Partial** | `sidebar.html:162-171` has Reset/Save in `session-settings-inline-row` inside More Options | Correct placement but labeled "Session:" not "More Options" header |
| **10.4 Preview Pills** | Title, Citation, Vowels, Cantillation, Translit pills on preview card | **Partial** | `sidebar.html:175-205` composition card has Title, Cantillation, Vowels, Transliteration | Missing dedicated Citation pill in HTML; added by JS wrapper |
| **10.4 Secondary Pills** | Lines, Details below preview | **Partial** | `sidebar_composition_controls.html` binds `#sidebar-lines-toggle`, `#sidebar-translation-details-toggle` | Elements referenced in JS but not found in sidebar.html DOM |
| **11.2 Search Triggers** | Click, Enter, debounced typing | **Compliant** | `sidebar_js.html:1197-1207` all three trigger `runUnifiedQuery` | Working correctly |
| **11.5 Sorting** | Visible Sort control: Relevance, A-Z, Category, Recent | **Partial** | `sidebar.html:100-104` has Relevance, A-Z, Z-A only | Missing Category and Recently Added sort modes |
| **11.6 Filtering** | Visible filters, multi-select, chips above results | **Non-compliant** | Translation language filter exists but no visible filter chips | PRD requires active filters as removable chips above results |
| **11.7 Grouping** | Category/topic/date groups with stable headers | **Partial** | Corpus-based grouping exists in `sidebar_results_render.html:133-147` | Only corpus grouping; no topic/date grouping |
| **11.9 Empty State** | "No results found" + guidance + clear filters | **Partial** | `sidebar_js.html:864-870` shows fuzzy suggestions | No "clear filters" option on empty state |
| **11.9 Loading** | Skeleton/stable loaders | **Partial** | `sidebar_js.html:771-778` loading indicator with spinner | Simple spinner, not skeleton loaders |
| **12.1 Preview Trust** | Updates immediately on all setting changes | **Compliant** | Composition controls + preview_render trigger refresh | Each pill change triggers `refreshSidebarLivePreview()` |
| **12.3 Transliteration** | Immediate preview update on scheme change | **Compliant** | `sidebar_js.html:275-297` transliteration option click saves + refreshes | Async but immediate UI feedback |
| **13 Display/Layout** | Compact panels, close on outside click, no clip | **Compliant** | `sidebar.html:129-158` uses `<details>` elements | Native `<details>` behavior handles open/close |
| **14.2 Footer Row 1** | Add Source + Open in Sefaria | **Non-compliant** | `sidebar.html:331-337` Row 1 is: Add Source + Session Library icon + Open in Sefaria | Session Library icon inserted into Row 1; PRD says Row 2 |
| **14.2 Footer Row 2** | Actions + Preferences + Session Library | **Non-compliant** | `sidebar.html:339-343` Row 2 is: Divine Names + Linker + AI Shiur tools | No "Actions" button, no "Preferences" in Row 2, Session Library misplaced |
| **14.7 Footer Anti-Bloat** | No duplicated session settings | **Non-compliant** | Session settings (Reset/Save) in both More Options (line 167-171) AND footer (line 344-351) | Exact duplication the PRD forbids |
| **15.1 Experimental Tab** | Dedicated tab when features active | **Compliant** | `sidebar.html:21` experimental button, `sidebar.html:264-284` section | Tab appears/hides based on prefs |
| **15.4 Accordion Content** | Feature controls inline in accordions | **Non-compliant** | `sidebar.html:268-283` accordions only contain "Open" buttons | PRD says controls should live in accordions, not just launchers |
| **15.6 AI Migration** | Controls in sidebar, not stranded in modal | **Non-compliant** | AI Shiur accordion has `Open AI Shiur` button launching modal | Controls remain in disconnected modal |
| **16.1 Insertion Order** | Title → Content → Citation | **Compliant** | `Code.gs` insertReference: title → text → translit → attribution → citation | Correct ordering verified |
| **16.2 Distinct Features** | Title link and citation separate | **Compliant** | Separate `insertSefariaLink` and `insertCitation` params | Correctly distinct |
| **17.1 Session Library Visible** | Directly accessible from footer | **Compliant** | `sidebar.html:332-334` `#open-session-library` in primary actions | Visible but in wrong row per PRD |
| **17.3 buildSessionEntry Single Owner** | One definition | **Non-compliant** | Defined in `sidebar_session_library.html:21` AND overridden in `sidebar_js.html:1973` | Dual ownership via late override |
| **18.2 No Late-File Overrides** | Single authoritative owner per function | **Non-compliant** | 7 functions overridden: see Section 4 | Core PRD architecture violation |
| **18.3 Sidebar Core Thin** | Not a monolithic dumping ground | **Non-compliant** | `sidebar_js.html` = 2,135 lines with search, preview, footer, events, modes | Exactly the anti-pattern PRD prohibits |
| **18.4 Module Ownership** | 12 specified modules exist | **Non-compliant** | Only 4 of 12 exist; 8 missing entirely | See Section 4 for full list |
| **19.1 No Duplicate Ownership** | Core functions defined once | **Non-compliant** | 5 functions have duplicate definitions across files | See Section 4 |
| **19.3 Static Preflight** | Balanced tags, syntax checks, etc. | **Partial** | `pre_clasp_qc.sh` covers tags, syntax, search wiring | Missing: duplicate function check, split-module scan |
| **20 Accessibility** | Keyboard accessible, focus states, tab order | **Partial** | aria attributes present; `focusResultByIndex` undefined = broken keyboard nav | Keyboard result navigation crashes |

## 3. Detailed Findings by Area

### 3.1 State Architecture (PRD Section 8)

**PRD requires:** Three explicit layers — userPreferences, sessionState, effectiveState — with deep copy on load, explicit save/reset, and single source of truth across all surfaces.

**Repo does:** Implements three globals (`accountPreferences`, `sessionPreferences`, `effectivePreferences`) in `sidebar_js.html:24-26`. Bootstrap handler at line 304 clones from server response. `resetSessionOverrides()` (line 107) and `saveSessionAsDefaults()` (line 119) work correctly. `mergePreferenceLayers()` merges account + session into effective.

**Gaps:**
- `clonePlainObject()` is a shallow copy, not deep. Nested objects would share references.
- State globals are unprotected — any code can mutate them directly.
- Same state helpers are duplicated in `ui_core_shared.html` AND `sidebar_js.html` — include order determines which wins.
- `ui_state.html` defines `initializePreferenceState()` but sidebar_js.html ignores it and does its own initialization.
- No shared in-memory bus between Preferences modal and Sidebar — if Preferences saves while sidebar is open, sidebar doesn't know.

### 3.2 Preferences Modal (PRD Section 9)

**PRD requires:** Texts Defaults, Voices Defaults, Experimental Features sections. Save/Reset/Cancel. Experimental toggles must cause immediate visible UI change (Experimental tab appears).

**Repo does:** `preferences.html` (38KB) has all three sections. Save, Reset, Cancel buttons exist. Experimental toggles for AI Mode and Surprise Me exist. 67 preference keys stored in `PropertiesService.getUserProperties()`.

**Gaps:**
- When experimental toggles are saved in Preferences, the sidebar tab visibility updates only on next sidebar load — not "immediately" as PRD requires (Preferences is a separate dialog, sidebar doesn't receive live updates).
- No preview-in-Preferences surface exists (PRD marks this as optional but recommended).

### 3.3 Sidebar Layout (PRD Section 10)

**PRD requires:** Stable three-column layout for control rows. No flex-based reflow. Compact pills for session overrides on preview card.

**Repo does:** Uses `.toggle-row` with label + switch pattern. Composition card at `sidebar.html:175-205` has interactive Hebrew text with Cantillation, Vowels, Transliteration controls. `sidebar_composition_controls.html` adds pill sync behavior via function wrapping.

**Gaps:**
- No explicit fixed-width three-column grid system — toggle rows use flexible label + switch layout.
- Several pill element IDs referenced in `sidebar_composition_controls.html` (`#sidebar-citation-toggle`, `#sidebar-lines-toggle`, `#sidebar-translation-details-toggle`) do not exist in `sidebar.html` DOM. The JS binds click handlers to elements that aren't there.
- Toggle rows for transliteration (line 216) and link-source-title (line 220) are `visually-hidden` with `aria-hidden="true"`. The PRD expects these as visible compact pills, not hidden form elements.

### 3.4 More Options / Compact Preview Pills (PRD Section 10.4)

**PRD requires:** More Options header with title + compact Reset + compact Save. Preview card hosts pill controls for Title, Citation, Vowels, Cantillation, Translit. Secondary pills for Lines, Details below preview.

**Repo does:** More Options accordion at `sidebar.html:161-231`. Inside it: session settings row with Reset/Save buttons, composition card with Hebrew text stage, toggle rows.

**Gaps:**
- Reset/Save buttons are inside the accordion body (line 167-171), not in the accordion header/summary as PRD specifies.
- Citation pill exists only in JS bindings (`sidebar_composition_controls.html:55`) targeting `#sidebar-citation-toggle` — this element doesn't exist in the HTML.
- Lines pill (`#sidebar-lines-toggle`) and Details pill (`#sidebar-translation-details-toggle`) same issue — JS binds to missing DOM elements.
- The pills that DO exist in HTML (Cantillation, Vowels) work. Title toggle works. Transliteration menu works.

### 3.5 Search, Results, Sorting, Filtering (PRD Section 11)

**PRD requires:** Click/Enter/debounce triggers. Sort by Relevance/Title/Category/Recent. Visible multi-select filters with chips above results. Group headers. Empty state with "clear filters" option. Skeleton loaders.

**Repo does:** All three triggers work (`sidebar_js.html:1197-1207`). Sort has Relevance/A-Z/Z-A (`sidebar.html:100-104`). Translation language filter dropdown exists. Corpus grouping with hide/restore. Loading spinner. Fuzzy "Did you mean" suggestions.

**Gaps:**
- Missing sort modes: Category and Recently Added/Updated.
- No visible filter chips above results — PRD explicitly requires active filters as removable chips.
- No "clear all filters" button.
- Language filter is dropdown-only, not multi-select chips.
- Loading uses simple spinner, not skeleton loaders that preserve layout shape.
- No date/time-related filters.
- `focusResultByIndex()` called on ArrowUp/Down (lines 1220, 1224) but **never defined** — keyboard navigation of results will throw ReferenceError.

### 3.6 Preview (PRD Section 12)

**PRD requires:** Immediate updates on all setting changes. Content order: linked title → source text → transliteration → translation → citation. Transliteration scheme changes reflected immediately.

**Repo does:** `sidebar_preview_render.html` wraps `updateSuggestion()` to add transliteration. `renderPreviewHTML()` in `sidebar_js.html:1439-1471` generates preview based on display/layout mode. `refreshSidebarLivePreview()` in preview_render triggers on composition control changes.

**Match:** Preview updates work for vowels, cantillation, transliteration, display mode, layout mode, version selection. Transliteration scheme changes trigger preview refresh.

**Gaps:**
- Preview doesn't show a linked-title preview element — the composition card shows "Nehemiah 8:5" as a toggle button, but the actual preview HTML (`renderPreviewHTML`) doesn't render a linked-title block.
- Citation block is not rendered in preview — only in insertion.
- The `updateSuggestion` wrapping via `__origUpdateSuggestion` is a late-file override pattern PRD prohibits.

### 3.7 Display & Layout Choosers (PRD Section 13)

**PRD requires:** Compact panels, close on outside click, no clipping, no horizontal overflow.

**Repo does:** Uses native `<details>` elements for Display and Layout (`sidebar.html:134-155`). Mode cards with icon buttons. `sidebar_display_controls.html` adds auto-close behavior.

**Match:** This area is largely compliant. The `<details>` pattern provides clean open/close. Mode cards are compact icon-based buttons.

**Minor gaps:**
- No explicit outside-click-to-close for `<details>` — native behavior requires clicking the summary to close. The PRD says "close on outside click."

### 3.8 Footer (PRD Section 14)

**PRD requires:** Row 1: Add Source (wider, prominent) + Open in Sefaria. Row 2: Actions + Preferences + Session Library. No duplicated controls. No bloat.

**Repo does:** `sidebar.html:329-362`:
- Row 1 (`primary-actions`): Add Source + **Session Library icon** + Open in Sefaria icon
- Row 2 (`quick-actions-row`): Divine Names + Linker + AI Shiur tool buttons  
- Row 3 (`session-override-actions`): hidden by default — Session Settings label + Reset/Save/Preferences gear
- Row 4 (`footer-inline`): Help + Feedback + Logo
- Row 5 (`experimental-quick-actions`): hidden — AI Shiur + Surprise Me + Prefs (below Help strip!)

**Gaps — this is significantly non-compliant:**
- Session Library is in Row 1, not Row 2 as PRD specifies.
- No "Actions" button that opens a compact panel — PRD Section 14.5.
- "Preferences" gear is buried in a hidden `session-override-actions` section.
- Quick actions row has tool-specific buttons instead of PRD's Actions/Preferences/Session Library.
- Session Settings (Reset/Save) duplicated: in More Options (line 167-171) AND in footer (line 344-351) — violates PRD 14.7 anti-bloat rule.
- Experimental quick actions render AFTER the Help/Feedback strip — visually below the footer's natural end.
- `session-override-actions` has `style="display:none"` — users may never see Preferences button.

### 3.9 Experimental Features (PRD Section 15)

**PRD requires:** Experimental tab with accordions containing feature controls. AI controls should live in sidebar, not stranded in separate modal. Turning on Surprise Me must cause immediate visible UI change.

**Repo does:** `sidebar.html:264-284` — Experimental section has two `<details>` accordions (AI Shiur, Surprise Me). Each contains a description and an "Open" button that launches a separate dialog/workflow.

**Gaps:**
- Accordions are **launchers**, not control surfaces — they just have "Open AI Shiur" and "Open Surprise Me" buttons. PRD requires feature controls to live inside the accordions.
- AI Shiur controls remain in a disconnected modal (`ai_lesson.html`). PRD Section 15.6 explicitly says these should migrate to the sidebar Experimental area.
- `showSidebarNotice()` called when experimental features are disabled (lines 2100, 2107, 2114) — **this function is never defined**. Clicking Surprise Me or AI Shiur when disabled will crash.
- `showSidebarToast()` called on Surprise Me success (line 2106) — **also undefined**.
- `openPreferencesWithHint()` called to redirect to Preferences (lines 2101, 2115, 2124) — **also undefined**.

### 3.10 Insertion Behavior (PRD Section 16)

**PRD requires:** Optional linked title BEFORE text. Main content. Optional citation AFTER text. Title and citation are distinct. No duplicate metadata.

**Repo does:** `Code.gs` `insertReference()` takes separate `insertSefariaLink` and `insertCitationOnly` params. Insertion order: title paragraph → main text → transliteration → attribution → citation.

**Match:** This is compliant. Title and citation are distinct features with separate controls and separate insertion logic. No duplicate metadata found.

### 3.11 Session Library (PRD Section 17)

**PRD requires:** Visible from footer. Pinned/recent items. Corpus filtering. Single ownership of `buildSessionEntry`.

**Repo does:** `sidebar_session_library.html` — complete implementation with pinned/recent, corpus grouping, filter select, modal display. `buildSessionEntry()` defined at line 21.

**Gaps:**
- `buildSessionEntry` is defined in `sidebar_session_library.html:21` AND redefined in `sidebar_js.html:1973` (wrapping the original to add `mode`, `url`, `query` fields). This is the dual ownership PRD 17.3 explicitly forbids.

## 4. Architecture Review

### 4.1 Module Existence vs PRD Section 18.4

PRD specifies 12 sidebar-specific modules. Current state:

| Module | Status | Where logic lives instead |
|---|---|---|
| `sidebar_preferences_state.html` | **MISSING** | `sidebar_js.html:24-130` |
| `sidebar_search_utils.html` | **MISSING** | `sidebar_js.html:447-862` |
| `sidebar_search_controller.html` | **MISSING** | `sidebar_js.html:963-1106` |
| `sidebar_results_render.html` | **EXISTS** | Correctly extracted |
| `sidebar_session_library.html` | **EXISTS** | Correctly extracted |
| `sidebar_preview_core.html` | **MISSING** | `sidebar_js.html:1439-1720` |
| `sidebar_composition_controls.html` | **EXISTS** | But uses override pattern |
| `sidebar_display_controls.html` | **EXISTS** | Minimal, correct |
| `sidebar_footer_actions.html` | **MISSING** | `sidebar_js.html:384-396, 2057-2073` |
| `sidebar_mode_controller.html` | **MISSING** | `sidebar_js.html:1866-2134` |
| `sidebar_event_bindings.html` | **MISSING** | Scattered throughout sidebar_js.html |
| `sidebar_bootstrap.html` | **MISSING** | `sidebar_js.html:304-316, 1828-1858` |

**Verdict:** 4 of 12 modules exist. 8 missing. The monolithic `sidebar_js.html` remains the dumping ground for search, preview, footer, events, mode logic, and bootstrap — exactly the anti-pattern PRD Section 18.3 prohibits.

### 4.2 Duplicate Function Definitions

| Function | File 1 | File 2 | Risk |
|---|---|---|---|
| `clonePlainObject` | `ui_core_shared.html:2` | `sidebar_js.html:28` | Include-order determines winner |
| `mergePreferenceLayers` | `ui_core_shared.html:9` | `sidebar_js.html:35` | Include-order determines winner |
| `parseStoredArrayPreference` | `ui_core_shared.html:16` | `sidebar_js.html:158` | Include-order determines winner |
| `escapeHTML` | `ui_dom.html:6` | `sidebar_js.html:149` | Include-order determines winner |
| `buildSessionEntry` | `sidebar_session_library.html:21` | `sidebar_js.html:1973` | Late override wraps original |

Include order in `sidebar.html:376-383`: `ui_core_shared` → `ui_api` → `ui_dom` → `ui_feedback` → `ui_state` → `sidebar_results_render` → `sidebar_session_library` → `sidebar_js`. Because `sidebar_js` loads last, its definitions silently overwrite the shared helpers. This is fragile but currently "works by accident."

### 4.3 Late-File Function Overrides

Seven functions are redefined via the save-original-and-wrap pattern:

| Function | Original Location | Override Location | Pattern |
|---|---|---|---|
| `runUnifiedQuery` | `sidebar_js.html:963` | `sidebar_js.html:2014` | `originalTextRunUnifiedQuery` |
| `resolveSelectedResult` | `sidebar_js.html:1108` | `sidebar_js.html:2022` | `originalResolveSelectedResult` |
| `refreshSelectedResult` | `sidebar_js.html:1158` | `sidebar_js.html:2049` | `originalRefreshSelectedResult` |
| `buildSessionEntry` | `sidebar_session_library.html:21` | `sidebar_js.html:1973` | `originalBuildSessionEntry` |
| `updateSuggestion` | `sidebar_js.html:1474` | `sidebar_preview_render.html:46` | `__origUpdateSuggestion` |
| `updateSidebarCompositionCard` | `sidebar_js.html:223` | `sidebar_composition_controls.html:39` | `__origUpdateSidebarCompositionCard` |
| `bindSidebarCompositionCard` | `sidebar_js.html:253` | `sidebar_composition_controls.html:47` | `__origBindSidebarCompositionCard` |

Additionally, `syncSessionOverrideButtons` and `setFooterButtonStates` are redefined later in the same file (sidebar_js.html:2057-2073) without the `original` pattern — they simply replace the earlier definition.

**This is the #1 architecture violation per PRD Section 19.2.** Every one of these must be refactored to single-owner definitions.

### 4.4 Undefined Functions (Runtime Crashes)

Four functions are called but never defined anywhere:

| Function | Called At | Effect |
|---|---|---|
| `focusResultByIndex()` | `sidebar_js.html:1220,1224` | ArrowUp/Down in search crashes |
| `showSidebarNotice()` | `sidebar_js.html:2100,2107,2114` | Surprise Me / AI Shiur prompts crash |
| `showSidebarToast()` | `sidebar_js.html:2106` | Surprise Me success notification crashes |
| `openPreferencesWithHint()` | `sidebar_js.html:2101,2115,2124` | "Open Preferences" redirect crashes |

The shared `ui_feedback.html` defines `showSharedNotice()` (not `showSidebarNotice`), and the DOM has `#sidebar-notice` / `#sidebar-toast` elements ready — but the glue functions were never written.

### 4.5 Stale Test Contracts

`test/ui/contracts/include-wiring.contract.json` references files that don't exist:
- `ui_core.js` (actual: `ui_core_shared.html`)
- `ui_api.js` (actual: `ui_api.html`)
- `ui_state.js` (actual: `ui_state.html`)
- `ui_dom.js` (actual: `ui_dom.html`)
- `ui_feedback.js` (actual: `ui_feedback.html`)
- `sidebar.page.js` (actual: `sidebar_js.html`)
- `ui_shell.css`, `ui_components.css`, `ui_utilities.css` (not found)

`test/ui/contracts/js-contracts.json` expects functions in files like `preferences.page.js.html` which doesn't exist (actual: `preferences_js.html`).

These contracts provide zero validation value — they will all fail or test the wrong files.

## 5. UX/Behavior Mismatches

1. **Keyboard result navigation crashes.** ArrowUp/Down in search input calls undefined `focusResultByIndex()`. Users pressing arrow keys get a silent JS error and nothing happens.

2. **Surprise Me / AI Shiur prompts crash when features disabled.** Clicking these buttons when the user hasn't enabled them calls undefined `showSidebarNotice()`. Instead of a helpful prompt, users get a silent failure.

3. **Preferences button is hidden.** The gear icon lives inside `session-override-actions` which has `style="display:none"`. In Voices mode, `syncSessionOverrideButtons()` keeps it hidden. Users in Voices mode cannot access Preferences from the sidebar at all.

4. **Experimental accordions are empty launchers.** Users toggle experimental features ON, see the Experimental tab, click it, find accordions that just say "Open AI Shiur" / "Open Surprise Me" — launching separate dialogs. PRD expects controls to live in the accordions, making the tab feel like a real workspace, not a menu of launchers.

5. **Session Library in primary action row.** The 📜 icon sits between Add Source and Open in Sefaria. This is prime footer real estate and makes the three buttons feel like peers, when Session Library is a secondary action. PRD puts it in Row 2.

6. **No visible active filter indicators.** When a user selects translation language filters, there's no visible chip/badge above results showing what's active. Users may forget filters are active and wonder why results seem reduced.

7. **Composition card pill elements missing from DOM.** JS in `sidebar_composition_controls.html` binds to `#sidebar-citation-toggle`, `#sidebar-lines-toggle`, `#sidebar-translation-details-toggle` — none of these exist in sidebar.html. The click handlers bind to nothing; the pills never render.

8. **Experimental quick actions below Help strip.** `experimental-quick-actions` div at sidebar.html:357-361 renders AFTER the Help/Feedback/Logo strip. When in experimental mode, these action buttons appear below the footer's natural visual end — confusing placement.

9. **Display/Layout uses `<details>` without outside-click-to-close.** Native `<details>` requires clicking the summary to toggle. PRD requires closing on outside click. Current behavior: user must click the summary specifically to close, not just click elsewhere.

10. **No skeleton loaders.** Loading state uses a simple spinner (`preview-loading-spinner`). PRD requires skeleton loaders that preserve layout shape to avoid content jumps.

## 6. Regression Risks

### 6.1 Duplicated Logic
- `clonePlainObject`, `mergePreferenceLayers`, `parseStoredArrayPreference`, `escapeHTML` each defined twice. If one copy is updated and the other isn't, subtle bugs emerge.
- Session settings Reset/Save buttons duplicated in More Options AND footer — behavior changes must be applied to both.

### 6.2 Dead Code / Legacy Paths
- `updateInsertionModeVisibility()` at sidebar_js.html:444 is an empty function stub.
- `updateQueryIntel()` at sidebar_js.html:954 is a no-op function.
- `Code.gs` contains `legacy_` prefixed functions (legacy_getAiLessonBootstrapData_, etc.) that are dead but still present.
- Hidden `<select>` elements (`.output-mode-selection`, `.bilingual-layout-selection`) serve as hidden state stores — fragile proxy pattern.

### 6.3 Patch-on-Patch Patterns
- `sidebar_composition_controls.html` wraps two functions from `sidebar_js.html`, then calls the wrapped versions again at file end (line 116-117). If the include order changes, this breaks.
- `sidebar_preview_render.html` wraps `updateSuggestion` — if another module also needs to wrap it, a three-deep chain forms.
- Voices mode implementation (sidebar_js.html:1866-2073) saves 4 originals and replaces them — a fifth function replacement would need to save the voices-mode version as the new original.

### 6.4 CSS/Layout Fragility
- `sidebar_css.html` is 4,190 lines — largest file in the project. No modular CSS structure.
- `.visually-hidden` used to hide toggle rows that should be pills. If CSS class is accidentally removed, hidden controls appear as full-width toggle rows, breaking layout.
- `style="display:none"` used inline on many elements (experimental button, results panel, mode context note, etc.). JS toggles these — but if JS fails to load, these elements remain permanently hidden.

### 6.5 State Desync Risks
- Preferences modal and sidebar don't share real-time state. User opens Preferences, changes experimental toggle, saves. Sidebar doesn't know until next load.
- `effectivePreferences` is recomputed in multiple places: `saveAccountPreference()`, `saveSessionPreference()`, `resetSessionOverrides()`, `saveSessionAsDefaults()`. If any path misses the recomputation, state drifts.
- `extendedGemaraPreference` in Code.gs loaded once on sidebar open. Dynamic changes not reflected until sidebar refresh.

### 6.6 Event Binding Risks
- Multiple `.off('click').on('click')` rebinding patterns throughout. If a binding is missed during mode switch, a button stops working.
- `sidebar_composition_controls.html` uses namespaced events (`.compact`, `.compactMenu`) but `sidebar_js.html` uses un-namespaced events on the same elements — risk of accidental unbinding.
- `$('#run-sefaria').off('click').on('click')` appears TWICE: sidebar_js.html:1197 and sidebar_js.html:2092. Second binding overwrites first.

### 6.7 Undefined Function Risk
- The 4 undefined functions won't cause load-time errors (they're called in event handlers). They'll only crash at runtime when the user performs specific actions. This makes them easy to miss in basic smoke testing.

### 6.8 Include-Order Fragility
- Current include order: `ui_core_shared` → `ui_api` → `ui_dom` → `ui_feedback` → `ui_state` → `sidebar_results_render` → `sidebar_session_library` → `sidebar_js`.
- `sidebar_composition_controls.html` and `sidebar_preview_render.html` are NOT included in `sidebar.html`. They must be included by some other mechanism (likely `sidebar_css.html` or embedded in another file). If they load before `sidebar_js.html`, the functions they try to wrap don't exist yet. If they load after, the wrapping works but creates the override chain.
- **CRITICAL:** `sidebar_composition_controls.html`, `sidebar_preview_render.html`, and `sidebar_display_controls.html` are **never included by any file**. Not in `sidebar.html` includes (lines 376-383), not in `Code.gs`, not referenced by any `.html` or `.gs` file. They are orphaned dead code. This means:
  - Compact pill sync (`syncCompactPills`) never runs — Citation, Lines, Details pills never render.
  - Transliteration preview (`renderPreviewTransliteration`) never runs — transliteration is NOT shown in preview.
  - Live preview refresh (`refreshSidebarLivePreview`) triggered by pill changes never fires.
  - Display controls auto-close behavior never activates.
  - The function wrapping (`__origUpdateSuggestion`, `__origUpdateSidebarCompositionCard`, `__origBindSidebarCompositionCard`) never happens.
  - These files were likely extracted during refactoring but never wired into the include chain.

## 7. Recommended Remediation Plan

### P0 — Must Fix First

**P0-1: Wire orphaned modules into sidebar.html**
- **Issue:** `sidebar_composition_controls.html`, `sidebar_preview_render.html`, `sidebar_display_controls.html` are never loaded. Pill sync, transliteration preview, and display auto-close are all dead.
- **Why it matters:** Users get no transliteration preview, no compact pill behavior, no auto-close on display chooser. Core PRD features are broken.
- **Fix:** Add `<?!= include('sidebar_display_controls'); ?>`, `<?!= include('sidebar_composition_controls'); ?>`, and `<?!= include('sidebar_preview_render'); ?>` to `sidebar.html` after the `sidebar_js` include (line 383). Verify load order handles the wrapping correctly.
- **Files:** `sidebar.html`

**P0-2: Define missing functions**
- **Issue:** `focusResultByIndex`, `showSidebarNotice`, `showSidebarToast`, `openPreferencesWithHint` are called but never defined.
- **Why it matters:** Keyboard navigation and experimental feature prompts crash at runtime.
- **Fix:** Implement these four functions. `showSidebarNotice` should use the existing `#sidebar-notice` DOM elements. `showSidebarToast` should use `#sidebar-toast`. `focusResultByIndex` should scroll to and highlight result by index. `openPreferencesWithHint` should call `google.script.run.preferencesPopup()` with a section hint.
- **Files:** `sidebar_js.html` or a new `sidebar_event_bindings.html`

**P0-3: Add missing pill DOM elements**
- **Issue:** `#sidebar-citation-toggle`, `#sidebar-lines-toggle`, `#sidebar-translation-details-toggle` referenced in JS but absent from HTML.
- **Why it matters:** Even after P0-1 wires the modules, these pills have no DOM targets.
- **Fix:** Add pill buttons to the composition card in `sidebar.html` (inside the `.sidebar-composition-card` area or as secondary pills below preview).
- **Files:** `sidebar.html`

**P0-4: Fix footer structure per PRD**
- **Issue:** Session Library in Row 1, no Actions button, Preferences hidden, experimental actions below Help strip.
- **Why it matters:** Footer is the stable action area; current structure violates PRD and confuses users.
- **Fix:** Restructure footer: Row 1 = Add Source (wide) + Open in Sefaria. Row 2 = Actions button + Preferences button + Session Library button. Move experimental quick actions inside experimental mode logic, not below Help strip. Remove duplicate session settings from footer.
- **Files:** `sidebar.html`, `sidebar_js.html` (footer state logic)

**P0-5: Eliminate duplicate function definitions**
- **Issue:** 5 functions defined in two places. Include-order determines which wins.
- **Why it matters:** Maintenance risk — editing one copy while the other silently wins.
- **Fix:** Remove duplicates from `sidebar_js.html` (lines 28-33, 35-39, 149-156, 158-169). Keep the shared versions in `ui_core_shared.html` and `ui_dom.html`. Verify sidebar_js.html functions reference the shared versions.
- **Files:** `sidebar_js.html`, `ui_core_shared.html`, `ui_dom.html`

### P1 — Important Next

**P1-1: Refactor late-file overrides to single-owner definitions**
- **Issue:** 7+ functions use save-original-and-wrap pattern.
- **Why it matters:** Makes code flow untraceable, creates fragile chains, violates PRD 19.2.
- **Fix:** For mode-dependent behavior (texts vs voices), use a strategy pattern or conditional branching inside a single function definition. For composition/preview enhancements, inline the enhanced behavior into the single definition.
- **Files:** `sidebar_js.html`, `sidebar_composition_controls.html`, `sidebar_preview_render.html`

**P1-2: Extract remaining logic from monolithic sidebar_js.html**
- **Issue:** 2,135-line file owns search, preview, footer, events, modes, preferences, and bootstrap.
- **Why it matters:** Any change risks breaking unrelated features. PRD 18.3 explicitly prohibits this.
- **Fix:** Extract into PRD-specified modules: `sidebar_search_controller.html`, `sidebar_preview_core.html`, `sidebar_footer_actions.html`, `sidebar_mode_controller.html`, `sidebar_event_bindings.html`, `sidebar_bootstrap.html`, `sidebar_preferences_state.html`, `sidebar_search_utils.html`.
- **Files:** New files + `sidebar_js.html` + `sidebar.html` (include chain)

**P1-3: Implement Experimental tab content model**
- **Issue:** Accordions are launchers with "Open" buttons, not inline control surfaces.
- **Why it matters:** PRD requires feature controls inside accordions. Users expect to interact without launching separate dialogs.
- **Fix:** Migrate core AI Shiur controls (topic, style, audience selectors) into the accordion body. For Surprise Me, add scope/settings controls inline. Keep separate dialogs as optional "advanced" paths.
- **Files:** `sidebar.html` (experimental section), new JS for experimental controls

**P1-4: Update test contracts to match actual file names**
- **Issue:** Contracts reference `ui_core.js`, `sidebar.page.js.html` etc. — none exist.
- **Why it matters:** Tests provide no validation against actual files.
- **Fix:** Update `include-wiring.contract.json`, `js-contracts.json`, and `selector-contracts.json` to reference actual file names (`ui_core_shared.html`, `sidebar_js.html`, etc.).
- **Files:** `test/ui/contracts/*.json`

**P1-5: Add active filter chips above results**
- **Issue:** No visible chips showing active filters. PRD Section 11.6 requires them.
- **Fix:** When translation language filter is active, render removable chips between `.results-header` and `.results-lists`. Include "Clear all" option.
- **Files:** `sidebar_results_render.html`, `sidebar.html` (DOM slot), `sidebar_css.html`

### P2 — Later Cleanup

**P2-1: Add Category and Recently Added sort modes**
- PRD specifies Category and Recently Added/Updated sorting. Currently only Relevance, A-Z, Z-A.

**P2-2: Implement skeleton loaders for search loading state**
- Replace simple spinner with skeleton loaders preserving layout shape.

**P2-3: Add outside-click-to-close for Display/Layout `<details>`**
- Current native `<details>` only closes on summary click. PRD requires outside-click close.

**P2-4: Add preview-in-Preferences (optional per PRD)**
- Preferences modal could show a preview reflecting default configuration.

**P2-5: Remove dead code**
- Remove `updateInsertionModeVisibility()` stub, `updateQueryIntel()` no-op, legacy_ functions in Code.gs.
- Remove orphaned hidden `<select>` proxy elements if possible.

**P2-6: Encapsulate state**
- Replace raw globals with a state manager object. Enforce mutation through setters that trigger UI sync.

## 8. Missing Tests / Validation

### Smoke Tests Needed (per PRD 19.4)
1. **Texts search** — type query, verify results render. Status: partially testable via existing search wiring check.
2. **Select text result** — click result, verify selection highlighting. Status: no automated test.
3. **Preview updates** — change vowels/cantillation/transliteration, verify preview changes. Status: no test; BLOCKED by P0-1 (orphaned modules).
4. **Add Source** — insert with various options. Status: no automated UI test.
5. **Open in Sefaria** — verify URL construction. Status: no test.
6. **Session Library** — open/recent/pinned. Status: no test.
7. **More Options pills** — toggle pills, verify state sync. Status: BLOCKED by P0-1 and P0-3.
8. **Transliteration preview** — enable, change scheme, verify preview. Status: BLOCKED by P0-1.
9. **Display/Layout chooser** — select mode, verify preview changes. Status: no test.
10. **Voices search** — switch to Voices, search, verify results. Status: no test.
11. **Footer Actions / Preferences / Session Library** — all accessible. Status: BLOCKED by P0-4.
12. **Corpus hide and restore** — hide corpus, restore, verify no recursion. Status: no test.
13. **Save session as defaults** — save, verify persistence. Status: no test.
14. **Reset session overrides** — reset, verify revert. Status: no test.

### Structural Checks Needed
- **Duplicate function detection:** Add to `pre_clasp_qc.sh` — scan all `.html` script bodies for `function X(` appearing in multiple files.
- **Orphaned file detection:** Verify every `.html` file in `apps-script/` is either a top-level template or included by one. Currently 3 orphaned files pass QC silently.
- **Undefined function detection:** Extract all function calls and definitions from JS; flag calls to undefined functions.

### Preflight Checks Needed
- Update contracts in `test/ui/contracts/` to match actual filenames.
- Add contract for `sidebar.html` include chain verifying all expected modules are included.
- Add selector contract entries for missing pill elements (`#sidebar-citation-toggle`, etc.).

### UI Regression Checks
- Verify no `<details>` elements break layout when opened (check for horizontal overflow).
- Verify footer height doesn't change between standard and experimental modes.
- Verify composition card doesn't reflow when pills are toggled.

### State-Sync Checks
- Open Preferences, change a toggle, save. Open sidebar — verify the change is reflected.
- In sidebar, change a session setting, then "Reset Session" — verify all controls revert.
- In sidebar, change settings, then "Save as Defaults" — verify account prefs updated.

## 9. Final Verdict

### Is the repo structurally aligned with the PRD?
**No.** The repo has partial alignment on state architecture and search behavior, but fails on module ownership (8 of 12 modules missing), function ownership (5 duplicates, 7+ overrides), footer structure, experimental tab content model, and runtime correctness (4 undefined functions, 3 orphaned files).

### Can it be safely evolved without major regressions?
**No.** The monolithic `sidebar_js.html` (2,135 lines) with scattered event bindings, function overrides, and duplicate definitions means any change risks unintended side effects. The orphaned module files mean refactoring work was started but never completed — the include chain is incomplete. The stale test contracts provide no safety net.

### Is a refactor needed before feature work continues?
**Yes.** The following must happen before new features are safe:

1. **Wire orphaned files** (P0-1) — This alone restores transliteration preview, pill sync, and display controls.
2. **Define missing functions** (P0-2) — This eliminates runtime crashes.
3. **Add missing pill DOM** (P0-3) — This completes the composition card.
4. **Fix footer** (P0-4) — This aligns the action area with PRD.
5. **Remove duplicates** (P0-5) — This eliminates include-order fragility.

After P0 items, the P1 refactor to extract modules from the monolith should proceed incrementally, one module at a time, with smoke tests at each step. The test contracts must be updated to reflect reality before they can serve as guardrails.

**The governing principle from the PRD remains unmet:**
> "Same settings, same meanings, clear ownership, compact live UI, and no fragile overrides."

The repo has settings and meanings that are mostly consistent, but ownership is fragmented, live UI features are orphaned, and fragile overrides are the primary extension mechanism. A focused P0 sprint followed by systematic P1 extraction would bring the repo into alignment.
