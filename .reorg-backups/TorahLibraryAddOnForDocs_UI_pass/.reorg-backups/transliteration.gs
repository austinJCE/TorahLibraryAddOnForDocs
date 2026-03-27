/* Local transliteration engine. */
var TRANSLITERATION_SCHEMES = {
  simple_english: { name: "Simple English", map: {"א":"'", "ב":"b", "ג":"g", "ד":"d", "ה":"h", "ו":"v", "ז":"z", "ח":"kh", "ט":"t", "י":"y", "כ":"kh", "ך":"kh", "ל":"l", "מ":"m", "ם":"m", "נ":"n", "ן":"n", "ס":"s", "ע":"'", "פ":"p", "ף":"f", "צ":"ts", "ץ":"ts", "ק":"k", "ר":"r", "ש":"sh", "ת":"t"}, vowels: {"\u05B0":"e","\u05B1":"e","\u05B2":"a","\u05B3":"o","\u05B4":"i","\u05B5":"e","\u05B6":"e","\u05B7":"a","\u05B8":"a","\u05B9":"o","\u05BB":"u","\u05BC":"","\u05BD":"","\u05BF":"","\u05C1":"","\u05C2":"","\u05C7":"a"} },
  academic_lite: { name: "Academic-lite", map: {"א":"ʾ", "ב":"b", "ג":"g", "ד":"d", "ה":"h", "ו":"v", "ז":"z", "ח":"ḥ", "ט":"ṭ", "י":"y", "כ":"kh", "ך":"kh", "ל":"l", "מ":"m", "ם":"m", "נ":"n", "ן":"n", "ס":"s", "ע":"ʿ", "פ":"p", "ף":"f", "צ":"ṣ", "ץ":"ṣ", "ק":"q", "ר":"r", "ש":"sh", "ת":"t"}, vowels: {"\u05B0":"ə","\u05B1":"e","\u05B2":"a","\u05B3":"o","\u05B4":"i","\u05B5":"e","\u05B6":"e","\u05B7":"a","\u05B8":"a","\u05B9":"o","\u05BB":"u","\u05BC":"","\u05BD":"","\u05BF":"","\u05C1":"","\u05C2":"","\u05C7":"a"} },
  modern_israeli: { name: "Modern Israeli", map: {"א":"'", "ב":"b", "ג":"g", "ד":"d", "ה":"h", "ו":"v", "ז":"z", "ח":"ch", "ט":"t", "י":"y", "כ":"ch", "ך":"ch", "ל":"l", "מ":"m", "ם":"m", "נ":"n", "ן":"n", "ס":"s", "ע":"'", "פ":"p", "ף":"f", "צ":"tz", "ץ":"tz", "ק":"k", "ר":"r", "ש":"sh", "ת":"t"}, vowels: {"\u05B0":"e","\u05B1":"e","\u05B2":"a","\u05B3":"o","\u05B4":"i","\u05B5":"e","\u05B6":"e","\u05B7":"a","\u05B8":"a","\u05B9":"o","\u05BB":"u","\u05BC":"","\u05BD":"","\u05BF":"","\u05C1":"","\u05C2":"","\u05C7":"a"} }
};
function stripCantillationMarks_(text) { return String(text || "").replace(/[\u0591-\u05AF]/g, ""); }
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
  return out.replace(/\s+/g, " ").replace(/'\s+/g, " ").trim();
}
function transliterateHebrewHtmlPreservingBasicBreaks(html, schemeKey, options) {
  var text = String(html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]*>/g, "");
  var lines = text.split(/\n+/);
  var out = [];
  for (var i = 0; i < lines.length; i += 1) { var line = lines[i].trim(); if (line) out.push(transliterateHebrewText(line, schemeKey, options)); }
  return out.join("\n");
}
