# Bundle E — preferences finalization

Updated files:
- preferences.html
- Code.gs

What changed:
- Kept the per-section accordion structure and removed the sticky/floating navigation behavior that could block access.
- Preserved **Expand all** / **Collapse all** at the top without using a floating nav.
- Added QoL behavior so interacting with a divine-name mapper dropdown or text field automatically enables that row's toggle.
- Added CSS tuning for transliteration override button alignment, including the alef row.
- Added `getDefaultPreferences()` and changed `getPreferences()` to merge user properties onto defaults, so missing values inherit predictably.
- Added `refreshSidebarAfterPreferences()` so the preferences dialog can refresh the open sidebar.
- Added backend support for Source Title and Sefaria Hyperlink formatting defaults.
- Updated title typography handling so linked titles can use hyperlink formatting and unlinked titles can use source-title formatting.

Notes:
- This pass intentionally avoids reintroducing a floating table-of-contents block.
- The custom reset modal from the preferences file is preserved.
