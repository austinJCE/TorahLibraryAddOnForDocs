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
  "include_translation_source_info",
  "include_transliteration_default",
  "meforash_replace",
  "meforash_replacement",
  "nekudot",
  "nekudot_filter",
  "popcorn_enabled",
  "teamim",
  "translation_font",
  "translation_font_size",
  "translation_font_style",
  "transliteration_font",
  "transliteration_font_size",
  "transliteration_font_style",
  "transliteration_scheme",
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
	  "include_translation_source_info": false,
	  "meforash_replace": false,
	  "nekudot": true,
	  "nekudot_filter": false,
	  "popcorn_enabled": false,
	  "teamim": true,
	  "translation_font": "Arial",
	  "translation_font_size": 11,
	  "versioning": true,
	  "yaw_replace": false
	};
  setPreferences(basicPrefs);
  //display release notes in popup
  
  let html = HtmlService.createHtmlOutputFromFile('release-notes')
      .setWidth(600)
      .setHeight(400);
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
      .setWidth(600)
      .setHeight(400);
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
    let json = response.getContentText();
    let test_data = JSON.parse(json);
  
  /*although it might make more sense to put the filters (orthography, seamus) elsewhere, as it is text processing, 
  all representations of this data need to have these applied to them such that the preview is נאמן to what the actual
  ref will look like when inserted*/

  // Technical debt: this try/catch currently wraps both fetch + text normalization + parsing.
  // Narrowing the protected region would make failures easier to reason about.

    const userProperties = PropertiesService.getUserProperties();
    // see https://unicode.org/charts/PDF/U0590.pdf for Hebrew unicode values
    if (userProperties.getProperty("nekudot") == "false" || (userProperties.getProperty("nekudot_filter") == "tanakh" || test_data.type != "Tanakh")) {
      json = json.replace(/[\u05B0-\u05BD]/g, "");
      json = json.replace(/[\u05BF-\u05C7]/g, ""); //in order to keep the makafs in
    }
    json = (userProperties.getProperty("teamim") == "false") ? json.replace(/[\u0591-\u05AF]/g, "") : json;
    // Technical debt: these Hebrew normalization regexes are broad and hard to maintain.
    // Consolidate and document this logic so replacements remain predictable across niqqud/ta'amim variants.
    let meforashReplacement = userProperties.getProperty("meforash_replacement");
    json = (userProperties.getProperty("meforash_replace") == "true") ? json.replace(/י[\u0591-\u05C7]*ה[\u0591-\u05C7]*ו[\u0591-\u05C7]*ה[\u0591-\u05C7]*/g, meforashReplacement) : json;  
    json = (userProperties.getProperty("yaw_replace") == "true") ? json.replace(/\bי[\u0591-\u05C7]*ה[\u0591-\u05C7]*\b/g, userProperties.getProperty("yaw_replacement")) : json;
    json = (userProperties.getProperty("elodim_replace") == "true") ? json.replace(/א[\u0591-\u05C7]*ל[\u0591-\u05C7]*ו[\u0591-\u05C7]*ה[\u0591-\u05C7]*י[\u0591-\u05C7]*ם[\u0591-\u05C7]*/g, userProperties.getProperty("elodim_replacement")) : json;
    
    let data = JSON.parse(json);
    applyEnglishDivineNamePreference(data, userProperties);
    return data;

  } catch (error) {
    // return nothing
    Logger.log(`The system has made a macha'ah: ${error.message} from url ${url}`)
    return; 
  }

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
  text.setBold(0, len - 1, fontStyle === "bold" || fontStyle === "bold_italic");
  text.setItalic(0, len - 1, fontStyle === "italic" || fontStyle === "bold_italic");
}

function applyHeaderStyleWithTypography(paragraph, isHebrew, typography) {
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

function insertReference(data, singleLanguage = undefined, pasukPreference = true, preferredTitle = null, includeTranslationSourceInfo = false, bilingualLayout = "he-right", insertSefariaLink = false, includeTransliteration = false) {
  if (!data || !data.ref) {
    throw new Error("Unable to insert source: no resolved reference.");
  }

  //set title as preferred title (e.g. Bereishit instead of Genesis) if exists
  let title = (preferredTitle) ? preferredTitle : data.ref;

  //add pesukim if user wants
  const includeLineMarkers = pasukPreference === true || pasukPreference === 'true';
  data = formatDataForPesukim(data, includeLineMarkers);

  let doc = DocumentApp.getActiveDocument().getBody();
  let docWrapper = DocumentApp.getActiveDocument();
  let cursor = docWrapper.getCursor();
  let selection = docWrapper.getSelection();
  let index = doc.getNumChildren();

  const resolveSafeSelectionInsertionIndex = () => {
    if (!selection) {
      return null;
    }

    let rangeElements = selection.getRangeElements();
    if (!rangeElements || rangeElements.length !== 1) {
      throw new Error("Could not insert at this selection. Select simple text in a single paragraph, or place the cursor where you want the source inserted.");
    }

    let rangeElement = rangeElements[0];
    if (!rangeElement || !rangeElement.isPartial()) {
      throw new Error("Could not insert at this selection. Select simple text in a single paragraph, or place the cursor where you want the source inserted.");
    }

    let element = rangeElement.getElement();
    if (!element || element.getType() !== DocumentApp.ElementType.TEXT) {
      throw new Error("Could not insert at this selection. Select plain paragraph text (not table/header/footer content), or place the cursor where you want the source inserted.");
    }

    let parent = element.getParent();
    if (!parent || (parent.getType() !== DocumentApp.ElementType.PARAGRAPH && parent.getType() !== DocumentApp.ElementType.LIST_ITEM)) {
      throw new Error("Could not insert at this selection. Select plain paragraph text, or place the cursor where you want the source inserted.");
    }

    let container = parent.getParent();
    if (container !== doc) {
      throw new Error("Could not insert at this selection. This add-on currently supports replacing selected body text only.");
    }

    let start = rangeElement.getStartOffset();
    let end = rangeElement.getEndOffsetInclusive();
    if (start < 0 || end < start) {
      throw new Error("Could not insert at this selection. Select plain paragraph text, or place the cursor where you want the source inserted.");
    }

    let textElement = element.asText();
    textElement.deleteText(start, end);
    return container.getChildIndex(parent) + 1;
  };

  if (!cursor && selection) {
    index = resolveSafeSelectionInsertionIndex();
  }

  if (cursor) {
    let currentElement = cursor.getElement();
    if (currentElement) {
      let paragraphParent = currentElement.getParent();
      if (paragraphParent) {
        //convert 0-index to 1-index
        index = paragraphParent.getChildIndex(currentElement) + 1;
      }
    }
  }
  /* ---- test harness --- 
  let index = doc.getNumChildren()-1;
  */

  let headerStyle = {};
        headerStyle[DocumentApp.Attribute.BOLD] = true;
        headerStyle[DocumentApp.Attribute.UNDERLINE] = true;
  let nullStyle = {};
        nullStyle[DocumentApp.Attribute.BOLD] = false;
        nullStyle[DocumentApp.Attribute.UNDERLINE] = false;
  let noUnderline = {};
    noUnderline[DocumentApp.Attribute.UNDERLINE] = false;

  let shouldIncludeEnglishAttribution = includeTranslationSourceInfo && singleLanguage != "he";
  let attributionLines = (shouldIncludeEnglishAttribution) ? getEnglishAttributionLines(data) : [];
  const typography = getTypographySettings();
  const currentPrefs = getPreferences();
  const transliterationScheme = currentPrefs.transliteration_scheme || "simple_english";
  const transliterationText = (includeTransliteration && data.he) ? transliterateHebrewHtmlPreservingBasicBreaks(data.he, transliterationScheme, { keepNiqqud: true }) : "";
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
    applyHeaderStyleWithTypography(insertedTitle, singleLanguage == "he", typography);
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
      insertTransliterationParagraphAfter(doc, index + 2, transliterationText, typography, true);
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
      applyHeaderStyleWithTypography(hebTitleParagraph, true, typography);
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
        insertTransliterationParagraphAfter(doc, index + 2, transliterationText, typography, true);
      }

      doc.insertParagraph(index + (transliterationText ? 3 : 2), insertSefariaLink ? buildLinkedTitleText(title, data, 'en') : title)
        .setAttributes(headerStyle)
        .setLeftToRight(true);
      let enTitleParagraph = doc.getChild(index + (transliterationText ? 3 : 2)).asParagraph();
      applyHeaderStyleWithTypography(enTitleParagraph, false, typography);
      if (insertSefariaLink) {
        enTitleParagraph.editAsText().setLinkUrl(sefariaUrl);
      }

      let engTextParagraph = doc.insertParagraph(index + (transliterationText ? 4 : 3), "");
      engTextParagraph.setLeftToRight(true);
      engTextParagraph.setAttributes(nullStyle);
      insertRichTextFromHTML(engTextParagraph, data.text);
      engTextParagraph.setAttributes(noUnderline);
      applyTypographyToParagraph(engTextParagraph, typography.translationFont, typography.translationFontSize, typography.translationFontStyle);

      if (shouldIncludeEnglishAttribution && attributionLines.length > 0) {
        let attributionParagraph = doc.insertParagraph(index + (transliterationText ? 5 : 4), "");
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
      applyTypographyToParagraph(engTitle, typography.translationFont, typography.translationFontSize);
      if (insertSefariaLink) {
        engTitle.editAsText().setLinkUrl(sefariaUrl);
      }

      let hebTitle = table.getCell(0, hebrewColumn)
        .setText("")
        .insertParagraph(0, "");
      hebTitle.setLeftToRight(false);
      insertRichTextFromHTML(hebTitle, insertSefariaLink ? buildLinkedTitleText(data.heRef, data, 'he') : data.heRef);
      hebTitle.setAttributes(headerStyle);
      applyTypographyToParagraph(hebTitle, typography.hebrewFont, typography.hebrewFontSize);
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
        insertTransliterationIntoCell(table.getCell(1, hebrewColumn), transliterationText, typography);
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
          cell.getChild(n - 1).removeFromParent();
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

function findSearch(input, filters, pageRank) {

   let url = 'https://www.sefaria.org/api/search-wrapper';

   //h/t to Russell Neiss for the filters demo code

   let safeFilters = Array.isArray(filters) ? filters : [];
   let filter_fields = Array(safeFilters.length).fill("path");

   let searchOptions = {
    'aggs': [],
    'field': 'naive_lemmatizer',
    'filters': safeFilters,
    'filter_fields': filter_fields,
    'query': input,
    'size': 50,
    'slop': 10,
    'type': 'text',
    'source_proj': true
  };

  if (pageRank) {
    let pageRankOptions = {'sort_fields': [
      'pagesheetrank'
      ],
      'sort_method': 'score',
      'sort_reverse': false,
      'sort_score_missing': 0.04,
    }
    searchOptions = {
      ...searchOptions,
      ...pageRankOptions
    }
  }

  let dataToSend = JSON.stringify(searchOptions);
  let postOptions = {
    "method":"post",
    "payload" : dataToSend,
    "contentType": "application/json"
  };
  let response = UrlFetchApp.fetch(url, postOptions).getContentText();

  let responseJSON = JSON.parse(response);
  
  return responseJSON["hits"]["hits"];
}

function preferencesPopup() {
  let output = HtmlService.createHtmlOutputFromFile('preferences')
    .setTitle('Preferences')
    .setWidth(420)
    .setHeight(640);
  DocumentApp.getUi().showModalDialog(output, 'Preferences');
}

function divineNamePopup() {
  transformDivineNames();
}

function linkerHTML() {
  linkTextsWithSefaria();
}
