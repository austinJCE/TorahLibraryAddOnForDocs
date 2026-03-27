# Canonical fitness patch — 2026-03-24

## Updated files
- sidebar_js.html
- sidebar_css.html

## Main fixes
- Removed stale duplicate result/filter event block from `sidebar_js.html`
- Restored compact language filter behavior:
  - translation checkboxes are no longer hidden by CSS
  - menu open/close now toggles the hidden state correctly
- Restored corpus restore dropdown wiring to the current `#restore-corpus-select`
- Added missing Session Library modal open/close/escape handlers
- Kept Session Library item selection in Advanced mode instead of drifting by prior mode state
- Made bilingual preview respect the selected layout (`he-right`, `he-left`, `he-top`)
- Updated version sorting to: year desc when present, then alphabetical

## Notes
- I did not replace the whole sidebar CSS with an older donor build; this patch stays close to the current repo and targets the largest regressions first.
- I verified that the patched `sidebar_js.html` parses successfully as JavaScript after stripping the surrounding `<script>` tags.
