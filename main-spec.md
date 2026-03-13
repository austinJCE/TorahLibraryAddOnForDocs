# Insert Source Sidebar UI Spec

## Purpose

This spec defines a Sefaria-familiar visual and interaction redesign for the `Insert Source` sidebar in the Google Docs add-on.

The goal is to make the sidebar feel more compatible with Sefaria users’ expectations while preserving the current add-on logic and keeping implementation lightweight for Google Apps Script.

## Design goals

- Feel familiar to Sefaria users without attempting a pixel-perfect clone
- Use a calm, text-first, editorial UI
- Replace dense form controls with clearer card-style and icon-style controls
- Move important display/layout controls toward the top of the sidebar
- Keep the implementation lightweight and Apps Script-friendly
- Preserve current backend behavior and internal values where possible

## Functional goals

The redesigned UI should support:

- Reference input
- Insert action
- Display mode selection:
  - Source
  - Translation
  - Source with Translation
- Bilingual layout selection:
  - Hebrew on top
  - Hebrew left
  - Hebrew right
- Line markers toggle
- Translation details toggle
- Translation version selection
- Hebrew version selection
- Preview area

The redesign should preserve the current internal mappings:

- `Source` -> `"he"`
- `Translation` -> `"en"`
- `Source with Translation` -> `undefined` / bilingual
- `Hebrew right` -> `"he-right"`
- `Hebrew left` -> `"he-left"`
- `Hebrew on top` -> `"he-top"`

## Interaction rules

### Display mode

The output mode dropdown should be replaced with three stacked selectable cards:

- Source
- Translation
- Source with Translation

Behavior:

- Only one card can be selected at a time
- The whole card is clickable
- Keyboard focus should be visible
- Selected state should be visually obvious

### Layout

The layout dropdown should be replaced by an icon-based layout selector.

This control is only visible when `Source with Translation` is selected.

Available options:

- Hebrew on top
- Hebrew left
- Hebrew right

### Conditional controls

#### Layout
Visible only when bilingual mode is selected.

#### Translation details
Visible only when Translation is involved:
- Translation
- Source with Translation

#### Line markers
Visible or enabled only when relevant for the resolved reference.

Preferred behavior:
- Hide when unavailable
- If hiding is too disruptive, disable and show brief helper text

### Insert button state

The Insert button should remain disabled until a valid reference has been resolved.

While a lookup is in progress:

- avoid showing stale preview content as if it were current
- avoid contradictory “invalid reference” messaging during active loading

## Design language

### Overall feel

The UI should feel:

- calm
- readable
- lightly editorial
- familiar to Sefaria users
- not dashboard-like
- not glossy

### Palette

Suggested palette:

- Background: `#f5f5f3`
- Panel background: `#ffffff`
- Control/card background: `#e9e7e3`
- Border/divider: `#d4d0ca`
- Primary text: `#222222`
- Secondary text: `#6b6b6b`
- Selected navy: `#1f3b68`
- Selected navy hover: `#29497d`
- Soft selected accent: `#c9d5e8`

### Typography

Use a simple system stack:

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
```

Suggested scale:

- Section label: `13px` to `14px`, semibold
- Card label: `15px`, medium/semibold
- Body/control text: `14px`
- Helper text: `11px` to `12px`
- Metadata text: `11px` to `12px`

Hebrew text should remain RTL and readable with slightly comfortable line-height.

### Spacing

Use spacing more than borders.

Suggested rhythm:

- 12px to 16px between major groups
- 8px between related controls
- rounded corners on cards and panels
- subtle borders only where needed

### Things to avoid

- bright saturated colors
- gradients
- glossy buttons
- heavy shadows
- overly complex iconography
- crowded/dense control stacks

## Recommended sidebar structure

Order of content from top to bottom:

1. Reference input row
2. Display mode cards
3. Layout selector
4. Options / toggles
5. Version controls
6. Preview

## Wireframe

```text
[ Reference input                 ] [Insert]

Display
[ Source                     ○ ]
[ Translation                ✓ ]
[ Source with Translation    ○ ]

Layout
[ top icon ] [ left icon ] [ right icon ]

Options
Line markers         [toggle]
Translation details  [toggle]

Versions
[ Translation selector / combobox ]
[ Hebrew selector ]

Preview
[ preview panel ]
```

## HTML structure recommendation

This is not required to be copied exactly, but Codex should use it as a target structure.

```html
<main class="sidebar-shell">
  <aside class="loading-overlay" hidden>
    <img src="https://www.sefaria.org/static/img/ajax-loader.gif" alt="Loading">
  </aside>

  <section class="reference-row">
    <input
      type="text"
      class="reference-input"
      placeholder="Text Title or Reference"
      aria-label="Text title or reference"
    >
    <button class="insert-button" disabled>Insert</button>
  </section>

  <section class="display-section">
    <div class="section-label">Display</div>

    <div class="mode-card-group" role="radiogroup" aria-label="Display mode">
      <button class="mode-card selected" data-mode="he" role="radio" aria-checked="false">
        <span class="mode-card-label">Source</span>
        <span class="mode-card-indicator"></span>
      </button>

      <button class="mode-card" data-mode="en" role="radio" aria-checked="true">
        <span class="mode-card-label">Translation</span>
        <span class="mode-card-indicator"></span>
      </button>

      <button class="mode-card" data-mode="both" role="radio" aria-checked="false">
        <span class="mode-card-label">Source with Translation</span>
        <span class="mode-card-indicator"></span>
      </button>
    </div>
  </section>

  <section class="layout-section">
    <div class="section-label">Layout</div>

    <div class="layout-option-group" role="radiogroup" aria-label="Bilingual layout">
      <button class="layout-option" data-layout="he-top" aria-label="Hebrew on top">
        <span class="layout-icon layout-icon-top" aria-hidden="true"></span>
      </button>

      <button class="layout-option" data-layout="he-left" aria-label="Hebrew left">
        <span class="layout-icon layout-icon-left" aria-hidden="true"></span>
      </button>

      <button class="layout-option selected" data-layout="he-right" aria-label="Hebrew right">
        <span class="layout-icon layout-icon-right" aria-hidden="true"></span>
      </button>
    </div>
  </section>

  <section class="options-section">
    <div class="toggle-row line-markers-row">
      <label class="toggle-label" for="line-markers-toggle">Line markers</label>
      <input type="checkbox" id="line-markers-toggle" class="line-markers-toggle">
    </div>
    <div class="helper-text line-markers-help">Shown for segmented texts.</div>

    <div class="toggle-row translation-details-row">
      <label class="toggle-label" for="translation-details-toggle">Translation details</label>
      <input type="checkbox" id="translation-details-toggle" class="translation-details-toggle">
    </div>
    <div class="helper-text">Adds version/source details below inserted text.</div>
  </section>

  <section class="versions-section">
    <div class="section-label">Versions</div>

    <div class="version-control">
      <label class="version-label" for="translation-version-input">Translation</label>
      <input
        type="text"
        id="translation-version-input"
        class="translation-combobox"
        placeholder="Search translation version"
      >
    </div>

    <div class="version-control">
      <label class="version-label" for="hebrew-version-select">Source</label>
      <select id="hebrew-version-select" class="hebrew-version-select"></select>
    </div>
  </section>

  <section class="preview-section">
    <div class="section-label">Preview</div>

    <div class="preview-panel">
      <div class="preview-columns">
        <div class="preview-column preview-translation">
          <div class="preview-column-label">Translation</div>
          <div class="preview-ref preview-ref-translation"></div>
          <div class="preview-text preview-text-translation"></div>
        </div>

        <div class="preview-column preview-hebrew" dir="rtl">
          <div class="preview-column-label">Source</div>
          <div class="preview-ref preview-ref-hebrew"></div>
          <div class="preview-text preview-text-hebrew"></div>
        </div>
      </div>
    </div>
  </section>
</main>
```

## CSS recommendation

Codex does not need to copy this exactly, but should preserve the overall visual direction.

```css
body {
  background: #f5f5f3;
  color: #222222;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
}

.sidebar-shell {
  padding: 12px;
}

.reference-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.reference-input {
  flex: 1;
  min-width: 0;
  border: 1px solid #d4d0ca;
  border-radius: 10px;
  background: #ffffff;
  padding: 10px 12px;
  font-size: 14px;
}

.insert-button {
  border: 0;
  border-radius: 10px;
  background: #1f3b68;
  color: #ffffff;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
}

.insert-button:disabled {
  opacity: 0.45;
}

.section-label {
  margin: 14px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #444444;
}

.mode-card-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mode-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 0;
  border-radius: 12px;
  background: #e9e7e3;
  color: #222222;
  padding: 14px 16px;
  text-align: left;
}

.mode-card.selected {
  background: #1f3b68;
  color: #ffffff;
}

.mode-card-indicator {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 2px solid currentColor;
  display: inline-block;
}

.layout-option-group {
  display: flex;
  gap: 8px;
}

.layout-option {
  width: 48px;
  height: 48px;
  border: 1px solid #d4d0ca;
  border-radius: 10px;
  background: #ffffff;
}

.layout-option.selected {
  border-color: #1f3b68;
  box-shadow: inset 0 0 0 2px #1f3b68;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.toggle-label {
  font-size: 14px;
}

.helper-text {
  margin-top: 4px;
  font-size: 11px;
  color: #6b6b6b;
}

.version-control {
  margin-top: 10px;
}

.version-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #555555;
}

.translation-combobox,
.hebrew-version-select {
  width: 100%;
  border: 1px solid #d4d0ca;
  border-radius: 10px;
  background: #ffffff;
  padding: 10px 12px;
  font-size: 14px;
}

.preview-panel {
  margin-top: 8px;
  border: 1px solid #d4d0ca;
  border-radius: 12px;
  background: #ffffff;
  padding: 10px;
}

.preview-columns {
  display: flex;
  gap: 10px;
}

.preview-column {
  flex: 1;
  min-width: 0;
}

.preview-column-label {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #555555;
}

.preview-ref {
  margin-bottom: 6px;
  font-size: 12px;
  color: #6b6b6b;
}

.preview-text {
  font-size: 14px;
  line-height: 1.45;
}
```

## Layout icon guidance

Use simple CSS line icons rather than external assets.

### Hebrew on top
Represent stacked horizontal lines.

### Hebrew left
Represent two side-by-side vertical blocks or line groups, with Hebrew side visually emphasized on the left.

### Hebrew right
Represent two side-by-side vertical blocks or line groups, with Hebrew side visually emphasized on the right.

The icons should be minimal and consistent with the rest of the UI.

## Copy recommendations

Prefer these labels:

- Source
- Translation
- Source with Translation
- Layout
- Line markers
- Translation details
- Versions
- Preview

Avoid implementation-centric labels like:

- Output mode
- bilingual layout selection
- include translation source info

## State behavior requirements

### Source selected
- Hide layout
- Hide translation details
- Hide translation version selector if practical
- Show Hebrew/source selector

### Translation selected
- Hide layout
- Show translation details
- Show translation selector
- Hide Hebrew/source selector if practical

### Source with Translation selected
- Show layout
- Show translation details
- Show both version selectors

## Accessibility requirements

- Whole cards should be clickable
- Selected states should be conveyed visually and with ARIA where practical
- Buttons and controls should remain keyboard-usable
- Focus states should remain visible

## Implementation guidance for Codex

- Favor small state-management changes over full rewrites
- Preserve existing internal logic and values when possible
- It is acceptable to keep hidden backing fields/selects internally if the visible UI is upgraded
- Keep the design compact enough for a narrow Google Docs sidebar

## Out of scope for this pass

- Search sidebar redesign to match the same visual language
- Full Sefaria feature parity
- Custom font loading
- Heavy animations
- Pixel-perfect cloning of Sefaria

## Deliverable expectation

Codex should use this spec as guidance for refactoring `main.html` to a more Sefaria-familiar control layout while preserving existing feature behavior.
