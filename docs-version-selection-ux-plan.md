## Archived planning note

This document captures a pre-implementation audit/plan and is kept for historical context. Current behavior should be read from `main.html` + `Code.gs`; this plan is not a roadmap commitment.

# Version Selection Flow Audit + UI/UX Upgrade Plan (No Implementation)

## Current flow audit

The current sidebar renders:
- A checkbox + dropdown for insertion language (`Hebrew` or `English`) in the footer.
- Two version dropdowns in the preview table: one for English (`.en-version-selection`) and one for Hebrew (`.he-version-selection`).
- On each version change, the client calls `findReference(title, versions)` again to refresh text and selected metadata.

Current assumptions in the client logic:
- `dataIn.versionTitle` is the selected translation version title.
- `dataIn.heVersionTitle` is the selected Hebrew version title.
- `dataIn.versions` is iterable and each item has at least `language` + `versionTitle`.
- Earlier builds treated non-`en` languages as Hebrew; current code now normalizes Hebrew/Translation/Other groups.

## Observed metadata shape in `dataIn.versions`

From current code and live API sampling (`Genesis.1.1`), `versions[]` objects include fields like:
- Language fields: `language`, `actualLanguage`, `languageFamilyName`, `direction`.
- Display fields: `versionTitle`, `shortVersionTitle`, `versionTitleInHebrew`.
- Source/notes fields: `versionSource`, `versionNotes`, `purchaseInformationURL`.
- Priority-ish fields: `priority`, `isPrimary`, `isSource`.

Notably, there is **no explicit guaranteed year field** such as `year` or `publicationYear` in sampled results.

## Year reliability assessment

Reliable year extraction is **not guaranteed** from a dedicated metadata field.

What does appear:
- Year-like values often appear in `versionTitle` or `shortVersionTitle` (e.g. `..., 2006`, `..., 1995`).
- Year-like values may also appear in `versionNotes`.

Recommendation:
- Treat year as *derived, best effort* only.
- Prefer extracting from `shortVersionTitle`, then `versionTitle`, and optionally `versionNotes`.
- Only accept years in a conservative range (e.g. 1000..currentYear+1).
- If multiple candidates exist, choose the most recent plausible year.
- If no reliable year is found, keep stable fallback order.

## Proposed normalization rules (defensive)

Build a one-pass normalization helper over `dataIn.versions`:

1. **Language key derivation**
   - `rawLang = (version.actualLanguage || version.language || "").toLowerCase().trim()`.
   - Map aliases to canonical display groups:
     - Hebrew: `he`, `heb`, `hebrew`.
     - English translation: `en`, `eng`, `english`.
     - Everything else -> `other:<rawLang || "unknown">`.

2. **Display label derivation**
   - Primary label: `version.shortVersionTitle || version.versionTitle || "Untitled version"`.
   - Secondary info can include full title when short title is used.

3. **Deduping**
   - Deduplicate by tuple `(canonicalLanguage, versionTitle, versionSource)`.
   - Keep first item to preserve server ordering as fallback stability.

4. **Sort key derivation**
   - `year = extractYear(...)` (nullable).
   - Sort within language group by:
     1) year desc when both have year,
     2) entries with year before entries without year,
     3) `priority` desc if present,
     4) original index asc (stable fallback).

5. **Selected item matching**
   - Translation selected value matches `dataIn.versionTitle` primarily.
   - Hebrew selected value matches `dataIn.heVersionTitle`.
   - If missing, prefer `isPrimary`, otherwise first item in group.

## Smallest safe UI plan

1. **Terminology update**
   - Replace user-facing `English` wording with `Translation` in:
     - footer language controls,
     - attribution checkbox label,
     - version selector labels/help text.

2. **Output mode selector**
   - Replace current checkbox + dropdown with one compact selector:
     - `Hebrew + Translation`
     - `Hebrew only`
     - `Translation only`
   - Map mode to existing `insertReference` contract:
     - `Hebrew + Translation` => `singleLanguage = undefined`
     - `Hebrew only` => `singleLanguage = "he"`
     - `Translation only` => `singleLanguage = "en"`

3. **Searchable translation combobox**
   - Keep Hebrew as plain `<select>` (smallest change).
   - Upgrade translation version picker to combobox behavior using existing jQuery UI autocomplete (already loaded).
   - Backing model remains a native `<select>` for compatibility; visible input drives filtering and selection.

4. **Grouped translation options**
   - Group translation versions by normalized language.
   - Render group headers only for groups that have at least one option.
   - Suggested group order:
     - English
     - Other languages (alphabetical by label)
   - This preserves existing behavior while handling multilingual expansion safely.

5. **No API contract changes yet**
   - Continue using current `findReference(title, versions)` call shape (`{en, he}`) for minimal risk.
   - Treat `en` as “translation version slot” even if underlying item language is not strictly `en` (with fallback to server default if rejected).

## Performance considerations for sidebar rendering

1. **Normalize once per response**
   - On `updateSuggestion(dataIn, inputTitle)`, compute normalized version view-model once and reuse for rendering + sorting + selected lookup.
   - Avoid repeated regex/year parsing inside render loops.

2. **Client-only filtering for combobox**
   - Combobox search should filter in-memory normalized options; no extra API calls on typing.

3. **Avoid full re-render churn when possible**
   - On translation picker input changes, update only picker list UI.
   - Only call `findReference(...)` after committed selection change.

4. **Debounce keyup-driven reference fetches (optional micro-upgrade)**
   - Current `.keyup` path may trigger many `findReference` calls while typing.
   - A short debounce (~150-250ms) can reduce network churn and jitter without changing behavior.

5. **Stable sorting + caching**
   - Keep original index to guarantee deterministic ordering when metadata is incomplete.
   - Cache normalized list by `dataIn.ref + selected version titles` for the current suggestion lifecycle if needed.

## Proposed acceptance criteria for implementation phase

- All user-visible `English` labels become `Translation`.
- Output mode selector has exactly three modes and maps correctly to insertion behavior.
- Translation picker is searchable and keyboard-navigable.
- Non-empty language groups render with headers; empty groups do not render.
- Sorting is newest-to-oldest when a plausible year exists; otherwise stable fallback order.
- No additional API calls are introduced relative to existing selection interactions.
