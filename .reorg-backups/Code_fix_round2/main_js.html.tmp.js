
// no need for $(document).ready() since this script is loaded at the end of the page
$(".input").attr("disabled", true);
var data = {};
var titles = [];
var latestResolveRequestId = 0;
var latestQueryRequestId = 0;
var latestDirectRefValidationRequestId = 0;
var selectedResultKey = null;
var selectedResultSummary = null;
var selectedRefValue = null;
var queryState = { rawLibraryMatches: [], rawSearchResults: [], libraryMatches: [], searchResults: [] };
var resultPostProcessState = { availableCorpora: [], removedCorpora: [] };
var resultsCollapsed = false;
var pendingPreferredVersions = null;
var translationAvailabilityByRef = {};
var hasResolvedReference = false;
var searchDebounceHandle = null;
var keyboardResultIndex = -1;
var resultsLoading = false;
var MAX_FUZZY_SUGGESTIONS = 3;

var corpusColorClassMap = {
  tanakh: 'corpus-accent-tanakh',
  mishnah: 'corpus-accent-mishnah',
  talmud: 'corpus-accent-talmud',
  midrash: 'corpus-accent-midrash',
  halakhah: 'corpus-accent-halakhah',
  liturgy: 'corpus-accent-liturgy',
  kabbalah: 'corpus-accent-kabbalah',
  philosophy: 'corpus-accent-philosophy',
  chasidut: 'corpus-accent-chasidut',
  musar: 'corpus-accent-musar',
  commentary: 'corpus-accent-commentary',
  reference: 'corpus-accent-reference',
  'modern-works': 'corpus-accent-modernworks',
  apocrypha: 'corpus-accent-apocrypha',
  tanaitic: 'corpus-accent-tanaitic'
};

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseStoredArrayPreference(value, fallback) {
  fallback = Array.isArray(fallback) ? fallback : [];
  if (Array.isArray(value)) return value.filter(Boolean);
  var raw = String(value || '').trim();
  if (!raw) return fallback.slice();
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : fallback.slice();
  } catch (error) {
    return raw ? raw.split(',').map(function (part) { return String(part || '').trim(); }).filter(Boolean) : fallback.slice();
  }
}

function mergePreferenceDefaults(preferences) {
  preferences = preferences || {};
  if (preferences.include_translation_source_info == "true") {
    $('.include-translation-source-info').prop('checked', true);
  }
  $('.wants-vowels').prop('checked', preferences.nekudot !== "false");
  $('.wants-cantillation').prop('checked', preferences.teamim !== "false");
  $('.include-transliteration').prop('checked', String(preferences.include_transliteration_default) === "true");
  $('.insert-sefaria-link').prop('checked', preferences.insert_sefaria_link_default !== "false");
  $('.insert-citation-only').prop('checked', String(preferences.insert_citation_default) === "true");
  $('.wants-pesukim').prop('checked', preferences.show_line_markers_default !== "false");
  $('.output-mode-selection').val(preferences.output_mode_default || 'both');
  $('.bilingual-layout-selection').val(preferences.bilingual_layout_default || 'he-right');
  $('.translation-only-filter').prop('checked', preferences.last_translation_only_filter === "true");
  $('.search-sort-select').val(preferences.last_search_sort_mode || 'relevance');
  $('.wants-relevance').prop('checked', preferences.last_search_relevance_sort !== "false");

  var savedTranslationLanguages = parseStoredArrayPreference(preferences.last_translation_languages, ['en']);
  $('.translation-language-option').prop('checked', false);
  var useAnyTranslationLanguage = !savedTranslationLanguages.length || savedTranslationLanguages.indexOf('any') >= 0;
  $('.translation-language-any').prop('checked', useAnyTranslationLanguage);
  if (!useAnyTranslationLanguage) {
    savedTranslationLanguages.forEach(function (value) {
      $('.translation-language-option[value="' + value.replace(/([\"'])/g, '\$1') + '"]').prop('checked', true);
    });
  }
}

function saveSidebarPreference(payload, onDone) {
  google.script.run.withSuccessHandler(function () {
    if (typeof onDone === 'function') onDone();
  }).setPreferences(payload || {});
}

google.script.run.withSuccessHandler(function (preferences) {
  mergePreferenceDefaults(preferences);
  syncDisplayModeCards();
  syncLayoutCards();
  updateBilingualLayoutVisibility();
  updateTranslationDetailsVisibility();
  updateHebrewOptionsVisibility();
  updateVersionControlsVisibility();
  updateTransliterationVisibility();
  updateInsertionModeVisibility();
  updateInsertionModeVisibility();
  loadSessionLibrary();
  updateTranslationLanguageVisibility();
}).getPreferences();

$('.include-translation-source-info').on('change', function () {
  saveSidebarPreference({
    include_translation_source_info: $('.include-translation-source-info').is(':checked')
  });
});

$('.include-transliteration').on('change', function () {
  saveSidebarPreference({
    include_transliteration_default: $('.include-transliteration').is(':checked')
  });
});

$('.insert-citation-only').on('change', function () {
  saveSidebarPreference({
    insert_citation_default: $('.insert-citation-only').is(':checked')
  }, refreshSelectedResult);
  updateInsertionModeVisibility();
});

$('.insert-sefaria-link').on('change', function () {
  saveSidebarPreference({
    insert_sefaria_link_default: $('.insert-sefaria-link').is(':checked')
  });
});

$('.wants-pesukim').on('change', function () {
  saveSidebarPreference({
    show_line_markers_default: $('.wants-pesukim').is(':checked')
  });
});

$('.wants-vowels, .wants-cantillation').on('change', function () {
  saveSidebarPreference({
    nekudot: $('.wants-vowels').is(':checked'),
    teamim: $('.wants-cantillation').is(':checked')
  }, refreshSelectedResult);
});

function saveLastUsedSearchSettings() {
  saveSidebarPreference({
    last_translation_languages: JSON.stringify(getCheckedValues('.translation-language-option')),
    last_translation_only_filter: $('.translation-only-filter').is(':checked'),
    last_search_sort_mode: $('.search-sort-select').val() || 'relevance',
    last_search_relevance_sort: $('.wants-relevance').length ? $('.wants-relevance').is(':checked') : true
  });
}

function buildPreviewLoadingHTML(message) {
  var text = String(message || 'Loading preview…').trim();
  return "<div class='preview-loading' role='status' aria-live='polite'><span class='preview-loading-spinner' aria-hidden='true'></span><span>" + escapeHTML(text) + "</span></div>";
}

function setInsertButtonState(enabled) {
  $('#insert-source').prop('disabled', !enabled);
}

function updatePesukimAvailability(response) {
  var supportsLineMarkers = !!(response && (Array.isArray(response.he) || Array.isArray(response.text) || response.lineMarkersAvailable === true));
  $('.pesukim-wrapper').toggle(supportsLineMarkers);
  $('.wants-pesukim').prop('disabled', !supportsLineMarkers);
  if (!supportsLineMarkers) {
    $('.wants-pesukim').prop('checked', false);
    $('.pesukim-help').text('Line markers are unavailable for this selection (single-block text).');
  } else {
    if (!$('.wants-pesukim').prop('checked')) {
      $('.wants-pesukim').prop('checked', true);
    }
    $('.pesukim-help').text('Applies to segmented refs (e.g., verse/line ranges).');
  }
}

function updateBilingualLayoutVisibility() {
  var outputMode = $('.output-mode-selection').val();
  $('.bilingual-layout-wrapper').toggle(outputMode === 'both');
}

function updateTranslationDetailsVisibility() {
  var outputMode = $('.output-mode-selection').val();
  $('.translation-details-row, .translation-details-help').toggle(outputMode === 'both' || outputMode === 'en');
}

function updateHebrewOptionsVisibility() {
  var outputMode = $('.output-mode-selection').val();
  $('.hebrew-options-row').toggle(outputMode !== 'en');
}

function updateVersionControlsVisibility() {
  var outputMode = $('.output-mode-selection').val();
  $('.translation-version-control').toggle(outputMode !== 'he');
  $('.advanced-version-details').toggle(outputMode !== 'en');
}

function updateTransliterationVisibility() {
  var outputMode = $('.output-mode-selection').val();
  $('.transliteration-row, .transliteration-help, .transliteration-options-row').toggle(outputMode !== 'en');
}


function updateInsertionModeVisibility() {
  var citationOnly = $('.insert-citation-only').is(':checked');
  $('.translation-details-row, .translation-details-help, .hebrew-options-row, .transliteration-help, .pesukim-wrapper, .pesukim-help, .advanced-version-details, .translation-version-control').toggle(!citationOnly);
  $('.insert-citation-help').show();
}

function normalizeOptionText(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    .replace(/^[\s\-–—:•·]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function showInsertWarning(message) {
  var warningText = String(message || 'Could not insert at the current selection. Place the cursor where you want the source inserted, then try again.').trim();
  $('.insert-warning').remove();
  $('.suggestions').prepend("<div class='insert-warning' role='alert' aria-live='assertive'>" + escapeHTML(warningText) + "</div>");
}

function buildSefariaOpenUrl() {
  if (!data || !data.ref) {
    return '';
  }
  var refSlug = encodeURIComponent(data.ref).replace(/%20/g, '_');
  var params = new URLSearchParams();
  var outputMode = $('.output-mode-selection').val();
  if (outputMode === 'he') params.set('lang', 'he');
  else if (outputMode === 'en') params.set('lang', 'en');
  else params.set('lang', 'bi');

  var selectedTranslationVersion = $('.translation-version-select').val() || data.versionTitle || '';
  var selectedSourceVersion = $('.he-version-selection').val() || data.heVersionTitle || '';
  if (outputMode !== 'he' && selectedTranslationVersion) params.set('ven', selectedTranslationVersion);
  if (outputMode !== 'en' && selectedSourceVersion) params.set('vhe', selectedSourceVersion);

  var query = params.toString();
  return query ? "https://www.sefaria.org/" + refSlug + "?" + query : "https://www.sefaria.org/" + refSlug;
}

function normalizeUnifiedReferenceInput(value) {
  var normalized = String(value || '').trim();
  if (!normalized) return '';
  normalized = normalized
    .replace(/[־‐-―]/g, '-')
    .replace(/[“”„‟″״]/g, '"')
    .replace(/[‘’‚‛′׳]/g, "'")
    .replace(/[‎‏‪-‮]/g, '')
    .replace(/׃/g, ':')
    .replace(/\s*[:：]\s*/g, ':')
    .replace(/\s*[-–—]\s*/g, '-')
    .replace(/([֐-׿])["'׳״]+(?=[\s:.-]|$)/g, '$1')
    .replace(/([֐-׿])["'׳״]+(?=[֐-׿])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized;
}

function isLikelyHebrewScriptInput(value) {
  var normalized = String(value || '').trim();
  return /[\u0590-\u05FF]/.test(normalized) && !/[A-Za-z]/.test(normalized);
}

function normalizeLatinLookupTitleCase(value) {
  var input = String(value || '').trim();
  if (!input || !/[A-Za-z]/.test(input) || /[\u0590-\u05FF]/.test(input) || !Array.isArray(titles)) {
    return input;
  }

  var lowerInput = input.toLowerCase();
  var bestMatch = '';
  var bestMatchLength = 0;

  titles.forEach(function (title) {
    var candidate = String(title || '').trim();
    if (!candidate || !/[A-Za-z]/.test(candidate)) return;
    var lowerCandidate = candidate.toLowerCase();
    if (lowerInput !== lowerCandidate && lowerInput.indexOf(lowerCandidate + " ") !== 0 && lowerInput.indexOf(lowerCandidate + ":") !== 0) {
      return;
    }
    if (candidate.length > bestMatchLength) {
      bestMatch = candidate;
      bestMatchLength = candidate.length;
    }
  });

  if (!bestMatch) return input;
  return bestMatch + input.slice(bestMatchLength);
}

function mapSefariaRefSlugToLookupRef(slug) {
  var decoded = String(slug || '').trim();
  if (!decoded) return '';
  try {
    decoded = decodeURIComponent(decoded);
  } catch (error) {}
  decoded = decoded.replace(/^\/+/, '').replace(/\/+?/g, '/').replace(/_/g, ' ');
  decoded = decoded.replace(/\/+$/g, '').replace(/\/+/g, '/');
  var parts = decoded.split('/').filter(Boolean);
  if (!parts.length) return '';
  var titlePart = parts[0];
  var sectionPart = parts.slice(1).join(':');
  return sectionPart ? titlePart + " " + sectionPart : titlePart;
}

function parseSefariaUrlInput(inputValue) {
  var raw = String(inputValue || '').trim();
  if (!raw) return null;

  var parsedUrl;
  try {
    parsedUrl = new URL(raw);
  } catch (error) {
    return null;
  }

  var host = (parsedUrl.hostname || '').toLowerCase();
  if (host.indexOf('sefaria.org') < 0) return null;

  var path = (parsedUrl.pathname || '').replace(/^\/+/, '');
  if (!path) return null;

  var blockedRoots = { api: true, texts: true, sheets: true, topics: true, collections: true, account: true, profile: true, help: true };
  var slug = path.split('/')[0] || '';
  if (!slug || blockedRoots[slug.toLowerCase()]) return null;

  var ref = mapSefariaRefSlugToLookupRef(path);
  if (!ref) return null;

  var lang = (parsedUrl.searchParams.get('lang') || '').toLowerCase().trim();
  var outputMode = 'both';
  if (lang === 'en') outputMode = 'en';
  else if (lang === 'he') outputMode = 'he';

  return {
    ref: ref,
    outputMode: outputMode,
    preferredVersions: {
      en: parsedUrl.searchParams.get('ven') || '',
      he: parsedUrl.searchParams.get('vhe') || ''
    }
  };
}

function updateActionabilityUI(state) {
  var isActionable = !!(state && state.isInsertable);
  $('.display-section, .layout-section, .options-section, .versions-section').toggleClass('section-muted', !isActionable);
}

function syncDisplayModeCards() {
  var outputMode = $('.output-mode-selection').val();
  $('.mode-card').each(function () {
    var isSelected = $(this).attr('data-mode') === outputMode;
    $(this).toggleClass('selected', isSelected);
    $(this).attr('aria-checked', isSelected ? 'true' : 'false');
  });
}

function syncLayoutCards() {
  var selectedLayout = $('.bilingual-layout-selection').val();
  $('.layout-option').each(function () {
    var isSelected = $(this).attr('data-layout') === selectedLayout;
    $(this).toggleClass('selected', isSelected);
    $(this).attr('aria-pressed', isSelected ? 'true' : 'false');
  });
}

function isResolvedReference(response) {
  return !!(response && response.ref && response.indexTitle && !response.error);
}

function hasRenderableText(value) {
  if (Array.isArray(value)) return value.some(function (part) { return hasRenderableText(part); });
  if (value === null || value === undefined) return false;
  var stripped = String(value).replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
  return stripped.length > 0;
}

function buildDepthPrompt(response) {
  var sectionNames = (response && Array.isArray(response.sectionNames)) ? response.sectionNames.filter(Boolean) : [];
  if (sectionNames.length >= 2) return "Enter " + sectionNames[0] + " and optionally a " + sectionNames[1] + ". Specify a range with '-'.";
  if (sectionNames.length === 1) return "Enter " + sectionNames[0] + ". Specify a range with '-'.";
  return "Enter a valid reference to insert.";
}

function getResolvedNodeState(response) {
  var resolved = isResolvedReference(response);
  var hasText = hasRenderableText(response && response.text);
  var hasHebrew = hasRenderableText(response && response.he);
  var isInsertable = resolved && (hasText || hasHebrew);
  var isStructural = resolved && !isInsertable;
  return {
    resolved: resolved,
    hasText: hasText,
    hasHebrew: hasHebrew,
    isInsertable: isInsertable,
    isStructural: isStructural,
    prompt: buildDepthPrompt(response)
  };
}

function formatBreadcrumb(refValue) {
  var ref = String(refValue || '').trim();
  if (!ref) return '';
  var commaParts = ref.split(',').map(function (part) { return part.trim(); }).filter(Boolean);
  if (commaParts.length <= 1) return ref;
  var title = commaParts[0];
  var pathPart = commaParts.slice(1).join(', ');
  var pathPieces = pathPart.split(':').map(function (part) { return part.trim(); }).filter(Boolean);
  if (!pathPieces.length) return ref;
  return [title].concat(pathPieces).join(' › ');
}

function buildPreviewMeta(primaryRef, fallbackRef) {
  var breadcrumb = formatBreadcrumb(primaryRef);
  if (!breadcrumb && fallbackRef && fallbackRef.indexTitle && Array.isArray(fallbackRef.sections)) {
    breadcrumb = [fallbackRef.indexTitle].concat(fallbackRef.sections).join(' › ');
  }
  var fallback = '';
  if (typeof fallbackRef === 'string') fallback = fallbackRef.trim();
  else if (fallbackRef && typeof fallbackRef === 'object') fallback = String(fallbackRef.ref || fallbackRef.heRef || primaryRef || '').trim();
  else fallback = String(primaryRef || '').trim();
  var display = breadcrumb || fallback;
  return "<div class='preview-meta'>" + escapeHTML(display) + "</div>";
}

function buildNonInsertableMessage(response) {
  var state = getResolvedNodeState(response);
  return buildPreviewMeta(response && (response.ref || response.heRef), response || '') +
    "<div class='noninsertable-warning'><h4 class='preview-state-title'>This is a section, not a directly insertable text.</h4><p class='preview-state-message'>Choose a subsection or more specific reference to preview and insert.</p><p class='preview-state-message'>" +
    escapeHTML(state.prompt) + "</p></div>";
}

function clearVersionSelectors() {
  $('.translation-version-control').empty();
  $('.hebrew-version-control').empty();
}

function setResultsHint(message, allowHtml) {
  var text = String(message || '').trim();
  var $hint = $('.results-hint');
  if (!text) {
    $hint.hide().empty();
    return;
  }
  if (allowHtml) {
    $hint.html(message).show();
  } else {
    $hint.text(text).show();
  }
}

function setResultsLoading(isLoading) {
  resultsLoading = !!isLoading;
  $('.results-panel').toggleClass('is-loading', resultsLoading);
  if (!$('.results-loading-indicator').length) {
    $('.results-header').append("<div class='results-loading-indicator' aria-live='polite' style='display:none;'><span class='preview-loading-spinner' aria-hidden='true'></span><span>Searching…</span></div>");
  }
  $('.results-loading-indicator').toggle(resultsLoading);
}

function normalizeFuzzyText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '')
    .replace(/[_.,/#!$%^&*;:{}=\\\-`~()\[\]"'׳״]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitReferenceForFuzzy(query) {
  var raw = String(query || '').trim();
  if (!raw) return { titlePart: '', suffixPart: '' };
  var match = raw.match(/^(.*?)(\s+[\d\u05D0-\u05EA].*)$/);
  if (!match) return { titlePart: raw, suffixPart: '' };
  return { titlePart: String(match[1] || '').trim(), suffixPart: String(match[2] || '') };
}

function levenshteinDistance(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (!a) return b.length;
  if (!b) return a.length;
  var matrix = [];
  for (var i = 0; i <= b.length; i++) matrix[i] = [i];
  for (var j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      var cost = a.charAt(j - 1) === b.charAt(i - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

function getFuzzyReferenceSuggestions(query) {
  var split = splitReferenceForFuzzy(query);
  var titlePart = normalizeFuzzyText(split.titlePart);
  if (!titlePart || titlePart.length < 2 || !Array.isArray(titles) || !titles.length) return [];
  var queryLooksHebrew = isLikelyHebrewScriptInput(split.titlePart);
  var firstChar = titlePart.charAt(0);
  var scored = titles.map(function (title) {
    var rawTitle = String(title || '').trim();
    var normalizedTitle = normalizeFuzzyText(rawTitle);
    if (!normalizedTitle) return null;
    var titleIsHebrew = isLikelyHebrewScriptInput(rawTitle);
    if (queryLooksHebrew !== titleIsHebrew) return null;
    if (firstChar && normalizedTitle.charAt(0) !== firstChar && normalizedTitle.indexOf(titlePart) !== 0 && titlePart.indexOf(normalizedTitle) !== 0) return null;
    var distance = levenshteinDistance(titlePart, normalizedTitle);
    var maxLen = Math.max(titlePart.length, normalizedTitle.length, 1);
    var ratio = distance / maxLen;
    var startsBonus = normalizedTitle.indexOf(titlePart) === 0 ? -0.25 : 0;
    var containsBonus = normalizedTitle.indexOf(titlePart) >= 0 ? -0.15 : 0;
    var score = ratio + startsBonus + containsBonus;
    if (ratio > 0.55 && normalizedTitle.indexOf(titlePart) < 0 && titlePart.indexOf(normalizedTitle) < 0) return null;
    return { rawTitle: rawTitle, score: score };
  }).filter(Boolean).sort(function (a, b) {
    if (a.score !== b.score) return a.score - b.score;
    return a.rawTitle.localeCompare(b.rawTitle);
  });

  var seen = {};
  return scored.filter(function (entry) {
    var suggestion = entry.rawTitle + split.suffixPart;
    if (seen[suggestion]) return false;
    seen[suggestion] = true;
    return suggestion.toLowerCase() !== String(query || '').trim().toLowerCase();
  }).slice(0, MAX_FUZZY_SUGGESTIONS).map(function (entry) {
    return entry.rawTitle + split.suffixPart;
  });
}

function renderFuzzySuggestions(query) {
  var suggestions = getFuzzyReferenceSuggestions(query);
  if (!suggestions.length) return;
  var html = "<div class='results-suggestion-wrap'><div class='results-suggestion-title'>Did you mean</div><div class='results-suggestion-buttons'>" + suggestions.map(function (suggestion) {
    return "<button type='button' class='results-suggestion-button' data-suggested-query='" + escapeHTML(suggestion) + "'>" + escapeHTML(suggestion) + "</button>";
  }).join('') + "</div></div>";
  setResultsHint(html, true);
}

function maybeShowZeroResultsSuggestions(input) {
  var hasRawResults = getAllRawResults().length > 0;
  var currentHint = $.trim($('.results-hint').text());
  if (!hasRawResults && !currentHint) {
    renderFuzzySuggestions(input);
  }
}

function describeResultLanguages(item) {
  var available = Array.isArray(item && item.availableLangs) ? item.availableLangs : [];
  if (!available.length) return 'Language not specified';
  var labelMap = { en: 'English', he: 'Hebrew', es: 'Spanish', fr: 'French', de: 'German', ru: 'Russian', ar: 'Arabic' };
  var unique = [];
  available.forEach(function (lang) {
    var normalized = String(lang || '').toLowerCase();
    if (unique.indexOf(normalized) < 0) unique.push(normalized);
  });
  return unique.map(function (lang) { return labelMap[lang] || lang.toUpperCase(); }).join(', ');
}

function getCorpusAccentClass(corpusKey) {
  return corpusColorClassMap[String(corpusKey || '').toLowerCase()] || 'corpus-accent-default';
}


function getCheckedValues(selector) {
  return $(selector).map(function () {
    return $(this).is(':checked') ? $(this).val() : null;
  }).get().filter(Boolean);
}

function updateMultiSelectButtonLabel(dropdownSelector, values, fallbackText, labelMap) {
  labelMap = labelMap || null;
  var labels = values.map(function (value) {
    return labelMap && labelMap[value] ? labelMap[value] : value;
  });
  var text = labels.length ? labels.join(', ') : fallbackText;
  $(dropdownSelector + ' .multi-select-button-text').text(text);
}


function syncCompactTranslationLanguageUI() {
  var selected = getCheckedValues('.translation-language-option');
  var anySelected = !selected.length || !$('.translation-only-filter').is(':checked');
  $('.translation-language-choice').removeClass('active');
  if (anySelected) {
    $('.translation-language-choice[data-lang="any"]').addClass('active');
  } else {
    selected.forEach(function (lang) {
      $('.translation-language-choice[data-lang="' + lang + '"]').addClass('active');
    });
  }
}

function updateTranslationLanguageVisibility() {
  var selectedValues = getCheckedValues('.translation-language-option');
  var useAny = !selectedValues.length || $('.translation-language-any').is(':checked');
  $('.translation-language-any').prop('checked', useAny);
  if (useAny) {
    $('.translation-language-option').prop('checked', false);
    $('.translation-only-filter').prop('checked', false);
    $('.translation-language-choice').removeClass('active');
    $('.translation-language-choice[data-lang="any"]').addClass('active');
  } else {
    $('.translation-only-filter').prop('checked', true);
    $('.translation-language-choice').removeClass('active');
    selectedValues.forEach(function(lang){ $('.translation-language-choice[data-lang="' + lang + '"]').addClass('active'); });
  }
}

function updateQueryIntel(input) { return; }






var sessionLibrary = { pinned: [], inserted: [] };

function loadSessionLibrary() {
  try {
    sessionLibrary = JSON.parse(localStorage.getItem('sefariaSidebarSessionLibrary') || '{"pinned":[],"inserted":[]}');
    if (!sessionLibrary || typeof sessionLibrary !== 'object') throw new Error('bad');
    if (!Array.isArray(sessionLibrary.pinned)) sessionLibrary.pinned = [];
    if (!Array.isArray(sessionLibrary.inserted)) sessionLibrary.inserted = [];
  } catch (e) {
    sessionLibrary = { pinned: [], inserted: [] };
  }
}

function saveSessionLibrary() {
  try { localStorage.setItem('sefariaSidebarSessionLibrary', JSON.stringify(sessionLibrary)); } catch (e) {}
}

function buildSessionEntry(ref, label, corpusLabel) {
  var rawLabel = String(label || ref || '').split(' › ')[0].split(',')[0].trim();
  return { ref: ref, label: rawLabel || ref, corpusLabel: String(corpusLabel || 'Other') };
}

function upsertSessionEntry(listName, entry) {
  if (!entry || !entry.ref) return;
  var list = sessionLibrary[listName] || [];
  list = list.filter(function(item){ return item && item.ref !== entry.ref; });
  list.unshift(entry);
  sessionLibrary[listName] = list.slice(0, 12);
  saveSessionLibrary();
  renderSessionLibrary();
}

function removeSessionEntry(listName, ref) {
  sessionLibrary[listName] = (sessionLibrary[listName] || []).filter(function(item){ return item && item.ref !== ref; });
  saveSessionLibrary();
  renderSessionLibrary();
}


function getCurrentCorpusForRef(ref) {
  var allItems = getAllProcessedResults().concat(getAllRawResults());
  var match = allItems.find(function(item){ return item && item.ref === ref; });
  return match ? getResultCorpusLabel(match, 'Other') : 'Other';
}

function isPinnedRef(ref) {
  return (sessionLibrary.pinned || []).some(function(item){ return item && item.ref === ref; });
}

function togglePinnedRef(ref, label) {
  if (!ref) return;
  if (isPinnedRef(ref)) removeSessionEntry('pinned', ref);
  else upsertSessionEntry('pinned', buildSessionEntry(ref, label, getCurrentCorpusForRef(ref)));
  renderResults();
}

function renderSessionLibrary() {
  var $panel = $('.session-library-panel');
  var $pinned = $('.pinned-results');
  var $inserted = $('.inserted-results');
  if (!$panel.length) return;
  $pinned.empty(); $inserted.empty();

  function renderGrouped($target, items, allowRemove) {
    var groups = {};
    (items || []).forEach(function(item){
      var corpus = String((item && item.corpusLabel) || 'Other');
      if (!groups[corpus]) groups[corpus] = [];
      groups[corpus].push(item);
    });
    Object.keys(groups).sort().forEach(function(corpus){
      $target.append("<li class='session-corpus-group'>" + escapeHTML(corpus) + "</li>");
      groups[corpus].forEach(function(item){
        var removeBtn = allowRemove ? "<button type='button' class='session-library-remove' data-list='pinned' data-ref='" + escapeHTML(item.ref) + "' aria-label='Remove pinned item'>×</button>" : "";
        $target.append("<li class='result-item session-library-item' data-ref='" + escapeHTML(item.ref) + "' data-list='" + (allowRemove ? "pinned" : "inserted") + "' role='button' tabindex='0'><div class='result-title session-library-label'>" + escapeHTML(item.label || item.ref) + "</div>" + removeBtn + "</li>");
      });
    });
  }

  renderGrouped($pinned, sessionLibrary.pinned || [], true);
  renderGrouped($inserted, sessionLibrary.inserted || [], false);
  $panel.toggle(!!(sessionLibrary.pinned.length || sessionLibrary.inserted.length));
}

function saveRecentResult(item) { return; }

function renderRecentResults() { return; }

function focusResultByIndex(index) {
  var $items = $('.result-item');
  if (!$items.length) return;
  keyboardResultIndex = Math.max(0, Math.min(index, $items.length - 1));
  $items.removeClass('is-nav-target');
  var $target = $items.eq(keyboardResultIndex);
  $target.addClass('is-nav-target').focus();
}

function getSearchParameters() {
  var sortMode = $('.search-sort-select').length ? ($('.search-sort-select').val() || 'relevance') : 'relevance';
  var translationOnly = $('.translation-only-filter').length ? $('.translation-only-filter').is(':checked') : false;
  var translationLanguages = [];
  if (translationOnly && !$('.translation-language-any').is(':checked')) {
    translationLanguages = getCheckedValues('.translation-language-option');
  }
  var relevanceSort = sortMode === 'relevance';
  return { filters: [], relevanceSort: relevanceSort, sortMode: sortMode, translationOnly: translationOnly, translationLanguages: translationLanguages };
}

function resetResultPostProcessState() {
  resultPostProcessState = { availableCorpora: [], removedCorpora: [] };
}

function getAllProcessedResults() {
  return queryState.libraryMatches.concat(queryState.searchResults).filter(function (item) { return item && item.ref; });
}

function getAllRawResults() {
  return queryState.rawLibraryMatches.concat(queryState.rawSearchResults).filter(function (item) { return item && item.ref; });
}

function getResultCorpusLabel(item, fallbackLabel) {
  return String((item && (item.clusterLabel || item.typeLabel || fallbackLabel)) || 'Other').trim() || 'Other';
}

function getResultCorpusKey(item, fallbackLabel) {
  return getResultCorpusLabel(item, fallbackLabel)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'other';
}

function syncAvailableCorpusFilters() {
  var seen = {};
  resultPostProcessState.availableCorpora = getAllRawResults().map(function (item) {
    return {
      key: getResultCorpusKey(item, 'Results'),
      label: getResultCorpusLabel(item, 'Results')
    };
  }).filter(function (entry) {
    if (!entry.key || seen[entry.key]) return false;
    seen[entry.key] = true;
    return true;
  });
  resultPostProcessState.removedCorpora = resultPostProcessState.removedCorpora.filter(function (key) {
    return resultPostProcessState.availableCorpora.some(function (entry) { return entry.key === key; });
  });
}

function ensureResultFilterUI() {
  if ($('.result-filter-strip').length) {
    return;
  }
  $('.results-header').after("<div class='result-filter-strip' style='display:none;'></div>");
}

function renderResultFilterStrip() {
  ensureResultFilterUI();
  var $strip = $('.result-filter-strip');
  if (!resultPostProcessState.availableCorpora.length) {
    $strip.hide().empty();
    $('.results-restore-button').hide();
    return;
  }

  var html = "<div class='result-filter-strip-label'>Corpus filters</div>" + resultPostProcessState.availableCorpora.map(function (entry) {
    var isRemoved = resultPostProcessState.removedCorpora.indexOf(entry.key) >= 0;
    var chipClass = isRemoved ? 'result-filter-chip removed' : 'result-filter-chip';
    var actionLabel = isRemoved ? 'Restore' : 'Hide';
    var symbol = isRemoved ? '↺' : '×';
    var accentClass = getCorpusAccentClass(entry.key);
    return "<button type='button' class='" + chipClass + " " + accentClass + "' data-corpus-key='" + escapeHTML(entry.key) + "' aria-pressed='" + (isRemoved ? 'true' : 'false') + "' title='" + actionLabel + " " + escapeHTML(entry.label) + "'>" +
      "<span class='result-filter-chip-label'>" + escapeHTML(entry.label) + "</span>" +
      "<span class='result-filter-chip-action' aria-hidden='true'>" + symbol + "</span>" +
      "</button>";
  }).join('');

  $strip.html(html).show();
  $('.results-restore-button').toggle(resultPostProcessState.removedCorpora.length > 0);
}

function resetSelectedResultView() {
  selectedResultKey = null;
  selectedResultSummary = null;
  selectedRefValue = null;
  resultsCollapsed = false;
  hasResolvedReference = false;
  setInsertButtonState(false);
  $('#open-on-sefaria').prop('disabled', true);
  data = {};
  clearVersionSelectors();
  updatePesukimAvailability(null);
  $('.result-item').removeClass('selected').attr('aria-pressed', 'false');
  $('.suggestions').html("<b>Select a result to preview it.</b>");
  updateActionabilityUI({ isInsertable: false });
}

function ensureSelectedResultStillVisible() {
  if (!selectedResultKey) {
    return;
  }
  var stillVisible = getAllProcessedResults().some(function (item) { return item.key === selectedResultKey; });
  if (!stillVisible) {
    resetSelectedResultView();
  }
}

function applyResultPostProcessing() {
  syncAvailableCorpusFilters();
  var removedLookup = {};
  resultPostProcessState.removedCorpora.forEach(function (key) {
    removedLookup[key] = true;
  });
  var searchParameters = getSearchParameters();
  var filterItems = function (items, fallbackLabel) {
    return applyClientSideSearchFilters(items, searchParameters).filter(function (item) {
      return !removedLookup[getResultCorpusKey(item, fallbackLabel)];
    });
  };

  queryState.libraryMatches = dedupeResultItems(filterItems(queryState.rawLibraryMatches, 'Library matches'));
  queryState.searchResults = dedupeResultItems(filterItems(queryState.rawSearchResults, 'Search results'));
  ensureSelectedResultStillVisible();
  renderResultFilterStrip();
  setResultsLoading(false);
}


function reprocessAndRenderResults() {
  applyResultPostProcessing();
  renderResults();
}

function toggleCorpusVisibility(corpusKey) {
  var existingIndex = resultPostProcessState.removedCorpora.indexOf(corpusKey);
  if (existingIndex >= 0) {
    resultPostProcessState.removedCorpora.splice(existingIndex, 1);
  } else {
    resultPostProcessState.removedCorpora.push(corpusKey);
  }
  reprocessAndRenderResults();
}

function renderResultGroup(selector, items, groupName) {
  var $list = $(selector);
  $list.empty();
  if (!items.length) {
    $list.append("<li class='result-subtitle'>No " + groupName.toLowerCase() + ".</li>");
    return;
  }

  var lastCluster = '';
  items.forEach(function (item) {
    var cluster = getResultCorpusLabel(item, groupName);
    var corpusKey = getResultCorpusKey(item, groupName);
    var accentClass = getCorpusAccentClass(corpusKey);
    if (cluster && cluster !== lastCluster) {
      $list.append("<li class='result-group-header " + accentClass + "'><span class='result-cluster-label'>" + escapeHTML(cluster) + "</span><button type='button' class='result-group-remove' data-corpus-key='" + escapeHTML(corpusKey) + "'>Remove</button></li>");
      lastCluster = cluster;
    }
    var selectedClass = item.key === selectedResultKey ? 'selected' : '';
    var metaLine = "<div class='result-meta'><span>" + escapeHTML(cluster) + "</span><span> • </span><span>" + escapeHTML(describeResultLanguages(item)) + "</span></div>";
    var subtitle = item.subtitle ? "<div class='result-subtitle'>" + escapeHTML(item.subtitle) + "</div>" : '';
    var snippet = item.snippet ? "<div class='result-snippet'>" + item.snippet + "</div>" : subtitle;
    $list.append("<li class='result-item result-row " + accentClass + " " + selectedClass + "' data-key='" + escapeHTML(item.key) + "' data-ref='" + escapeHTML(item.ref) + "' role='button' tabindex='0' aria-pressed='" + (item.key === selectedResultKey ? 'true' : 'false') + "'><div class='result-row-main'><div class='result-title'>" + escapeHTML(item.label) + "</div><button type='button' class='result-pin-button' data-ref='" + escapeHTML(item.ref) + "' data-label='" + escapeHTML(item.label) + "' aria-label='" + (isPinnedRef(item.ref) ? "Unpin result" : "Pin result") + "'>" + (isPinnedRef(item.ref) ? "★" : "☆") + "</button></div>" + metaLine + snippet + "</li>");
  });
}


function renderResults() {
  renderResultGroup('.library-results', queryState.libraryMatches, 'Library matches');
  renderResultGroup('.search-results', queryState.searchResults, 'Search results');
  updateResultsVisibility();
}

function updateResultsVisibility() {
  var shouldCollapse = resultsCollapsed && !!selectedResultSummary;
  $('.results-lists').toggle(!shouldCollapse);
  $('.results-toggle-button').toggle(!!selectedResultSummary).text(shouldCollapse ? 'Show results' : 'Hide results');
  if (shouldCollapse) {
    $('.selected-result-summary').html("<strong>" + escapeHTML(selectedResultSummary.label) + "</strong>" + (selectedResultSummary.subtitle ? "<div>" + escapeHTML(selectedResultSummary.subtitle) + "</div>" : '') + (selectedResultSummary.status ? "<div class='helper-text'>" + escapeHTML(selectedResultSummary.status) + "</div>" : '')).show();
  } else {
    $('.selected-result-summary').hide().empty();
  }
}

function clearSelectedResult() {
  resetResultPostProcessState();
  queryState = { rawLibraryMatches: [], rawSearchResults: [], libraryMatches: [], searchResults: [] };
  resetSelectedResultView();
  updateResultsVisibility();
  renderResultFilterStrip();
}

function compareResultsAlphabetically(a, b, direction) {
  var left = String((a && (a.label || a.ref)) || '').toLowerCase();
  var right = String((b && (b.label || b.ref)) || '').toLowerCase();
  return direction === 'desc' ? right.localeCompare(left) : left.localeCompare(right);
}

function itemMatchesTranslationLanguages(item, languages) {
  if (!item || item.hasTranslation === false) return false;
  var selected = Array.isArray(languages) ? languages.filter(Boolean) : [];
  if (!selected.length) return item.hasTranslation !== false;
  var available = Array.isArray(item.availableLangs) ? item.availableLangs.map(function (lang) { return String(lang || '').toLowerCase(); }) : [];
  if (!available.length) return selected.indexOf('en') >= 0 && item.hasTranslation !== false;
  return selected.some(function (lang) { return available.indexOf(String(lang || '').toLowerCase()) >= 0; });
}

function dedupeResultItems(items) {
  var seen = {};
  var out = [];
  (items || []).forEach(function(item) {
    if (!item || !item.ref) return;
    var key = String(item.ref).trim().toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    out.push(item);
  });
  return out;
}

function applyClientSideSearchFilters(items, searchParameters) {
  var filtered = Array.isArray(items) ? items.slice() : [];
  if (searchParameters && searchParameters.translationOnly) {
    filtered = filtered.filter(function (item) { return itemMatchesTranslationLanguages(item, searchParameters.translationLanguages); });
  }
  if (searchParameters && searchParameters.sortMode === 'alphabetical-asc') {
    filtered.sort(function (a, b) { return compareResultsAlphabetically(a, b, 'asc'); });
  } else if (searchParameters && searchParameters.sortMode === 'alphabetical-desc') {
    filtered.sort(function (a, b) { return compareResultsAlphabetically(a, b, 'desc'); });
  }
  return filtered;
}

function maybeAutoSelectSingleResult() {
  var allResults = queryState.libraryMatches.concat(queryState.searchResults).filter(function (item) { return item && item.ref; });
  if (allResults.length !== 1) return;
  var only = allResults[0];
  if (!only || !only.key || selectedResultKey === only.key) return;
  selectedResultKey = only.key;
  selectedResultSummary = { label: only.label || only.ref, subtitle: only.subtitle || '' };
  resultsCollapsed = true;
  renderResults();
  resolveSelectedResult(only.ref, only.label || only.ref);
}

function formatRefForResult(ref) {
  var clean = String(ref || '').trim();
  var chunks = clean.split(',').map(function (part) { return part.trim(); }).filter(Boolean);
  if (chunks.length <= 1) return { label: clean, subtitle: '' };
  return { label: chunks[0], subtitle: chunks.slice(1).join(' › ') };
}

function buildResultFromSource(source, fallbackRef, keyPrefix, index, snippet, typeLabel) {
  var ref = source.ref || fallbackRef || '';
  var display = formatRefForResult(ref);
  var sourcePath = Array.isArray(source.path) ? source.path.filter(Boolean) : (typeof source.path === 'string' ? source.path.split('/').map(function (part) { return part.trim(); }).filter(Boolean) : []);
  var breadcrumb = sourcePath.length > 1 ? sourcePath.slice(0, -1).join(' › ') : (display.subtitle || source.heRef || '');
  var availableLangs = Array.isArray(source && source.availableLangs) ? source.availableLangs.map(function (lang) { return String(lang || '').toLowerCase(); }).filter(Boolean) : (Array.isArray(source && source.versions) ? source.versions.map(function (version) { return String((version && version.language) || '').toLowerCase(); }).filter(Boolean) : []);
  var clusterLabel = source.primary_category || (Array.isArray(source.categories) ? source.categories[0] : '') || typeLabel;

  return {
    key: keyPrefix + "-" + index + "-" + (ref || index),
    ref: ref,
    label: sourcePath[sourcePath.length - 1] || display.label || ref || 'Result',
    subtitle: breadcrumb,
    snippet: snippet,
    typeLabel: typeLabel,
    clusterLabel: clusterLabel,
    availableLangs: availableLangs,
    hasTranslation: source && (source.hasEn !== false && source.availableLangs ? source.availableLangs.indexOf('en') >= 0 : (Array.isArray(source.versions) ? source.versions.some(function (version) { return version && version.language === 'en'; }) : true))
  };
}

function runUnifiedQuery() {
  var input = normalizeUnifiedReferenceInput(($('.input').val() || '').trim());
  $('.input').val(input);
  clearSelectedResult();
  setResultsHint('');
  setResultsLoading(true);
  pendingPreferredVersions = null;

  if (!input) {
    queryState = { rawLibraryMatches: [], rawSearchResults: [], libraryMatches: [], searchResults: [] };
    resetResultPostProcessState();
    reprocessAndRenderResults();
    updateActionabilityUI({ isInsertable: false });
    $('.suggestions').html("<b>Please enter a reference, title, or phrase.</b>");
    setResultsLoading(false);
    return;
  }

  var sefariaUrlInput = parseSefariaUrlInput(input);
  if (sefariaUrlInput) {
    $('.output-mode-selection').val(sefariaUrlInput.outputMode);
    syncDisplayModeCards();
    updateBilingualLayoutVisibility();
    updateTranslationDetailsVisibility();
    updateVersionControlsVisibility();

    pendingPreferredVersions = sefariaUrlInput.preferredVersions;
    resetResultPostProcessState();
    queryState.rawLibraryMatches = [{
      key: "library-ref-" + sefariaUrlInput.ref,
      ref: sefariaUrlInput.ref,
      label: sefariaUrlInput.ref,
      subtitle: 'Parsed from Sefaria URL',
      typeLabel: 'Library',
      hasTranslation: true,
      availableLangs: ['en']
    }];
    queryState.rawSearchResults = [];
    reprocessAndRenderResults();

    selectedResultKey = queryState.libraryMatches[0].key;
    selectedResultSummary = { label: sefariaUrlInput.ref, subtitle: 'Parsed from Sefaria URL' };
    resultsCollapsed = true;
    updateResultsVisibility();
    setResultsLoading(false);
    resolveSelectedResult(sefariaUrlInput.ref, sefariaUrlInput.ref);
    return;
  }

  var prefixTitles = titles
    .filter(function (title) { return title && title.toUpperCase().indexOf(input.toUpperCase()) === 0; })
    .slice(0, 6)
    .map(function (title, index) {
      return {
        key: "library-title-" + index + "-" + title,
        ref: title,
        label: title,
        subtitle: 'Title match',
        typeLabel: 'Library',
        hasTranslation: true,
        availableLangs: ['en']
      };
    });

  var directLookupInput = normalizeLatinLookupTitleCase(input);
  var directRefMatch = {
    key: "library-ref-" + directLookupInput,
    ref: directLookupInput,
    label: input,
    subtitle: 'Direct reference lookup',
    typeLabel: 'Library',
    hasTranslation: true,
    availableLangs: ['en']
  };

  var isHebrewScript = isLikelyHebrewScriptInput(input);
  resetResultPostProcessState();
  queryState.rawLibraryMatches = prefixTitles;
  queryState.rawSearchResults = [];
  reprocessAndRenderResults();

  var requestId = ++latestQueryRequestId;
  var validationRequestId = ++latestDirectRefValidationRequestId;
  var pendingAsyncResultGroups = 2;
  function finishResultGroup() {
    if (requestId !== latestQueryRequestId) return;
    pendingAsyncResultGroups = Math.max(0, pendingAsyncResultGroups - 1);
    if (pendingAsyncResultGroups === 0) {
      setResultsLoading(false);
      maybeShowZeroResultsSuggestions(input);
      maybeAutoSelectSingleResult();
    }
  }

  google.script.run.withSuccessHandler(function (response) {
    if (validationRequestId !== latestDirectRefValidationRequestId || requestId !== latestQueryRequestId) return;
    var isValidDirectRef = getResolvedNodeState(response).resolved;
    if (isValidDirectRef) {
      queryState.rawLibraryMatches = [directRefMatch].concat(queryState.rawLibraryMatches).slice(0, 10);
      setResultsHint('');
    } else if (isHebrewScript) {
      setResultsHint('No direct library match for this Hebrew ref. Check spelling and try again.');
    }
    reprocessAndRenderResults();
    finishResultGroup();
  }).withFailureHandler(function () {
    if (validationRequestId !== latestDirectRefValidationRequestId || requestId !== latestQueryRequestId) return;
    if (isHebrewScript) setResultsHint('No direct library match for this Hebrew ref. Check spelling and try again.');
    finishResultGroup();
  }).findReference(directLookupInput);

  var searchParameters = getSearchParameters();
  google.script.run.withSuccessHandler(function (response) {
    if (requestId !== latestQueryRequestId) return;
    var hits = (Array.isArray(response) ? response : (((response || {}).hits || {}).hits || [])).slice(0, 24);
    var libraryPathHits = [];
    var contentHits = [];
    hits.forEach(function (hit, index) {
      var source = (hit && hit._source) ? hit._source : {};
      var snippet = hit && hit.highlight && hit.highlight.naive_lemmatizer && hit.highlight.naive_lemmatizer[0] ? hit.highlight.naive_lemmatizer[0] : '';
      var pathDepth = Array.isArray(source.path) ? source.path.filter(Boolean).length : (typeof source.path === 'string' ? source.path.split('/').filter(Boolean).length : 0);
      if (pathDepth > 1) {
        libraryPathHits.push(buildResultFromSource(source, source.ref, 'library-search', index, snippet, 'Library path'));
        return;
      }
      contentHits.push(buildResultFromSource(source, source.ref, 'search', index, snippet, 'Content hit'));
    });
    var filteredLibraryPathHits = applyClientSideSearchFilters(libraryPathHits, searchParameters).slice(0, 10);
    var filteredContentHits = applyClientSideSearchFilters(contentHits, searchParameters).slice(0, 12);
    queryState.rawLibraryMatches = queryState.rawLibraryMatches.concat(filteredLibraryPathHits).slice(0, 10);
    queryState.rawSearchResults = filteredContentHits;
    if (searchParameters.translationOnly && !queryState.libraryMatches.length && !queryState.searchResults.length) {
      setResultsHint('No results matched the selected translation language filter.');
    }
    reprocessAndRenderResults();
    finishResultGroup();
  }).withFailureHandler(function (error) {
    if (requestId !== latestQueryRequestId) return;
    queryState.rawSearchResults = [];
    if (error && error.message) setResultsHint(error.message);
    reprocessAndRenderResults();
    finishResultGroup();
  }).findSearchAdvanced(input, searchParameters);
}

function resolveSelectedResult(selectedRef, inputLabel) {
  selectedRefValue = selectedRef;
  var requestId = ++latestResolveRequestId;
  hasResolvedReference = false;
  setInsertButtonState(false);
  $('#open-on-sefaria').prop('disabled', true);
  updatePesukimAvailability(null);
  $('.suggestions').html(buildPreviewLoadingHTML('Loading preview…'));

  google.script.run.withSuccessHandler(function (response) {
    if (requestId !== latestResolveRequestId) return;
    var nodeState = getResolvedNodeState(response);
    if (nodeState.isInsertable) {
      if (selectedResultSummary) {
        selectedResultSummary.status = 'Ready to insert';
        updateResultsVisibility();
      }
      updateSuggestion(response, inputLabel);
      updatePesukimAvailability(response);
      updateActionabilityUI(nodeState);
      data = response;
      hasResolvedReference = true;
      setInsertButtonState(true);
      $('#open-on-sefaria').prop('disabled', false);
      return;
    }

    hasResolvedReference = false;
    setInsertButtonState(false);
    $('#open-on-sefaria').prop('disabled', true);
    if (selectedResultSummary) {
      selectedResultSummary.status = 'Choose a more specific ref';
      updateResultsVisibility();
    }
    clearVersionSelectors();
    updatePesukimAvailability(null);
    updateActionabilityUI(nodeState);
    $('.suggestions').html("<br>" + buildNonInsertableMessage(response));
  }).withFailureHandler(function () {
    if (requestId !== latestResolveRequestId) return;
    hasResolvedReference = false;
    setInsertButtonState(false);
    $('#open-on-sefaria').prop('disabled', true);
    clearVersionSelectors();
    updatePesukimAvailability(null);
    updateActionabilityUI({ isInsertable: false });
    $('.suggestions').html("<br><b>Enter a valid reference to insert.</b>");
  }).findReference(selectedRef);
}

function refreshSelectedResult() {
  if (!selectedRefValue) return;
  var fallbackLabel = selectedResultSummary && selectedResultSummary.label ? selectedResultSummary.label : selectedRefValue;
  resolveSelectedResult(selectedRefValue, fallbackLabel);
}

$('#insert-source').click(function () {
  if (!hasResolvedReference || !data || !data.ref) return;

  var outputMode = $('.output-mode-selection').val();
  var language = (outputMode === 'both') ? undefined : outputMode;
  var bilingualLayout = $('.bilingual-layout-selection').val();
  var showPesukim = Boolean($('.wants-pesukim').prop('checked'));
  var includeTranslationSourceInfo = $('.include-translation-source-info').is(':checked');
  var insertSefariaLink = $('.insert-sefaria-link').is(':checked');
  var input = $('.input').val();

  $('.hide').add($('.warning')).fadeIn('1000');
  google.script.run.withSuccessHandler(function () {
    $('.hide').add($('.warning')).fadeOut('1000');
    $('.insert-warning').remove();
    upsertSessionEntry('inserted', buildSessionEntry(data.ref, selectedResultSummary && selectedResultSummary.label ? selectedResultSummary.label : data.ref, getCurrentCorpusForRef(data.ref)));
    }).withFailureHandler(function (error) {
    $('.hide').add($('.warning')).fadeOut('1000');
    showInsertWarning(error && error.message);
  }).insertReference(
      data,
      language,
      showPesukim,
      input,
      includeTranslationSourceInfo,
      bilingualLayout,
      insertSefariaLink,
      $('.include-transliteration').is(':checked'),
      $('.insert-citation-only').is(':checked')
    );
});

$('#run-sefaria').off('click').on('click', runUnifiedQuery);

$('.input').on('input', function () {
  var value = $(this).val() || '';
  updateQueryIntel(value);
  if (searchDebounceHandle) clearTimeout(searchDebounceHandle);
  searchDebounceHandle = setTimeout(function () {
    if ((value || '').trim().length >= 2) runUnifiedQuery();
  }, 320);
});

$('.input').on('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    if (keyboardResultIndex >= 0 && $('.result-item').length) {
      $('.result-item').eq(keyboardResultIndex).trigger('click');
      return;
    }
    runUnifiedQuery();
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    focusResultByIndex(keyboardResultIndex + 1);
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    focusResultByIndex(keyboardResultIndex <= 0 ? 0 : keyboardResultIndex - 1);
  }
});

$(document).on('keydown', function (event) {
  if (event.key === '/' && !$(event.target).is('input, textarea, select')) {
    event.preventDefault();
    $('.input').focus();
  }
});

$('.wants-relevance, .search-sort-select, .translation-language-option, .translation-only-filter').on('change', function () {
  updateTranslationLanguageVisibility();
  saveLastUsedSearchSettings();
  if (getAllRawResults().length) {
    reprocessAndRenderResults();
  } else if (($('.input').val() || '').trim()) {
    runUnifiedQuery();
  }
});

$('.results-panel').on('click keydown', '.result-item', function (event) {
  if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();

  var key = $(this).attr('data-key');
  var item = queryState.libraryMatches.concat(queryState.searchResults).find(function (result) { return result.key === key; });
  if (!item) return;

  selectedResultKey = item.key;
  selectedResultSummary = { label: item.label || item.ref, subtitle: item.subtitle || '' };
  resultsCollapsed = true;
  $('.result-item').removeClass('selected').attr('aria-pressed', 'false');
  $(this).addClass('selected').attr('aria-pressed', 'true');
  updateResultsVisibility();
  resolveSelectedResult(item.ref, item.label || item.ref);
});

$('.results-panel').on('click', '.result-group-remove', function (event) {
  event.preventDefault();
  event.stopPropagation();
  var corpusKey = $(this).attr('data-corpus-key');
  if (!corpusKey) return;
  toggleCorpusVisibility(corpusKey);
});

$('.results-panel').on('click', '.result-filter-chip', function (event) {
  event.preventDefault();
  var corpusKey = $(this).attr('data-corpus-key');
  if (!corpusKey) return;
  toggleCorpusVisibility(corpusKey);
});

$('.results-toggle-button').on('click', function () {
  if (!selectedResultSummary) return;
  resultsCollapsed = !resultsCollapsed;
  updateResultsVisibility();
});


$('#open-on-sefaria').on('click', function () {
  var sefariaUrl = buildSefariaOpenUrl();
  if (!sefariaUrl) return;
  window.open(sefariaUrl, '_blank', 'noopener');
});

$('.open-divine-name-preferences, .open-preferences-tool').on('click', function (event) {
  if (event) event.preventDefault();
  google.script.run.preferencesPopup();
});

$('.open-divine-names-tool').on('click', function () {
  $('.hide').fadeIn('200');
  google.script.run.withSuccessHandler(function () {
    $('.hide').fadeOut('200');
  }).withFailureHandler(function () {
    $('.hide').fadeOut('200');
  }).transformDivineNames();
});

$('.open-linker-tool').on('click', function () {
  google.script.run.linkerHTML();
});


function bindDropdownToggle(selector) {
  var dropdown = $(selector);
  if (!dropdown.length) return;
  dropdown.find('.multi-select-button').on('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    $('.multi-select-dropdown').not(dropdown).removeClass('open').find('.multi-select-button').attr('aria-expanded', 'false');
    var willOpen = !dropdown.hasClass('open');
    dropdown.toggleClass('open', willOpen);
    dropdown.find('.multi-select-button').attr('aria-expanded', willOpen ? 'true' : 'false');
  });
}

$('.translation-language-toggle').on('click', function (event) {
  event.preventDefault();
  event.stopPropagation();
  var $dropdown = $('#translation-language-dropdown');
  var willOpen = !$dropdown.hasClass('open');
  $dropdown.toggleClass('open', willOpen);
  $(this).attr('aria-expanded', willOpen ? 'true' : 'false');
});

$(document).on('click', function (event) {
  if (!$(event.target).closest('.multi-select-dropdown, .translation-language-compact').length) {
    $('.multi-select-dropdown').removeClass('open').find('.multi-select-button').attr('aria-expanded', 'false');
    $('#translation-language-dropdown').removeClass('open').find('.translation-language-toggle').attr('aria-expanded', 'false');
  }
});

function normalizeLanguage(version) {
  var suffixLanguageLUT = {
    en: 'English', he: 'Hebrew', ro: 'Romanian', yi: 'Yiddish', fr: 'French', de: 'German',
    es: 'Spanish', pt: 'Portuguese', ru: 'Russian', it: 'Italian', ar: 'Arabic', nl: 'Dutch',
    pl: 'Polish', hu: 'Hungarian', cs: 'Czech', uk: 'Ukrainian', tr: 'Turkish', lad: 'Ladino', su: 'Sundanese'
  };
  var lang = ((version.actualLanguage || version.language || "") + "").toLowerCase().trim();
  var family = (version.languageFamilyName || "").toString().trim();
  var normalizedFamily = family ? family.charAt(0).toUpperCase() + family.slice(1) : "";
  var title = (version.versionTitle || version.shortVersionTitle || '').toString().trim();
  var suffixMatch = title.match(/\[([a-z]{2,3})\]\s*$/i);
  var suffix = suffixMatch ? suffixMatch[1].toLowerCase() : '';
  var suffixLabel = suffixLanguageLUT[suffix] || '';
  var metadataLooksEnglish = ["en", "eng", "english"].indexOf(lang) >= 0 || /english/i.test(family);

  if (["he", "heb", "hebrew"].indexOf(lang) >= 0 || /hebrew/i.test(family)) return { key: "he", label: "HE" };
  if (metadataLooksEnglish) {
    if (suffix && suffix !== 'en' && suffixLabel) return { key: "other:" + suffix, label: suffix.toUpperCase() };
    return { key: "en", label: "EN" };
  }
  if (suffixLabel && normalizedFamily && /english/i.test(normalizedFamily) && suffix !== 'en') return { key: "other:" + suffix, label: suffix.toUpperCase() };
  if (!lang && normalizedFamily) return { key: "other:" + normalizedFamily.toLowerCase(), label: normalizedFamily.slice(0,2).toUpperCase() };
  if (!lang && suffixLabel) return { key: "other:" + suffix, label: suffix.toUpperCase() };
  if (!lang) return { key: "en", label: "EN" };
  return { key: "other:" + lang, label: String(lang).slice(0,2).toUpperCase() };
}

function extractYear(version) {
  var currentYear = (new Date()).getFullYear() + 1;
  var fields = [version.shortVersionTitle, version.versionTitle, version.versionNotes].filter(function (value) { return value; }).map(function (value) { return value.toString(); });
  var candidates = [];
  for (var i = 0; i < fields.length; i++) {
    var matches = fields[i].match(/\b(1\d{3}|20\d{2}|2100)\b/g);
    if (!matches) continue;
    for (var j = 0; j < matches.length; j++) {
      var numeric = parseInt(matches[j], 10);
      if (numeric >= 1000 && numeric <= currentYear) candidates.push(numeric);
    }
  }
  if (!candidates.length) return null;
  return Math.max.apply(null, candidates);
}

function buildVersionModel(dataIn) {
  var versions = Array.isArray(dataIn.versions) ? dataIn.versions : [];
  var seen = {};
  var normalized = [];
  versions.forEach(function (version, index) {
    var safeVersion = version || {};
    var language = normalizeLanguage(safeVersion);
    var versionTitle = safeVersion.versionTitle || safeVersion.shortVersionTitle || ("Untitled version #" + (index + 1));
    var dedupeKey = language.key + "::" + versionTitle + "::" + (safeVersion.versionSource || "");
    if (seen[dedupeKey]) return;
    seen[dedupeKey] = true;
    normalized.push({
      index: index,
      versionTitle: versionTitle,
      label: safeVersion.shortVersionTitle || safeVersion.versionTitle || versionTitle,
      fullTitle: safeVersion.versionTitle || versionTitle,
      languageKey: language.key,
      languageLabel: language.label,
      direction: safeVersion.direction,
      priority: Number(safeVersion.priority) || 0,
      isPrimary: !!safeVersion.isPrimary,
      year: extractYear(safeVersion)
    });
  });
  return normalized;
}

function sortVersionEntries(entries) {
  return entries.slice().sort(function (a, b) {
    if (a.year !== null && b.year !== null && a.year !== b.year) return b.year - a.year;
    if (a.year !== null && b.year === null) return -1;
    if (a.year === null && b.year !== null) return 1;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.index - b.index;
  });
}

function renderPreviewHTML(dataIn, inputTitle) {
  var mode = $('.output-mode-selection').val();
  if (mode === 'he') return buildPreviewMeta(dataIn.heRef, dataIn) + "<div class='preview-he'>" + (dataIn.he || '<p class=\"preview-state-message\">No source text available.</p>') + "</div>";
  if (mode === 'en') return buildPreviewMeta(dataIn.ref, inputTitle) + "<div>" + (dataIn.text || '<p class=\"preview-state-message\">No translation text available.</p>') + "</div>";
  return "<table class='preview-table'><tr><td>" + buildPreviewMeta(dataIn.ref, inputTitle) + (dataIn.text || '<p class=\"preview-state-message\">No translation text available.</p>') + "</td><td class='preview-he'>" + buildPreviewMeta(dataIn.heRef, dataIn) + (dataIn.he || '<p class=\"preview-state-message\">No source text available.</p>') + "</td></tr></table>";
}

function updateSuggestion(dataIn, inputTitle) {
  var resolvedRef = dataIn && dataIn.ref ? dataIn.ref : inputTitle;
  var versionEntries = buildVersionModel(dataIn);
  var enSelectedVersionTitle = dataIn.versionTitle || "";
  var heSelectedVersionTitle = dataIn.heVersionTitle || "";
  var hebrewEntries = sortVersionEntries(versionEntries.filter(function (entry) { return entry.languageKey === 'he'; }));
  var translationEntries = sortVersionEntries(versionEntries.filter(function (entry) { return entry.languageKey !== 'he'; }));

  var selectVersionHebrew = "<div class=\"version-control-header\"><label class=\"version-label\" for=\"he-version-filter\">Source editions</label><span class=\"version-count\">" + hebrewEntries.length + " available</span></div><input type=\"text\" id=\"he-version-filter\" class=\"translation-filter-input he-version-filter\" placeholder=\"Filter source editions\" aria-label=\"Filter source editions\"><select id=\"he-version-selection\" class=\"translation-version-select he-version-selection\" size=\"6\" aria-label=\"Source editions\"></select><div class=\"translation-selected-display he-selected-display\" aria-live=\"polite\"></div>";

  var translationInput = "<div class=\"version-control-header\"><label class=\"version-label\" for=\"translation-version-filter\">Translation versions</label><span class=\"version-count\">" + translationEntries.length + " available</span></div><input type=\"text\" id=\"translation-version-filter\" class=\"translation-filter-input\" placeholder=\"Filter by language or version name\" aria-label=\"Filter translation versions\"><select id=\"translation-version-selection\" class=\"translation-version-select\" size=\"6\" aria-label=\"Translation versions\"></select><div class=\"translation-selected-display\" aria-live=\"polite\"></div>";

  var languageGroups = {};
  translationEntries.forEach(function (entry) {
    if (!languageGroups[entry.languageLabel]) languageGroups[entry.languageLabel] = [];
    languageGroups[entry.languageLabel].push(entry);
  });

  var translationGroupLabels = Object.keys(languageGroups).sort(function (a, b) {
    if (a === 'English') return -1;
    if (b === 'English') return 1;
    return a.localeCompare(b);
  });

  var translationItems = [];
  translationGroupLabels.forEach(function (groupLabel) {
    var cleanGroupLabel = normalizeOptionText(groupLabel) || 'Other';
    if (!languageGroups[groupLabel] || !languageGroups[groupLabel].length) return;
    languageGroups[groupLabel].forEach(function (entry) {
      var cleanLabel = normalizeOptionText(entry.fullTitle || entry.label || entry.versionTitle);
      var fallbackLabel = normalizeOptionText(entry.versionTitle);
      var normalizedLabel = cleanLabel || fallbackLabel || ("Translation " + (entry.index + 1));
      var optionLabel = normalizeOptionText(cleanGroupLabel + " – " + normalizedLabel);
      translationItems.push({
        label: normalizedLabel,
        optionLabel: optionLabel,
        value: entry.versionTitle,
        category: cleanGroupLabel,
        searchable: (normalizedLabel + " " + entry.versionTitle + " " + cleanGroupLabel).toLowerCase(),
        availableForRef: Object.prototype.hasOwnProperty.call(translationAvailabilityByRef, resolvedRef + "::" + entry.versionTitle)
          ? translationAvailabilityByRef[resolvedRef + "::" + entry.versionTitle]
          : true
      });
    });
  });

  var hebrewItems = hebrewEntries.map(function (entry) {
    var normalizedLabel = normalizeOptionText(entry.fullTitle || entry.label || entry.versionTitle) || normalizeOptionText(entry.versionTitle) || ("Source " + (entry.index + 1));
    return {
      label: normalizedLabel,
      optionLabel: normalizedLabel,
      value: entry.versionTitle,
      searchable: (normalizedLabel + " " + entry.versionTitle).toLowerCase()
    };
  });

  $('.translation-version-control').html(translationInput);
  $('.hebrew-version-control').html(selectVersionHebrew);
  $('.suggestions').html(renderPreviewHTML(dataIn, inputTitle));

  if (pendingPreferredVersions) {
    var preferredEn = pendingPreferredVersions.en || '';
    var preferredHe = pendingPreferredVersions.he || '';
    if (preferredEn && translationEntries.some(function (entry) { return entry.versionTitle === preferredEn; })) enSelectedVersionTitle = preferredEn;
    if (preferredHe && hebrewEntries.some(function (entry) { return entry.versionTitle === preferredHe; })) heSelectedVersionTitle = preferredHe;
  }

  var currentEnVersion = enSelectedVersionTitle;
  var currentHeVersion = heSelectedVersionTitle;

  function syncSelectedHebrewDisplay() {
    var selectedOption = $('.he-version-selection option:selected');
    var selectedText = selectedOption.length ? selectedOption.text().trim() : '';
    var selectedTitle = selectedOption.length ? (selectedOption.attr('title') || '') : '';
    var displayText = selectedText || selectedTitle || 'No source edition selected.';
    $('.he-version-selected-display').text(displayText).attr('title', displayText);
  }

  function renderHebrewOptions(filterTerm) {
    var query = String(filterTerm || '').trim().toLowerCase();
    var filtered = hebrewItems.filter(function (item) { return !query || item.searchable.indexOf(query) >= 0; });
    var optionsHTML = '';
    if (!filtered.length) {
      optionsHTML = '<option value="" disabled>No matching source editions</option>';
    } else {
      filtered.forEach(function (item) {
        var selected = item.value === currentHeVersion ? 'selected' : '';
        optionsHTML += "<option value=\"" + escapeHTML(item.value) + "\" " + selected + " title=\"" + escapeHTML(item.optionLabel) + "\">" + escapeHTML(item.optionLabel) + "</option>";
      });
    }
    $('.he-version-selection').html(optionsHTML);
    if (!$('.he-version-selection').val()) {
      var firstEnabled = $('.he-version-selection option:not(:disabled)').first();
      if (firstEnabled.length) {
        firstEnabled.prop('selected', true);
        currentHeVersion = firstEnabled.val();
      }
    }
    if (currentHeVersion && !$('.he-version-selection option:selected').length) currentHeVersion = '';
    syncSelectedHebrewDisplay();
  }

  function syncSelectedTranslationDisplay() {
    var selectedOption = $('.translation-version-select option:selected');
    var selectedText = selectedOption.length ? selectedOption.text().trim() : '';
    var selectedTitle = selectedOption.length ? (selectedOption.attr('title') || '') : '';
    var displayText = selectedText || selectedTitle || 'No translation selected.';
    $('.translation-selected-display').text(displayText).attr('title', displayText);
  }

  function syncSelectedHebrewDisplay() {
    var selectedOption = $('.he-version-selection option:selected');
    var selectedText = selectedOption.length ? selectedOption.text().trim() : '';
    var selectedTitle = selectedOption.length ? (selectedOption.attr('title') || '') : '';
    var displayText = selectedText || selectedTitle || 'No source edition selected.';
    $('.he-selected-display').text(displayText).attr('title', displayText);
  }

  function renderHebrewOptions(filterTerm) {
    var query = String(filterTerm || '').trim().toLowerCase();
    var filtered = hebrewEntries.filter(function (entry) {
      var text = (entry.label + ' ' + entry.versionTitle + ' ' + (entry.year || '')).toLowerCase();
      return !query || text.indexOf(query) >= 0;
    });
    var html = '';
    if (!filtered.length) html = '<option value="" disabled>No matching source editions</option>';
    filtered.forEach(function(entry) {
      var selected = entry.versionTitle === heSelectedVersionTitle ? 'selected' : '';
      var label = entry.year ? (entry.label + ' – ' + entry.year) : entry.label;
      html += "<option value=\"" + escapeHTML(entry.versionTitle) + "\" " + selected + " title=\"" + escapeHTML(label) + "\">" + escapeHTML(label) + "</option>";
    });
    $('.he-version-selection').html(html);
    if (!$('.he-version-selection').val()) {
      var first = $('.he-version-selection option:not(:disabled)').first();
      if (first.length) {
        first.prop('selected', true);
        heSelectedVersionTitle = first.val();
      }
    }
    syncSelectedHebrewDisplay();
  }

  function markTranslationAvailability(resolvedVersionTitle, attemptedVersionTitle) {
    var resolved = String(resolvedVersionTitle || '').trim();
    var attempted = String(attemptedVersionTitle || '').trim();
    if (!attempted) return;
    var wasResolved = !!(resolved && resolved === attempted);
    translationAvailabilityByRef[resolvedRef + "::" + attempted] = wasResolved;
    translationItems.forEach(function (item) {
      if (item.value === attempted) item.availableForRef = wasResolved;
    });
  }

  function renderTranslationOptions(filterTerm) {
    var query = String(filterTerm || '').trim().toLowerCase();
    var filtered = translationItems.filter(function (item) { return !query || item.searchable.indexOf(query) >= 0; });
    var optionsHTML = '';
    if (!filtered.length) {
      optionsHTML = '<option value="" disabled>No matching translations</option>';
    } else {
      filtered.forEach(function (item) {
        var isUnavailable = item.availableForRef === false;
        var selected = item.value === currentEnVersion && !isUnavailable ? 'selected' : '';
        var disabled = isUnavailable ? 'disabled' : '';
        var label = isUnavailable ? (item.optionLabel + " – unavailable for this ref") : item.optionLabel;
        optionsHTML += "<option value=\"" + escapeHTML(item.value) + "\" " + selected + " " + disabled + " title=\"" + escapeHTML(label) + "\">" + escapeHTML(label) + "</option>";
      });
    }
    $('.translation-version-select').html(optionsHTML);
    if (!$('.translation-version-select').val()) {
      var firstEnabled = $('.translation-version-select option:not(:disabled)').first();
      if (firstEnabled.length) {
        firstEnabled.prop('selected', true);
        currentEnVersion = firstEnabled.val();
      }
    }
    if (currentEnVersion && !$('.translation-version-select option:selected').length) currentEnVersion = '';
    syncSelectedTranslationDisplay();
  }

  function getVersions(targetTranslationVersion) {
    var selectedTranslation = targetTranslationVersion || $('.translation-version-select').val();
    var enVersion = selectedTranslation || currentEnVersion || enSelectedVersionTitle;
    var heVersion = $('.he-version-selection').val();
    var versions = { "en": enVersion, "he": heVersion };
    var requestId = ++latestResolveRequestId;
    hasResolvedReference = false;
    setInsertButtonState(false);
    $('.suggestions').html(buildPreviewLoadingHTML('Refreshing preview…'));
    google.script.run.withSuccessHandler(function (response) {
      if (requestId !== latestResolveRequestId) return;
      var nodeState = getResolvedNodeState(response);
      if (!nodeState.isInsertable) {
        hasResolvedReference = false;
        setInsertButtonState(false);
        clearVersionSelectors();
        updatePesukimAvailability(null);
        updateActionabilityUI(nodeState);
        $('.suggestions').html("<br>" + buildNonInsertableMessage(response));
        return;
      }
      var resolvedTranslation = String((response && response.versionTitle) || '').trim();
      markTranslationAvailability(resolvedTranslation, enVersion);
      if (enVersion && resolvedTranslation && resolvedTranslation !== enVersion) renderTranslationOptions($('.translation-filter-input').val());
      updateSuggestion(response, inputTitle);
      updatePesukimAvailability(response);
      updateActionabilityUI(nodeState);
      data = response;
      hasResolvedReference = true;
      setInsertButtonState(true);
    }).withFailureHandler(function () {
      if (requestId !== latestResolveRequestId) return;
      markTranslationAvailability('', enVersion);
      renderTranslationOptions($('.translation-filter-input').val());
      hasResolvedReference = false;
      setInsertButtonState(false);
      clearVersionSelectors();
      updatePesukimAvailability(null);
      updateActionabilityUI({ isInsertable: false });
    }).findReference(resolvedRef, versions);
  }

  renderTranslationOptions('');
  renderHebrewOptions('');
  renderHebrewOptions('');

  $('.translation-filter-input').on('input', function () {
    renderTranslationOptions($(this).val());
  }).on('keydown', function (event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      $('.translation-version-select').focus();
    }
  });

  $('.translation-version-select').on('change', function () {
    var selected = $(this).val();
    syncSelectedTranslationDisplay();
    if (!selected) return;
    currentEnVersion = selected;
    getVersions(selected);
  });

  $('.he-version-filter').on('input', function () {
    renderHebrewOptions($(this).val());
  }).on('keydown', function (event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      $('.he-version-selection').focus();
    }
  });

  $('.he-version-selection').on('change', function () {
    currentHeVersion = $(this).val() || currentHeVersion;
    syncSelectedHebrewDisplay();
    getVersions();
  });

  if (pendingPreferredVersions) {
    var prefEn = pendingPreferredVersions.en || '';
    var prefHe = pendingPreferredVersions.he || '';
    pendingPreferredVersions = null;
    if (prefEn || prefHe) {
      var currentEn = $('.translation-version-select').val() || currentEnVersion || enSelectedVersionTitle;
      var currentHe = $('.he-version-selection').val() || heSelectedVersionTitle;
      if (currentEn !== (dataIn.versionTitle || '') || currentHe !== (dataIn.heVersionTitle || '')) getVersions();
    }
  }
}


$(document).on('click', '.results-suggestion-button', function (event) {
  event.preventDefault();
  var suggestion = $(this).attr('data-suggested-query') || $(this).text();
  $('.input').val(suggestion);
  updateQueryIntel(suggestion);
  runUnifiedQuery();
});

$('.results-restore-button').on('click', function (event) {
  event.preventDefault();
  resultPostProcessState.removedCorpora = [];
  reprocessAndRenderResults();
});

$(document).on('change', '.translation-language-any', function () {
  if ($(this).is(':checked')) {
    $('.translation-language-option').prop('checked', false);
  }
  updateTranslationLanguageVisibility();
  saveLastUsedSearchSettings();
  if (getAllRawResults().length) reprocessAndRenderResults();
});

$(document).on('change', '.translation-language-option', function () {
  if ($(this).is(':checked')) {
    $('.translation-language-any').prop('checked', false);
  } else if (!$('.translation-language-option:checked').length) {
    $('.translation-language-any').prop('checked', true);
  }
  updateTranslationLanguageVisibility();
  saveLastUsedSearchSettings();
  if (getAllRawResults().length) reprocessAndRenderResults();
});

$('.session-library-panel').on('click keydown', '.session-library-item', function (event) {
  if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
  if ($(event.target).closest('.session-library-remove').length) return;
  event.preventDefault();
  var ref = $(this).attr('data-ref');
  if (ref) {
    $('.input').val(ref);
    runUnifiedQuery();
  }
});

$('.session-library-panel').on('click', '.session-library-remove', function (event) {
  event.preventDefault();
  event.stopPropagation();
  removeSessionEntry($(this).attr('data-list'), $(this).attr('data-ref'));
});

$('.results-panel').on('click', '.result-pin-button', function (event) {
  event.preventDefault();
  event.stopPropagation();
  togglePinnedRef($(this).attr('data-ref'), $(this).attr('data-label'));
});

$('.output-mode-selection').on('change', function () {
  updateBilingualLayoutVisibility();
  updateTranslationDetailsVisibility();
  updateHebrewOptionsVisibility();
  updateVersionControlsVisibility();
  updateTransliterationVisibility();
  syncDisplayModeCards();
  saveSidebarPreference({ output_mode_default: $('.output-mode-selection').val() });
  if (hasResolvedReference && data && data.ref) {
    updateSuggestion(data, selectedResultSummary ? selectedResultSummary.label : data.ref);
  }
});

$('.mode-card').on('click keydown', function (event) {
  if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  $('.output-mode-selection').val($(this).attr('data-mode')).trigger('change');
});

$('.layout-option').on('click keydown', function (event) {
  if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  $('.bilingual-layout-selection').val($(this).attr('data-layout'));
  syncLayoutCards();
  saveSidebarPreference({ bilingual_layout_default: $('.bilingual-layout-selection').val() });
});

function initializeSidebar(receivedTitles) {
  titles = Array.isArray(receivedTitles) ? receivedTitles : [];
  $(".input").removeAttr("disabled");
  $('.suggestions').html("<b>Please enter the title of a text or a source to insert.</b>");
  $('.input').autocomplete({
    source: function (request, response) {
      var matches = $.map(titles, function (tag) {
        if (tag.toUpperCase().indexOf(request.term.toUpperCase()) === 0) return tag;
      });
      response(matches);
    },
    open: function () {
      $('.input').autocomplete("widget").width(280);
    }
  });

  loadSessionLibrary();
  renderSessionLibrary();
  updateTranslationLanguageVisibility();
  syncCompactTranslationLanguageUI();
  updateQueryIntel('');
  updateBilingualLayoutVisibility();
  updateTranslationDetailsVisibility();
  updateHebrewOptionsVisibility();
  updateVersionControlsVisibility();
  updateTransliterationVisibility();
  syncDisplayModeCards();
  syncLayoutCards();
  ensureResultFilterUI();
  $('.results-restore-button').hide();
  renderResults();
  renderSessionLibrary();
  setInsertButtonState(false);
}

google.script.run.withSuccessHandler(function (receivedTitles) {
  initializeSidebar(receivedTitles);
}).withFailureHandler(function () {
  initializeSidebar([]);
}).returnTitles();

$('.close').click(function () {
  google.script.host.close();
});



$(document).on('click', '.restore-all-results, #restore-results', function (event) {
  event.preventDefault();
  resultPostProcessState.removedCorpora = [];
  reprocessAndRenderResults();
});

$(document).on('click', '.results-suggestion-button', function (event) {
  event.preventDefault();
  var suggested = $(this).attr('data-suggested-query') || $(this).text();
  $('.input').val(suggested);
  runUnifiedQuery();
});

$('.results-restore-button').on('click', function (event) {
  event.preventDefault();
  resultPostProcessState.removedCorpora = [];
  reprocessAndRenderResults();
});

$(document).on('click', '#translation-language-toggle', function (event) {
  event.preventDefault();
  event.stopPropagation();
  $('#translation-language-menu').toggleClass('hidden');
  $('#translation-language-toggle').attr('aria-expanded', $('#translation-language-menu').hasClass('hidden') ? 'false' : 'true');
});

$(document).on('click', '.translation-language-choice', function (event) {
  event.preventDefault();
  var lang = $(this).attr('data-lang');
  $('.translation-language-choice').removeClass('active');
  $(this).addClass('active');
  if (lang === 'any') {
    $('.translation-language-any').prop('checked', true);
    $('.translation-language-option').prop('checked', false);
    $('.translation-only-filter').prop('checked', false);
  } else {
    $('.translation-language-any').prop('checked', false);
    $('.translation-language-option').prop('checked', false);
    $('.translation-language-option[value="' + lang + '"]').prop('checked', true);
    $('.translation-only-filter').prop('checked', true);
  }
  updateTranslationLanguageVisibility();
  saveLastUsedSearchSettings();
  $('#translation-language-menu').addClass('hidden');
  $('#translation-language-toggle').attr('aria-expanded', 'false');
  if (getAllRawResults().length) reprocessAndRenderResults();
  else if (($('.input').val() || '').trim()) runUnifiedQuery();
});

$(document).on('click', function (event) {
  if (!$(event.target).closest('.results-refine-row').length) {
    $('#translation-language-menu').addClass('hidden');
    $('#translation-language-toggle').attr('aria-expanded', 'false');
  }
});

const moreToggle = document.getElementById('translation-language-more-toggle');
const moreMenu = document.getElementById('translation-language-more');

if (moreToggle && moreMenu) {
  moreToggle.addEventListener('click', function () {
    const isHidden = moreMenu.classList.contains('hidden');
    moreMenu.classList.toggle('hidden', !isHidden);
    moreToggle.setAttribute('aria-expanded', String(isHidden));
    moreToggle.textContent = isHidden ? '▴' : '▾';
  });
}
