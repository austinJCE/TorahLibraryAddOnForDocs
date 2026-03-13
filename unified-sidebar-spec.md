# Unified Sidebar Spec

## Purpose

This spec defines a future unified sidebar for the Google Docs add-on that combines the current **Insert Source** and **Search Texts** workflows into a single Sefaria-familiar source finding and insertion experience.

The goal is to simplify the user journey so that users can:

1. find a source by reference, title, nested library path, or phrase
2. choose how the source should appear
3. preview it
4. insert it

without switching between separate menu items or duplicated interfaces.

---

## Problem statement

The current product splits the workflow into two menu items:

- **Insert Source**
  - optimized for users who already know the exact text/reference
- **Search Texts**
  - optimized for phrase/content search

This creates several UX and product problems:

- duplicated controls and duplicated logic
- inconsistent capabilities between the two sidebars
- inconsistent visual design
- duplicated QA burden
- unnecessary menu-choice friction for users
- missing insertion controls in the search flow
- missing search/discovery affordances in the direct-insert flow

The actual user goal is not:
- “which sidebar should I use?”

The actual user goal is:
- “find the right source and insert it in the right format.”

---

## Product vision

The add-on should become:

> **one unified Sefaria-style source finder and inserter**, with library matches first, search hits second, and one shared set of display and formatting controls.

---

## Design goals

- Collapse the current two-sidebar experience into one sidebar
- Make the flow feel familiar to Sefaria users
- Put **library matches first**, before broader search hits
- Use one shared set of insertion/display controls
- Support both exact references and exploratory phrase search
- Reduce duplicated UI and duplicated engineering effort
- Preserve compatibility with current backend behavior where practical

---

## Core user flow

The unified sidebar should support this sequence:

### 1. Find
The user types a:

- reference
- title
- nested text path
- phrase

### 2. Select
The sidebar shows grouped results, with **library matches first** and **search results second**.

The user selects one result.

### 3. Configure
Once a result is selected, the user configures:

- Source / Translation / Source with Translation
- bilingual layout
- Hebrew display options
- line markers
- translation details
- translation version
- Hebrew version (if still needed)

### 4. Preview
A single preview panel shows the selected source in the chosen format.

### 5. Insert
The user inserts the source into the Doc.

---

## Sidebar information architecture

Recommended top-to-bottom structure:

1. **Find a source**
2. **Results**
3. **Display**
4. **Layout**
5. **Options**
6. **Versions**
7. **Preview**
8. **Insert**

---

## Unified sidebar layout

```text
[ Find a source __________________________ ]

Library matches
- result 1
- result 2
- result 3

Search results
- result 1
- result 2
- result 3

Display
[ Source ]
[ Translation ]
[ Source with Translation ]

Layout
[ Hebrew on top ] [ Hebrew left ] [ Hebrew right ]

Options
[ ] Line markers
[ ] Translation details
[ ] Vowels
[ ] Cantillation

Versions
[ Translation version selector ]
[ Hebrew version selector / advanced ]

Preview
[ preview panel ]

[ Insert ]
```

---

## Search / lookup model

## Single input field

Use one main field labeled:

- **Find a source**

Placeholder text:

- `Reference, title, or phrase`

Examples:

- `Genesis 1:1`
- `Berakhot 2a`
- `Siddur Ashkenaz weekday shacharit`
- `love your neighbor`

---

## Results model

Results should be grouped in this order:

### A. Library matches
These should appear first.

This group should contain:

- exact reference matches
- title matches
- known text nodes
- nested library-path matches
- structurally identifiable Sefaria library items

These are the most likely “I know what source I want” results.

### B. Search results
These should appear second.

This group should contain:

- phrase hits
- contextual matches
- ranked content hits
- PageRank / relevance-based results

This preserves discovery without forcing a separate workflow.

---

## Result ranking principle

**Library matches should appear before general relevance/PageRank search hits.**

Reason:

- if a user types the name/path of a text, they are usually trying to insert that text directly
- broader content hits are still valuable, but should not displace the most structurally relevant library result

---

## Result display design

### Library match item
A library match should show:

- title or nested path
- breadcrumb where available
- optional Hebrew secondary line
- optional short metadata if useful

Example:

```text
Siddur Ashkenaz
Weekday › Shacharit › Preparatory Prayers › Torah Study
```

### Search result item
A search result should show:

- readable ref title
- breadcrumb or fallback ref
- highlighted snippet

Example:

```text
Berakhot 2a
“…from what time may one recite the Shema…”
```

---

## Selection behavior

- Clicking a result selects it
- A selected result is visibly highlighted
- Selection does not immediately insert
- Only one result can be selected at a time
- Selecting a result populates the configuration and preview areas below
- Insert button remains disabled until a valid result is selected

---

## Display controls

These should be shared regardless of how the source was found.

### Display mode cards
Replace dropdowns with Sefaria-familiar cards:

- **Source**
- **Translation**
- **Source with Translation**

Internal mapping can remain:

- `Source` -> `"he"`
- `Translation` -> `"en"`
- `Source with Translation` -> `undefined` / bilingual

---

## Layout controls

Visible only when **Source with Translation** is selected.

Use compact icon-style options:

- Hebrew on top
- Hebrew left
- Hebrew right

Internal mapping can remain:

- `he-top`
- `he-left`
- `he-right`

---

## Hebrew display options

This is where the unified workflow should become more Sefaria-like.

For most users, the primary Hebrew controls are not “which Hebrew version title do I want?” but rather:

- Vowels / niqqud on or off
- Cantillation / trope on or off

These should become the primary, visible Hebrew formatting controls.

### Recommended visible controls
- **Vowels**
- **Cantillation**

### Advanced / optional controls
If Hebrew version selection is still needed, place it in an expandable advanced section rather than making it the first thing users see.

---

## Translation controls

When Translation is involved, show:

- translation version selector / combobox
- translation details toggle

### Translation details
This toggle controls whether version/source/license metadata appears below inserted translation text.

---

## Line markers

Line markers should be shown only when relevant.

Preferred behavior:

- show for segmented texts
- hide for non-segmented texts
- or, if needed, disable with helper text

Label:

- **Line markers**

Avoid overly technical wording.

---

## Preview behavior

There should be one shared preview panel.

The preview should update when:

- selected result changes
- display mode changes
- layout changes
- Hebrew options change
- translation version changes
- Hebrew version changes
- translation details toggle changes (if previewing metadata)
- line markers toggle changes

### Preview goals
- be visually calm
- look like a miniature Sefaria-style source panel
- reflect the final insertion format as closely as practical

---

## Nested / breadcrumb display in preview

When the selected source represents a nested path, the preview/header area should use breadcrumb-style display where possible.

Example:

```text
Siddur Ashkenaz
Weekday › Shacharit › Preparatory Prayers › Torah Study
```

Fallback:
- use readable ref/title display if hierarchy cannot be derived safely

---

## Suggested design language

The unified sidebar should feel:

- calm
- editorial
- text-first
- warm neutral
- familiar to Sefaria users

### Palette
Suggested palette:

- Background: `#f5f5f3`
- Panel background: `#ffffff`
- Control/card background: `#e9e7e3`
- Border/divider: `#d4d0ca`
- Primary text: `#222222`
- Secondary text: `#6b6b6b`
- Selected navy: `#1f3b68`
- Soft selected accent: `#c9d5e8`

### Typography
Use a simple system stack:

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
```

---

## State model

The unified sidebar should conceptually manage three major state areas.

### 1. Query state
- current input text
- current loading state
- current library matches
- current search results

### 2. Selection state
- selected result
- resolved canonical ref
- resolved preview data

### 3. Insert config state
- display mode
- layout
- line markers
- translation details
- vowels
- cantillation
- translation version
- Hebrew version if still exposed

---

## Migration guidance

This should be implemented in phases, not in one giant rewrite.

### Phase 1: product/spec alignment
- define the unified sidebar
- define grouped results model
- define shared insert controls

### Phase 2: unified discovery layer
- one search/reference input
- library matches group
- search results group
- result selection without insertion

### Phase 3: shared config layer
- move existing Insert Source controls under selected result
- connect one preview and one insert button

### Phase 4: retire duplicated sidebars
- remove or deprecate the split Insert Source / Search Texts model
- update menu structure accordingly

---

## Interim guidance

Until the unified sidebar exists:

- do not overinvest in polishing two separate sidebars beyond what is needed for functionality and reasonable UX
- prioritize fixes that will be reusable in the unified version
- prefer shared components/state patterns where possible

---

## Out of scope for this spec

- Exact pixel clone of Sefaria.org
- Full Sefaria feature parity
- Heavy connector/search infrastructure changes
- Marketplace deployment changes
- Full sheet import/export implementation

---

## Deliverable expectation

Future implementation work should use this spec as the product and interaction target for replacing the current split-sidebar model with one unified sidebar workflow.
