# Cleanup summary

## Structural changes
- Added a new `basic.html` sidebar flow modeled on the current Sefaria add-on UX.
- Kept the existing richer sidebar as `Advanced Search`.
- Updated menu labels in `Code.gs` to expose `Basic Search` and `Advanced Search` clearly.

## Code quality fixes
- Fixed the broken `SETTINGS` array commas in `Code.gs`.
- Expanded default preference coverage so saved sidebar/search state is consistent.
- Simplified install defaults to use `getDefaultPreferences()`.
- Removed the duplicate early `preferencesPopup()` definition.
- Applied title vs hyperlink typography preferences during insertion.

## UX / brand alignment
- Replaced loading markup with the Sefaria loading gif pattern.
- Added Sefaria-aligned typography and color tokens to the advanced sidebar.
- Added a simpler branded basic sidebar with familiar search / preview / insert flow.
- Added footer utility buttons to the basic sidebar for Preferences, Link Texts, and Divine Names.

## Notes
- `Basic Search` intentionally keeps the simpler translation/version flow from the current Sefaria UI.
- `Advanced Search` preserves the richer search/filter experience, but with updated naming and styling.
