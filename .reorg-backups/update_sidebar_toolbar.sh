#!/usr/bin/env bash
set -euo pipefail

HTML_FILE="${1:-sidebar.html}"
CSS_FILE="${2:-sidebar_css.html}"
JS_FILE="${3:-sidebar_js.html}"

cp -p "$HTML_FILE" "$HTML_FILE.bak"
cp -p "$CSS_FILE" "$CSS_FILE.bak"
cp -p "$JS_FILE" "$JS_FILE.bak"

python3 - "$HTML_FILE" "$CSS_FILE" "$JS_FILE" <<'PY'
from pathlib import Path
import re
import sys

html_path = Path(sys.argv[1])
css_path = Path(sys.argv[2])
js_path = Path(sys.argv[3])

html = html_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")
js = js_path.read_text(encoding="utf-8")

# ----------------------------
# HTML PATCH
# ----------------------------

sort_block_old = """                <select class="results-tool search-sort-select text-mode-only" id="search-sort-mode" aria-label="Sort results">
                  <option value="relevance" selected>Rel. ▾</option>
                  <option value="alphabetical-asc">A–Z ▾</option>
                  <option value="alphabetical-desc">Z–A ▾</option>
                </select>"""

sort_block_new = """                <select class="results-tool search-sort-select text-mode-only" id="search-sort-mode" aria-label="Sort results">
                  <option value="relevance" selected>Rel. ▾</option>
                  <option value="alphabetical-asc">A–Z ▾</option>
                  <option value="alphabetical-desc">Z–A ▾</option>
                </select>

                <button type="button" class="results-tool restore-corpus-button text-mode-only" id="restore-corpus-button" aria-label="Restore Corpus" title="Restore Corpus">⤦</button>
                <label class="visually-hidden" for="restore-corpus-select">Restore removed corpus</label>
                <select class="results-tool restore-corpus-select visually-hidden" id="restore-corpus-select" aria-label="Restore removed corpus">
                  <option value="">Restore…</option>
                </select>"""

if 'id="restore-corpus-button"' not in html:
    html = html.replace(sort_block_old, sort_block_new)

html = re.sub(
    r'\n\s*<div class="restore-corpus-row text-mode-only" id="restore-corpus-row" style="display:none;">.*?</div>\s*\n',
    "\n",
    html,
    flags=re.S
)

# ----------------------------
# CSS PATCH
# ----------------------------

css_marker = "/* ===== Compact results toolbar + stable restore ===== */"
if css_marker not in css:
    css_block = r"""

  /* ===== Compact results toolbar + stable restore ===== */
  .restore-corpus-row,
  #restore-corpus-row,
  #restore-corpus-wrap {
    display: none !important;
  }

  .library-results-heading-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    margin: 0 0 6px;
  }

  .library-results-label {
    margin: 0;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .library-results-toolbar {
    display: inline-flex !important;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    min-width: 0;
    flex-wrap: nowrap;
  }

  .library-results-toolbar .translation-language-compact {
    flex: 0 1 auto;
    width: auto !important;
    min-width: 0;
  }

  .library-results-toolbar .translation-language-toggle,
  .library-results-toolbar .lang-tool-button,
  .library-results-toolbar .results-tool.lang-tool-button {
    width: auto;
    min-width: 90px;
    max-width: 120px;
    height: 28px;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 14px;
  }

  .library-results-toolbar .search-sort-select {
    flex: 0 0 auto;
    width: auto;
    min-width: 72px;
    max-width: 90px;
    height: 28px;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 14px;
  }

  .restore-corpus-button,
  .translation-language-toggle,
  .search-sort-select {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
  }

  .restore-corpus-button {
    position: relative;
    flex: 0 0 auto;
    width: 28px;
    min-width: 28px;
    height: 28px;
    min-height: 28px;
    padding: 0;
    border-radius: 999px;
    font-size: 15px;
    line-height: 1;
    transition:
      opacity 0.15s ease,
      transform 0.15s ease,
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .restore-corpus-button[disabled] {
    opacity: 0.35;
    cursor: default;
    pointer-events: none;
  }

  .restore-corpus-button.is-active {
    opacity: 1;
    cursor: pointer;
  }

  .restore-corpus-button.is-active:hover,
  .restore-corpus-button.is-active:focus-visible {
    background: #fff;
    border-color: var(--selected);
    color: var(--selected);
    transform: translateY(-1px);
    box-shadow: 0 0 0 2px rgba(24, 52, 93, 0.08);
  }

  .restore-corpus-button.is-active::after {
    content: "";
    position: absolute;
    top: 4px;
    right: 4px;
    width: 6px;
    height: 6px;
    background: var(--selected);
    border-radius: 50%;
  }

  .restore-corpus-select.visually-hidden {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    margin: -1px !important;
    padding: 0 !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }

  .translation-language-menu {
    left: auto !important;
    right: 0 !important;
    max-width: min(280px, calc(100vw - 32px));
  }

  @media (max-width: 420px) {
    .library-results-heading-row {
      grid-template-columns: 1fr;
      align-items: stretch;
    }

    .library-results-label {
      white-space: normal;
    }

    .library-results-toolbar {
      justify-content: flex-start;
      flex-wrap: wrap;
    }
  }
"""
    css = css.replace("</style>", css_block + "\n</style>")

# ----------------------------
# JS PATCH
# ----------------------------

# 1) add syncRestoreCorpusButton() before renderResultFilterStrip()
if "function syncRestoreCorpusButton()" not in js:
    anchor = "function renderResultFilterStrip() {"
    insert_block = """
function syncRestoreCorpusButton() {
  var $button = $('#restore-corpus-button');
  var removed = (resultPostProcessState && resultPostProcessState.removedCorpora) || [];

  if (!$button.length) return;

  var hasRemoved = removed.length > 0;
  $button.prop('disabled', !hasRemoved);
  $button.attr('aria-disabled', hasRemoved ? 'false' : 'true');
  $button.toggleClass('is-active', hasRemoved);

  if (hasRemoved) {
    var latestKey = removed[removed.length - 1];
    var latestEntry = (resultPostProcessState.availableCorpora || []).find(function (item) {
      return item.key === latestKey;
    });
    var tooltip = latestEntry ? 'Restore Corpus: ' + latestEntry.label : 'Restore Corpus';
    $button.attr('title', tooltip).attr('aria-label', tooltip);
  } else {
    $button.attr('title', 'Restore Corpus').attr('aria-label', 'Restore Corpus');
  }
}

"""
    js = js.replace(anchor, insert_block + anchor)

# 2) replace renderResultFilterStrip()
js = re.sub(
    r'function renderResultFilterStrip\(\) \{.*?\n\}',
    """function renderResultFilterStrip() {
  ensureResultFilterUI();
  var $strip = $('.result-filter-strip');
  var $select = $('#restore-corpus-select');
  var removed = resultPostProcessState.removedCorpora.slice();

  $strip.hide().empty();

  if (!$select.length) {
    syncRestoreCorpusButton();
    return;
  }

  if (!removed.length) {
    $select.html('<option value="">Restore…</option>').val('');
    syncRestoreCorpusButton();
    return;
  }

  var options = ['<option value="">Restore…</option>'];
  removed.forEach(function (key) {
    var entry = resultPostProcessState.availableCorpora.find(function (item) { return item.key === key; });
    options.push('<option value="' + escapeHTML(key) + '">' + escapeHTML(entry ? entry.label : key) + '</option>');
  });
  $select.html(options.join('')).val('');
  syncRestoreCorpusButton();
}""",
    js,
    count=1,
    flags=re.S
)

# 3) update initializeSidebar button init
js = js.replace(
    "$('.results-restore-button').hide();",
    "$('#restore-corpus-button').prop('disabled', true).attr('aria-disabled', 'true').removeClass('is-active');"
)

# 4) add button click handler after select change handler
if "$('#restore-corpus-button').on('click'" not in js:
    select_handler = """$('#restore-corpus-select').on('change', function() {
  var selected = $(this).val();
  if (!selected) return;
  toggleCorpusVisibility(selected);
  $(this).val('');
});"""
    button_handler = """$('#restore-corpus-select').on('change', function() {
  var selected = $(this).val();
  if (!selected) return;
  toggleCorpusVisibility(selected);
  $(this).val('');
});

$('#restore-corpus-button').on('click', function(event) {
  event.preventDefault();

  var removed = (resultPostProcessState && resultPostProcessState.removedCorpora) || [];
  var $select = $('#restore-corpus-select');

  if (!removed.length || !$select.length) return;

  $select.focus();

  try {
    $select[0].click();
  } catch (error) {
    var latestKey = removed[removed.length - 1];
    if (latestKey) toggleCorpusVisibility(latestKey);
  }
});"""
    js = js.replace(select_handler, button_handler)

# 5) ensure renderResultFilterStrip() keeps button state synced on clear/reset paths
# already called from clearSelectedResult and applyResultPostProcessing; nothing else needed

html_path.write_text(html, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")
js_path.write_text(js, encoding="utf-8")
PY

echo "Patched:"
echo "  $HTML_FILE"
echo "  $CSS_FILE"
echo "  $JS_FILE"
echo
echo "Backups:"
echo "  $HTML_FILE.bak"
echo "  $CSS_FILE.bak"
echo "  $JS_FILE.bak"
