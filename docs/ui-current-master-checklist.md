# 🧱 MASTER CHECKLIST (Updated Ground Truth)

## 🔴 CRITICAL FUNCTIONAL

### Sidebar loads
- [ ] **Texts** mode loads
- [ ] **Voices** mode loads
- [ ] Sidebar body is visible
- [ ] No stuck overlay / loading mask
- [ ] Mode switch reflects the active page correctly
- [ ] No duplicate top-level mode buttons

---

## 🧭 MODE STRUCTURE

### Top-level navigation
- [ ] Top-level tabs are **Texts** and **Voices**
- [ ] No legacy **Basic** tab remains
- [ ] No legacy **Advanced** tab remains
- [ ] No duplicated **Voices** button remains
- [ ] Experimental mode/button appears only when appropriate

### Session settings placement
- [ ] Session Settings live inside **Texts → More Options**
- [ ] Session Settings do **not** appear as a separate top-level mode
- [ ] Session Settings row appears at the **top** of More Options
- [ ] Session Settings row is hidden in **Voices**
- [ ] Reset / Save Defaults buttons enable and disable correctly

---

## 🔎 RESULTS PANEL

### Translation filter
- [ ] Clicking language filters actually filters results
- [ ] Clicking **Any** restores results
- [ ] Filter does **not** wipe out panel
- [ ] “No library matches” shows when appropriate
- [ ] Menu opens in usable position
- [ ] Menu does not overflow left or right
- [ ] Custom-menu positioning keeps menus inside the visible sidebar area

### Results layout
- [ ] A/א filter + Sort appear under **Library matches**
- [ ] A/א and Sort are on the same row
- [ ] Restore Corpus control appears only when needed
- [ ] Restore Corpus control opens in a usable position
- [ ] No ghost section like “Search results No search results”
- [ ] Results summary collapse/expand works correctly

### Corpus behavior
- [ ] Corpus rows have background color
- [ ] Corpus headers have background color
- [ ] Hide corpus button works
- [ ] Hide corpus button is disabled or prevented when only one corpus remains
- [ ] Hiding a corpus does not break results
- [ ] Restoring corpus does not break results

---

## 📚 VERSIONS

### Translation versions
- [ ] Appears when **>1 translation exists**
- [ ] Appears in **Texts**
- [ ] Styled as an accordion
- [ ] Filter input works
- [ ] Text is left-aligned
- [ ] Does not duplicate source/original versions in counts

### Original versions
- [ ] Labeled **Original Versions**
- [ ] Shows count inline
- [ ] Appears only when **>1 exists**
- [ ] Styled as an accordion

---

## 🧭 DISPLAY & LAYOUT

### Structure
- [ ] Display is a **single selector button**
- [ ] Layout is a **single selector button**
- [ ] No giant header blocks
- [ ] Both appear side-by-side
- [ ] Selector menus stay within the sidebar viewport

### Behavior
- [ ] Changing display updates preview immediately
- [ ] Changing layout updates preview immediately
- [ ] Changing layout affects insertion behavior correctly
- [ ] Preview reflects:
  - [ ] `he-right`
  - [ ] `he-left`
  - [ ] `he-top`

---

## 🧪 PREVIEW

### Text preview
- [ ] Bilingual preview updates correctly
- [ ] No stale layout rendering
- [ ] No mismatch between preview and insert
- [ ] Preview content clears correctly when selection is removed

### Interactive Hebrew preview
- [ ] Present in **Texts → More Options**
- [ ] Uses the interactive preview UI, not legacy dropdown toggles
- [ ] Only **one** Hebrew variant is visible at a time
- [ ] Cantillation toggle works
- [ ] Vowel toggle works
- [ ] Transliteration dropdown works
- [ ] “None” disables transliteration
- [ ] Status line updates correctly
- [ ] Hebrew preview text stays inside its box
- [ ] Hebrew preview does not overflow right
- [ ] Live state updates visually when toggles change

---

## ⚙️ MORE OPTIONS

### Visibility
- [ ] More Options appears only when a text result is selected
- [ ] More Options appears in **Texts** when applicable
- [ ] More Options does not appear in **Voices**

### Content
- [ ] Session row is first
- [ ] Translation details toggle remains
- [ ] Line markers toggle remains
- [ ] Transliteration controls remain
- [ ] Insert Sefaria link controls remain where intended

### Removed legacy control
- [ ] **No “Include source citation” toggle exists anywhere in sidebar**
- [ ] No hidden legacy citation row remains in sidebar HTML
- [ ] No sidebar JS references `insert_citation_default`
- [ ] No sidebar CSS exists only for the removed citation control

---

## ➕ INSERT BEHAVIOR

### Transliteration
- [ ] Inserts when enabled in Preferences
- [ ] Honors dropdown selection
- [ ] “None” disables transliteration insertion

### Translation details
- [ ] Translation details inserts below text when enabled
- [ ] Translation details does not replace source text
- [ ] Translation details formatting matches intended behavior

### Citation removal
- [ ] No legacy source-citation insertion path remains
- [ ] No citation-only insertion mode remains
- [ ] No UI copy still promises source citation insertion

---

## 🎤 VOICES MODE

- [ ] Displays sheet title, not `sheet:12345`
- [ ] Works with search + selection
- [ ] Search row is available
- [ ] Results render correctly for sheets
- [ ] Voice selection updates actions correctly
- [ ] Text-only panels stay hidden in Voices

---

## 📚 SESSION LIBRARY / HISTORY

### Behavior
- [ ] Session Library updates in **Texts**
- [ ] Session Library updates in **Voices** when applicable
- [ ] Session Library updates in current non-legacy mode structure
- [ ] Pinning adds item to Session Library
- [ ] Unpinning removes item from Session Library
- [ ] Recent items are recorded correctly
- [ ] Pinned items sort above recent items

### UI
- [ ] History button is to the **left of the search bar**
- [ ] History button opens modal in **Texts**
- [ ] History button opens modal in **Voices** if intended
- [ ] History button shows active styling when pinned/recent items exist
- [ ] Pin icon stays visually active after pinning
- [ ] Session Library modal groups items in a usable way
- [ ] Corpus grouping in Session Library behaves correctly

---

## 🧱 FOOTER

### Primary actions row
- [ ] Buttons vertically aligned
- [ ] Buttons equal height
- [ ] No overflow
- [ ] Add Source styling is correct when enabled and disabled
- [ ] Open in Sefaria active/inactive styling is correct

### Quick actions row
- [ ] All buttons share consistent format
- [ ] Icons vertically centered
- [ ] Background colors consistent
- [ ] Preferences button is in the intended location
- [ ] No deprecated AI footer button remains if moved elsewhere

---

## 🎛️ PREFERENCES MODAL

### Stability
- [ ] Modal fully loads
- [ ] No stuck overlay
- [ ] No JS errors
- [ ] Save bar is stable

### Interactive Hebrew preview / transliteration
- [ ] Transliteration preview works
- [ ] Preview updates when scheme changes
- [ ] Preview updates when font/style changes
- [ ] Override grid works
- [ ] Mapping save/remove works

### Legacy citation removal
- [ ] **No “Include source citation” / `insert_citation_default` control remains in Preferences**
- [ ] No legacy help text about citation insertion remains
- [ ] No preferences JS reads/writes `insert_citation_default`
- [ ] No preferences CSS exists only for removed citation control

### Accordions
- [ ] All start closed, if that remains the intended behavior
- [ ] Deep-link / hint opening works when requested by sidebar flows

---

## 🎨 CSS CONSISTENCY

- [ ] No duplicate late-file override blocks that fight each other
- [ ] No duplicate `<style>` close-tag issues
- [ ] No conflicting layout rules for search row / menus / footer
- [ ] No hidden containers that block the UI
- [ ] Toolbar elements stay on one row where intended
- [ ] Custom menus use one consistent positioning system
- [ ] Preview text overflow rules are consistent

---

## 🧠 ARCHITECTURE / REFACTOR SAFETY

### Must remain true
- [ ] Sidebar HTML / CSS / JS stay in sync
- [ ] Preferences HTML / CSS / JS stay in sync
- [ ] No duplicate function definitions
- [ ] No duplicate global constants
- [ ] No mixed old/new systems for the same control
- [ ] No legacy Basic/Advanced assumptions remain in live code paths

### Refactor-pack rollout
- [ ] `ui_head` introduced
- [ ] shared CSS includes introduced
- [ ] shared JS includes introduced
- [ ] sidebar page module isolated
- [ ] preferences page module isolated
- [ ] old behavior preserved during extraction
- [ ] extraction proceeds one page at a time
- [ ] page-specific behavior stays page-specific unless truly shared

### Stop conditions
- [ ] Stop if a selector rename becomes necessary
- [ ] Stop if layout shifts
- [ ] Stop if page behavior becomes harder to express
- [ ] Stop if a shared abstraction requires hidden behavior changes

---

## 🚨 HIGH-RISK AREAS

Do not casually modify these without re-testing:

- Translation filter logic
- Version visibility logic
- Texts / Voices mode-dependent visibility
- Session Library persistence and rendering
- Search-row layout and custom menu positioning
- Interactive preview bindings
- Late-file CSS overrides
- Legacy citation-preference removal across both sidebar and preferences
- Shared-include extraction boundaries during refactor

---

## Current project-status notes to carry forward

- Top-level mode structure is now intended to be **Texts / Voices**, not **Basic / Advanced**.
- Session settings are intended to live inside **More Options**, not as their own top-level distinction.
- The codebase still has some **legacy citation references** in sidebar/preferences JS and Preferences UI, so removing them should be treated as an explicit cleanup milestone.
- The refactor pack is aiming for **shared infrastructure without UX change**, so the checklist should now track both **behavioral correctness** and **safe extraction progress**.
