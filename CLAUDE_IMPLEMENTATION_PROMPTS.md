# Claude Code Implementation Prompts

**Purpose:** Self-contained prompts for Claude Code to fix bugs, missing features, and PRD compliance gaps identified in the April 15 2026 audit.

**How to use:** Copy the full text of a single prompt into a new Claude Code session. Each prompt is self-contained — it includes all file paths, line references, and the exact changes needed. Run prompts in order within each priority tier (P0 before P1 before P2).

**Model recommendations:**
- **P0 prompts (DOM fixes, wiring):** Sonnet 4.6 — fast, precise, low risk of over-engineering
- **P1 prompts (architectural):** Opus 4.6 — deeper reasoning for cross-file coordination
- **P2 prompts (polish):** Sonnet 4.6

---

## P0-A: Critical DOM Fix — Vowels, Cantillation, and Transliteration Pill Wiring

**Priority:** P0 (must fix first)
**Model:** Sonnet 4.6
**Risk:** Low — adding missing DOM elements; no logic changes

### Prompt

```
You are working on a Google Docs add-on sidebar. There are three critical bugs
where JavaScript binds to DOM elements that do not exist in sidebar.html. The
result is that vowels, cantillation, and transliteration on/off toggles silently
do nothing when clicked.

## Bug 1: Missing .wants-vowels and .wants-cantillation hidden checkboxes

### The problem
Multiple JS files use jQuery selectors `.wants-vowels` and `.wants-cantillation`
to read/write vowel and cantillation state:

- sidebar_preferences_state.html:124-125 — mergePreferenceDefaults() sets them
- sidebar_event_bindings.html:43-47 — change handler saves preferences
- sidebar_composition_controls.html:8-9 — updateSidebarCompositionCard() reads them
- sidebar_composition_controls.html:59,63 — pill click toggles them

But sidebar.html has NO elements with class="wants-vowels" or
class="wants-cantillation". Only class="wants-pesukim" exists (line 218).

### The fix
In apps-script/sidebar.html, find the block of hidden form elements near line 329:

    <select class="output-mode-selection visually-hidden" aria-hidden="true">
      ...
    </select>
    <select class="bilingual-layout-selection visually-hidden" aria-hidden="true">
      ...
    </select>
    <input type="checkbox" class="translation-only-filter ui-hidden-checkbox" aria-hidden="true">
    <input type="checkbox" class="wants-relevance ui-hidden-checkbox" aria-hidden="true" checked>

Add two new hidden checkboxes immediately after the .wants-relevance line:

    <input type="checkbox" class="wants-vowels ui-hidden-checkbox" aria-hidden="true" checked>
    <input type="checkbox" class="wants-cantillation ui-hidden-checkbox" aria-hidden="true" checked>

Both are checked by default because the backend defaults for nekudot and teamim
are both true.

## Bug 2: Missing #sidebar-transliteration-pill element

### The problem
sidebar_composition_controls.html binds two separate IDs:

- Line 66: $('#sidebar-transliteration-pill').off('click').on('click', ...)
  — intended for on/off toggle of transliteration
- Line 78: $('#sidebar-transliteration-toggle').off('click').on('click', ...)
  — intended for opening the scheme dropdown menu

But sidebar.html only has ONE element: id="sidebar-transliteration-toggle"
(line 194). There is no #sidebar-transliteration-pill in the DOM.

The result: the on/off toggle (line 66) binds to nothing and never fires.

### The fix
In apps-script/sidebar.html, the transliteration wrap area (around line 193-205)
currently looks like:

    <div class="sidebar-composition-transliteration-wrap">
      <button type="button" class="sidebar-composition-transliteration"
        id="sidebar-transliteration-toggle"
        aria-haspopup="listbox" aria-expanded="false">ha-sefer kol-ha'am</button>
      <div class="sidebar-composition-transliteration-menu hidden" ...>
        ...
      </div>
    </div>

Add a new pill button BEFORE the existing transliteration toggle:

    <div class="sidebar-composition-transliteration-wrap">
      <button type="button" class="sidebar-mark-pill"
        id="sidebar-transliteration-pill"
        aria-pressed="false"
        title="Toggle transliteration">Translit</button>
      <button type="button" class="sidebar-composition-transliteration"
        id="sidebar-transliteration-toggle"
        aria-haspopup="listbox" aria-expanded="false">ha-sefer kol-ha'am</button>
      ...

The pill shows on/off state. The existing toggle shows the active scheme and
opens the dropdown.

## Verification

After these changes:
1. Open the sidebar. The composition card should show vowels/cantillation as
   active (checked by default).
2. Click the Vowels pill — the Hebrew preview text should switch between
   vocalized and consonantal forms.
3. Click the Cantillation pill — the Hebrew preview should toggle cantillation marks.
4. Click the Translit pill — transliteration should toggle on/off.
5. Click the scheme dropdown — schemes should appear and be selectable.
6. All pill states should persist when saving session preferences.
```

---

## P0-B: Restore Corpus Dropdown Menu — Missing DOM Elements

**Priority:** P0
**Model:** Sonnet 4.6
**Risk:** Low — adding HTML that existing JS already targets

### Prompt

```
You are working on a Google Docs add-on sidebar. The "restore corpus" feature
lets users hide result groups (corpora) and then restore them. The JS in
sidebar_results_render.html builds a dropdown menu by targeting these IDs:

- #restore-corpus-menu (line 178, 195, 202)
- #restore-corpus-menu-wrap (line 179)
- #restore-corpus-menu-items (line 208)

None of these exist in sidebar.html. The restore button (#restore-corpus-button,
line 109-115 of sidebar.html) becomes active when corpora are hidden but clicking
it does nothing because the dropdown menu it tries to show doesn't exist.

## The fix

In apps-script/sidebar.html, find the restore-corpus-button (around line 109):

        <button
          type="button"
          class="results-tool restore-corpus-button text-mode-only"
          id="restore-corpus-button"
          aria-label="Restore Corpus"
          title="Restore Corpus"
          style="display:none;">⤦</button>

Wrap it in a relative container and add the dropdown menu immediately after:

        <div id="restore-corpus-menu-wrap" style="position:relative;display:inline-block;">
          <button
            type="button"
            class="results-tool restore-corpus-button text-mode-only"
            id="restore-corpus-button"
            aria-label="Restore Corpus"
            aria-haspopup="true"
            aria-expanded="false"
            title="Restore Corpus"
            style="display:none;">⤦</button>
          <div id="restore-corpus-menu" class="hidden restore-corpus-menu" role="menu" aria-label="Restore hidden corpora">
            <div id="restore-corpus-menu-items"></div>
          </div>
        </div>

Also remove the now-orphaned <label> and <select> for restore-corpus-select
that appears right after (lines 117-119 of sidebar.html):

        <label class="visually-hidden" for="restore-corpus-select">Restore removed corpus</label>
        <select class="results-tool restore-corpus-select visually-hidden" id="restore-corpus-select" aria-label="Restore removed corpus">
          <option value="">Restore…</option>
        </select>

These are unused legacy elements that can be removed.

Then add basic CSS for the dropdown in apps-script/sidebar_css.html. Find a
section near other dropdown styles and add:

    .restore-corpus-menu {
      position: absolute;
      right: 0;
      top: 100%;
      z-index: 20;
      min-width: 140px;
      max-width: 220px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,.12);
      padding: 4px 0;
    }
    .restore-corpus-menu.hidden { display: none; }
    .restore-corpus-menu-item {
      display: block;
      width: 100%;
      padding: 6px 12px;
      border: none;
      background: none;
      text-align: left;
      font-size: 12px;
      cursor: pointer;
      color: var(--text);
    }
    .restore-corpus-menu-item:hover {
      background: var(--selected-soft);
    }

Finally, add a click handler for the menu items in sidebar_event_bindings.html.
Find a reasonable spot near the existing corpus-related handlers and add:

    $(document).on('click', '.restore-corpus-menu-item', function (event) {
      event.preventDefault();
      var corpusKey = $(this).attr('data-corpus-key');
      if (!corpusKey) return;
      toggleCorpusVisibility(corpusKey);
    });

And wire the button to open/close the menu. In sidebar_results_render.html,
find the existing #restore-corpus-button click handler (if any), or add one
in sidebar_event_bindings.html:

    $('#restore-corpus-button').off('click').on('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var menu = $('#restore-corpus-menu');
      if (menu.hasClass('hidden')) openRestoreCorpusMenu();
      else closeRestoreCorpusMenu();
    });

    $(document).on('click', function (event) {
      if (!$(event.target).closest('#restore-corpus-menu-wrap').length) {
        closeRestoreCorpusMenu();
      }
    });

openRestoreCorpusMenu() and closeRestoreCorpusMenu() already exist in
sidebar_results_render.html and will work once the DOM elements exist.

## Verification
1. Search for something that returns results from multiple corpora.
2. Click the ❌ on a corpus header to hide it.
3. The restore button (⤦) should appear and become active.
4. Click the restore button — a dropdown menu should appear listing hidden corpora.
5. Click a corpus name in the dropdown — it should reappear in the results.
6. Click outside the dropdown — it should close.
```

---

## P0-C: Experimental Tab Bootstrap Visibility Fix

**Priority:** P0
**Model:** Sonnet 4.6
**Risk:** Low — adding one function call

### Prompt

```
You are working on a Google Docs add-on sidebar. The experimental features tab
(🧪 button) is supposed to appear when the user has enabled experimental features
(Surprise Me or AI Mode) in Preferences. But the tab never appears after the
sidebar loads, even when features are enabled.

## Root cause

In sidebar_bootstrap.html, the async bootstrap handler calls
applyEffectivePreferencesToUI() after loading preferences. But
applyEffectivePreferencesToUI() (defined in sidebar_preferences_state.html:51-63)
does NOT call syncExperimentalAvailability().

syncExperimentalAvailability() IS called synchronously at sidebar_bootstrap.html
line 49 — but at that point effectivePreferences is still {} (empty), so
hasExperimentalFeaturesEnabled() returns false and the tab is hidden.

When the async bootstrap completes and applyEffectivePreferencesToUI() runs with
the actual preferences, it updates display mode, layout, etc. but never
re-evaluates experimental visibility.

## The fix

In apps-script/sidebar_preferences_state.html, find applyEffectivePreferencesToUI():

    function applyEffectivePreferencesToUI() {
      mergePreferenceDefaults(effectivePreferences);
      syncDisplayModeCards();
      syncLayoutCards();
      updateBilingualLayoutVisibility();
      updateTranslationDetailsVisibility();
      updateHebrewOptionsVisibility();
      updateVersionControlsVisibility();
      updateTransliterationVisibility();
      updateTranslationLanguageVisibility();
      syncSessionOverrideButtons();
      syncAiQuickActionState();
    }

Add two calls at the end:

    function applyEffectivePreferencesToUI() {
      mergePreferenceDefaults(effectivePreferences);
      syncDisplayModeCards();
      syncLayoutCards();
      updateBilingualLayoutVisibility();
      updateTranslationDetailsVisibility();
      updateHebrewOptionsVisibility();
      updateVersionControlsVisibility();
      updateTransliterationVisibility();
      updateTranslationLanguageVisibility();
      syncSessionOverrideButtons();
      syncAiQuickActionState();
      syncExperimentalAvailability();
      updateQuickActionsForMode();
    }

This ensures that every time effective preferences are applied — on bootstrap,
on reset, on save-as-defaults — the experimental tab and quick actions are
re-evaluated against the loaded preferences.

## Verification
1. Open Preferences. Enable "Surprise Me" or "AI Lesson Generator". Save. Close.
2. Close and reopen the sidebar.
3. The 🧪 button should appear in the mode tab row immediately after the
   sidebar finishes loading.
4. Click 🧪 — the experimental section should appear with the relevant accordion.
5. Go back to Preferences, disable all experimental features, save, close,
   reopen sidebar — the 🧪 button should NOT appear.
```

---

## P0-D: Duplicate Event Handler Cleanup — Mode Cards and Layout Options

**Priority:** P0
**Model:** Sonnet 4.6
**Risk:** Low — removing redundant handlers; canonical versions remain

### Prompt

```
You are working on a Google Docs add-on sidebar. There are duplicate jQuery
event handlers for `.mode-card` and `.layout-option` clicks. Both
sidebar_event_bindings.html and sidebar_display_controls.html bind these same
selectors, causing double execution on every click. This creates race conditions
and inconsistent state.

## Problem 1: Duplicate .mode-card handler

### Location A — sidebar_event_bindings.html lines 260-264:
    $('.mode-card').on('click keydown', function (event) {
      if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      $('.output-mode-selection').val($(this).attr('data-mode')).trigger('change');
    });

### Location B — sidebar_display_controls.html lines 130-140:
    $('.mode-card').on('click', function () {
      var mode = $(this).attr('data-mode');
      $('.output-mode-selection').val(mode).trigger('change');
      syncDisplayModeCards();
      updateBilingualLayoutVisibility();
      updateTranslationDetailsVisibility();
      updateHebrewOptionsVisibility();
      updateVersionControlsVisibility();
      updateTransliterationVisibility();
      closeCompactChoicePanels();
    });

Location B is the correct canonical version — it performs the full cascade of
UI sync calls after mode change and closes open panels. Location A only sets
the value and fires change, relying on a separate .output-mode-selection
change handler (line 239) to do the rest, which creates timing issues.

## Problem 2: Duplicate .layout-option handler

### Location A — sidebar_event_bindings.html lines 266-275:
    $('.layout-option').on('click keydown', function (event) {
      if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      $('.bilingual-layout-selection').val($(this).attr('data-layout'));
      syncLayoutCards();
      saveSidebarPreference({ bilingual_layout_default: $('.bilingual-layout-selection').val() });
      if (hasResolvedReference && data && data.ref) {
        updateSuggestion(data, selectedResultSummary ? selectedResultSummary.label : data.ref);
      }
    });

### Location B — sidebar_display_controls.html lines 142-147:
    $('.layout-option').on('click', function () {
      var layout = $(this).attr('data-layout');
      $('.bilingual-layout-selection').val(layout).trigger('change');
      syncLayoutCards();
      closeCompactChoicePanels();
    });

Both are incomplete independently. Location A saves preference and refreshes
preview but doesn't close panels. Location B closes panels but doesn't save
or refresh.

## The fix

### Step 1: Remove both handlers from sidebar_event_bindings.html

Delete lines 260-275 from apps-script/sidebar_event_bindings.html — the
entire `.mode-card` and `.layout-option` handler blocks.

### Step 2: Upgrade the handlers in sidebar_display_controls.html

Replace the existing `.mode-card` handler (lines 130-140) with:

    $('.mode-card').on('click keydown', function (event) {
      if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      var mode = $(this).attr('data-mode');
      $('.output-mode-selection').val(mode).trigger('change');
      syncDisplayModeCards();
      updateBilingualLayoutVisibility();
      updateTranslationDetailsVisibility();
      updateHebrewOptionsVisibility();
      updateVersionControlsVisibility();
      updateTransliterationVisibility();
      closeCompactChoicePanels();
    });

Replace the existing `.layout-option` handler (lines 142-147) with:

    $('.layout-option').on('click keydown', function (event) {
      if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      var layout = $(this).attr('data-layout');
      $('.bilingual-layout-selection').val(layout).trigger('change');
      syncLayoutCards();
      saveSidebarPreference({ bilingual_layout_default: $('.bilingual-layout-selection').val() });
      closeCompactChoicePanels();
      if (typeof hasResolvedReference !== 'undefined' && hasResolvedReference && data && data.ref) {
        updateSuggestion(data, selectedResultSummary ? selectedResultSummary.label : data.ref);
      }
    });

These merged versions:
- Support keyboard activation (Enter/Space) for accessibility
- Perform the full UI sync cascade
- Save preference changes
- Refresh the preview when a result is selected
- Close open panels

## Verification
1. Open the sidebar and select a text result.
2. Click a display mode card — mode should change, preview should update,
   and no errors in console.
3. Use keyboard (Tab to card, press Enter) — same result.
4. Switch layout option — layout should change, preference should persist
   on sidebar reopen, and preview should update.
5. Verify no duplicate console logs or double-firing.
```

---

## P0-E: Move Experimental Section Inside Scrollable Container

**Priority:** P0
**Model:** Sonnet 4.6
**Risk:** Low — moving a DOM block; no logic changes

### Prompt

```
You are working on a Google Docs add-on sidebar. The experimental features
section (AI Shiur + Surprise Me inline forms) is positioned OUTSIDE the
scrollable container, so its content overflows and clips at the bottom of the
300px-wide Google Docs sidebar iframe.

## The problem

In apps-script/sidebar.html, the scrollable area is wrapped in:

    <div class="sidebar-scroll"> <!-- opens around line 130 -->
      ... all main content sections ...
    </div> <!-- closes at line 270 -->

But the experimental section starts at line 272, AFTER the closing </div>:

        <section class="experimental-section" style="display:none;">
          <details class="sidebar-accordion experimental-accordion" open>
            ...
          </details>
        </section>

This means it renders below the scroll container in a non-scrollable area.
When the experimental section is shown and its accordion forms are opened, the
content extends past the visible viewport with no way for the user to scroll
to it.

## The fix

Move the experimental section INSIDE the .sidebar-scroll div, right after the
preview section and before the closing </div> of .sidebar-scroll.

In apps-script/sidebar.html, find lines 268-270:

        </section>

        
      </div>

        <section class="experimental-section" style="display:none;">

Change this to:

        </section>

        <section class="experimental-section" style="display:none;">

And then find the end of the experimental section (around line 326-327):

        </section>


      <select class="output-mode-selection visually-hidden" aria-hidden="true">

Change this to:

        </section>

        
      </div>

      <select class="output-mode-selection visually-hidden" aria-hidden="true">

In other words: the </div> that closes .sidebar-scroll should move from its
current position (between the preview section and the experimental section) to
AFTER the experimental section.

The blank line and indentation should match the existing pattern. The
experimental section should be indented at the same level as the other sections
inside .sidebar-scroll.

## Verification
1. Open Preferences. Enable an experimental feature. Save. Reopen sidebar.
2. Click the 🧪 tab button.
3. The experimental section should appear inside the scrollable area.
4. Open both accordion forms (AI Shiur + Surprise Me) — all content should
   be reachable by scrolling.
5. No content should clip or overflow past the sidebar footer.
6. Switch to Texts mode and back to experimental — all sections remain
   scrollable.
```

---

## P1-A: Master Experimental Features Toggle in Preferences

**Priority:** P1
**Model:** Opus 4.6
**Risk:** Medium — cross-file coordination between Preferences HTML, JS, sidebar mode controller, and Code.gs

### Prompt

```
You are working on a Google Docs add-on. The PRD (torah_library_addon_prd_v2.md
§9.5) requires a master "Enable Experimental Features" toggle in the Preferences
modal that gates the child toggles (Surprise Me and AI Lesson Generator). When
the master is off, child toggles should be disabled and the 🧪 tab should not
appear in the sidebar.

Currently the Preferences modal (preferences.html) only has the two child
toggles with no master gate. Users can enable individual features but there is
no single on/off switch for the entire experimental category.

## Changes needed

### 1. Add master toggle to preferences.html

In apps-script/preferences.html, find the Experimental Features section
(around line 497-499):

        <details class="section-card section-accordion" id="features" name="features">
          <summary class="section-card-summary"><span>Experimental Features</span></summary>
          <div class="section-card-body">
            <div class="toggle-row">
              <div class="toggle-copy">
                <div class="toggle-title">Enable Surprise Me</div>

Add a master toggle BEFORE the child toggles:

        <details class="section-card section-accordion" id="features" name="features">
          <summary class="section-card-summary"><span>Experimental Features</span></summary>
          <div class="section-card-body">
            <div class="toggle-row">
              <div class="toggle-copy">
                <div class="toggle-title">Enable Experimental Features</div>
                <div class="toggle-help">Turn on to access Surprise Me and AI Lesson Generator features.</div>
              </div>
              <label class="switch" for="experimental_features_enabled">
                <input id="experimental_features_enabled" type="checkbox" name="experimental_features_enabled">
                <span class="slider"></span>
              </label>
            </div>
            <div class="experimental-child-toggles">
            <div class="toggle-row">
              <div class="toggle-copy">
                <div class="toggle-title">Enable Surprise Me</div>

And close the wrapper div after the AI toggle row (after line 519):

            </div>
            </div> <!-- .experimental-child-toggles -->

### 2. Add gating JS in preferences_js.html

In apps-script/preferences_js.html, add logic so the master toggle
controls child toggle state. Find a suitable location and add:

    function syncExperimentalChildToggles() {
      var masterOn = $('#experimental_features_enabled').is(':checked');
      $('.experimental-child-toggles').toggleClass('disabled-section', !masterOn);
      $('.experimental-child-toggles input[type="checkbox"]').prop('disabled', !masterOn);
      if (!masterOn) {
        $('.experimental-child-toggles input[type="checkbox"]').prop('checked', false);
      }
    }

    $('#experimental_features_enabled').on('change', syncExperimentalChildToggles);

Call syncExperimentalChildToggles() after preferences are loaded into the form
(in the function that populates toggle states from saved preferences).

### 3. Add CSS for disabled state

In the Preferences CSS (either in preferences.html's <style> block or in a
separate CSS include), add:

    .disabled-section {
      opacity: 0.45;
      pointer-events: none;
    }

### 4. Register the new key in Code.gs

In apps-script/Code.gs, find the SETTINGS array (starts around line 13) and
add:

    { key: 'experimental_features_enabled', type: 'bool' },

### 5. Update sidebar mode controller

In apps-script/sidebar_mode_controller.html, update
hasExperimentalFeaturesEnabled() (line 54) to also check the master toggle:

    function hasExperimentalFeaturesEnabled() {
      var prefs = effectivePreferences || {};
      if (String(prefs.experimental_features_enabled) !== 'true' &&
          prefs.experimental_features_enabled !== true) {
        return false;
      }
      return String(prefs.experimental_ai_source_sheet_enabled) === 'true' ||
        prefs.experimental_ai_source_sheet_enabled === true ||
        String(prefs.surprise_me_enabled) === 'true' ||
        prefs.surprise_me_enabled === true;
    }

## Verification
1. Open Preferences. The master toggle should default to off.
2. With master off, child toggles should be grayed out and non-interactive.
3. Turn master on — child toggles become interactive.
4. Enable Surprise Me, save, reopen sidebar — 🧪 tab should appear.
5. Go back to Preferences, turn master OFF (children auto-uncheck), save,
   reopen sidebar — 🧪 tab should NOT appear.
6. Verify preference persistence across sidebar reloads.
```

---

## P1-B: Settings Parity — Add Missing Defaults to Preferences Modal

**Priority:** P1
**Model:** Opus 4.6
**Risk:** Medium — adding new HTML sections + wiring save/load for 4 new settings in preferences

### Prompt

```
You are working on a Google Docs add-on. The PRD (torah_library_addon_prd_v2.md
§8.5) establishes a Settings Parity Contract: every insertion-impacting setting
(except fonts and transliteration overrides) must appear BOTH in the Preferences
modal as saved defaults AND in the sidebar More Options as per-session overrides.

## The gap

The following 10 canonical settings are defined in the parity contract:

 1. output_mode_default (Display mode: Both/Hebrew/English)
 2. bilingual_layout_default (Bilingual layout: he-right/he-left/stacked)
 3. nekudot (Vowels on/off)
 4. teamim (Cantillation on/off)
 5. include_transliteration_default (Transliteration on/off)
 6. insert_sefaria_link_default (Link source title on/off)
 7. insert_citation_default (Include source citation on/off)
 8. show_line_markers_default (Line markers on/off)
 9. include_translation_source_info (Translation details on/off)
10. transliteration_scheme (Transliteration scheme — excluded from parity as override)

Current state of parity:

| Setting                           | In Preferences? | In Sidebar? |
|-----------------------------------|-----------------|-------------|
| output_mode_default               | NO              | YES         |
| bilingual_layout_default          | NO              | YES         |
| nekudot                           | YES (hidden)    | YES (pill)  |
| teamim                            | YES (hidden)    | YES (pill)  |
| include_transliteration_default   | YES             | YES         |
| insert_sefaria_link_default       | YES             | YES         |
| insert_citation_default           | YES             | YES         |
| show_line_markers_default         | NO              | YES         |
| include_translation_source_info   | NO              | YES         |
| transliteration_scheme            | YES             | YES (exempt)|

Four settings are MISSING from the Preferences modal:
- output_mode_default
- bilingual_layout_default
- show_line_markers_default
- include_translation_source_info

## The fix

### 1. Add Display Defaults section to preferences.html

In apps-script/preferences.html, find the "Insertion Behavior" section (the
section containing insert_sefaria_link_default and insert_citation_default).
Add a new section BEFORE it (or as a subsection) for display defaults:

    <details class="section-card section-accordion" id="display-defaults" name="display-defaults">
      <summary class="section-card-summary"><span>Display Defaults</span></summary>
      <div class="section-card-body">
        <div class="compact-field">
          <label for="output_mode_default">Default Display Mode</label>
          <select id="output_mode_default" name="output_mode_default">
            <option value="both">Original with Translation</option>
            <option value="he">Original Only</option>
            <option value="en">Translation Only</option>
          </select>
          <div class="mini-help">Choose which text layers appear when you insert a source.</div>
        </div>
        <div class="compact-field">
          <label for="bilingual_layout_default">Default Bilingual Layout</label>
          <select id="bilingual_layout_default" name="bilingual_layout_default">
            <option value="he-right">Hebrew Right / English Left</option>
            <option value="he-left">Hebrew Left / English Right</option>
            <option value="stacked">Stacked (Hebrew above English)</option>
          </select>
          <div class="mini-help">Layout for side-by-side bilingual display.</div>
        </div>
        <div class="toggle-row">
          <div class="toggle-copy">
            <div class="toggle-title">Show Line Markers</div>
            <div class="toggle-help">Adds verse numbers or segment markers when the text supports them.</div>
          </div>
          <label class="switch" for="show_line_markers_default">
            <input id="show_line_markers_default" type="checkbox" name="show_line_markers_default" checked>
            <span class="slider"></span>
          </label>
        </div>
        <div class="toggle-row">
          <div class="toggle-copy">
            <div class="toggle-title">Include Translation Details</div>
            <div class="toggle-help">Adds version and source details below the inserted translation text.</div>
          </div>
          <label class="switch" for="include_translation_source_info">
            <input id="include_translation_source_info" type="checkbox" name="include_translation_source_info">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </details>

### 2. Register keys in Code.gs SETTINGS array

In apps-script/Code.gs, find the SETTINGS array (starts around line 13) and
ensure ALL four keys are present. Some may already be there; add any that are
missing:

    { key: 'output_mode_default', type: 'string' },
    { key: 'bilingual_layout_default', type: 'string' },
    { key: 'show_line_markers_default', type: 'bool' },
    { key: 'include_translation_source_info', type: 'bool' },

### 3. Wire save/load in preferences_js.html

In apps-script/preferences_js.html, find the function that populates form
fields from saved preferences (often called populateForm, loadPreferences,
or similar). Add lines to set the new fields:

    $('#output_mode_default').val(prefs.output_mode_default || 'both');
    $('#bilingual_layout_default').val(prefs.bilingual_layout_default || 'he-right');
    $('#show_line_markers_default').prop('checked', prefs.show_line_markers_default !== 'false');
    $('#include_translation_source_info').prop('checked', prefs.include_translation_source_info === 'true');

Find the function that gathers form values for saving and add these four
fields to the collected object.

### 4. Verify sidebar reads these on bootstrap

In apps-script/sidebar_preferences_state.html, mergePreferenceDefaults()
already reads these keys (lines 124-134) and maps them to sidebar DOM elements.
Confirm that saving them from Preferences correctly flows through
getSidebarBootstrapData() → effectivePreferences → mergePreferenceDefaults().

## Verification
1. Open Preferences. The new "Display Defaults" section should appear.
2. Change display mode to "Original Only", save.
3. Close and reopen sidebar — sidebar should load in "Original Only" mode.
4. In sidebar, switch to "Both" in More Options → this is a session override.
5. Close and reopen sidebar — should revert to "Original Only" (the saved default).
6. In sidebar, switch to "Both", click "Save as Defaults" — reopen Preferences,
   display mode should now show "Both".
7. Repeat for bilingual layout, line markers, and translation details.
```

---

## P1-C: Missing insert_citation_default in SETTINGS + Session Library Button in Experimental Quick Actions

**Priority:** P1
**Model:** Sonnet 4.6
**Risk:** Low — adding a missing key and a missing button

### Prompt

```
You are working on a Google Docs add-on. There are two distinct issues to fix.

## Issue 1: insert_citation_default missing from SETTINGS array

The sidebar correctly reads and writes `insert_citation_default` as a
preference key. The Preferences modal has an `insert_citation_default` checkbox
(preferences.html line 51). But `insert_citation_default` is NOT listed in the
SETTINGS array in Code.gs (line 13-68).

The SETTINGS array controls which keys are persisted to PropertiesService. If a
key is missing from this array, `saveSidebarPreferences()` and
`savePreferences()` silently skip it, meaning citation preference changes are
never actually saved to the user's account.

### The fix

In apps-script/Code.gs, find the SETTINGS array (line 13). It's a flat array
of string keys. Add `"insert_citation_default"` in alphabetical order, after
`"include_transliteration_default"`:

Before:
    "include_transliteration_default",  "insert_sefaria_link_default",

After:
    "include_transliteration_default",
    "insert_citation_default",
    "insert_sefaria_link_default",

## Issue 2: No Session Library button in experimental quick actions row

The sidebar footer has TWO quick action rows:

1. `.standard-quick-actions` (line 378-382 of sidebar.html): Contains
   Session Library, Actions, Preferences buttons.
2. `.experimental-quick-actions` (line 383-387 of sidebar.html): Contains
   AI Shiur, Surprise Me, Prefs buttons — but NO Session Library.

When in experimental mode, the user loses access to the Session Library from
the footer. This is a missing feature per PRD §15.

### The fix

In apps-script/sidebar.html, find the experimental quick actions row
(around line 383):

      <div class="footer-button-row experimental-quick-actions" style="display:none;">
        <button type="button" class="footer-action-button open-ai-lesson-tool">AI Shiur</button>
        <button type="button" class="footer-action-button open-surprise-tool">Surprise Me</button>
        <button type="button" class="footer-action-button open-preferences-tool">Prefs</button>
      </div>

Add a Session Library button:

      <div class="footer-button-row experimental-quick-actions" style="display:none;">
        <button type="button" class="footer-action-button open-ai-lesson-tool">AI Shiur</button>
        <button type="button" class="footer-action-button open-surprise-tool">Surprise Me</button>
        <button type="button" class="footer-action-button open-preferences-tool">Prefs</button>
        <button type="button" class="footer-tool-button" id="open-session-library-experimental" title="Session Library" aria-label="Session Library">Library</button>
      </div>

Then wire the click handler. In apps-script/sidebar_event_bindings.html, find
where `#open-session-library` is bound and add the experimental variant
nearby:

    $('#open-session-library-experimental').on('click', function () {
      setSidebarMode('texts');
      $('#open-session-library').trigger('click');
    });

This switches to texts mode first (where the session library panel lives)
and then opens it.

## Verification
1. Open Preferences. Toggle "Include source citation" on, save.
2. Close and reopen sidebar — citation checkbox should be on.
3. Toggle it off in sidebar More Options — it should save per-session.
4. Close and reopen — should revert to saved default (on).
5. Switch to experimental mode (🧪 tab) — "Library" button should appear
   in footer quick actions row.
6. Click "Library" — should switch to texts mode and show session library.
```

---

## P1-D: Dead Code Removal

**Priority:** P1
**Model:** Sonnet 4.6
**Risk:** Low — removing unused code; no behavior change

### Prompt

```
You are working on a Google Docs add-on sidebar. There are two pieces of dead
code that should be removed to reduce confusion and maintenance burden.

## Dead code 1: initializePreferenceState() in ui_state.html

In apps-script/ui_state.html, the function initializePreferenceState()
(lines 8-16) is never called anywhere in the codebase. It was likely part of
an earlier architecture that was replaced by the current bootstrap pattern in
sidebar_bootstrap.html, which directly assigns to the global variables
accountPreferences, sessionPreferences, and effectivePreferences.

### Verify it's unused
Search the entire codebase for "initializePreferenceState" — it should only
appear in its own definition in ui_state.html. If it IS called somewhere,
do NOT remove it; instead report the finding.

### The fix
If confirmed unused, remove the function from apps-script/ui_state.html:

Delete lines 8-16:
    function initializePreferenceState(bootstrap) {
      return {
        accountPreferences: clonePlainObject(...),
        sessionPreferences: clonePlainObject(...),
        effectivePreferences: clonePlainObject(...),
        sidebarSessionId: ...,
        mode: ...
      };
    }

## Dead code 2: Premature IIFE in sidebar_composition_controls.html

In apps-script/sidebar_composition_controls.html, lines 119-123:

    (function(){
      if (typeof bindSidebarCompositionCard !== 'function') return;
      bindSidebarCompositionCard();
      refreshCompositionAndPreview();
    })();

This IIFE runs at script load time, BEFORE the async bootstrap has loaded
effective preferences. It calls bindSidebarCompositionCard() and
refreshCompositionAndPreview() prematurely. The bootstrap handler in
sidebar_bootstrap.html (line 28-29) already calls these functions AFTER
preferences are loaded — which is the correct timing.

The IIFE silently fails because:
- The hidden checkboxes it reads (.wants-vowels, .wants-cantillation) don't
  exist yet (addressed in P0-A)
- Even if they did, effectivePreferences is still {} at this point

### The fix
Remove lines 119-123 from apps-script/sidebar_composition_controls.html:

Delete the IIFE block:
    (function(){
      if (typeof bindSidebarCompositionCard !== 'function') return;
      bindSidebarCompositionCard();
      refreshCompositionAndPreview();
    })();

Leave only the closing </script> tag after line 117.

### Verify bootstrap still calls these
Confirm that sidebar_bootstrap.html calls both bindSidebarCompositionCard()
and refreshCompositionAndPreview() (or updateSidebarCompositionCard()) in
its async success handler. If it doesn't, add those calls to the bootstrap
handler rather than keeping the premature IIFE.

## Verification
1. Open the sidebar — composition card should still render correctly after
   preferences load.
2. Pill toggles should still work.
3. No console errors on load.
4. Verify no references to initializePreferenceState remain in the codebase.
```

---

## P2-A: Duplicate Document-Click Close Handlers

**Priority:** P2 (polish)
**Model:** Sonnet 4.6
**Risk:** Low — removing redundant handler

### Prompt

```
You are working on a Google Docs add-on sidebar. The file
sidebar_display_controls.html has two overlapping document-click handlers that
both close dropdown panels, but target slightly different class names. This is
confusing and can cause one handler to interfere with the other.

## The problem

In apps-script/sidebar_display_controls.html:

Handler 1 (lines 5-8, inside IIFE):
    $(document).off('click.displayChoiceClose').on('click.displayChoiceClose', function (event) {
      if ($(event.target).closest('.display-choice-dropdown').length) return;
      closeDisplayChoicePanels();
    });

Handler 2 (lines 16-20, outside IIFE):
    $(document).on('click', function(e) {
      if (!$(e.target).closest('.display-choice-detail').length) {
        $('.display-choice-detail').removeAttr('open');
      }
    });

Handler 1 uses `.display-choice-dropdown` as the selector.
Handler 2 uses `.display-choice-detail` as the selector.

These likely refer to the same elements or related elements. Having both
means every document click triggers two handlers, each closing panels slightly
differently.

## The fix

1. First, check sidebar.html to see which class is actually used on the
   <details> elements for display/layout choosers. The correct class is
   likely `.display-choice-dropdown` based on the IIFE's more careful
   namespaced binding.

2. Remove Handler 2 (lines 16-20) entirely — the IIFE handler already
   covers this case with proper namespacing and the closeDisplayChoicePanels()
   function.

3. If `.display-choice-detail` is actually used on some elements while
   `.display-choice-dropdown` is used on others, unify them to one class
   name and use a single handler.

## Verification
1. Open the sidebar and click a display mode chooser — dropdown should open.
2. Click outside it — should close.
3. Click a layout chooser — dropdown should open.
4. Click outside — should close.
5. Open one chooser, then click the other — first should close, second opens.
6. No console errors.
```

---

## P2-B: Recent Sort Does Not Actually Sort

**Priority:** P2 (polish)
**Model:** Sonnet 4.6
**Risk:** Low — improving UX; no breakage path

### Prompt

```
You are working on a Google Docs add-on sidebar. The search results sort
dropdown includes a "Recent" option. In sidebar_results_render.html around
line 332, the comment says:

    // 'recent' and 'relevance': preserve existing order

This means "Recent" sort simply preserves whatever order the API returned.
It does NOT actually sort by when the user last viewed or inserted these items.
This is misleading.

## Options (choose one based on feasibility)

### Option A: Implement recent sort using session library data
If sidebar_session_library.html maintains a list of recently
inserted/viewed references with timestamps, use that data to sort results:

    if (sortMode === 'recent') {
      var recentItems = getRecentSessionItems(); // from session library
      rest.sort(function(a, b) {
        var aTime = getRecentTimestamp(a, recentItems);
        var bTime = getRecentTimestamp(b, recentItems);
        return bTime - aTime; // most recent first
      });
    }

### Option B: Remove or relabel the option
If there is no timestamp data available, either:
- Remove "Recent" from the sort dropdown in sidebar.html
- Relabel it to "Default" or "API Order" to accurately describe what it does

## Investigation steps
1. Read sidebar_session_library.html to check if entries have timestamps.
2. Read sidebar.html to find the sort dropdown and see all options.
3. Decide which approach (A or B) is feasible.
4. Implement.

## Verification
1. Search for a term that returns multiple results.
2. If Option A: Insert a few results, re-search, select "Recent" sort —
   inserted items should appear first.
3. If Option B: The dropdown label should accurately describe behavior.
```

---

## P2-C: Footer Button Order — Match PRD Spec

**Priority:** P2 (polish)
**Model:** Sonnet 4.6
**Risk:** Low — reordering HTML elements

### Prompt

```
You are working on a Google Docs add-on sidebar. The PRD specifies that the
footer quick action buttons in the standard row should be ordered:

    Actions | Preferences | Session Library

But in apps-script/sidebar.html (lines 378-382), the actual order is:

    Session Library | Actions | Preferences

## The fix

In apps-script/sidebar.html, find lines 378-382:

      <section class="sidebar-footer-tools footer-tool-row standard-quick-actions" aria-label="Quick actions">
        <button type="button" class="footer-tool-button" id="open-session-library" title="Session Library" aria-label="Session Library">Session Library</button>
        <button type="button" class="footer-tool-button open-actions-panel" title="Actions" aria-label="Actions">Actions</button>
        <button type="button" class="footer-tool-button open-preferences-tool" title="Preferences" aria-label="Preferences">Preferences</button>
      </section>

Reorder to match the PRD:

      <section class="sidebar-footer-tools footer-tool-row standard-quick-actions" aria-label="Quick actions">
        <button type="button" class="footer-tool-button open-actions-panel" title="Actions" aria-label="Actions">Actions</button>
        <button type="button" class="footer-tool-button open-preferences-tool" title="Preferences" aria-label="Preferences">Preferences</button>
        <button type="button" class="footer-tool-button" id="open-session-library" title="Session Library" aria-label="Session Library">Session Library</button>
      </section>

Also verify that the CSS for `.footer-tool-row` uses flexbox so the visual
order matches DOM order. If there are any CSS `order` properties overriding
this, remove them.

## Verification
1. Open the sidebar — footer should show: Actions | Preferences | Session Library
2. All three buttons should still work correctly.
3. The three-column layout should remain visually balanced.
```

---

## Summary: Execution Order

Run prompts in this recommended order:

### Tier 0 — Critical DOM fixes (run first, any order within tier):
1. **P0-A**: Vowels, cantillation, transliteration pill wiring
2. **P0-B**: Restore corpus dropdown menu
3. **P0-C**: Experimental tab bootstrap visibility
4. **P0-D**: Duplicate event handler cleanup
5. **P0-E**: Experimental section inside scroll container

### Tier 1 — Architectural (run after all P0 are done):
6. **P1-A**: Master experimental features toggle
7. **P1-B**: Settings parity — display defaults in Preferences
8. **P1-C**: insert_citation_default in SETTINGS + Session Library button
9. **P1-D**: Dead code removal

### Tier 2 — Polish (run after all P1 are done):
10. **P2-A**: Duplicate document-click close handler
11. **P2-B**: Recent sort implementation or relabeling
12. **P2-C**: Footer button order

### Model recommendations:
- **P0-A through P0-E, P1-C, P1-D, P2-A through P2-C**: Sonnet 4.6 — fast, precise edits
- **P1-A, P1-B**: Opus 4.6 — cross-file coordination requiring deeper reasoning
