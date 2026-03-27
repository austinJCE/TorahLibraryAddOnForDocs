/*
Copyright 2014-2024 Shlomi Helfgot
Modifications copyright 2026 Austin Swafford
Licensed under the MIT License. See repository LICENSE.md.
כל המביא דבר בשם אומרו מביא גאולה לעולם
*/

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


const SETTINGS = [
  "apply_sheimot_on_insertion",
  "elodim_replace",
  "elodim_replacement",
  "extended_gemara",
  "god_replace",
  "god_replacement",
  "hebrew_font",
  "hebrew_font_size",
  "hebrew_font_style",
  "include_translation_source_info",
  "include_transliteration_default",
  "insert_sefaria_link_default",
  "show_line_markers_default",
  "output_mode_default",
  "bilingual_layout_default",
  "meforash_replace",
  "meforash_replacement",
  "nekudot",
  "nekudot_filter",
  "popcorn_enabled",
  "teamim",
  "teamim_filter",
  "translation_font",
  "translation_font_size",
  "translation_font_style",
  "transliteration_font",
  "transliteration_font_size",
  "transliteration_font_style",
  "transliteration_scheme",
  "transliteration_overrides",
  "transliteration_is_biblical_hebrew",
  "transliteration_biblical_dagesh_mode",
  "versioning",
  "yaw_replace",
  "yaw_replacement"
];

function onInstall() {
	  const basicPrefs = {
    "apply_sheimot_on_insertion": false,
    "elodim_replace": false,
    "extended_gemara": false,
    "god_replace": false,
    "god_replacement": "G-d",
    "hebrew_font": "Arial",
    "hebrew_font_size": 14,
    "hebrew_font_style": "normal",
    "include_translation_source_info": false,
    "include_transliteration_default": false,
    "insert_sefaria_link_default": true,
    "show_line_markers_default": true,
    "output_mode_default": "both",
    "bilingual_layout_default": "he-right",
    "meforash_replace": false,
    "nekudot": true,
    "nekudot_filter": "always",
    "popcorn_enabled": false,
    "teamim": true,
    "teamim_filter": "available",
    "translation_font": "EB Garamond",
    "translation_font_size": 11,
    "translation_font_style": "normal",
    "transliteration_font": "EB Garamond",
    "transliteration_font_size": 11,
    "transliteration_font_style": "italic",
    "transliteration_scheme": "traditional",
    "transliteration_overrides": "{}",
    "transliteration_is_biblical_hebrew": true,
    "transliteration_biblical_dagesh_mode": "none",
    "versioning": true,
    "yaw_replace": false
  };
  setPreferences(basicPrefs);
  //display release notes in popup
  
  let html = HtmlService.createHtmlOutputFromFile('release-notes')
      .setWidth(720)
      .setHeight(760);
  DocumentApp.getUi().showModalDialog(html, 'Release Notes');
}

let extendedGemaraPreference = false;

function onOpen() {
  const menu = DocumentApp.getUi().createAddonMenu()
      .addItem('Find & Insert Source', 'sefariaHTML')
      .addItem('Transform Divine Names', 'transformDivineNames')
      .addItem('Link Texts with Sefaria', 'linkTextsWithSefaria')
      .addItem('Preferences', 'preferencesPopup')
      .addItem('Support', 'supportAndFeatureRequestPopup');

  const prefs = getPreferences();
  if (prefs.popcorn_enabled == "true") {
    menu.addItem('Popcorn (beta, legacy feature by Shlomi Helfgot)', 'popcornHTML');
  }

  menu.addToUi();
}

function sefariaHTML() {
  onOpen();
  let template = HtmlService.createTemplateFromFile('main');
  let mainHTMLOutput = template.evaluate()
    .setTitle('Find & Insert Source')
    .setWidth(300);
  DocumentApp.getUi().showSidebar(mainHTMLOutput);
  extendedGemaraPreference = PropertiesService.getUserProperties().getProperty("extended_gemara");
}

function supportAndFeatureRequestPopup() {
  let html = HtmlService.createHtmlOutputFromFile('support-and-features')
      .setWidth(760)
      .setHeight(860);
  DocumentApp.getUi().showModalDialog(html, 'Support and Features');
}

function preferencesPopup() {
  let html = HtmlService.createHtmlOutputFromFile('preferences')
      .setWidth(600)
      .setHeight(400);
  DocumentApp.getUi().showModalDialog(html, 'Preferences');
}

//returns the user preference w.r.t. displaying the versioning dropdowns in the insertion module
function getVersioningPreference() {
  try {
    const userProperties = PropertiesService.getUserProperties(); 
    return userProperties.getProperty("versioning");
  } catch (error) {
    Logger.log(`The system has made a mach'ah: ${error.message}`);
    return true;
  }
}


function normalizeReferenceInput(reference) {
  let normalized = String(reference || '').trim();
  if (!normalized) {
    return '';
  }

  normalized = normalized
    .replace(/[־‐-―]/g, '-')
    .replace(/[“”„‟″״]/g, '"')
    .replace(/[‘’‚‛′׳]/g, "'")
    .replace(/[‎‏‪-‮]/g, '')
    .replace(/\u05C3/g, ':')
    .replace(/\s*[:：]\s*/g, ':')
    .replace(/\s*[-–—]\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalize common Hebrew numeral punctuation: א׳:א׳-ב׳ => א:א-ב
  normalized = normalized
    .replace(/([\u0590-\u05FF])['"׳״]+(?=[\s:.-]|$)/g, '$1')
    .replace(/([\u0590-\u05FF])['"׳״]+(?=[\u0590-\u05FF])/g, '$1');

  normalized = normalized.replace(/([֐-׿])\s+([֐-׿])/g, '$1 $2');
  return normalized;
}

function findRefsInDocumentText(documentText) {
  const payload = {
    text: {
      title: '',
      body: String(documentText || '')
    }
  };

  try {
    const enqueueResponse = UrlFetchApp.fetch('https://www.sefaria.org/api/find-refs', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const enqueueData = JSON.parse(enqueueResponse.getContentText() || '{}');
    const taskId = enqueueData.task_id;
    if (!taskId) {
      return [];
    }

    for (let attempt = 0; attempt < 12; attempt++) {
      Utilities.sleep(400);
      const statusResponse = UrlFetchApp.fetch(`https://www.sefaria.org/api/async/${encodeURIComponent(taskId)}`, { muteHttpExceptions: true });
      const statusData = JSON.parse(statusResponse.getContentText() || '{}');
      if (!statusData.ready) {
        continue;
      }
      const body = (((statusData || {}).result || {}).body || {});
      return Array.isArray(body.results) ? body.results : [];
    }
  } catch (error) {
    Logger.log(`Failed to fetch find-refs output: ${error.message}`);
  }

  return [];
}

function resolveReferenceWithFallbacks(reference, versions) {
  const candidates = [];
  const normalized = normalizeReferenceInput(reference);
  if (normalized) {
    candidates.push(normalized);
  }
  const original = String(reference || '').trim();
  if (original && candidates.indexOf(original) < 0) {
    candidates.push(original);
  }

  for (let i = 0; i < candidates.length; i++) {
    const resolved = findReference(candidates[i], versions, true);
    if (resolved && resolved.ref && !resolved.error) {
      return resolved;
    }
  }

  return;
}

function findReference(reference, versions=undefined, skipNormalization=false) {
  // Technical debt: this resolver still fails hard on incomplete/partial refs (e.g. "Shemo" before "Shemot").
  // We should return structured "incomplete reference" states instead of relying on exception flow.
  //reference = "Shemot 12:1"; /* this is a test harness */
  let safeReference = String(reference || '').trim();
  if (!safeReference) {
    return;
  }
  if (!skipNormalization) {
    return resolveReferenceWithFallbacks(safeReference, versions);
  }

  Logger.log(`Reference: ${safeReference}`);
  let url = 'https://www.sefaria.org/api/texts/'
  
  let encodedReference = encodeURIComponent(safeReference);

  if (versions) {
    let encodedEnVersion = encodeURIComponent(versions.en || "");
    let encodedHeVersion = encodeURIComponent(versions.he || "");
    let versionedAdditions = `${encodedReference}?ven=${encodedEnVersion}&vhe=${encodedHeVersion}&commentary=0&context=0`;
    url = url + versionedAdditions;
  }
  else {
    let nonVersionedAdditions = `${encodedReference}?commentary=0&context=0`;
    url = url + nonVersionedAdditions;
  }

  // patch for now; triggered when an invalid sefer name is sent
  try {
    let response = UrlFetchApp.fetch(url);
    let data = JSON.parse(response.getContentText());
  
  /*although it might make more sense to put the filters (orthography, seamus) elsewhere, as it is text processing, 
  all representations of this data need to have these applied to them such that the preview is נאמן to what the actual
  ref will look like when inserted*/

  // Technical debt: this try/catch currently wraps both fetch + text normalization + parsing.
  // Narrowing the protected region would make failures easier to reason about.

    const userProperties = PropertiesService.getUserProperties();
    data = applyHebrewDisplayPreferences(data, userProperties);
    data = applyHebrewDivineNamePreferences(data, userProperties);
    applyEnglishDivineNamePreference(data, userProperties);
    return data;

  } catch (error) {
    // return nothing
    Logger.log(`The system has made a macha'ah: ${error.message} from url ${url}`)
    return; 
  }

}

function normalizeHebrewDisplayFilters_(userProperties) {
  const nekudotEnabled = userProperties.getProperty("nekudot") != "false";
  const rawNekudotFilter = String(userProperties.getProperty("nekudot_filter") || "always").toLowerCase();
  const nekudotFilter = (rawNekudotFilter === "tanakh" || rawNekudotFilter === "never") ? rawNekudotFilter : "always";

  const teamimEnabled = userProperties.getProperty("teamim") != "false";
  const rawTeamimFilter = String(userProperties.getProperty("teamim_filter") || "available").toLowerCase();
  const teamimFilter = (rawTeamimFilter === "tanakh" || rawTeamimFilter === "torah") ? "tanakh" : (rawTeamimFilter === "never" ? "never" : "available");

  return {
    nekudotEnabled,
    nekudotFilter,
    teamimEnabled,
    teamimFilter
  };
}

function applyHebrewTextDisplayPreferences(value, context, filters) {
  if (Array.isArray(value)) {
    return value.map(function(item) {
      return applyHebrewTextDisplayPreferences(item, context, filters);
    });
  }
  if (value === null || value === undefined || typeof value !== 'string') {
    return value;
  }

  let output = value;
  const shouldStripNekudot = !filters.nekudotEnabled || (filters.nekudotFilter === 'tanakh' && context !== 'Tanakh');
  const shouldStripTeamim = !filters.teamimEnabled || (filters.teamimFilter === 'tanakh' && context !== 'Tanakh');

  if (shouldStripTeamim) {
    output = output.replace(/[֑-֯]/g, '');
  }
  if (shouldStripNekudot) {
    output = output.replace(/[ְ-ֽ]/g, '');
    output = output.replace(/[ֿ-ׇ]/g, '');
  }

  return output;
}

function applyHebrewDisplayPreferences(data, userProperties) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const filters = normalizeHebrewDisplayFilters_(userProperties);
  const context = data.type || '';
  const clone = JSON.parse(JSON.stringify(data));

  ['he', 'heRef'].forEach(function(field) {
    if (Object.prototype.hasOwnProperty.call(clone, field)) {
      clone[field] = applyHebrewTextDisplayPreferences(clone[field], context, filters);
    }
  });

  return clone;
}

function applyHebrewDivineNamePreferences(data, userProperties) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const meforashReplacement = userProperties.getProperty("meforash_replacement");
  const replacements = [];

  if (userProperties.getProperty("meforash_replace") == "true" && meforashReplacement) {
    replacements.push({ pattern: /י[֑-ׇ]*ה[֑-ׇ]*ו[֑-ׇ]*ה[֑-ׇ]*/g, replacement: meforashReplacement });
  }
  if (userProperties.getProperty("yaw_replace") == "true") {
    replacements.push({ pattern: /י[֑-ׇ]*ה[֑-ׇ]*/g, replacement: userProperties.getProperty("yaw_replacement") || '' });
  }
  if (userProperties.getProperty("elodim_replace") == "true") {
    replacements.push({ pattern: /א[֑-ׇ]*ל[֑-ׇ]*ו[֑-ׇ]*ה[֑-ׇ]*י[֑-ׇ]*ם[֑-ׇ]*/g, replacement: userProperties.getProperty("elodim_replacement") || '' });
  }

  if (!replacements.length) {
    return data;
  }

  const applyReplacements = function(node) {
    if (Array.isArray(node)) {
      return node.map(function(value) { return applyReplacements(value); });
    }
    if (typeof node === 'string') {
      return replacements.reduce(function(current, rule) {
        return current.replace(rule.pattern, rule.replacement);
      }, node);
    }
    return node;
  };

  const clone = JSON.parse(JSON.stringify(data));
  ['he', 'heRef'].forEach(function(field) {
    if (Object.prototype.hasOwnProperty.call(clone, field)) {
      clone[field] = applyReplacements(clone[field]);
    }
  });
  return clone;
}

function applyEnglishDivineNamePreference(data, userProperties) {
  if (!data || userProperties.getProperty("god_replace") != "true") {
    return;
  }

  const replacement = userProperties.getProperty("god_replacement") || "G-d";
  const replaceInNode = (node) => {
    if (Array.isArray(node)) {
      return node.map((value) => replaceInNode(value));
    }
    if (typeof node === 'string') {
      return node.replace(/\bGod\b/g, replacement);
    }
    return node;
  };

  data.text = replaceInNode(data.text);
}

function getTypographySettings() {
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
}

function applyTypographyToTextRange(textElement, start, end, font, size, style) {
  if (!textElement) {
    return;
  }

  const fullLength = textElement.getText().length;
  if (fullLength <= 0) {
    return;
  }

  const safeStart = Math.max(0, Number(start) || 0);
  const safeEnd = Math.min(fullLength - 1, Number(end));
  if (safeEnd < safeStart) {
    return;
  }

  if (font) {
    textElement.setFontFamily(safeStart, safeEnd, font);
  }
  if (!isNaN(size) && size > 0) {
    textElement.setFontSize(safeStart, safeEnd, size);
  }

  const fontStyle = String(style || "normal");
  const flags = fontStyle === "normal" ? [] : fontStyle.split(",");
  textElement.setBold(safeStart, safeEnd, flags.indexOf("bold") >= 0);
  textElement.setItalic(safeStart, safeEnd, flags.indexOf("italic") >= 0);
  textElement.setUnderline(safeStart, safeEnd, flags.indexOf("underline") >= 0);
}

function applyTypographyToParagraph(paragraph, font, size, style) {
  if (!paragraph) {
    return;
  }

  const text = paragraph.editAsText();
  const len = text.getText().length;
  if (len <= 0) {
    return;
  }

  applyTypographyToTextRange(text, 0, len - 1, font, size, style);
}

function applyHeaderStyleWithTypography(paragraph, isHebrew, typography) {
  applyTypographyToParagraph(
    paragraph,
    isHebrew ? typography.hebrewFont : typography.translationFont,
    isHebrew ? typography.hebrewFontSize : typography.translationFontSize,
    isHebrew ? typography.hebrewFontStyle : typography.translationFontStyle
  );
}

function htmlToPlainTextForInsertion(html) {
  if (html === null || html === undefined) {
    return '';
  }

  let text = Array.isArray(html) ? html.join('') : String(html);
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function buildFinalHebrewBlock(hebrewHtml, transliterationHtml) {
  const safeHebrew = hebrewHtml || '';
  const safeTransliteration = transliterationHtml || '';

  if (!safeTransliteration) {
    return {
      html: safeHebrew,
      transliterationText: ''
    };
  }

  if (!safeHebrew) {
    return {
      html: '<i>' + safeTransliteration + '</i>',
      transliterationText: htmlToPlainTextForInsertion(safeTransliteration)
    };
  }

  return {
    html: safeHebrew + '\n<i>' + safeTransliteration + '</i>',
    transliterationText: htmlToPlainTextForInsertion(safeTransliteration)
  };
}

function applyHebrewCompanionLineTypography(paragraph, transliterationText, typography) {
  if (!paragraph || !transliterationText) {
    return;
  }

  const text = paragraph.editAsText();
  const fullText = text.getText();
  const transliterationLength = transliterationText.length;
  if (!fullText || transliterationLength <= 0) {
    return;
  }

  const transliterationStart = fullText.length - transliterationLength;
  const transliterationEnd = fullText.length - 1;
  if (transliterationEnd < transliterationStart) {
    return;
  }

  applyTypographyToTextRange(
    text,
    transliterationStart,
    transliterationEnd,
    typography.transliterationFont,
    typography.transliterationFontSize,
    typography.transliterationFontStyle
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
}

function testRef() {
  findReference("Shemot 12:2", {"en": "The Holy Scriptures: A New Translation (JPS 1917)", "he": "Yehoyesh's Yiddish Tanakh Translation [yi]"})
}

function formatDataForPesukim(data, pesukim) {
  const hasLineMarkerableContent = (value) => {
    if (!Array.isArray(value)) {
      return false;
    }
    return value.some((item) => Array.isArray(item) || typeof item === 'string');
  };

  const lineMarkersAvailable = hasLineMarkerableContent(data.he) || hasLineMarkerableContent(data.text);
  data.lineMarkersAvailable = lineMarkersAvailable;
  data.lineMarkersApplied = !!(lineMarkersAvailable && pesukim);

  let heTextWrapper = "", enTextWrapper = "", fromVerse = (data["sections"][1]) ? data["sections"][1] : 1;
  
  function addHebrewVerse(text, wrapper, pesukim, number) {
    let editedText = text;
    if(pesukim) {
        editedText = "("+gematriya(number, {punctuate: false})+") "+text+"\n";
    } else {
        editedText = text + "\n";
    }
    wrapper+=editedText;
    return wrapper;
  }
  function addEnglishVerse(text, wrapper, pesukim, number) {
    let editedText = text;
      if(pesukim) {
        editedText = "("+number+") "+text+"\n";
      } else {
        editedText = text + "\n";
      };
      wrapper+=editedText;
      return wrapper;
  }

  if(data.isSpanning) {
    data.he.forEach(function(perekText, perekNum) {
      if(typeof perekText == "object") {
        perekText.forEach(function(verseText, index) {
         heTextWrapper = addHebrewVerse(verseText, heTextWrapper, pesukim, fromVerse+index)
        });
        fromVerse = 1;
      } else {
        heTextWrapper+=perekText;
      }
    });
    data.text.forEach(function(perekText, perekNum) {
      if(typeof perekText == "object") {
        perekText.forEach(function(verseText, index) {
         enTextWrapper = addEnglishVerse(verseText, enTextWrapper, pesukim, fromVerse+index)
        });
        fromVerse = 1;
      } else {
        enTextWrapper+=perekText;
      }
    });
  } else {
    if(typeof data.he == "object") {
      data.he.forEach(function(ele, index) {
        heTextWrapper = addHebrewVerse(ele, heTextWrapper, pesukim, fromVerse+index);
      });
    } else {
      heTextWrapper = data.he;
    }
    if(typeof data.text == "object") {
      data.text.forEach(function(ele, index) {
        enTextWrapper = addEnglishVerse(ele, enTextWrapper, pesukim, fromVerse+index);
      });
    } else {
      enTextWrapper = data.text;
    }
  }

  data.he = heTextWrapper;
  data.text = enTextWrapper;

  return data;
};

function getAttributionParagraphText(attributionLines) {
  if (!attributionLines || !Array.isArray(attributionLines) || attributionLines.length === 0) {
    return "";
  }
  return attributionLines.join("\n");
}

function insertAttributionParagraph(paragraph, attributionLines) {
  const attributionText = getAttributionParagraphText(attributionLines);
  if (!attributionText) {
    return;
  }

  paragraph.setText(attributionText);
  let attributionStyle = {};
      attributionStyle[DocumentApp.Attribute.ITALIC] = true;
      attributionStyle[DocumentApp.Attribute.FONT_SIZE] = 8;
      attributionStyle[DocumentApp.Attribute.BOLD] = false;
      attributionStyle[DocumentApp.Attribute.UNDERLINE] = false;
  paragraph.setAttributes(attributionStyle);
  paragraph.setLeftToRight(true);
}


function buildLinkedTitleText(baseTitle, data, singleLanguage) {
  let safeTitle = String(baseTitle || '').trim();
  let modeLabel = singleLanguage === 'he' ? 'Hebrew' : (singleLanguage === 'en' ? 'Translation' : 'Bilingual');
  let versionLabel = '';

  if (singleLanguage === 'he') {
    versionLabel = String((data && data.heVersionTitle) || '').trim();
  } else if (singleLanguage === 'en') {
    versionLabel = String((data && data.versionTitle) || '').trim();
  } else {
    const enVersion = String((data && data.versionTitle) || '').trim();
    const heVersion = String((data && data.heVersionTitle) || '').trim();
    if (enVersion && heVersion) {
      versionLabel = `EN: ${enVersion}; HE: ${heVersion}`;
    } else {
      versionLabel = enVersion || heVersion;
    }
  }

  if (!versionLabel) {
    return `${safeTitle} (${modeLabel})`;
  }
  return `${safeTitle} (${modeLabel} • ${versionLabel})`;
}

function getReferenceInsertStyles() {
  let headerStyle = {};
      headerStyle[DocumentApp.Attribute.BOLD] = true;
      headerStyle[DocumentApp.Attribute.UNDERLINE] = true;
  let nullStyle = {};
      nullStyle[DocumentApp.Attribute.BOLD] = false;
      nullStyle[DocumentApp.Attribute.UNDERLINE] = false;
  let noUnderline = {};
      noUnderline[DocumentApp.Attribute.UNDERLINE] = false;
  let tableStyle = {};
      tableStyle[DocumentApp.Attribute.BOLD] = false;

  return {
    headerStyle: headerStyle,
    nullStyle: nullStyle,
    noUnderline: noUnderline,
    tableStyle: tableStyle
  };
}

function normalizeBilingualLayoutValue(bilingualLayout) {
  let resolvedBilingualLayout = bilingualLayout || 'he-right';
  if (resolvedBilingualLayout !== 'he-left' && resolvedBilingualLayout !== 'he-top' && resolvedBilingualLayout !== 'he-right') {
    return 'he-right';
  }
  return resolvedBilingualLayout;
}

function findInsertableBodyChild(element, body) {
  let current = element;
  while (current) {
    let parent = current.getParent();
    if (parent === body) {
      return current;
    }
    current = parent;
  }
  return null;
}

function resolveReferenceInsertionIndex(docWrapper, docBody) {
  let cursor = docWrapper.getCursor();
  let selection = docWrapper.getSelection();

  const resolveSafeSelectionInsertionIndex = () => {
    if (!selection) {
      return null;
    }

    let rangeElements = selection.getRangeElements();
    if (!rangeElements || rangeElements.length !== 1) {
      throw new Error('Could not insert at this selection. Select simple text in a single paragraph, or place the cursor where you want the source inserted.');
    }

    let rangeElement = rangeElements[0];
    if (!rangeElement || !rangeElement.isPartial()) {
      throw new Error('Could not insert at this selection. Select simple text in a single paragraph, or place the cursor where you want the source inserted.');
    }

    let element = rangeElement.getElement();
    if (!element || element.getType() !== DocumentApp.ElementType.TEXT) {
      throw new Error('Could not insert at this selection. Select plain paragraph text (not table/header/footer content), or place the cursor where you want the source inserted.');
    }

    let parent = element.getParent();
    if (!parent || (parent.getType() !== DocumentApp.ElementType.PARAGRAPH && parent.getType() !== DocumentApp.ElementType.LIST_ITEM)) {
      throw new Error('Could not insert at this selection. Select plain paragraph text, or place the cursor where you want the source inserted.');
    }

    let container = parent.getParent();
    if (container !== docBody) {
      throw new Error('Could not insert at this selection. This add-on currently supports replacing selected body text only.');
    }

    let start = rangeElement.getStartOffset();
    let end = rangeElement.getEndOffsetInclusive();
    if (start < 0 || end < start) {
      throw new Error('Could not insert at this selection. Select plain paragraph text, or place the cursor where you want the source inserted.');
    }

    element.asText().deleteText(start, end);
    return docBody.getChildIndex(parent) + 1;
  };

  if (!cursor && selection) {
    return resolveSafeSelectionInsertionIndex();
  }

  if (cursor) {
    let anchor = findInsertableBodyChild(cursor.getElement(), docBody);
    if (anchor) {
      return docBody.getChildIndex(anchor) + 1;
    }
  }

  return docBody.getNumChildren();
}

function buildInsertReferenceContext(data, options) {
  const typography = getTypographySettings();
  const currentPrefs = getPreferences();
  const transliterationScheme = currentPrefs.transliteration_scheme || 'traditional';
  const transliterationDageshMode = currentPrefs.transliteration_biblical_dagesh_mode || 'none';
  const transliterationIsBiblical = currentPrefs.transliteration_is_biblical_hebrew !== 'false';
  const isBiblicalHebrewText = transliterationIsBiblical && data.type == 'Tanakh';
  const transliterationOverrides = (() => {
    try {
      return JSON.parse(currentPrefs.transliteration_overrides || '{}') || {};
    } catch (error) {
      return {};
    }
  })();
  const transliterationText = (options.includeTransliteration && data.he)
    ? transliterateHebrewHtmlPreservingBasicBreaks(data.he, transliterationScheme, {
        keepNiqqud: true,
        isBiblicalHebrew: isBiblicalHebrewText,
        dageshMode: isBiblicalHebrewText ? transliterationDageshMode : 'none',
        overrideMap: transliterationOverrides
      })
    : '';

  return {
    title: options.preferredTitle ? options.preferredTitle : data.ref,
    typography: typography,
    styles: getReferenceInsertStyles(),
    resolvedBilingualLayout: options.singleLanguage ? null : normalizeBilingualLayoutValue(options.bilingualLayout),
    shouldIncludeEnglishAttribution: options.includeTranslationSourceInfo && options.singleLanguage != 'he',
    attributionLines: (options.includeTranslationSourceInfo && options.singleLanguage != 'he') ? getEnglishAttributionLines(data) : [],
    transliterationText: transliterationText,
    finalHebrewBlock: buildFinalHebrewBlock(data.he, transliterationText),
    sefariaUrl: `https://www.sefaria.org/${encodeURIComponent(data.ref || '').replace(/%20/g, '_')}`
  };
}

function buildReferenceInsertPlan(data, options, context) {
  if (options.singleLanguage) {
    const isHebrew = options.singleLanguage == 'he';
    const blocks = [
      {
        type: 'title',
        lang: options.singleLanguage,
        text: isHebrew ? data.heRef : context.title,
        linkMode: options.insertSefariaLink ? options.singleLanguage : null
      },
      {
        type: 'body',
        lang: options.singleLanguage,
        html: isHebrew ? context.finalHebrewBlock.html : data.text,
        transliterationText: isHebrew ? context.finalHebrewBlock.transliterationText : ''
      }
    ];

    if (!isHebrew && context.attributionLines.length > 0) {
      blocks.push({
        type: 'attribution',
        lines: context.attributionLines
      });
    }

    return {
      type: 'blocks',
      blocks: blocks
    };
  }

  if (context.resolvedBilingualLayout == 'he-top') {
    const blocks = [
      {
        type: 'title',
        lang: 'he',
        text: data.heRef,
        linkMode: options.insertSefariaLink ? 'he' : null
      },
      {
        type: 'body',
        lang: 'he',
        html: context.finalHebrewBlock.html,
        transliterationText: context.finalHebrewBlock.transliterationText
      }
    ];

    blocks.push(
      {
        type: 'title',
        lang: 'en',
        text: context.title,
        linkMode: options.insertSefariaLink ? 'en' : null
      },
      {
        type: 'body',
        lang: 'en',
        html: data.text
      }
    );

    if (context.attributionLines.length > 0) {
      blocks.push({
        type: 'attribution',
        lines: context.attributionLines
      });
    }

    return {
      type: 'blocks',
      blocks: blocks
    };
  }

  return {
    type: 'table',
    englishColumn: context.resolvedBilingualLayout == 'he-left' ? 1 : 0,
    hebrewColumn: context.resolvedBilingualLayout == 'he-left' ? 0 : 1,
    englishTitle: context.title,
    hebrewTitle: data.heRef,
    englishText: data.text,
    hebrewText: context.finalHebrewBlock.html,
    hebrewTransliterationText: context.finalHebrewBlock.transliterationText,
    attributionLines: context.attributionLines,
    insertSefariaLink: options.insertSefariaLink
  };
}

function applyReferenceBodyTypography(paragraph, lang, typography) {
  const isHebrew = lang == 'he';
  applyTypographyToParagraph(
    paragraph,
    isHebrew ? typography.hebrewFont : typography.translationFont,
    isHebrew ? typography.hebrewFontSize : typography.translationFontSize,
    isHebrew ? typography.hebrewFontStyle : typography.translationFontStyle
  );
}

function insertReferenceTitleParagraph(doc, index, block, data, context) {
  const isHebrew = block.lang == 'he';
  const titleText = block.linkMode ? buildLinkedTitleText(block.text, data, block.linkMode) : block.text;
  const paragraph = doc.insertParagraph(index, titleText)
    .setAttributes(context.styles.headerStyle)
    .setLeftToRight(!isHebrew);

  applyHeaderStyleWithTypography(paragraph, isHebrew, context.typography);
  if (block.linkMode) {
    paragraph.editAsText().setLinkUrl(context.sefariaUrl);
  }
  return paragraph;
}

function insertReferenceBodyParagraph(doc, index, block, context) {
  const isHebrew = block.lang == 'he';
  const paragraph = doc.insertParagraph(index, '');
  paragraph.setLeftToRight(!isHebrew);
  paragraph.setAttributes(context.styles.nullStyle);
  insertRichTextFromHTML(paragraph, block.html);
  paragraph.setAttributes(context.styles.noUnderline);
  applyReferenceBodyTypography(paragraph, block.lang, context.typography);
  if (isHebrew && block.transliterationText) {
    applyHebrewCompanionLineTypography(paragraph, block.transliterationText, context.typography);
  }
  return paragraph;
}

function renderReferenceBlockPlan(doc, index, plan, data, context) {
  let currentIndex = index;
  plan.blocks.forEach(function(block) {
    switch (block.type) {
      case 'title':
        insertReferenceTitleParagraph(doc, currentIndex, block, data, context);
        currentIndex += 1;
        break;
      case 'body':
        insertReferenceBodyParagraph(doc, currentIndex, block, context);
        currentIndex += 1;
        break;
      case 'attribution': {
        const paragraph = doc.insertParagraph(currentIndex, '');
        insertAttributionParagraph(paragraph, block.lines);
        currentIndex += 1;
        break;
      }
    }
  });
}

function insertReferenceCellTitle(cell, lang, titleText, data, context, linkMode) {
  let paragraph = cell.setText('').insertParagraph(0, '');
  paragraph.setLeftToRight(lang != 'he');
  insertRichTextFromHTML(paragraph, linkMode ? buildLinkedTitleText(titleText, data, linkMode) : titleText);
  paragraph.setAttributes(context.styles.headerStyle);
  applyHeaderStyleWithTypography(paragraph, lang == 'he', context.typography);
  if (linkMode) {
    paragraph.editAsText().setLinkUrl(context.sefariaUrl);
  }
  return paragraph;
}

function insertReferenceCellBody(cell, lang, html, context, transliterationText) {
  let paragraph = cell.setText('').insertParagraph(0, '');
  paragraph.setLeftToRight(lang != 'he');
  paragraph.setAttributes(context.styles.nullStyle);
  insertRichTextFromHTML(paragraph, html);
  paragraph.setAttributes(context.styles.noUnderline);
  applyReferenceBodyTypography(paragraph, lang, context.typography);
  if (lang == 'he' && transliterationText) {
    applyHebrewCompanionLineTypography(paragraph, transliterationText, context.typography);
  }
  return paragraph;
}

function cleanupReferenceTableTrailingParagraphs(table) {
  for (let r = 0; r < table.getNumRows(); r++) {
    const row = table.getRow(r);
    for (let c = 0; c < row.getNumCells(); c++) {
      const cell = row.getCell(c);
      const n = cell.getNumChildren();
      if (n > 0) {
        cell.getChild(n - 1).removeFromParent();
      }
    }
  }
}

function renderReferenceTablePlan(doc, index, plan, data, context) {
  let table = doc.insertTable(index, [['', ''], ['', '']]);
  table.setAttributes(context.styles.tableStyle);

  insertReferenceCellTitle(table.getCell(0, plan.englishColumn), 'en', plan.englishTitle, data, context, plan.insertSefariaLink ? 'en' : null);
  insertReferenceCellTitle(table.getCell(0, plan.hebrewColumn), 'he', plan.hebrewTitle, data, context, plan.insertSefariaLink ? 'he' : null);
  insertReferenceCellBody(table.getCell(1, plan.englishColumn), 'en', plan.englishText, context, '');
  insertReferenceCellBody(table.getCell(1, plan.hebrewColumn), 'he', plan.hebrewText, context, plan.hebrewTransliterationText);

  if (plan.attributionLines.length > 0) {
    let attributionParagraph = doc.insertParagraph(index + 1, '');
    insertAttributionParagraph(attributionParagraph, plan.attributionLines);
  }

  cleanupReferenceTableTrailingParagraphs(table);
}

function renderReferenceInsertPlan(doc, index, plan, data, context) {
  if (plan.type == 'table') {
    renderReferenceTablePlan(doc, index, plan, data, context);
    return;
  }
  renderReferenceBlockPlan(doc, index, plan, data, context);
}

function insertReference(data, singleLanguage = undefined, pasukPreference = true, preferredTitle = null, includeTranslationSourceInfo = false, bilingualLayout = 'he-right', insertSefariaLink = false, includeTransliteration = false) {
  if (!data || !data.ref) {
    throw new Error('Unable to insert source: no resolved reference.');
  }

  const includeLineMarkers = pasukPreference === true || pasukPreference === 'true';
  data = formatDataForPesukim(data, includeLineMarkers);

  const docWrapper = DocumentApp.getActiveDocument();
  const doc = docWrapper.getBody();
  const index = resolveReferenceInsertionIndex(docWrapper, doc);
  const options = {
    singleLanguage: singleLanguage,
    preferredTitle: preferredTitle,
    includeTranslationSourceInfo: includeTranslationSourceInfo,
    bilingualLayout: bilingualLayout,
    insertSefariaLink: insertSefariaLink,
    includeTransliteration: includeTransliteration
  };
  const context = buildInsertReferenceContext(data, options);
  const plan = buildReferenceInsertPlan(data, options, context);

  renderReferenceInsertPlan(doc, index, plan, data, context);
}

/*
converts an html string (returned from the Sefaria API) to rich-text (using the Google Docs API) and inserts it into the provided element.
violates encapsulation principles because Google Apps Script for some reason doesn't allow for headless rich text (e.g. new Text()...)
*/
function insertRichTextFromHTML(element, htmlString) {
  // Technical debt: text preprocessing concerns (e.g. translation cleanup) still live in the HTML parser path.
  // Long-term, preprocessing should be separated from tag-to-rich-text rendering.

  element = element.editAsText();
  let buf = [];
  let index = 0, italicsFnCount = 0, textLength = element.editAsText().getText().length;
  let bolded = false, italicized = false, inFootnote = false;


  if (Array.isArray(htmlString)) {
    htmlString = htmlString.join("");
  }
  let iterableString = htmlString.split(/(<\/?[a-zA-Z]+[a-zA-Z'"0-9= \-/]*>)/g);

  let inserterFn = (textModification) => {
    //grab all words in the buffer and join
    let snippet = buf.join("");

    //index of snippet needs to be zero-indexed. This is how we keep track of which words/phrases/sentences to bold/italicize
    let snippetLength = snippet.length;
    let snippetIndex = snippetLength - 1;

    if (snippet != "") {
      element.insertText(textLength, snippet);

      //set rich text settings
      element.setBold(textLength, textLength+snippetIndex, bolded); 
      element.setItalic(textLength, textLength+snippetIndex, italicized);

      textLength += snippetLength;
    }

    switch(textModification) {
      case "bold":
        bolded = !bolded;
        break;
      case "italic":
        italicized = !italicized;
        break;
      case "linebreak":
        element.insertText(textLength, "\n");
        textLength += 1;
        break;
    }
  }

  for (let i = 0; i < iterableString.length; i++) {
    let word = iterableString[i];

    /* example format of footnotes in the text: -----‘Do not let me see your faces<sup class=\"footnote-marker\">*</sup><i class=\"footnote\"><b>Do not let me see your faces </b>See note at v. 3.</i> unless----*/
    if (inFootnote) {
      if ( word == "<i class=\"footnote\">" || word == "<i>") {
        italicsFnCount++;
      } else if ( word == "</i>") {
        italicsFnCount--;
        if (italicsFnCount == 0) {
          inFootnote = false;
          continue;
        }
      }

    }

    else if (word[0] == "<") {
      //grab the name of the tag
      let tagName = /<\/?([a-zA-Z]+)([a-zA-Z'"0-9= \-/])*>/.exec(word)[1];

      switch (tagName) {
        case "b":
          inserterFn("bold");
          buf = [];
          index = 0;
          break;
        case "strong":
          if (!extendedGemaraPreference || bolded) {
            inserterFn("bold");
          }
          buf = [];
          index = 0;
          break;
        case "i":
          if (!extendedGemaraPreference || bolded) {
            inserterFn("italic");
          }
          buf = [];
          index = 0;
          break;
        case "br":
          inserterFn("linebreak");
          buf = [];
          index = 0;
          break;
        case "sup":
          inFootnote = true;
          italicsFnCount = 0;
          break;
        default:
          break;
      }
      continue;
    }

    if (!inFootnote) {
      buf[index++] = word;
    }
  }

  // add in the last words, if the text snippet does not end with a tag
  let snippet = buf.join("");
  if ( snippet != "" ) {
    element.insertText(textLength, snippet);
    let snippetIndex = snippet.length - 1;
    element.setBold(textLength, textLength+snippetIndex, false); 
    element.setItalic(textLength, textLength+snippetIndex, false);
  }
}

function getPreferences() {
  let returnPrefs = {}
  let preferences = PropertiesService.getUserProperties();
  for (let i = 0; i < SETTINGS.length; i++) {
    returnPrefs[SETTINGS[i]] = preferences.getProperty(SETTINGS[i]);
  }
  return returnPrefs;
}

function setPreferences(preferenceObject) {
  const userProperties = PropertiesService.getUserProperties();  
  for (const property in preferenceObject) {
    try {

      userProperties.setProperty(property, preferenceObject[property]);


    } catch (error) {

      Logger.log(`The system has made a mach'ah: ${error.message}`);
    }
  }
}

function sefariaSearch() {
  // Legacy menu item now routes to the unified sidebar.
  sefariaHTML();
} 

function transformDivineNames() {
  const body = DocumentApp.getActiveDocument().getBody();
  const prefs = getPreferences();
  const noTransformsEnabled = [prefs.meforash_replace, prefs.yaw_replace, prefs.elodim_replace, prefs.god_replace]
    .every((value) => value != "true");
  if (noTransformsEnabled) {
    DocumentApp.getUi().alert('No divine-name transforms are enabled. Open Preferences and enable at least one transform before running this action.');
    return;
  }
  const hebrewMarks = "\\u0591-\\u05C7";
  const hebrewChars = "\\u0590-\\u05FF";
  const replaceRangesInTextElement = (textElement, ranges) => {
    if (!ranges || !ranges.length) {
      return;
    }

    for (let i = ranges.length - 1; i >= 0; i--) {
      const range = ranges[i];
      const start = range.start;
      const end = range.end;
      const replacement = range.replacement;
      const originalAttributes = textElement.getAttributes(start);
      const originalLink = textElement.getLinkUrl(start);

      textElement.deleteText(start, end);
      textElement.insertText(start, replacement);

      if (replacement.length > 0) {
        const replacementEnd = start + replacement.length - 1;
        textElement.setAttributes(start, replacementEnd, originalAttributes);
        textElement.setLinkUrl(start, replacementEnd, originalLink);
      }
    }
  };

  const replaceHebrewWordInTextElement = (textElement, tokenPattern, replacement) => {
    const source = textElement.getText();
    if (!source) {
      return;
    }
    const wrappedPattern = new RegExp(`(^|[^${hebrewChars}])(${tokenPattern})(?=$|[^${hebrewChars}])`, 'g');
    const ranges = [];
    let match;

    while ((match = wrappedPattern.exec(source)) !== null) {
      const prefix = match[1] || "";
      const token = match[2] || "";
      const tokenStart = match.index + prefix.length;
      const tokenEnd = tokenStart + token.length - 1;
      if (token.length > 0) {
        ranges.push({ start: tokenStart, end: tokenEnd, replacement });
      }
    }

    replaceRangesInTextElement(textElement, ranges);
  };

  const replaceRegexInTextElement = (textElement, regex, replacement) => {
    const source = textElement.getText();
    if (!source) {
      return;
    }
    const ranges = [];
    let match;

    while ((match = regex.exec(source)) !== null) {
      ranges.push({
        start: match.index,
        end: match.index + match[0].length - 1,
        replacement
      });
    }

    replaceRangesInTextElement(textElement, ranges);
  };

  const collectTextElements = (element, textElements) => {
    if (!element) {
      return;
    }

    if (element.getType && element.getType() === DocumentApp.ElementType.TEXT) {
      textElements.push(element.asText());
      return;
    }

    if (!element.getNumChildren) {
      return;
    }

    const count = element.getNumChildren();
    for (let i = 0; i < count; i++) {
      collectTextElements(element.getChild(i), textElements);
    }
  };

  const textElements = [];
  collectTextElements(body, textElements);

  textElements.forEach((textElement) => {
    if (prefs.meforash_replace == "true") {
      replaceHebrewWordInTextElement(textElement, `י[${hebrewMarks}]*ה[${hebrewMarks}]*ו[${hebrewMarks}]*ה[${hebrewMarks}]*`, prefs.meforash_replacement || "ה'");
    }
    if (prefs.yaw_replace == "true") {
      replaceHebrewWordInTextElement(textElement, `י[${hebrewMarks}]*ה[${hebrewMarks}]*`, prefs.yaw_replacement || "קה");
    }
    if (prefs.elodim_replace == "true") {
      replaceHebrewWordInTextElement(textElement, `א[${hebrewMarks}]*ל[${hebrewMarks}]*(?:ו[${hebrewMarks}]*)?ה[${hebrewMarks}]*י[${hebrewMarks}]*ם[${hebrewMarks}]*`, prefs.elodim_replacement || "אלוקים");
    }
    if (prefs.god_replace == "true") {
      replaceRegexInTextElement(textElement, /\bGod\b/g, prefs.god_replacement || "G-d");
    }
  });
}

function linkTextsWithSefaria() {
  const bodyText = DocumentApp.getActiveDocument().getBody().editAsText();
  const docText = bodyText.getText();
  const linkerMatches = findRefsInDocumentText(docText);
  let linkedCount = 0;
  linkerMatches.forEach((match) => {
    if (!match || match.linkFailed || !Array.isArray(match.refs) || !match.refs.length) {
      return;
    }
    const start = Number(match.startChar);
    const endExclusive = Number(match.endChar);
    if (!isFinite(start) || !isFinite(endExclusive)) {
      return;
    }
    const end = endExclusive - 1;
    if (start < 0 || end < start || end >= docText.length) {
      return;
    }
    if (bodyText.getLinkUrl(start) || bodyText.getLinkUrl(end)) {
      return;
    }
    const ref = String(match.refs[0] || '').trim();
    if (!ref) {
      return;
    }
    const url = `https://www.sefaria.org/${encodeURIComponent(ref).replace(/%20/g, '_')}`;
    bodyText.setLinkUrl(start, end, url);
    linkedCount++;
  });

  DocumentApp.getUi().alert(`Linked ${linkedCount} recognizable reference${linkedCount === 1 ? '' : 's'} to Sefaria.`);
}

function returnTitles() {
    let url = 'https://www.sefaria.org/api/index/titles/';
    let response = UrlFetchApp.fetch(url);
    let json = response.getContentText();
    let data = JSON.parse(json);
    let titleArray = data["books"];
    return titleArray;
}

function buildSearchWrapperPayload_(input, searchConfig) {
  let normalizedConfig = {};
  if (Array.isArray(searchConfig)) {
    normalizedConfig.filters = searchConfig;
  } else if (typeof searchConfig === 'boolean') {
    normalizedConfig.relevanceSort = searchConfig;
  } else if (searchConfig && typeof searchConfig === 'object') {
    normalizedConfig = searchConfig;
  }

  let safeFilters = Array.isArray(normalizedConfig.filters) ? normalizedConfig.filters.filter(Boolean) : [];
  let usePageRank = normalizedConfig.relevanceSort !== false;
  let searchOptions = {
    'aggs': [],
    'field': 'naive_lemmatizer',
    'filters': safeFilters,
    'filter_fields': Array(safeFilters.length).fill('path'),
    'query': String(input || '').trim(),
    'size': 50,
    'slop': 10,
    'type': 'text',
    'source_proj': true
  };

  if (usePageRank) {
    searchOptions.sort_fields = ['pagesheetrank'];
    searchOptions.sort_method = 'score';
    searchOptions.sort_reverse = false;
    searchOptions.sort_score_missing = 0.04;
  }

  return searchOptions;
}


function searchWrapperRequest_(payload) {
  let url = 'https://www.sefaria.org/api/search-wrapper';
  let postOptions = {
    method: 'post',
    payload: JSON.stringify(payload),
    contentType: 'application/json',
    muteHttpExceptions: true
  };

  let rawResponse = UrlFetchApp.fetch(url, postOptions);
  let statusCode = rawResponse.getResponseCode ? rawResponse.getResponseCode() : 200;
  let responseText = rawResponse.getContentText() || '{}';

  if (statusCode >= 400) {
    throw new Error('Search request failed with status ' + statusCode + '.');
  }

  return JSON.parse(responseText || '{}');
}

function normalizeSearchTranslationLanguages_(languages) {
  const languageLUT = {
    english: 'en', en: 'en', eng: 'en',
    spanish: 'es', es: 'es', spa: 'es',
    french: 'fr', fr: 'fr', fre: 'fr', fra: 'fr',
    german: 'de', de: 'de', ger: 'de', deu: 'de',
    russian: 'ru', ru: 'ru', rus: 'ru',
    arabic: 'ar', ar: 'ar', ara: 'ar',
    hebrew: 'he', he: 'he', heb: 'he'
  };
  return (Array.isArray(languages) ? languages : []).map(function(language) {
    const raw = String(language || '').trim().toLowerCase();
    return languageLUT[raw] || raw;
  }).filter(Boolean);
}

function searchHitHasTranslation_(hit, desiredLanguages) {
  let source = hit && hit._source ? hit._source : {};
  let selectedLanguages = normalizeSearchTranslationLanguages_(desiredLanguages);
  let availableLangs = [];
  if (source && Array.isArray(source.availableLangs)) {
    availableLangs = normalizeSearchTranslationLanguages_(source.availableLangs);
  } else if (source && Array.isArray(source.versions)) {
    availableLangs = normalizeSearchTranslationLanguages_(source.versions.map(function(version) {
      return version && version.language;
    }));
  }
  if (!selectedLanguages.length) {
    if (availableLangs.length) {
      return availableLangs.length > 0;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'hasEn')) {
      return source.hasEn !== false;
    }
    return true;
  }
  if (!availableLangs.length) {
    return selectedLanguages.indexOf('en') >= 0 && source.hasEn !== false;
  }
  return selectedLanguages.some(function(language) {
    return availableLangs.indexOf(language) >= 0;
  });
}

function findSearchAdvanced(input, filters, relevanceSort, translationOnly) {
  let searchConfig = (filters && typeof filters === 'object' && !Array.isArray(filters))
    ? filters
    : { filters: filters, relevanceSort: relevanceSort, translationOnly: translationOnly === true };

  let attempts = [];
  attempts.push(buildSearchWrapperPayload_(input, searchConfig));

  if (Array.isArray(searchConfig.filters) && searchConfig.filters.length > 0) {
    attempts.push(buildSearchWrapperPayload_(input, Object.assign({}, searchConfig, { filters: [] })));
  }

  if (searchConfig.relevanceSort !== false) {
    attempts.push(buildSearchWrapperPayload_(input, Object.assign({}, searchConfig, { relevanceSort: false })));
  }

  attempts.push({
    aggs: [],
    field: 'naive_lemmatizer',
    query: String(input || '').trim(),
    size: 50,
    slop: 10,
    type: 'text',
    source_proj: true
  });

  let lastError = null;
  for (let i = 0; i < attempts.length; i++) {
    try {
      let responseJSON = searchWrapperRequest_(attempts[i]);
      let hits = (((responseJSON || {}).hits || {}).hits || []);
      if (searchConfig.translationOnly) {
        hits = hits.filter(function(hit) {
          return searchHitHasTranslation_(hit, searchConfig.translationLanguages);
        });
      }
      return hits;
    } catch (error) {
      lastError = error;
      Logger.log('Search attempt ' + (i + 1) + ' failed: ' + error.message);
    }
  }

  throw new Error(lastError && lastError.message ? lastError.message : 'Search is temporarily unavailable. Please try again.');
}

function findSearch(input, filters, pageRank) {
  return findSearchAdvanced(input, filters, pageRank, false);
}

function preferencesPopup() {
  let output = HtmlService.createHtmlOutputFromFile('preferences')
    .setTitle('Preferences')
    .setWidth(600)
    .setHeight(760);
  DocumentApp.getUi().showModalDialog(output, 'Preferences');
}

function divineNamePopup() {
  transformDivineNames();
}

function linkerHTML() {
  linkTextsWithSefaria();
}
