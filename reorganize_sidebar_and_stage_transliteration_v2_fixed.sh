#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${1:-.}"
APPS_DIR="$REPO_ROOT/apps-script"
MAIN_HTML="$APPS_DIR/main.html"
PREFS_HTML="$APPS_DIR/preferences.html"
CODE_GS="$APPS_DIR/Code.gs"
BACKUP_DIR="$REPO_ROOT/.reorg-backups"
STAMP="$(date +%Y%m%d%H%M%S)"

for f in "$MAIN_HTML" "$PREFS_HTML" "$CODE_GS"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: Missing required file: $f" >&2
    exit 1
  fi
done

mkdir -p "$BACKUP_DIR"
cp "$MAIN_HTML" "$BACKUP_DIR/main.html.$STAMP.bak"
cp "$PREFS_HTML" "$BACKUP_DIR/preferences.html.$STAMP.bak"
cp "$CODE_GS" "$BACKUP_DIR/Code.gs.$STAMP.bak"

python3 - "$APPS_DIR" <<'PY'
from pathlib import Path
import re
import sys

apps = Path(sys.argv[1])
main_html = apps / "main.html"
prefs_html = apps / "preferences.html"
code_gs = apps / "Code.gs"
main_css = apps / "main-css.html"
main_js = apps / "main-js.html"
trans_gs = apps / "transliteration.gs"
gem_gs = apps / "gematriya.gs"
pop_gs = apps / "popcorn-feature.gs"

main_text = main_html.read_text(encoding="utf-8")
code_text = code_gs.read_text(encoding="utf-8")

# split main.html if needed
if "include('main-css')" not in main_text and "include('main-js')" not in main_text:
    style_match = re.search(r"<style>(.*?)</style>", main_text, re.S)
    script_match = re.search(r"<!--MAIN UX SCRIPT-->\s*<script>(.*?)</script>", main_text, re.S)
    if not style_match or not script_match:
        raise SystemExit("Could not split main.html cleanly.")
    main_css.write_text("<style>\n" + style_match.group(1).strip("\n") + "\n</style>\n", encoding="utf-8")
    main_js.write_text("<script>\n" + script_match.group(1).strip("\n") + "\n</script>\n", encoding="utf-8")
    main_text = re.sub(r"<style>.*?</style>", "<?!= include('main-css'); ?>", main_text, count=1, flags=re.S)
    main_text = re.sub(r"<!--MAIN UX SCRIPT-->\s*<script>.*?</script>", "<?!= include('main-js'); ?>", main_text, count=1, flags=re.S)

main_js_text = main_js.read_text(encoding="utf-8") if main_js.exists() else ""

# sidebar transliteration toggle
trans_row = (
    '          <div class="toggle-row transliteration-row">\n'
    '            <label for="include-transliteration">Include transliteration</label>\n'
    '            <input id="include-transliteration" type="checkbox" class="include-transliteration">\n'
    '          </div>\n'
    '          <p class="helper-text transliteration-help">Adds a generated transliterated line beneath Hebrew output.</p>'
)
if "include-transliteration" not in main_text:
    anchor = '<div class="toggle-row pesukim-wrapper">'
    if anchor in main_text:
        main_text = main_text.replace(anchor, trans_row + "\n          " + anchor, 1)

if main_js_text and ".include-transliteration" not in main_js_text:
    replacements = [
        (
            "      $('.wants-cantillation').prop('checked', preferences.teamim !== \"false\");",
            "      $('.wants-cantillation').prop('checked', preferences.teamim !== \"false\");\n      $('.include-transliteration').prop('checked', preferences.include_transliteration_default === \"true\");"
        ),
        (
            "      const updateVersionControlsVisibility = () => {\n        let outputMode = $('.output-mode-selection').val();\n        $('.translation-version-control').toggle(outputMode !== 'he');\n        $('.advanced-version-details').toggle(outputMode !== 'en');\n      };",
            "      const updateVersionControlsVisibility = () => {\n        let outputMode = $('.output-mode-selection').val();\n        $('.translation-version-control').toggle(outputMode !== 'he');\n        $('.advanced-version-details').toggle(outputMode !== 'en');\n      };\n\n      const updateTransliterationVisibility = () => {\n        let outputMode = $('.output-mode-selection').val();\n        let show = outputMode !== 'en';\n        $('.transliteration-row, .transliteration-help').toggle(show);\n      };"
        ),
        (
            "        updateVersionControlsVisibility();\n        syncDisplayModeCards();",
            "        updateVersionControlsVisibility();\n        updateTransliterationVisibility();\n        syncDisplayModeCards();"
        ),
        (
            "      updateVersionControlsVisibility();\n      syncDisplayModeCards();",
            "      updateVersionControlsVisibility();\n      updateTransliterationVisibility();\n      syncDisplayModeCards();"
        ),
        (
            "        let includeTranslationSourceInfo = $('.include-translation-source-info').is(':checked');\n        let insertSefariaLink = $('.insert-sefaria-link').is(':checked');\n        let input = $('.input').val();",
            "        let includeTranslationSourceInfo = $('.include-translation-source-info').is(':checked');\n        let insertSefariaLink = $('.insert-sefaria-link').is(':checked');\n        let includeTransliteration = $('.include-transliteration').is(':checked');\n        let input = $('.input').val();"
        ),
        (
            ").insertReference(data, language, showPesukim, input, includeTranslationSourceInfo, bilingualLayout, insertSefariaLink);",
            ").insertReference(data, language, showPesukim, input, includeTranslationSourceInfo, bilingualLayout, insertSefariaLink, includeTransliteration);"
        )
    ]
    for old, new in replacements:
        if old in main_js_text:
            main_js_text = main_js_text.replace(old, new, 1)
    main_js.write_text(main_js_text, encoding="utf-8")

main_html.write_text(main_text, encoding="utf-8")

prefs_html.write_text("""<!DOCTYPE html>
<html>
  <head>
    <base target=\"_top\">
    <link rel=\"stylesheet\" href=\"https://ssl.gstatic.com/docs/script/css/add-ons.css\">
    <link rel=\"stylesheet\" href=\"//ajax.googleapis.com/ajax/libs/jqueryui/1.9.1/themes/smoothness/jquery-ui.css\" />
    <style>
      html, body { height: 100%; }
      body { margin: 0; overflow: hidden; }
      .preferences-dialog { display: flex; flex-direction: column; height: 100vh; }
      .preferences-shell { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 16px; }
      .save-bar { background: #fff; border-top: 1px solid #ddd; padding: 10px 16px; display: flex; align-items: center; gap: 12px; }
      .hide { position: absolute; top: 0; left: 0; width: 600px; height: 400px; background: rgba(255,255,255,0.5); z-index: 2; }
      .hide > img { position: absolute; top: 48%; left: 48%; }
      #results { color: green; }
      preference { display: block; margin: 8px 0; }
      .section-note { margin: 4px 0 10px; color: #666; font-size: 12px; line-height: 1.4; }
      .typography-block { border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px; margin: 10px 0 14px; background: #fafafa; }
      .typography-subheader { font-weight: 700; font-size: 13px; margin: 0 0 8px; }
      .typography-row { display: grid; grid-template-columns: 2.2fr 1fr 1fr; gap: 10px; align-items: end; }
      .typography-field label, .preference-field label { display: block; font-size: 12px; color: #555; margin-bottom: 4px; }
      .typography-field select, .typography-field input, .preference-field select, .preference-field input[type=\"text\"], .preference-field input[type=\"number\"] { width: 100%; box-sizing: border-box; }
      .toggle-line { display: flex; align-items: center; gap: 8px; }
      .font-pref { margin-bottom: 1rem; }
      .font-pref label { display: block; font-weight: 600; margin-bottom: 0.35rem; }
      .font-pref select { width: 100%; max-width: 28rem; padding: 0.35rem 0.5rem; font-size: 1rem; }
      .font-note { margin-top: 0.35rem; font-size: 0.9rem; color: #555; }
      .font-preview { margin-top: 0.5rem; padding: 0.5rem 0.65rem; border: 1px solid #ddd; border-radius: 0.4rem; background: #fafafa; line-height: 1.5; }
      .font-preview .label { display: block; font-size: 0.8rem; color: #666; margin-bottom: 0.2rem; font-family: system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif; }
      .font-preview.hebrew { direction: rtl; font-size: 1.35rem; }
      .font-preview.translation { direction: ltr; font-size: 1.1rem; }
    </style>
    <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js\"></script>
    <script src=\"//ajax.googleapis.com/ajax/libs/jqueryui/1.9.1/jquery-ui.min.js\"></script>
  </head>
  <body>
    <aside class=\"hide\"><img src=\"https://www.sefaria.org/static/img/ajax-loader.gif\"></aside>
    <div class=\"preferences-dialog\">
      <div class=\"preferences-shell\">
        <section name=\"orthography\">
          <h1>Orthography</h1>
          <preference><span class=\"toggle-line\"><input type=\"checkbox\" name=\"nekudot\"> Nekudot <select name=\"nekudot_filter\"><option value=\"always\">when possible</option><option value=\"tanakh\">only in Tanakh/Bible</option></select></span></preference>
          <preference><span class=\"toggle-line\"><input type=\"checkbox\" name=\"teamim\"> Ta'amei HaMiqra</span></preference>
        </section>
        <section name=\"typography\">
          <h1>Typography</h1>
          <p class=\"section-note\">These defaults are applied when text is inserted. Some specialty fonts may need to be enabled manually in Google Docs via Font &gt; More fonts.</p>
          <div class=\"typography-block\">
            <div class=\"typography-subheader\">Source</div>
            <preference class=\"font-pref\">
              <label for=\"hebrew_font\">Hebrew font</label>
              <select name=\"hebrew_font\" id=\"hebrew_font\">
                <optgroup label=\"Full Scholarly Support\">
                  <option value=\"Ezra SIL\">Ezra SIL (Sefaria)</option>
                  <option value=\"SBL Hebrew\">SBL Hebrew (Sefaria)</option>
                </optgroup>
                <optgroup label=\"Common\">
                  <option value=\"Arial\">Arial (Word compatible)</option>
                  <option value=\"David\">David</option>
                  <option value=\"Frank Ruhl Libre\">Frank Ruhl Libre (Sefaria)</option>
                  <option value=\"Noto Rashi Hebrew\">Noto Rashi Hebrew</option>
                  <option value=\"Noto Sans Hebrew\">Noto Sans Hebrew</option>
                  <option value=\"Noto Serif Hebrew\" selected>Noto Serif Hebrew</option>
                  <option value=\"Times New Roman\">Times New Roman (Word compatible)</option>
                </optgroup>
              </select>
              <div class=\"font-note\" id=\"hebrew_font_note\"></div>
              <div class=\"font-preview hebrew\" id=\"hebrew_font_preview\">
                <span class=\"label\">Preview</span>
                ...וְעַתָּ֗ה כִּתְב֤וּ לָכֶם֙ אֶת־הַשִּׁירָ֣ה
              </div>
            </preference>
            <div class=\"typography-row\">
              <div class=\"typography-field\"></div>
              <div class=\"typography-field\"><label for=\"hebrew-font-size\">Font size</label><input id=\"hebrew-font-size\" type=\"number\" name=\"hebrew_font_size\" min=\"8\" max=\"48\" step=\"1\"></div>
              <div class=\"typography-field\"><label for=\"hebrew-font-style\">Style</label><select id=\"hebrew-font-style\" name=\"hebrew_font_style\"><option value=\"normal\">Normal</option><option value=\"italic\">Italic</option><option value=\"bold\">Bold</option><option value=\"bold_italic\">Bold + Italic</option></select></div>
            </div>
          </div>
          <div class=\"typography-block\">
            <div class=\"typography-subheader\">Translation</div>
            <preference class=\"font-pref\">
              <label for=\"translation_font\">Translation font</label>
              <select name=\"translation_font\" id=\"translation_font\">
                <optgroup label=\"Google Fonts\">
                  <option value=\"Crimson Text\">Crimson Text</option>
                  <option value=\"EB Garamond\" selected>EB Garamond</option>
                  <option value=\"Roboto\">Roboto</option>
                </optgroup>
                <optgroup label=\"Common\">
                  <option value=\"Calibri\">Calibri (Word compatible)</option>
                  <option value=\"Georgia\">Georgia</option>
                  <option value=\"Times New Roman\">Times New Roman (Word compatible)</option>
                  <option value=\"Verdana\">Verdana</option>
                </optgroup>
              </select>
              <div class=\"font-note\" id=\"translation_font_note\"></div>
              <div class=\"font-preview translation\" id=\"translation_font_preview\">
                <span class=\"label\">Preview</span>
                Therefore, write down this poem…
              </div>
            </preference>
            <div class=\"typography-row\">
              <div class=\"typography-field\"></div>
              <div class=\"typography-field\"><label for=\"translation-font-size\">Font size</label><input id=\"translation-font-size\" type=\"number\" name=\"translation_font_size\" min=\"8\" max=\"48\" step=\"1\"></div>
              <div class=\"typography-field\"><label for=\"translation-font-style\">Style</label><select id=\"translation-font-style\" name=\"translation_font_style\"><option value=\"normal\">Normal</option><option value=\"italic\">Italic</option><option value=\"bold\">Bold</option><option value=\"bold_italic\">Bold + Italic</option></select></div>
            </div>
          </div>
          <div class=\"typography-block\">
            <div class=\"typography-subheader\">Transliteration</div>
            <div class=\"typography-row\">
              <div class=\"typography-field\"><label for=\"transliteration-font\">Font</label><select id=\"transliteration-font\" name=\"transliteration_font\"><option value=\"Crimson Text\">Crimson Text</option><option value=\"EB Garamond\">EB Garamond</option><option value=\"Roboto\">Roboto</option><option value=\"Calibri\">Calibri</option><option value=\"Georgia\">Georgia</option><option value=\"Times New Roman\">Times New Roman</option><option value=\"Verdana\">Verdana</option></select></div>
              <div class=\"typography-field\"><label for=\"transliteration-font-size\">Font size</label><input id=\"transliteration-font-size\" type=\"number\" name=\"transliteration_font_size\" min=\"8\" max=\"48\" step=\"1\"></div>
              <div class=\"typography-field\"><label for=\"transliteration-font-style\">Style</label><select id=\"transliteration-font-style\" name=\"transliteration_font_style\"><option value=\"normal\">Normal</option><option value=\"italic\">Italic</option><option value=\"bold\">Bold</option><option value=\"bold_italic\">Bold + Italic</option></select></div>
            </div>
          </div>
        </section>
        <section name=\"transliteration\">
          <h1>Transliteration defaults</h1>
          <preference class=\"preference-field\"><span class=\"toggle-line\"><input type=\"checkbox\" name=\"include_transliteration_default\"> Include transliteration by default when Hebrew output is selected</span></preference>
          <preference class=\"preference-field\"><label for=\"transliteration-scheme\">Default transliteration scheme</label><select id=\"transliteration-scheme\" name=\"transliteration_scheme\"><option value=\"simple_english\">Simple English</option><option value=\"academic_lite\">Academic-lite</option><option value=\"modern_israeli\">Modern Israeli</option></select></preference>
        </section>
        <section name=\"sheimot\">
          <h1>Sheimot</h1>
          <preference><span class=\"toggle-line\"><input type=\"checkbox\" name=\"meforash_replace\"> Replace יהוה with <select name=\"meforash_replacement\"><option value=\"ה'\">ה'</option><option value=\"יקוק\">יקוק</option><option value=\"השם\">השם</option><option value=\"ד'\">ד'</option><option value=\"ידוד\">ידוד</option><option value=\"יהו-ה\">יהו-ה</option><option value=\"יחוח\">יחוח</option></select></span></preference>
          <preference><span class=\"toggle-line\"><input type=\"checkbox\" name=\"yaw_replace\"> Replace יה with <select name=\"yaw_replacement\"><option value=\"קה\">קה</option><option value=\"השם\">השם</option></select></span></preference>
          <preference><span class=\"toggle-line\"><input type=\"checkbox\" name=\"elodim_replace\"> Replace אלוהים with <select name=\"elodim_replacement\"><option value=\"אלוקים\">אלוקים</option><option value=\"אלודים\">אלודים</option></select></span></preference>
          <preference><span class=\"toggle-line\"><input type=\"checkbox\" name=\"god_replace\"> Replace God with <input type=\"text\" name=\"god_replacement\" placeholder=\"G-d\"></span></preference>
        </section>
        <section name=\"features\">
          <h1>Features</h1>
          <preference><span class=\"toggle-line\"><input type=\"checkbox\" name=\"popcorn_enabled\"> Enable Popcorn (beta, legacy feature by Shlomi Helfgot) menu item</span></preference>
        </section>
      </div>
      <section class=\"save-bar\" name=\"actions\"><button class=\"blue submit\">Save Preferences</button><span id=\"results\"></span></section>
    </div>
    <script>
      const fontMeta = {
        "Ezra SIL": { stack: "'Ezra SIL', 'SBL Hebrew', 'Times New Roman', serif", word: false },
        "SBL Hebrew": { stack: "'SBL Hebrew', 'Ezra SIL', 'Times New Roman', serif", word: false },
        "Arial": { stack: "Arial, 'Noto Sans Hebrew', sans-serif", word: true },
        "David": { stack: "David, 'Times New Roman', serif", word: false },
        "Frank Ruhl Libre": { stack: "'Frank Ruhl Libre', 'Times New Roman', serif", word: false },
        "Noto Rashi Hebrew": { stack: "'Noto Rashi Hebrew', 'Noto Serif Hebrew', serif", word: false },
        "Noto Sans Hebrew": { stack: "'Noto Sans Hebrew', Arial, sans-serif", word: false },
        "Noto Serif Hebrew": { stack: "'Noto Serif Hebrew', 'Times New Roman', serif", word: false },
        "Times New Roman": { stack: "'Times New Roman', serif", word: true },
        "Crimson Text": { stack: "'Crimson Text', Georgia, serif", word: false },
        "EB Garamond": { stack: "'EB Garamond', Georgia, serif", word: false },
        "Roboto": { stack: "Roboto, Arial, sans-serif", word: false },
        "Calibri": { stack: "Calibri, Arial, sans-serif", word: true },
        "Georgia": { stack: "Georgia, serif", word: false },
        "Verdana": { stack: "Verdana, Arial, sans-serif", word: false }
      };
      function updateFontPreview(selectId, previewId, noteId) {
        const select = document.getElementById(selectId);
        const preview = document.getElementById(previewId);
        const note = document.getElementById(noteId);
        if (!select || !preview || !note) return;
        const meta = fontMeta[select.value];
        if (!meta) return;
        select.style.fontFamily = meta.stack;
        preview.style.fontFamily = meta.stack;
        note.textContent = meta.word ? "Word compatible" : "";
      }
      google.script.run.withSuccessHandler(function(preferences) {
        var checkboxes = document.querySelectorAll('input[type=\"checkbox\"]');
        for (var n = 0; n < checkboxes.length; n += 1) {
          var checkbox = checkboxes[n].name;
          if (preferences[checkbox] == \"true\") { checkboxes[n].checked = true; }
        }
        var selectors = document.querySelectorAll('select');
        for (var j = 0; j < selectors.length; j += 1) {
          if (preferences[selectors[j].name] !== undefined && preferences[selectors[j].name] !== null) { selectors[j].value = preferences[selectors[j].name]; }
        }
        var fields = document.querySelectorAll('input[type=\"text\"], input[type=\"number\"]');
        for (var k = 0; k < fields.length; k += 1) {
          var fieldName = fields[k].name;
          if (preferences[fieldName] !== undefined && preferences[fieldName] !== null) { fields[k].value = preferences[fieldName]; }
        }
        updateFontPreview(\"hebrew_font\", \"hebrew_font_preview\", \"hebrew_font_note\");
        updateFontPreview(\"translation_font\", \"translation_font_preview\", \"translation_font_note\");
        $('.hide').fadeOut(1000);
      }).getPreferences();
      document.getElementById(\"hebrew_font\").addEventListener(\"change\", function() { updateFontPreview(\"hebrew_font\", \"hebrew_font_preview\", \"hebrew_font_note\"); });
      document.getElementById(\"translation_font\").addEventListener(\"change\", function() { updateFontPreview(\"translation_font\", \"translation_font_preview\", \"translation_font_note\"); });
      $('.submit').click(function() {
        $('#results').html('<img src=\"https://www.sefaria.org/static/img/ajax-loader.gif\">');
        var preferenceObject = {};
        $('select').each(function(index, element) { preferenceObject[$(element).attr('name')] = $(element).val(); });
        $(\"input[type='checkbox']\").each(function(index, element) { preferenceObject[$(element).attr('name')] = $(element).is(':checked'); });
        $(\"input[type='text'], input[type='number']\").each(function(index, element) { preferenceObject[$(element).attr('name')] = $(element).val(); });
        google.script.run.withSuccessHandler(function() { $('#results').html('Successfully updated preferences.'); }).setPreferences(preferenceObject);
      });
    </script>
  </body>
</html>
""", encoding="utf-8")

trans_gs.write_text("""/* Local transliteration engine. */
var TRANSLITERATION_SCHEMES = {
  simple_english: { name: "Simple English", map: {"א":"'", "ב":"b", "ג":"g", "ד":"d", "ה":"h", "ו":"v", "ז":"z", "ח":"kh", "ט":"t", "י":"y", "כ":"kh", "ך":"kh", "ל":"l", "מ":"m", "ם":"m", "נ":"n", "ן":"n", "ס":"s", "ע":"'", "פ":"p", "ף":"f", "צ":"ts", "ץ":"ts", "ק":"k", "ר":"r", "ש":"sh", "ת":"t"}, vowels: {"\\u05B0":"e","\\u05B1":"e","\\u05B2":"a","\\u05B3":"o","\\u05B4":"i","\\u05B5":"e","\\u05B6":"e","\\u05B7":"a","\\u05B8":"a","\\u05B9":"o","\\u05BB":"u","\\u05BC":"","\\u05BD":"","\\u05BF":"","\\u05C1":"","\\u05C2":"","\\u05C7":"a"} },
  academic_lite: { name: "Academic-lite", map: {"א":"ʾ", "ב":"b", "ג":"g", "ד":"d", "ה":"h", "ו":"v", "ז":"z", "ח":"ḥ", "ט":"ṭ", "י":"y", "כ":"kh", "ך":"kh", "ל":"l", "מ":"m", "ם":"m", "נ":"n", "ן":"n", "ס":"s", "ע":"ʿ", "פ":"p", "ף":"f", "צ":"ṣ", "ץ":"ṣ", "ק":"q", "ר":"r", "ש":"sh", "ת":"t"}, vowels: {"\\u05B0":"ə","\\u05B1":"e","\\u05B2":"a","\\u05B3":"o","\\u05B4":"i","\\u05B5":"e","\\u05B6":"e","\\u05B7":"a","\\u05B8":"a","\\u05B9":"o","\\u05BB":"u","\\u05BC":"","\\u05BD":"","\\u05BF":"","\\u05C1":"","\\u05C2":"","\\u05C7":"a"} },
  modern_israeli: { name: "Modern Israeli", map: {"א":"'", "ב":"b", "ג":"g", "ד":"d", "ה":"h", "ו":"v", "ז":"z", "ח":"ch", "ט":"t", "י":"y", "כ":"ch", "ך":"ch", "ל":"l", "מ":"m", "ם":"m", "נ":"n", "ן":"n", "ס":"s", "ע":"'", "פ":"p", "ף":"f", "צ":"tz", "ץ":"tz", "ק":"k", "ר":"r", "ש":"sh", "ת":"t"}, vowels: {"\\u05B0":"e","\\u05B1":"e","\\u05B2":"a","\\u05B3":"o","\\u05B4":"i","\\u05B5":"e","\\u05B6":"e","\\u05B7":"a","\\u05B8":"a","\\u05B9":"o","\\u05BB":"u","\\u05BC":"","\\u05BD":"","\\u05BF":"","\\u05C1":"","\\u05C2":"","\\u05C7":"a"} }
};
function stripCantillationMarks_(text) { return String(text || "").replace(/[\\u0591-\\u05AF]/g, ""); }
function transliterateHebrewText(text, schemeKey, options) {
  options = options || {};
  var keepNiqqud = options.keepNiqqud !== false;
  var cleaned = stripCantillationMarks_(String(text || ""));
  if (!cleaned) return "";
  var scheme = TRANSLITERATION_SCHEMES[schemeKey] || TRANSLITERATION_SCHEMES.simple_english;
  var out = "";
  for (var i = 0; i < cleaned.length; i += 1) {
    var ch = cleaned.charAt(i);
    if (scheme.map[ch]) { out += scheme.map[ch]; continue; }
    if (keepNiqqud && Object.prototype.hasOwnProperty.call(scheme.vowels, ch)) { out += scheme.vowels[ch]; continue; }
    out += ch;
  }
  return out.replace(/\\s+/g, " ").replace(/'\\s+/g, " ").trim();
}
function transliterateHebrewHtmlPreservingBasicBreaks(html, schemeKey, options) {
  var text = String(html || "").replace(/<br\\s*\\/?>/gi, "\\n").replace(/<\\/p>/gi, "\\n").replace(/<[^>]*>/g, "");
  var lines = text.split(/\\n+/);
  var out = [];
  for (var i = 0; i < lines.length; i += 1) { var line = lines[i].trim(); if (line) out.push(transliterateHebrewText(line, schemeKey, options)); }
  return out.join("\\n");
}
""", encoding="utf-8")

# extract popcorn and gematriya if present
pop_match = re.search(r"\nfunction popcornHTML\(\) \{.*?\n\}\n\nfunction insertPopcorn\(\) \{.*?\n\}\n", code_text, re.S)
if pop_match:
    pop_gs.write_text(pop_match.group(0).strip() + "\n", encoding="utf-8")
    code_text = code_text.replace(pop_match.group(0), "\n", 1)

gem_match = re.search(r"\n/\*\n \* Convert numbers to gematriya representation, and vice-versa\..*", code_text, re.S)
if gem_match:
    gem_gs.write_text(gem_match.group(0).strip() + "\n", encoding="utf-8")
    code_text = code_text[:gem_match.start()].rstrip() + "\n"

if "function include(filename)" not in code_text:
    code_text = "function include(filename) {\n  return HtmlService.createHtmlOutputFromFile(filename).getContent();\n}\n\n" + code_text

# settings/defaults
if '"include_transliteration_default"' not in code_text:
    code_text = code_text.replace('"translation_font_size"\n]', '"translation_font_size",\n  "translation_font_style",\n  "transliteration_font",\n  "transliteration_font_size",\n  "transliteration_font_style",\n  "include_transliteration_default",\n  "transliteration_scheme"\n]', 1)
if '"transliteration_font"' not in code_text:
    code_text = code_text.replace('"translation_font_size": 11\n  };', '"translation_font_size": 11,\n    "translation_font_style": "normal",\n    "transliteration_font": "EB Garamond",\n    "transliteration_font_size": 11,\n    "transliteration_font_style": "italic",\n    "include_transliteration_default": false,\n    "transliteration_scheme": "simple_english"\n  };', 1)

# typography functions
code_text = code_text.replace(
"""function getTypographySettings() {
  const userProperties = PropertiesService.getUserProperties();
  return {
    hebrewFont: userProperties.getProperty("hebrew_font") || "Arial",
    hebrewFontSize: Number(userProperties.getProperty("hebrew_font_size") || 14),
    translationFont: userProperties.getProperty("translation_font") || "Arial",
    translationFontSize: Number(userProperties.getProperty("translation_font_size") || 11)
  };
}""",
"""function getTypographySettings() {
  const userProperties = PropertiesService.getUserProperties();
  return {
    hebrewFont: userProperties.getProperty("hebrew_font") || "Noto Serif Hebrew",
    hebrewFontSize: Number(userProperties.getProperty("hebrew_font_size") || 14),
    hebrewFontStyle: userProperties.getProperty("hebrew_font_style") || "normal",
    translationFont: userProperties.getProperty("translation_font") || "EB Garamond",
    translationFontSize: Number(userProperties.getProperty("translation_font_size") || 11),
    translationFontStyle: userProperties.getProperty("translation_font_style") || "normal",
    transliterationFont: userProperties.getProperty("transliteration_font") || "EB Garamond",
    transliterationFontSize: Number(userProperties.getProperty("transliteration_font_size") || 11),
    transliterationFontStyle: userProperties.getProperty("transliteration_font_style") || "italic"
  };
}""",
1)

code_text = code_text.replace(
"""function applyTypographyToParagraph(paragraph, font, size) {
  if (!paragraph) {
    return;
  }

  const text = paragraph.editAsText();
  const len = text.getText().length;
  if (len <= 0) {
    return;
  }

  if (font) {
    text.setFontFamily(0, len - 1, font);
  }
  if (!isNaN(size) && size > 0) {
    text.setFontSize(0, len - 1, size);
  }
}""",
"""function applyTypographyToParagraph(paragraph, font, size, style) {
  if (!paragraph) {
    return;
  }

  const text = paragraph.editAsText();
  const len = text.getText().length;
  if (len <= 0) {
    return;
  }

  if (font) {
    text.setFontFamily(0, len - 1, font);
  }
  if (!isNaN(size) && size > 0) {
    text.setFontSize(0, len - 1, size);
  }

  const fontStyle = String(style || "normal");
  text.setBold(0, len - 1, fontStyle === "bold" || fontStyle === "bold_italic");
  text.setItalic(0, len - 1, fontStyle === "italic" || fontStyle === "bold_italic");
}""",
1)

code_text = code_text.replace(
"""function applyHeaderStyleWithTypography(paragraph, isHebrew, typography) {
  applyTypographyToParagraph(
    paragraph,
    isHebrew ? typography.hebrewFont : typography.translationFont,
    isHebrew ? typography.hebrewFontSize : typography.translationFontSize
  );
}""",
"""function applyHeaderStyleWithTypography(paragraph, isHebrew, typography) {
  applyTypographyToParagraph(
    paragraph,
    isHebrew ? typography.hebrewFont : typography.translationFont,
    isHebrew ? typography.hebrewFontSize : typography.translationFontSize,
    isHebrew ? typography.hebrewFontStyle : typography.translationFontStyle
  );
}

function insertTransliterationParagraphAfter(doc, index, transliterationText, typography, ltr) {
  if (!transliterationText) {
    return;
  }
  let paragraph = doc.insertParagraph(index, transliterationText);
  paragraph.setLeftToRight(ltr !== false);
  paragraph.setAttributes({});
  applyTypographyToParagraph(paragraph, typography.transliterationFont, typography.transliterationFontSize, typography.transliterationFontStyle);
}

function insertTransliterationIntoCell(cell, transliterationText, typography) {
  if (!cell || !transliterationText) {
    return;
  }
  let paragraph = cell.insertParagraph(cell.getNumChildren(), transliterationText);
  paragraph.setLeftToRight(true);
  paragraph.setAttributes({});
  applyTypographyToParagraph(paragraph, typography.transliterationFont, typography.transliterationFontSize, typography.transliterationFontStyle);
}""",
1)

# insertReference changes
code_text = code_text.replace(
'function insertReference(data, singleLanguage = undefined, pasukPreference = true, preferredTitle = null, includeTranslationSourceInfo = false, bilingualLayout = "he-right", insertSefariaLink = false) {',
'function insertReference(data, singleLanguage = undefined, pasukPreference = true, preferredTitle = null, includeTranslationSourceInfo = false, bilingualLayout = "he-right", insertSefariaLink = false, includeTransliteration = false) {',
1
)

code_text = code_text.replace(
"""  const typography = getTypographySettings();
  const sefariaUrl = `https://www.sefaria.org/${encodeURIComponent(data.ref || '').replace(/%20/g, '_')}`;""",
"""  const typography = getTypographySettings();
  const currentPrefs = getPreferences();
  const transliterationScheme = currentPrefs.transliteration_scheme || "simple_english";
  const transliterationText = (includeTransliteration && data.he) ? transliterateHebrewHtmlPreservingBasicBreaks(data.he, transliterationScheme, { keepNiqqud: true }) : "";
  const sefariaUrl = `https://www.sefaria.org/${encodeURIComponent(data.ref || '').replace(/%20/g, '_')}`;""",
1
)

code_text = code_text.replace(
"""    applyTypographyToParagraph(
      mainTextParagraph,
      singleLanguage == "he" ? typography.hebrewFont : typography.translationFont,
      singleLanguage == "he" ? typography.hebrewFontSize : typography.translationFontSize
    );""",
"""    applyTypographyToParagraph(
      mainTextParagraph,
      singleLanguage == "he" ? typography.hebrewFont : typography.translationFont,
      singleLanguage == "he" ? typography.hebrewFontSize : typography.translationFontSize,
      singleLanguage == "he" ? typography.hebrewFontStyle : typography.translationFontStyle
    );

    if (singleLanguage == "he" && transliterationText) {
      insertTransliterationParagraphAfter(doc, index + 2, transliterationText, typography, true);
    }""",
1
)

code_text = code_text.replace(
"applyTypographyToParagraph(hebTextParagraph, typography.hebrewFont, typography.hebrewFontSize);",
"applyTypographyToParagraph(hebTextParagraph, typography.hebrewFont, typography.hebrewFontSize, typography.hebrewFontStyle);\n\n      if (transliterationText) {\n        insertTransliterationParagraphAfter(doc, index + 2, transliterationText, typography, true);\n      }",
1
)

code_text = code_text.replace(
"doc.insertParagraph(index + 2, insertSefariaLink ? buildLinkedTitleText(title, data, 'en') : title)",
"doc.insertParagraph(index + (transliterationText ? 3 : 2), insertSefariaLink ? buildLinkedTitleText(title, data, 'en') : title)",
1
)
code_text = code_text.replace(
"let enTitleParagraph = doc.getChild(index + 2).asParagraph();",
"let enTitleParagraph = doc.getChild(index + (transliterationText ? 3 : 2)).asParagraph();",
1
)
code_text = code_text.replace(
'let engTextParagraph = doc.insertParagraph(index + 3, "");',
'let engTextParagraph = doc.insertParagraph(index + (transliterationText ? 4 : 3), "");',
1
)
code_text = code_text.replace(
'let attributionParagraph = doc.insertParagraph(index + 4, "");',
'let attributionParagraph = doc.insertParagraph(index + (transliterationText ? 5 : 4), "");',
1
)
code_text = code_text.replace(
"applyTypographyToParagraph(engTextParagraph, typography.translationFont, typography.translationFontSize);",
"applyTypographyToParagraph(engTextParagraph, typography.translationFont, typography.translationFontSize, typography.translationFontStyle);",
1
)
code_text = code_text.replace(
"applyTypographyToParagraph(engText, typography.translationFont, typography.translationFontSize);",
"applyTypographyToParagraph(engText, typography.translationFont, typography.translationFontSize, typography.translationFontStyle);",
1
)

code_text = code_text.replace(
"""      let hebText = table.getCell(1, hebrewColumn)
        .setText("")
        .insertParagraph(0, "");
      hebText.setLeftToRight(false);
      hebText.setAttributes(nullStyle);
      insertRichTextFromHTML(hebText, data.he);
      hebText.setAttributes(noUnderline);
      applyTypographyToParagraph(hebText, typography.hebrewFont, typography.hebrewFontSize);""",
"""      let hebText = table.getCell(1, hebrewColumn)
        .setText("")
        .insertParagraph(0, "");
      hebText.setLeftToRight(false);
      hebText.setAttributes(nullStyle);
      insertRichTextFromHTML(hebText, data.he);
      hebText.setAttributes(noUnderline);
      applyTypographyToParagraph(hebText, typography.hebrewFont, typography.hebrewFontSize, typography.hebrewFontStyle);

      if (transliterationText) {
        insertTransliterationIntoCell(table.getCell(1, hebrewColumn), transliterationText, typography);
      }""",
1
)

code_gs.write_text(code_text, encoding="utf-8")
PY

echo "Done."
echo "- apps-script/main-css.html"
echo "- apps-script/main-js.html"
echo "- apps-script/preferences.html"
echo "- apps-script/transliteration.gs"
echo "- apps-script/gematriya.gs"
echo "- apps-script/popcorn-feature.gs"
echo "- apps-script/Code.gs"
