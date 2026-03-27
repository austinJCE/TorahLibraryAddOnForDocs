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
  "last_search_corpus_filters",
  "last_translation_languages",
  "last_translation_only_filter",
  "last_search_sort_mode",
  "last_search_relevance_sort",
  "sefaria_link_font_style",
  "sefaria_link_font_size",
  "sefaria_link_font",
  "source_title_font_style",
  "source_title_font_size",
  "source_title_font",
  "versioning",
  "yaw_replace",
  "yaw_replacement"
];

function getDefaultPreferences() {
  return {
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
    "source_title_font": "Frank Ruhl Libre",
    "source_title_font_size": 14,
    "source_title_font_style": "bold,underline",
    "sefaria_link_font": "Frank Ruhl Libre",
    "sefaria_link_font_size": 14,
    "sefaria_link_font_style": "bold,underline",
    "transliteration_font": "EB Garamond",
    "transliteration_font_size": 11,
    "transliteration_font_style": "italic",
    "transliteration_scheme": "traditional",
    "transliteration_overrides": "{}",
    "transliteration_is_biblical_hebrew": true,
    "transliteration_biblical_dagesh_mode": "none",
    "versioning": true,
    "yaw_replace": false,
    "last_search_corpus_filters": "[]",
    "last_translation_languages": "[\"en\"]",
    "last_translation_only_filter": false,
    "last_search_sort_mode": "relevance",
    "last_search_relevance_sort": true
  };
}

function onInstall() {
	  const basicPrefs = getDefaultPreferences();
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
      .addItem('User Guide', 'howItWorksPopup')
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

function howItWorksPopup() {
  let html = HtmlService.createHtmlOutputFromFile('help')
      .setWidth(820)
      .setHeight(860);
  DocumentApp.getUi().showModalDialog(html, 'User Guide');
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
    sourceTitleFont: userProperties.getProperty("source_title_font") || userProperties.getProperty("hebrew_font") || "Frank Ruhl Libre",
    sourceTitleFontSize: Number(userProperties.getProperty("source_title_font_size") || userProperties.getProperty("hebrew_font_size") || 14),
    sourceTitleFontStyle: userProperties.getProperty("source_title_font_style") || "bold,underline",
    sefariaLinkFont: userProperties.getProperty("sefaria_link_font") || userProperties.getProperty("source_title_font") || userProperties.getProperty("hebrew_font") || "Frank Ruhl Libre",
    sefariaLinkFontSize: Number(userProperties.getProperty("sefaria_link_font_size") || userProperties.getProperty("source_title_font_size") || userProperties.getProperty("hebrew_font_size") || 14),
    sefariaLinkFontStyle: userProperties.getProperty("sefaria_link_font_style") || "bold,underline",
    transliterationFont: userProperties.getProperty("transliteration_font") || "EB Garamond",
    transliterationFontSize: Number(userProperties.getProperty("transliteration_font_size") || 11),
    transliterationFontStyle: userProperties.getProperty("transliteration_font_style") || "italic"
  };
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

  if (font) {
    text.setFontFamily(0, len - 1, font);
  }
  if (!isNaN(size) && size > 0) {
    text.setFontSize(0, len - 1, size);
  }

  const fontStyle = String(style || "normal");
  const flags = fontStyle === "normal" ? [] : fontStyle.split(",");
  text.setBold(0, len - 1, flags.indexOf("bold") >= 0);
  text.setItalic(0, len - 1, flags.indexOf("italic") >= 0);
  text.setUnderline(0, len - 1, flags.indexOf("underline") >= 0);
}

function applyHeaderStyleWithTypography(paragraph, isHebrew, typography, isLinked) {
  const useLinkStyle = !!isLinked;
  applyTypographyToParagraph(
    paragraph,
    useLinkStyle ? typography.sefariaLinkFont : typography.sourceTitleFont,
    useLinkStyle ? typography.sefariaLinkFontSize : typography.sourceTitleFontSize,
    useLinkStyle ? typography.sefariaLinkFontStyle : typography.sourceTitleFontStyle
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

function appendTransliterationToParagraph(paragraph, transliterationText, typography) {
  if (!paragraph || !transliterationText) {
    return;
  }
  const text = paragraph.editAsText();
  const existing = text.getText();
  const start = existing.length;
  const prefix = start > 0 ? "\n" : "";
  text.insertText(start, prefix + transliterationText);
  const rangeStart = start + prefix.length;
  const rangeEnd = rangeStart + transliterationText.length - 1;
  if (rangeEnd >= rangeStart) {
    if (typography.transliterationFont) text.setFontFamily(rangeStart, rangeEnd, typography.transliterationFont);
    if (!isNaN(typography.transliterationFontSize) && typography.transliterationFontSize > 0) text.setFontSize(rangeStart, rangeEnd, typography.transliterationFontSize);
    const flags = String(typography.transliterationFontStyle || 'italic').split(',');
    text.setBold(rangeStart, rangeEnd, flags.indexOf('bold') >= 0);
    text.setItalic(rangeStart, rangeEnd, flags.indexOf('italic') >= 0);
    text.setUnderline(rangeStart, rangeEnd, flags.indexOf('underline') >= 0);
  }
}

function maybeBuildTransliterationText_(data, includeTransliteration, currentPrefs) {
  if (!includeTransliteration || !data || !data.he) {
    return '';
  }
  const transliterationText = maybeBuildTransliterationText_(data, includeTransliteration, currentPrefs);
  const sefariaUrl = `https://www.sefaria.org/${encodeURIComponent(data.ref || '').replace(/%20/g, '_')}`;

  let resolvedBilingualLayout = (singleLanguage) ? null : (bilingualLayout || "he-right");
  if (resolvedBilingualLayout !== "he-left" && resolvedBilingualLayout !== "he-top" && resolvedBilingualLayout !== "he-right") {
    resolvedBilingualLayout = "he-right";
  }
  
  if (singleLanguage) {

    let ltr = (singleLanguage == "he") ? false : true;
    let titleText = (singleLanguage == "he") ? data.heRef : title;
    if (insertSefariaLink) {
      titleText = buildLinkedTitleText(titleText, data, singleLanguage);
    }
    let mainText = (singleLanguage == "he") ? data.he : data.text;
    
    doc.insertParagraph(index, titleText)
      .setAttributes(headerStyle)
      .setLeftToRight(ltr);
    let insertedTitle = doc.getChild(index).asParagraph();
    applyHeaderStyleWithTypography(insertedTitle, singleLanguage == "he", typography, insertSefariaLink);
    if (insertSefariaLink) {
      insertedTitle.editAsText().setLinkUrl(sefariaUrl);
    }
    

    let mainTextParagraph = doc.insertParagraph(index+1, "");
    insertRichTextFromHTML(mainTextParagraph, mainText);
    mainTextParagraph.setAttributes(noUnderline);
    if (singleLanguage == "he") {
      mainTextParagraph.setAttributes(nullStyle);
    }
    mainTextParagraph.setLeftToRight(ltr);
    applyTypographyToParagraph(
      mainTextParagraph,
      singleLanguage == "he" ? typography.hebrewFont : typography.translationFont,
      singleLanguage == "he" ? typography.hebrewFontSize : typography.translationFontSize,
      singleLanguage == "he" ? typography.hebrewFontStyle : typography.translationFontStyle
    );

    if (singleLanguage == "he" && transliterationText) {
      appendTransliterationToParagraph(mainTextParagraph, transliterationText, typography);
    }

    if (singleLanguage == "en" && attributionLines.length > 0) {
      let attributionParagraph = doc.insertParagraph(index+2, "");
      insertAttributionParagraph(attributionParagraph, attributionLines);
    }

  }
  else {
    if (resolvedBilingualLayout == "he-top") {
      doc.insertParagraph(index, insertSefariaLink ? buildLinkedTitleText(data.heRef, data, 'he') : data.heRef)
        .setAttributes(headerStyle)
        .setLeftToRight(false);
      let hebTitleParagraph = doc.getChild(index).asParagraph();
      applyHeaderStyleWithTypography(hebTitleParagraph, true, typography, insertSefariaLink);
      if (insertSefariaLink) {
        hebTitleParagraph.editAsText().setLinkUrl(sefariaUrl);
      }

      let hebTextParagraph = doc.insertParagraph(index + 1, "");
      hebTextParagraph.setLeftToRight(false);
      hebTextParagraph.setAttributes(nullStyle);
      insertRichTextFromHTML(hebTextParagraph, data.he);
      hebTextParagraph.setAttributes(noUnderline);
      applyTypographyToParagraph(hebTextParagraph, typography.hebrewFont, typography.hebrewFontSize, typography.hebrewFontStyle);

      if (transliterationText) {
        appendTransliterationToParagraph(mainTextParagraph, transliterationText, typography);
      }

      doc.insertParagraph(index + 2, insertSefariaLink ? buildLinkedTitleText(title, data, 'en') : title)
        .setAttributes(headerStyle)
        .setLeftToRight(true);
      let enTitleParagraph = doc.getChild(index + 2).asParagraph();
      applyHeaderStyleWithTypography(enTitleParagraph, false, typography, insertSefariaLink);
      if (insertSefariaLink) {
        enTitleParagraph.editAsText().setLinkUrl(sefariaUrl);
      }

      let engTextParagraph = doc.insertParagraph(index + 3, "");
      engTextParagraph.setLeftToRight(true);
      engTextParagraph.setAttributes(nullStyle);
      insertRichTextFromHTML(engTextParagraph, data.text);
      engTextParagraph.setAttributes(noUnderline);
      applyTypographyToParagraph(engTextParagraph, typography.translationFont, typography.translationFontSize, typography.translationFontStyle);

      if (shouldIncludeEnglishAttribution && attributionLines.length > 0) {
        let attributionParagraph = doc.insertParagraph(index + 4, "");
        insertAttributionParagraph(attributionParagraph, attributionLines);
      }
    } else {
      /* note: since Hebrew text needs to be inserted in RTL order, we first insert the table without 
      the Hebrew text and then add in the Hebrew text manually, with the correct text-direction */
      let cells = [
        ["", ""],
        ["", ""]
      ];
      let tableStyle = {};
          tableStyle[DocumentApp.Attribute.BOLD] = false;
      let table = doc.insertTable(index, cells)

      table.setAttributes(tableStyle);

      let englishColumn = (resolvedBilingualLayout == "he-left") ? 1 : 0;
      let hebrewColumn = (resolvedBilingualLayout == "he-left") ? 0 : 1;

      let engTitle = table.getCell(0, englishColumn)
        .setText("")
        .insertParagraph(0, "");
      engTitle.setLeftToRight(true);
      insertRichTextFromHTML(engTitle, insertSefariaLink ? buildLinkedTitleText(title, data, 'en') : title);
      engTitle.setAttributes(headerStyle);
      applyHeaderStyleWithTypography(engTitle, false, typography, insertSefariaLink);
      if (insertSefariaLink) {
        engTitle.editAsText().setLinkUrl(sefariaUrl);
      }

      let hebTitle = table.getCell(0, hebrewColumn)
        .setText("")
        .insertParagraph(0, "");
      hebTitle.setLeftToRight(false);
      insertRichTextFromHTML(hebTitle, insertSefariaLink ? buildLinkedTitleText(data.heRef, data, 'he') : data.heRef);
      hebTitle.setAttributes(headerStyle);
      applyHeaderStyleWithTypography(hebTitle, true, typography, insertSefariaLink);
      if (insertSefariaLink) {
        hebTitle.editAsText().setLinkUrl(sefariaUrl);
      }

      let engText = table.getCell(1, englishColumn)
        .setText("")
        .insertParagraph(0, "")
        .setLeftToRight(true);
      engText.setAttributes(nullStyle);
      insertRichTextFromHTML(engText, data.text);
      engText.setAttributes(noUnderline);
      applyTypographyToParagraph(engText, typography.translationFont, typography.translationFontSize, typography.translationFontStyle);

      let hebText = table.getCell(1, hebrewColumn)
        .setText("")
        .insertParagraph(0, "");
      hebText.setLeftToRight(false);
      hebText.setAttributes(nullStyle);
      insertRichTextFromHTML(hebText, data.he);
      hebText.setAttributes(noUnderline);
      applyTypographyToParagraph(hebText, typography.hebrewFont, typography.hebrewFontSize, typography.hebrewFontStyle);

      if (transliterationText) {
        appendTransliterationToParagraph(hebText, transliterationText, typography);
      }

      if (shouldIncludeEnglishAttribution && attributionLines.length > 0) {
        let attributionParagraph = doc.insertParagraph(index + 1, "");
        insertAttributionParagraph(attributionParagraph, attributionLines);
      }

      /* the constraints of insertParagraph mean that there will always be an extra line break in table cells to which we dynamically add text. See https://stackoverflow.com/questions/39506414/remove-newline-from-google-doc-table-content.
      This solution was contributed by an expert in Google Apps Script, @tanaike. Thanks @tanaike! [https://stackoverflow.com/questions/76647915/extra-spaces-when-inserting-text-in-google-docs-tables-rich-text-version?noredirect=1#comment135153775_76647915] */ 

      for (let r = 0; r < table.getNumRows(); r++) {
        const row = table.getRow(r);
        for (let c = 0; c < row.getNumCells(); c++) {
          const cell = row.getCell(c);
          const n = cell.getNumChildren();
          if (n > 0) {
            const lastChild = cell.getChild(n - 1);
            if (lastChild.getType() === DocumentApp.ElementType.PARAGRAPH) {
              const lastText = lastChild.asParagraph().getText();
              if (!lastText || !String(lastText).trim()) {
                lastChild.removeFromParent();
              }
            }
          }
        }
      }
    }

  }

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


function refreshSidebarAfterPreferences() {
  sefariaHTML();
  return true;
}
