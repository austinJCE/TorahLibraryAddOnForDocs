# Torah Library Add-On for Google Docs

A Google Docs add-on that inserts Torah sources directly from the Sefaria API into Google Docs, with support for Hebrew/English insertion, orthography preferences, and version-aware translation handling.

> This is not an official Sefaria project.

## Project overview

This repository contains the Google Apps Script code and add-on UI templates used to:
- search or reference a Sefaria text,
- preview available versions,
- insert the selected content into the active Google Doc,
- apply user preferences (orthography, language output, etc.), and
- optionally include English translation/source attribution in inserted output.

The codebase is intentionally lightweight and Apps Script-native (no heavy local emulation of Google Docs APIs).

## Main features

- **Insert Source sidebar** for direct source insertion by reference/title.
- **Search Texts sidebar** for broader source discovery.
- **Preferences dialog** for persistent user settings via `PropertiesService`.
- **Orthography controls** (nekudot, ta'amim, Sheimot replacement options).
- **Version-aware insertion** for Hebrew/English text versions.
- **Optional English translation attribution** checkbox:
  - Adds attribution block below English-only insertions.
  - Adds attribution block below bilingual table insertions.
  - Attribution format:
    - first line: `<versionTitle>`
    - optional metadata lines when available (`Source: <domain/url>`, `Digitization: ...`, `License: ...`)

## New optional translation/source attribution setting

In the **Insert Source** sidebar, the checkbox:

- `Include English translation attribution (version/source)`

controls whether attribution is appended to English output.

Behavior details:
1. Attribution is only relevant when English text is inserted (English-only or bilingual output).
2. The formatter first uses `data.versionSource` when present.
3. If missing, it falls back to searching `data.versions` for a matching English version title.
4. If no source is found, it still emits a version-title-only attribution block.
5. If no `versionTitle` is available, no attribution is inserted.

## Repository structure

- `Code.gs` - Main Apps Script server logic (menu setup, Sefaria API calls, insertion, preferences).
- `attribution.js` - Pure helper module for translation/source attribution logic (shared by GAS runtime and local tests).
- `main.html` - Insert Source sidebar UI.
- `search.html` - Search Texts sidebar UI.
- `preferences.html` - Preferences dialog UI.
- `support-and-features.html` - Support/feature request modal.
- `release-notes.html` - Release notes modal.
- `consts.gs` - Constants/supporting data.
- `tests/attribution.test.js` - Lightweight local unit tests for attribution formatting/fallback behavior.
- `appsscript.json` - Apps Script project manifest.

## Development workflow

### 1) Make a focused change

- Keep changes small and PR-friendly.
- Prefer pure helpers for logic that can be tested outside Google Docs APIs.
- Avoid adding local infra that tries to emulate `DocumentApp`.

### 2) Run local unit tests

Prerequisite: Node.js 18+ (for built-in `node:test`).

```bash
npm test
```

This runs the lightweight attribution logic tests only.

### 3) Manual validation in Apps Script (safe workflow)

Before opening a PR against the real add-on app repo, validate in a **separate test Apps Script project** and a **test Google Doc**:

1. Create a copy/fork of this repo branch locally.
2. Create a new standalone Apps Script project (or a disposable copy of the add-on project).
3. Copy updated script/html files into that test project.
4. Open a non-production Google Doc dedicated for testing.
5. Run the add-on in test mode and verify:
   - source insertion still works,
   - English-only insertion with checkbox ON includes attribution block below translation,
   - bilingual insertion with checkbox ON includes attribution block below the table,
   - checkbox OFF omits attribution,
   - missing metadata still produces version-title-only fallback,
   - existing preferences behavior is unchanged.
6. Only after successful test validation, prepare your PR to the real app repository.

## Contribution guidelines

- Open small, reviewable PRs.
- Include:
  - what changed,
  - why,
  - local test results,
  - manual validation notes.
- For changes touching insertion formatting, include sample before/after outputs in PR notes when possible.

## Local testing details

Current local tests intentionally cover only pure logic:
- attribution formatting,
- source fallback resolution,
- empty/edge input behavior.

They do **not** attempt to emulate Google Docs `DocumentApp`, cursor behavior, or table insertion APIs.

This keeps test setup fast and maintainable while still guarding logic regressions in the new feature.
