/*
 * Local transliteration engine with user overrides.
 *
 * Overrides are stored in user preferences under:
 *   transliteration_overrides
 *
 * Expected format:
 *   JSON object mapping a single Hebrew character (or niqqud mark) to a replacement string
 *
 * Example:
 *   {"ח":"ch","ע":"","ש":"s"}
 */

var TRANSLITERATION_SCHEMES = {
  simple_english: {
    name: "Simple English",
    map: {
      "א": "'", "ב": "b", "ג": "g", "ד": "d", "ה": "h", "ו": "v", "ז": "z",
      "ח": "kh", "ט": "t", "י": "y", "כ": "kh", "ך": "kh", "ל": "l", "מ": "m",
      "ם": "m", "נ": "n", "ן": "n", "ס": "s", "ע": "'", "פ": "p", "ף": "f",
      "צ": "ts", "ץ": "ts", "ק": "k", "ר": "r", "ש": "sh", "ת": "t"
    },
    vowels: {
      "\u05B0": "e", "\u05B1": "e", "\u05B2": "a", "\u05B3": "o", "\u05B4": "i",
      "\u05B5": "e", "\u05B6": "e", "\u05B7": "a", "\u05B8": "a", "\u05B9": "o",
      "\u05BB": "u", "\u05BC": "", "\u05BD": "", "\u05BF": "", "\u05C1": "",
      "\u05C2": "", "\u05C7": "a"
    }
  },

  academic_lite: {
    name: "Academic-lite",
    map: {
      "א": "ʾ", "ב": "b", "ג": "g", "ד": "d", "ה": "h", "ו": "v", "ז": "z",
      "ח": "ḥ", "ט": "ṭ", "י": "y", "כ": "kh", "ך": "kh", "ל": "l", "מ": "m",
      "ם": "m", "נ": "n", "ן": "n", "ס": "s", "ע": "ʿ", "פ": "p", "ף": "f",
      "צ": "ṣ", "ץ": "ṣ", "ק": "q", "ר": "r", "ש": "sh", "ת": "t"
    },
    vowels: {
      "\u05B0": "ə", "\u05B1": "e", "\u05B2": "a", "\u05B3": "o", "\u05B4": "i",
      "\u05B5": "e", "\u05B6": "e", "\u05B7": "a", "\u05B8": "a", "\u05B9": "o",
      "\u05BB": "u", "\u05BC": "", "\u05BD": "", "\u05BF": "", "\u05C1": "",
      "\u05C2": "", "\u05C7": "a"
    }
  },

  modern_israeli: {
    name: "Modern Israeli",
    map: {
      "א": "'", "ב": "b", "ג": "g", "ד": "d", "ה": "h", "ו": "v", "ז": "z",
      "ח": "ch", "ט": "t", "י": "y", "כ": "ch", "ך": "ch", "ל": "l", "מ": "m",
      "ם": "m", "נ": "n", "ן": "n", "ס": "s", "ע": "'", "פ": "p", "ף": "f",
      "צ": "tz", "ץ": "tz", "ק": "k", "ר": "r", "ש": "sh", "ת": "t"
    },
    vowels: {
      "\u05B0": "e", "\u05B1": "e", "\u05B2": "a", "\u05B3": "o", "\u05B4": "i",
      "\u05B5": "e", "\u05B6": "e", "\u05B7": "a", "\u05B8": "a", "\u05B9": "o",
      "\u05BB": "u", "\u05BC": "", "\u05BD": "", "\u05BF": "", "\u05C1": "",
      "\u05C2": "", "\u05C7": "a"
    }
  }
};

function stripCantillationMarks_(text) {
  return String(text || "").replace(/[\u0591-\u05AF]/g, "");
}

function getTransliterationOverrides_() {
  try {
    var userProperties = PropertiesService.getUserProperties();
    var raw = userProperties.getProperty("transliteration_overrides");
    if (!raw) {
      return {};
    }
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    var cleaned = {};
    Object.keys(parsed).forEach(function(key) {
      var normalizedKey = String(key || "");
      if (!normalizedKey) {
        return;
      }
      cleaned[normalizedKey] = String(parsed[key] == null ? "" : parsed[key]);
    });
    return cleaned;
  } catch (error) {
    return {};
  }
}

function applyTransliterationOverrides_(text, overrides) {
  var input = String(text || "");
  if (!input || !overrides || typeof overrides !== "object") {
    return input;
  }

  var out = "";
  for (var i = 0; i < input.length; i += 1) {
    var ch = input.charAt(i);
    if (Object.prototype.hasOwnProperty.call(overrides, ch)) {
      out += overrides[ch];
    } else {
      out += ch;
    }
  }
  return out;
}

function transliterateHebrewText(text, schemeKey, options) {
  options = options || {};
  var keepNiqqud = options.keepNiqqud !== false;
  var useOverrides = options.useOverrides !== false;

  var cleaned = stripCantillationMarks_(String(text || ""));
  if (!cleaned) {
    return "";
  }

  var scheme = TRANSLITERATION_SCHEMES[schemeKey] || TRANSLITERATION_SCHEMES.simple_english;
  var overrides = useOverrides ? getTransliterationOverrides_() : {};
  var out = "";

  for (var i = 0; i < cleaned.length; i += 1) {
    var ch = cleaned.charAt(i);

    if (Object.prototype.hasOwnProperty.call(overrides, ch)) {
      out += overrides[ch];
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(scheme.map, ch)) {
      out += scheme.map[ch];
      continue;
    }

    if (keepNiqqud && Object.prototype.hasOwnProperty.call(scheme.vowels, ch)) {
      out += scheme.vowels[ch];
      continue;
    }

    out += ch;
  }

  return out
    .replace(/\s+/g, " ")
    .replace(/'\s+/g, " ")
    .trim();
}

function transliterateHebrewHtmlPreservingBasicBreaks(html, schemeKey, options) {
  var text = String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "");

  var lines = text.split(/\n+/);
  var out = [];

  for (var i = 0; i < lines.length; i += 1) {
    var line = lines[i].trim();
    if (!line) {
      continue;
    }
    out.push(transliterateHebrewText(line, schemeKey, options));
  }

  return out.join("\n");
}

function previewTransliterationWithOverrides(text, schemeKey) {
  return transliterateHebrewText(text, schemeKey, {
    keepNiqqud: true,
    useOverrides: true
  });
}
