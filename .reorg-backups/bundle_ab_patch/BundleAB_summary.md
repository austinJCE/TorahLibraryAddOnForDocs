# Bundle A + B patch summary

Updated files:
- main.html
- main_js.html
- main_css.html
- Code.gs

What this pass addresses:

## Bundle A — functional blockers
- Added working click handling for **Did you mean** suggestions so they populate the search box and rerun the search.
- Added a working **Restore all** handler for removed corpora.
- Strengthened transliteration preference inheritance by making `getPreferences()` fall back to defaults when user properties are unset.
- Hardened transliteration opt-in handling in `Code.gs` so string/boolean values both work.
- Reworked the **source edition selector** to use the same filter + list + selected-display pattern as translation versions.
- Changed translation version availability so options are not all disabled by default.
- Made the version labels more compact and word-wrap friendly.

## Bundle B — sidebar layout stabilization
- Moved **Sort** directly below the search box.
- Moved **Display** and **Bilingual layout** out of More Options and into the main flow.
- Removed the old **Corpus** filter block from More Options.
- Put **Vowels** and **Cantillation** on one row.
- Moved **More Options** below the primary action buttons.
- Kept **Insert** and **Open on Sefaria** side-by-side and restored tooltip text on Open on Sefaria.
- Added layout overrides to push the footer to the bottom and flatten its top edge.
- Normalized footer icon sizing so the gear and Hebrew glyphs fill the space more evenly.
- Forced a single scroll region in the sidebar and hid horizontal overflow.
- Hid the old query badge row.

## Also included
- Session Library support from your pass files was kept in place and made functional:
  - Pinned
  - Inserted
  - Inserted updates after successful insertion
- Old Recent-only behavior is suppressed in the JS.

Notes:
- This pass does **not** attempt the full Pass 3 translation-language icon redesign. It focuses on the agreed Bundle A + B items first.
