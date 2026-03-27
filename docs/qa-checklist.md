# QA Checklist — Tight Pass (March 2026)

## Completed implementation fixes

- Normalized Hebrew display-filter handling in the fetch/render path.
- Fixed cantillation filter value mismatch (`tanakh` vs legacy `torah`).
- Applied niqqud and ta'amim stripping to parsed Hebrew fields instead of raw JSON blobs.
- Kept Hebrew reference labels (`heRef`) in sync with the same display filters used for body text.
- Ensured transliteration insertion uses the saved override map at insertion time.
- Fixed typography style parity for bilingual table headers so B/I/U preferences apply there too.
- Synced sidebar default state for “Include transliteration”.
- Escaped saved transliteration override values before rendering them in Preferences.

## Manual QA checklist

### Hebrew display filters
- [ ] Tanakh ref with vowels=Always, cantillation=Available
- [ ] Tanakh ref with vowels=Tanakh only, cantillation=Tanakh only
- [ ] Non-Tanakh ref with vowels=Tanakh only strips niqqud
- [ ] Non-Tanakh ref with cantillation=Tanakh only strips ta'amim
- [ ] heRef label matches body-text filtering behavior

### Transliteration
- [ ] Default scheme inserts expected transliteration
- [ ] Saved override on consonant propagates to inserted transliteration
- [ ] Saved override on niqqud propagates to inserted transliteration
- [ ] Clearing an override removes it from later insertions

### Typography parity
- [ ] Source body respects font/size/style
- [ ] Translation body respects font/size/style
- [ ] Transliteration body respects font/size/style
- [ ] Bilingual table headers respect font/size/style
- [ ] Single-language headers still insert correctly

### Sidebar state
- [ ] “Include transliteration by default” loads correctly in sidebar
- [ ] Preview still refreshes after quick vowel/cantillation toggles

## Suggested next QA session

Focus on live preview parity between preferences, preview, and final inserted Docs formatting.
